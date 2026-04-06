package cv

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExtractSkills(t *testing.T) {
	text := `
	I have 5 years of experience with Go, Docker, Kubernetes and PostgreSQL.
	Also proficient in React, TypeScript and AWS.
	`
	skills := ExtractSkills(text)
	assert.Contains(t, skills, "Go")
	assert.Contains(t, skills, "Docker")
	assert.Contains(t, skills, "Kubernetes")
	assert.Contains(t, skills, "PostgreSQL")
	assert.Contains(t, skills, "React")
	assert.Contains(t, skills, "TypeScript")
	assert.Contains(t, skills, "AWS")
}

func TestExtractExperienceYears(t *testing.T) {
	tests := []struct {
		text     string
		expected int
	}{
		{"5 years experience in software development", 5},
		{"10 yil deneyim", 10},
		{"3 years of experience", 3},
		{"no experience mentioned", 0},
		{"15 years experience and 3 years managing", 15},
	}
	for _, tc := range tests {
		name := tc.text; if len(name) > 20 { name = name[:20] }
		t.Run(name, func(t *testing.T) {
			result := ExtractExperienceYears(tc.text)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestExtractFields(t *testing.T) {
	text := `Ayse Yilmaz
ayse@example.com
+90 555 123 4567

Senior Go Developer with 7 years experience.
Skills: Go, Docker, Kubernetes, PostgreSQL, AWS
`
	fields, err := ExtractFields(text)
	require.NoError(t, err)
	assert.Equal(t, "Ayse Yilmaz", fields.Name)
	assert.Equal(t, "ayse@example.com", fields.Email)
	assert.NotEmpty(t, fields.Phone)
	assert.Equal(t, 7, fields.ExperienceYears)
	assert.Contains(t, fields.Skills, "Go")
	assert.Contains(t, fields.Skills, "Docker")
}

func TestExtractFields_EmptyText(t *testing.T) {
	fields, err := ExtractFields("")
	require.NoError(t, err)
	assert.Empty(t, fields.Email)
	assert.Empty(t, fields.Skills)
	assert.Equal(t, 0, fields.ExperienceYears)
}
