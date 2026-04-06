package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Store is the interface for rate limit counter storage.
type Store interface {
	// Incr atomically increments the counter for the given key within the
	// sliding window and returns the current count.
	Incr(ctx context.Context, key string, windowSec int) (int, error)
}

// RedisStore implements Store using Redis sorted sets (ZSET) for sliding-window
// rate limiting. Each request is stored as a member with its timestamp as score.
// Expired members are pruned atomically using ZREMRANGEBYSCORE.
type RedisStore struct {
	client *redis.Client
}

// NewRedisStore creates a new Redis-backed rate limit store.
func NewRedisStore(client *redis.Client) *RedisStore {
	return &RedisStore{client: client}
}

// slidingWindowScript is a Lua script that atomically:
// 1. Removes entries outside the sliding window
// 2. Adds the current request
// 3. Returns the current count
// 4. Sets TTL on the key
var slidingWindowScript = redis.NewScript(`
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
local min_score = now - window

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', min_score)

-- Add current request
redis.call('ZADD', key, now, member)

-- Set expiry on the key (window + buffer)
redis.call('EXPIRE', key, window + 10)

-- Return current count
return redis.call('ZCARD', key)
`)

// Incr adds the current request to the sliding window and returns the current
// count within the window.
func (s *RedisStore) Incr(ctx context.Context, key string, windowSec int) (int, error) {
	now := time.Now().UnixMicro()
	member := fmt.Sprintf("%d", now)
	window := int64(windowSec) * 1_000_000 // convert to microseconds

	result, err := slidingWindowScript.Run(ctx, s.client, []string{key}, now, window, member).Int()
	if err != nil {
		return 0, fmt.Errorf("rate limit incr: %w", err)
	}

	return result, nil
}
