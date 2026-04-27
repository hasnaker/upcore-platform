package domain_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/audit/internal/domain"
)

func TestConsentCatalog_FiveTypesWithLegalBasis(t *testing.T) {
	cat := domain.ConsentCatalog()
	require.Len(t, cat, 5, "KVKK P1 rıza kataloğu 5 tipten oluşur")

	expected := map[domain.ConsentType]bool{
		domain.ConsentDataProcessing:        true,
		domain.ConsentPerformanceEvaluation: true,
		domain.ConsentBurnoutMonitoring:     true,
		domain.ConsentAnalytics:             true,
		domain.ConsentAIRecommendations:     true,
	}
	for _, e := range cat {
		assert.True(t, expected[e.Type], "catalog contains unknown type %s", e.Type)
		assert.NotEmpty(t, e.TitleTR, "title_tr required for %s", e.Type)
		assert.NotEmpty(t, e.SummaryTR, "summary_tr required for %s", e.Type)
		assert.NotEmpty(t, e.LegalBasis, "legal_basis required for %s", e.Type)
		assert.NotEmpty(t, e.Article, "KVKK article reference required for %s", e.Type)
		assert.Equal(t, domain.ConsentVersion, e.Version)
	}

	// data_processing is the only required entry.
	req := 0
	for _, e := range cat {
		if e.Required {
			req++
		}
	}
	assert.Equal(t, 1, req)

	// ai_recommendations is the only one flagged to block ML.
	blockers := 0
	for _, e := range cat {
		if e.BlocksAI {
			blockers++
			assert.Equal(t, domain.ConsentAIRecommendations, e.Type)
		}
	}
	assert.Equal(t, 1, blockers)
}

func TestConsentType_Valid(t *testing.T) {
	assert.NoError(t, domain.ConsentAnalytics.Valid())
	assert.Error(t, domain.ConsentType("unknown").Valid())
}

func TestConsentStatus_Valid(t *testing.T) {
	assert.NoError(t, domain.ConsentStatusGranted.Valid())
	assert.NoError(t, domain.ConsentStatusDeclined.Valid())
	assert.NoError(t, domain.ConsentStatusRevoked.Valid())
	assert.Error(t, domain.ConsentStatus("paused").Valid())
}

func TestLookupCatalog(t *testing.T) {
	entry, ok := domain.LookupCatalog(domain.ConsentAIRecommendations)
	require.True(t, ok)
	assert.True(t, entry.BlocksAI)

	_, ok = domain.LookupCatalog(domain.ConsentType("bogus"))
	assert.False(t, ok)
}

func TestJSONMap_ScanAndValue(t *testing.T) {
	m := domain.JSONMap{"source": "portal", "locale": "tr-TR"}
	raw, err := m.Value()
	require.NoError(t, err)

	// Value must produce JSON bytes round-trippable to a plain map.
	var out map[string]any
	require.NoError(t, json.Unmarshal(raw.([]byte), &out))
	assert.Equal(t, "portal", out["source"])

	// Scan the bytes back.
	var m2 domain.JSONMap
	require.NoError(t, m2.Scan(raw.([]byte)))
	assert.Equal(t, "tr-TR", m2["locale"])

	// Scan nil → empty map.
	var m3 domain.JSONMap
	require.NoError(t, m3.Scan(nil))
	assert.Empty(t, m3)

	// Scan empty bytes → empty map.
	var m4 domain.JSONMap
	require.NoError(t, m4.Scan([]byte{}))
	assert.Empty(t, m4)

	// Scan garbage bytes → error.
	var m5 domain.JSONMap
	assert.Error(t, m5.Scan([]byte("{not-json")))
}

func TestDataConsent_IsBlocking(t *testing.T) {
	c := &domain.DataConsent{
		ConsentType: domain.ConsentAIRecommendations,
		Status:      domain.ConsentStatusDeclined,
	}
	assert.True(t, c.IsBlocking())

	c.Status = domain.ConsentStatusGranted
	assert.False(t, c.IsBlocking())

	c.Status = domain.ConsentStatusRevoked
	assert.True(t, c.IsBlocking())

	// Other consent types never block ML.
	c.ConsentType = domain.ConsentBurnoutMonitoring
	c.Status = domain.ConsentStatusDeclined
	assert.False(t, c.IsBlocking())

	// nil-safe
	var nilC *domain.DataConsent
	assert.False(t, nilC.IsBlocking())
}
