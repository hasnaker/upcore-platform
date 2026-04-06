package event

import (
	"context"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInMemoryPublisher_Publish(t *testing.T) {
	pub := NewInMemoryPublisher()

	err := pub.Publish(context.Background(), TopicAssessmentCreated, map[string]string{"key": "value"})
	require.NoError(t, err)

	assert.Equal(t, 1, pub.Count(TopicAssessmentCreated))
	assert.Equal(t, 0, pub.Count(TopicAssessmentCompleted))
}

func TestInMemoryPublisher_MultipleTopics(t *testing.T) {
	pub := NewInMemoryPublisher()

	_ = pub.Publish(context.Background(), TopicAssessmentCreated, nil)
	_ = pub.Publish(context.Background(), TopicAssessmentStarted, nil)
	_ = pub.Publish(context.Background(), TopicAssessmentCompleted, nil)
	_ = pub.Publish(context.Background(), TopicAssessmentCreated, nil)

	assert.Equal(t, 2, pub.Count(TopicAssessmentCreated))
	assert.Equal(t, 1, pub.Count(TopicAssessmentStarted))
	assert.Equal(t, 1, pub.Count(TopicAssessmentCompleted))
}

func TestInMemoryPublisher_Snapshot(t *testing.T) {
	pub := NewInMemoryPublisher()

	_ = pub.Publish(context.Background(), TopicAssessmentCreated, map[string]string{"id": "123"})
	snap := pub.Snapshot()
	assert.Len(t, snap, 1)
	assert.Equal(t, TopicAssessmentCreated, snap[0].EventType)
	assert.Equal(t, "assessment", snap[0].ServiceName)
}

func TestNopPublisher_Publish(t *testing.T) {
	pub := NewNopPublisher(zerolog.Nop())
	err := pub.Publish(context.Background(), TopicAssessmentCreated, map[string]string{"key": "value"})
	require.NoError(t, err)
}

func TestNopPublisher_Close(t *testing.T) {
	pub := NewNopPublisher(zerolog.Nop())
	assert.NoError(t, pub.Close())
}

func TestInMemoryPublisher_Close(t *testing.T) {
	pub := NewInMemoryPublisher()
	assert.NoError(t, pub.Close())
}
