package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/repository"
	"github.com/upcore/audit/internal/service"
)

// --- Fake repo -------------------------------------------------------------

type fakeConsentRepo struct {
	// rows keyed by (tenant|user|type|version)
	rows    map[string]*domain.DataConsent
	history map[string][]*domain.ConsentHistoryEntry
}

func newFakeConsentRepo() *fakeConsentRepo {
	return &fakeConsentRepo{
		rows:    map[string]*domain.DataConsent{},
		history: map[string][]*domain.ConsentHistoryEntry{},
	}
}

func (f *fakeConsentRepo) key(t, u uuid.UUID, ct domain.ConsentType, v int) string {
	return t.String() + "|" + u.String() + "|" + string(ct) + "|" + itoa(v)
}

func (f *fakeConsentRepo) histKey(t, u uuid.UUID, ct domain.ConsentType) string {
	return t.String() + "|" + u.String() + "|" + string(ct)
}

func (f *fakeConsentRepo) ListByUser(_ context.Context, tenantID, userID uuid.UUID) ([]*domain.DataConsent, error) {
	out := []*domain.DataConsent{}
	// pick highest version per consent_type
	byType := map[domain.ConsentType]*domain.DataConsent{}
	for _, r := range f.rows {
		if r.TenantID != tenantID || r.UserID != userID {
			continue
		}
		if cur, ok := byType[r.ConsentType]; !ok || cur.Version < r.Version {
			byType[r.ConsentType] = r
		}
	}
	for _, v := range byType {
		out = append(out, v)
	}
	return out, nil
}

func (f *fakeConsentRepo) GetLatest(_ context.Context, tenantID, userID uuid.UUID, ct domain.ConsentType) (*domain.DataConsent, error) {
	var best *domain.DataConsent
	for _, r := range f.rows {
		if r.TenantID != tenantID || r.UserID != userID || r.ConsentType != ct {
			continue
		}
		if best == nil || r.Version > best.Version {
			best = r
		}
	}
	if best == nil {
		return nil, domain.ErrNotFound
	}
	cp := *best
	return &cp, nil
}

func (f *fakeConsentRepo) Upsert(_ context.Context, c *domain.DataConsent) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	c.UpdatedAt = time.Now().UTC()
	k := f.key(c.TenantID, c.UserID, c.ConsentType, c.Version)

	var prev *domain.ConsentStatus
	if existing, ok := f.rows[k]; ok {
		p := existing.Status
		prev = &p
	}
	// store a copy
	row := *c
	f.rows[k] = &row

	// Simulate history trigger.
	hk := f.histKey(c.TenantID, c.UserID, c.ConsentType)
	reason := "user_action"
	if prev == nil {
		reason = "user_action"
	}
	f.history[hk] = append(f.history[hk], &domain.ConsentHistoryEntry{
		ID:             uuid.New(),
		TenantID:       c.TenantID,
		ConsentID:      c.ID,
		UserID:         c.UserID,
		ConsentType:    c.ConsentType,
		Version:        c.Version,
		PreviousStatus: prev,
		NewStatus:      c.Status,
		ChangeReason:   reason,
		IPAddr:         c.IPAddr,
		UserAgent:      c.UserAgent,
		Metadata:       c.Metadata,
		ChangedAt:      time.Now().UTC(),
	})
	return nil
}

func (f *fakeConsentRepo) ListHistory(_ context.Context, tenantID, userID uuid.UUID, ct domain.ConsentType) ([]*domain.ConsentHistoryEntry, error) {
	hk := f.histKey(tenantID, userID, ct)
	entries := f.history[hk]
	// newest first
	out := make([]*domain.ConsentHistoryEntry, len(entries))
	for i, e := range entries {
		out[len(entries)-1-i] = e
	}
	return out, nil
}

var _ repository.ConsentRepository = (*fakeConsentRepo)(nil)

func itoa(i int) string {
	// tiny local stringifier to avoid strconv import clutter
	if i == 0 {
		return "0"
	}
	neg := i < 0
	if neg {
		i = -i
	}
	buf := []byte{}
	for i > 0 {
		buf = append([]byte{byte('0' + i%10)}, buf...)
		i /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}

// --- Tests -----------------------------------------------------------------

func TestConsentService_ListUserConsents_Catalog(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	tenantID := uuid.New()
	userID := uuid.New()

	out, err := svc.ListUserConsents(context.Background(), tenantID, userID)
	require.NoError(t, err)
	// Catalog must contain the 5 types regardless of user state.
	assert.Len(t, out.Catalog, 5)
	assert.Equal(t, domain.ConsentVersion, out.Version)
	// User with zero decisions: empty consents slice.
	assert.Len(t, out.Consents, 0)
}

func TestConsentService_Upsert_GrantInitial(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	tenantID := uuid.New()
	userID := uuid.New()

	req := &service.UpsertConsentRequest{
		ConsentType: domain.ConsentBurnoutMonitoring,
		Status:      domain.ConsentStatusGranted,
	}
	entry, err := svc.Upsert(context.Background(), tenantID, userID, "10.0.0.5", "curl/8", req)
	require.NoError(t, err)
	assert.Equal(t, domain.ConsentStatusGranted, entry.Status)
	require.NotNil(t, entry.AcceptedAt)
	require.NotNil(t, entry.IPAddr)
	assert.Equal(t, "10.0.0.5", *entry.IPAddr)
	require.NotNil(t, entry.UserAgent)
	assert.Equal(t, "curl/8", *entry.UserAgent)
	assert.Equal(t, domain.ConsentVersion, entry.Version)
}

func TestConsentService_Upsert_GrantedThenDeclined_BecomesRevoked(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	tenantID := uuid.New()
	userID := uuid.New()

	_, err := svc.Upsert(context.Background(), tenantID, userID, "1.2.3.4", "ua", &service.UpsertConsentRequest{
		ConsentType: domain.ConsentAIRecommendations,
		Status:      domain.ConsentStatusGranted,
	})
	require.NoError(t, err)

	entry, err := svc.Upsert(context.Background(), tenantID, userID, "1.2.3.4", "ua", &service.UpsertConsentRequest{
		ConsentType: domain.ConsentAIRecommendations,
		Status:      domain.ConsentStatusDeclined,
	})
	require.NoError(t, err)
	assert.Equal(t, domain.ConsentStatusRevoked, entry.Status, "granted → declined must be recorded as revoked")

	// accepted_at carried forward
	require.NotNil(t, entry.AcceptedAt)
}

func TestConsentService_Upsert_InitialDecline_StaysDeclined(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	entry, err := svc.Upsert(context.Background(), uuid.New(), uuid.New(), "1.1.1.1", "ua", &service.UpsertConsentRequest{
		ConsentType: domain.ConsentAIRecommendations,
		Status:      domain.ConsentStatusDeclined,
	})
	require.NoError(t, err)
	assert.Equal(t, domain.ConsentStatusDeclined, entry.Status)
	assert.Nil(t, entry.AcceptedAt)
}

func TestConsentService_Upsert_RejectsDeclineOnRequired(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	_, err := svc.Upsert(context.Background(), uuid.New(), uuid.New(), "", "", &service.UpsertConsentRequest{
		ConsentType: domain.ConsentDataProcessing,
		Status:      domain.ConsentStatusDeclined,
	})
	require.Error(t, err, "required consents cannot be declined")
}

func TestConsentService_Upsert_InvalidTypeRejected(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	_, err := svc.Upsert(context.Background(), uuid.New(), uuid.New(), "", "", &service.UpsertConsentRequest{
		ConsentType: domain.ConsentType("marketing"),
		Status:      domain.ConsentStatusGranted,
	})
	require.Error(t, err)
}

func TestConsentService_IsAIAllowed_GrantedOnly(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	tenantID := uuid.New()
	userID := uuid.New()

	// No record → default deny.
	allowed, err := svc.IsAIAllowed(context.Background(), tenantID, userID)
	require.NoError(t, err)
	assert.False(t, allowed)

	// Grant → allowed.
	_, err = svc.Upsert(context.Background(), tenantID, userID, "", "", &service.UpsertConsentRequest{
		ConsentType: domain.ConsentAIRecommendations,
		Status:      domain.ConsentStatusGranted,
	})
	require.NoError(t, err)
	allowed, err = svc.IsAIAllowed(context.Background(), tenantID, userID)
	require.NoError(t, err)
	assert.True(t, allowed)

	// Revoke → not allowed.
	_, err = svc.Upsert(context.Background(), tenantID, userID, "", "", &service.UpsertConsentRequest{
		ConsentType: domain.ConsentAIRecommendations,
		Status:      domain.ConsentStatusDeclined,
	})
	require.NoError(t, err)
	allowed, err = svc.IsAIAllowed(context.Background(), tenantID, userID)
	require.NoError(t, err)
	assert.False(t, allowed, "revoked ai_recommendations blocks ML pipeline")
}

func TestConsentService_GetHistory(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	tenantID := uuid.New()
	userID := uuid.New()

	// 3 transitions: grant → revoke → grant.
	for _, st := range []domain.ConsentStatus{
		domain.ConsentStatusGranted,
		domain.ConsentStatusDeclined,
		domain.ConsentStatusGranted,
	} {
		_, err := svc.Upsert(context.Background(), tenantID, userID, "1.1.1.1", "ua", &service.UpsertConsentRequest{
			ConsentType: domain.ConsentBurnoutMonitoring,
			Status:      st,
		})
		require.NoError(t, err)
	}

	entries, err := svc.GetHistory(context.Background(), tenantID, userID, domain.ConsentBurnoutMonitoring)
	require.NoError(t, err)
	assert.Len(t, entries, 3)
}

func TestConsentService_Upsert_MissingTenant(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	_, err := svc.Upsert(context.Background(), uuid.Nil, uuid.New(), "", "", &service.UpsertConsentRequest{
		ConsentType: domain.ConsentAnalytics,
		Status:      domain.ConsentStatusGranted,
	})
	require.ErrorIs(t, err, domain.ErrMissingTenantID)
}

func TestConsentService_GetHistory_InvalidType(t *testing.T) {
	repo := newFakeConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())

	_, err := svc.GetHistory(context.Background(), uuid.New(), uuid.New(), domain.ConsentType("bogus"))
	require.Error(t, err)
}
