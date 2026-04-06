package scoring

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHTTPClient_Score_Success(t *testing.T) {
	expected := ScoreResponse{
		AssessmentID: uuid.New(),
		Scales: []ScaleScore{
			{ScaleCode: "burnout", ScaleName: "Burnout", RawScore: 25.5},
		},
		ScoredAt: time.Now().UTC(),
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/api/v1/score/bat", r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		var req ScoreRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		require.NoError(t, err)
		assert.Equal(t, "BAT-12-TR", req.InstrumentCode)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(expected)
	}))
	defer srv.Close()

	log := zerolog.Nop()
	client := NewHTTPClient(srv.URL, 5*time.Second, log)

	resp, err := client.Score(context.Background(), ScoreRequest{
		AssessmentID:   expected.AssessmentID,
		TenantID:       uuid.New(),
		InstrumentCode: "BAT-12-TR",
		Responses: []ResponseItem{
			{ItemCode: "bat_1", ItemIndex: 0, ResponseValue: 3, TimeSpentSeconds: 5.0},
		},
	})

	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, expected.AssessmentID, resp.AssessmentID)
	assert.Len(t, resp.Scales, 1)
	assert.Equal(t, "burnout", resp.Scales[0].ScaleCode)
}

func TestHTTPClient_Score_ServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	log := zerolog.Nop()
	client := NewHTTPClient(srv.URL, 5*time.Second, log)

	_, err := client.Score(context.Background(), ScoreRequest{
		AssessmentID:   uuid.New(),
		InstrumentCode: "BAT-12-TR",
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "status 500")
}

func TestHTTPClient_Score_UnknownInstrument(t *testing.T) {
	log := zerolog.Nop()
	client := NewHTTPClient("http://localhost:9999", 5*time.Second, log)

	_, err := client.Score(context.Background(), ScoreRequest{
		AssessmentID:   uuid.New(),
		InstrumentCode: "UNKNOWN",
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "no scoring endpoint")
}

func TestNopClient_Score(t *testing.T) {
	log := zerolog.Nop()
	client := NewNopClient(log)

	resp, err := client.Score(context.Background(), ScoreRequest{
		AssessmentID:   uuid.New(),
		InstrumentCode: "BAT-12-TR",
	})

	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Len(t, resp.Scales, 1)
	assert.Equal(t, "total", resp.Scales[0].ScaleCode)
}
