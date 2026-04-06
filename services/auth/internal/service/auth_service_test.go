package service

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/auth/internal/domain"
)

// --- fakes ---

type fakeUserRepo struct {
	users map[string]*domain.User
}

func newFakeUserRepo() *fakeUserRepo { return &fakeUserRepo{users: map[string]*domain.User{}} }

func (f *fakeUserRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.User, error) {
	for _, u := range f.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, domain.ErrUserNotFound
}
func (f *fakeUserRepo) GetByClerkID(_ context.Context, clerkID string) (*domain.User, error) {
	if u, ok := f.users[clerkID]; ok {
		return u, nil
	}
	return nil, domain.ErrUserNotFound
}
func (f *fakeUserRepo) GetByEmail(_ context.Context, _ uuid.UUID, email string) (*domain.User, error) {
	for _, u := range f.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, domain.ErrUserNotFound
}
func (f *fakeUserRepo) Create(_ context.Context, u *domain.User) error {
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now()
	}
	u.UpdatedAt = time.Now()
	f.users[u.ClerkID] = u
	return nil
}
func (f *fakeUserRepo) Update(_ context.Context, u *domain.User) error {
	u.UpdatedAt = time.Now()
	f.users[u.ClerkID] = u
	return nil
}
func (f *fakeUserRepo) SoftDelete(_ context.Context, id uuid.UUID) error {
	for k, u := range f.users {
		if u.ID == id {
			delete(f.users, k)
			return nil
		}
	}
	return domain.ErrUserNotFound
}

type fakeRoleRepo struct {
	roles       map[string]*domain.Role
	assignments []struct{ userID, roleID uuid.UUID }
}

func newFakeRoleRepo() *fakeRoleRepo {
	return &fakeRoleRepo{
		roles: map[string]*domain.Role{
			domain.RoleEmployee: {ID: uuid.New(), Name: domain.RoleEmployee, IsSystem: true},
		},
	}
}
func (f *fakeRoleRepo) GetByName(_ context.Context, _ uuid.UUID, name string) (*domain.Role, error) {
	if r, ok := f.roles[name]; ok {
		return r, nil
	}
	return nil, domain.ErrRoleNotFound
}
func (f *fakeRoleRepo) AssignToUser(_ context.Context, userID, roleID, _, _ uuid.UUID) error {
	f.assignments = append(f.assignments, struct{ userID, roleID uuid.UUID }{userID, roleID})
	return nil
}
func (f *fakeRoleRepo) GetUserRoles(_ context.Context, userID uuid.UUID) ([]*domain.Role, error) {
	var out []*domain.Role
	for _, a := range f.assignments {
		if a.userID == userID {
			for _, r := range f.roles {
				if r.ID == a.roleID {
					out = append(out, r)
				}
			}
		}
	}
	return out, nil
}

type fakeSessions struct{ revoked []uuid.UUID }

func (f *fakeSessions) RevokeAllForUser(_ context.Context, userID uuid.UUID, _ string) (int64, error) {
	f.revoked = append(f.revoked, userID)
	return 1, nil
}

type fakePublisher struct{ events []string }

func (f *fakePublisher) Publish(_ context.Context, topic string, _ any) error {
	f.events = append(f.events, topic)
	return nil
}

// --- tests ---

func TestAuthService_UpsertCreatesUser(t *testing.T) {
	users := newFakeUserRepo()
	roles := newFakeRoleRepo()
	sessions := &fakeSessions{}
	pub := &fakePublisher{}
	svc := NewAuthService(users, roles, sessions, pub)

	tenantID := uuid.New()
	u, err := svc.UpsertFromClerk(
		context.Background(),
		"usr_abc", tenantID, "jane@example.com", "Jane", "Doe", "tr-TR", json.RawMessage(`{}`),
	)
	require.NoError(t, err)
	assert.Equal(t, "jane@example.com", u.Email)
	assert.Equal(t, domain.UserStatusActive, u.Status)
	assert.Len(t, roles.assignments, 1, "default employee role assigned")
	assert.Contains(t, pub.events, "auth.user.created.v1")
}

func TestAuthService_UpsertUpdatesExisting(t *testing.T) {
	users := newFakeUserRepo()
	roles := newFakeRoleRepo()
	svc := NewAuthService(users, roles, nil, nil)

	tenantID := uuid.New()
	_, err := svc.UpsertFromClerk(
		context.Background(), "usr_abc", tenantID, "jane@example.com", "Jane", "Doe", "tr-TR", nil,
	)
	require.NoError(t, err)
	u, err := svc.UpsertFromClerk(
		context.Background(), "usr_abc", tenantID, "jane.doe@example.com", "Jane", "Doe", "", nil,
	)
	require.NoError(t, err)
	assert.Equal(t, "jane.doe@example.com", u.Email)
	// Only one creation event => role assignment happened only once
	assert.Len(t, roles.assignments, 1)
}

func TestAuthService_DeleteByClerkID(t *testing.T) {
	users := newFakeUserRepo()
	roles := newFakeRoleRepo()
	sessions := &fakeSessions{}
	pub := &fakePublisher{}
	svc := NewAuthService(users, roles, sessions, pub)

	tenantID := uuid.New()
	_, err := svc.UpsertFromClerk(context.Background(), "usr_1", tenantID, "a@b.com", "A", "B", "tr-TR", nil)
	require.NoError(t, err)

	err = svc.DeleteByClerkID(context.Background(), "usr_1")
	require.NoError(t, err)
	assert.Len(t, sessions.revoked, 1)
	assert.Contains(t, pub.events, "auth.user.deleted.v1")

	// Idempotent
	err = svc.DeleteByClerkID(context.Background(), "usr_1")
	assert.NoError(t, err)
}

func TestAuthService_GetProfile(t *testing.T) {
	users := newFakeUserRepo()
	roles := newFakeRoleRepo()
	svc := NewAuthService(users, roles, nil, nil)

	tenantID := uuid.New()
	u, err := svc.UpsertFromClerk(context.Background(), "usr_x", tenantID, "x@y.com", "X", "Y", "", nil)
	require.NoError(t, err)

	p, err := svc.GetProfile(context.Background(), u.ID)
	require.NoError(t, err)
	assert.Equal(t, u.ID, p.User.ID)
	assert.Contains(t, p.Roles, domain.RoleEmployee)
}

func TestAuthService_HandleSessionRevoked(t *testing.T) {
	users := newFakeUserRepo()
	roles := newFakeRoleRepo()
	sessions := &fakeSessions{}
	pub := &fakePublisher{}
	svc := NewAuthService(users, roles, sessions, pub)

	tenantID := uuid.New()
	_, err := svc.UpsertFromClerk(context.Background(), "usr_s", tenantID, "s@s.com", "S", "", "", nil)
	require.NoError(t, err)

	err = svc.HandleSessionRevoked(context.Background(), "sess_1", "usr_s")
	require.NoError(t, err)
	assert.Len(t, sessions.revoked, 1)
	assert.Contains(t, pub.events, "auth.session.revoked.v1")
}

func TestSessionService_CreateRotate(t *testing.T) {
	repo := &inMemorySessions{sessions: map[uuid.UUID]*domain.Session{}, byHash: map[string]*domain.Session{}}
	svc := NewSessionService(repo, time.Hour)
	ctx := context.Background()
	userID, tenantID := uuid.New(), uuid.New()

	sess, token, err := svc.Create(ctx, userID, tenantID, "ua", "ip")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.Equal(t, userID, sess.UserID)

	// rotate
	newSess, newToken, err := svc.Rotate(ctx, token, "ua", "ip")
	require.NoError(t, err)
	assert.NotEqual(t, sess.ID, newSess.ID)
	assert.NotEqual(t, token, newToken)

	// cannot reuse old token
	_, _, err = svc.Rotate(ctx, token, "ua", "ip")
	assert.Error(t, err)
}

type inMemorySessions struct {
	sessions map[uuid.UUID]*domain.Session
	byHash   map[string]*domain.Session
}

func (i *inMemorySessions) Create(_ context.Context, s *domain.Session) error {
	i.sessions[s.ID] = s
	i.byHash[s.RefreshTokenHash] = s
	return nil
}
func (i *inMemorySessions) GetByID(_ context.Context, id uuid.UUID) (*domain.Session, error) {
	if s, ok := i.sessions[id]; ok {
		return s, nil
	}
	return nil, domain.ErrSessionNotFound
}
func (i *inMemorySessions) GetByTokenHash(_ context.Context, h string) (*domain.Session, error) {
	if s, ok := i.byHash[h]; ok {
		return s, nil
	}
	return nil, domain.ErrSessionNotFound
}
func (i *inMemorySessions) ListByUser(_ context.Context, userID uuid.UUID) ([]*domain.Session, error) {
	var out []*domain.Session
	for _, s := range i.sessions {
		if s.UserID == userID && s.IsValid() {
			out = append(out, s)
		}
	}
	return out, nil
}
func (i *inMemorySessions) Revoke(_ context.Context, id uuid.UUID, reason string) error {
	s, ok := i.sessions[id]
	if !ok {
		return domain.ErrSessionNotFound
	}
	now := time.Now()
	s.RevokedAt = &now
	s.RevokeReason = &reason
	return nil
}
func (i *inMemorySessions) RevokeAllForUser(_ context.Context, userID uuid.UUID, reason string) (int64, error) {
	var n int64
	for _, s := range i.sessions {
		if s.UserID == userID && s.RevokedAt == nil {
			now := time.Now()
			s.RevokedAt = &now
			s.RevokeReason = &reason
			n++
		}
	}
	return n, nil
}
func (i *inMemorySessions) DeleteExpired(_ context.Context) (int64, error) { return 0, nil }
