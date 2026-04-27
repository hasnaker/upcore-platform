package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// CandidateToken mirrors app.candidate_tokens — short-lived magic-link token.
type CandidateToken struct {
	Token       string     `db:"token" json:"token"`
	TenantID    uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	CandidateID uuid.UUID  `db:"candidate_id" json:"candidate_id"`
	Purpose     string     `db:"purpose" json:"purpose"`
	ExpiresAt   time.Time  `db:"expires_at" json:"expires_at"`
	ConsumedAt  *time.Time `db:"consumed_at" json:"consumed_at,omitempty"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
}

// CandidateTokenRepository issues + verifies magic-link tokens.
type CandidateTokenRepository interface {
	Issue(ctx context.Context, tenantID, candidateID uuid.UUID, purpose string, ttl time.Duration) (*CandidateToken, error)
	Resolve(ctx context.Context, token string) (*CandidateToken, error)
	Consume(ctx context.Context, token string) error
	ExpireAll(ctx context.Context, tenantID, candidateID uuid.UUID) error
}

type candidateTokenRepo struct{ db *sqlx.DB }

// NewCandidateTokenRepository constructs.
func NewCandidateTokenRepository(d *sqlx.DB) CandidateTokenRepository {
	return &candidateTokenRepo{db: d}
}

// Issue generates a 40-byte random hex token and stores it with a TTL.
// purpose: portal | offer_accept | interview_join.
func (r *candidateTokenRepo) Issue(ctx context.Context, tenantID, candidateID uuid.UUID, purpose string, ttl time.Duration) (*CandidateToken, error) {
	if ttl <= 0 {
		ttl = 14 * 24 * time.Hour
	}
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return nil, err
	}
	token := "upc_" + hex.EncodeToString(buf)
	t := &CandidateToken{
		Token: token, TenantID: tenantID, CandidateID: candidateID,
		Purpose: purpose, ExpiresAt: time.Now().UTC().Add(ttl),
	}
	if _, err := r.db.ExecContext(ctx,
		`INSERT INTO app.candidate_tokens (token, tenant_id, candidate_id, purpose, expires_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		t.Token, t.TenantID, t.CandidateID, t.Purpose, t.ExpiresAt); err != nil {
		return nil, fmt.Errorf("insert candidate token: %w", err)
	}
	return t, nil
}

// Resolve returns the token row if it's valid (not expired, not consumed).
// Does NOT apply tenant RLS — magic-link callers have no session.
func (r *candidateTokenRepo) Resolve(ctx context.Context, token string) (*CandidateToken, error) {
	var t CandidateToken
	err := r.db.GetContext(ctx, &t,
		`SELECT token, tenant_id, candidate_id, purpose, expires_at, consumed_at, created_at
		 FROM app.candidate_tokens
		 WHERE token = $1 AND expires_at > NOW() AND consumed_at IS NULL`,
		token)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("invalid or expired token")
		}
		return nil, err
	}
	return &t, nil
}

// Consume marks the token as used (for purposes that are single-use, e.g.
// offer_accept). portal-purpose tokens stay usable until expires_at.
func (r *candidateTokenRepo) Consume(ctx context.Context, token string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE app.candidate_tokens SET consumed_at=NOW()
		 WHERE token=$1 AND consumed_at IS NULL`, token)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("token already consumed or not found")
	}
	return nil
}

// ExpireAll revokes all outstanding tokens for a candidate.
func (r *candidateTokenRepo) ExpireAll(ctx context.Context, tenantID, candidateID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE app.candidate_tokens SET expires_at = NOW()
		 WHERE tenant_id=$1 AND candidate_id=$2 AND expires_at > NOW()`,
		tenantID, candidateID)
	return err
}
