package cv

import (
	"regexp"
	"strconv"
	"strings"
)

// CVFields holds structured data extracted from raw CV text.
type CVFields struct {
	Name            string   `json:"name,omitempty"`
	Email           string   `json:"email,omitempty"`
	Phone           string   `json:"phone,omitempty"`
	Skills          []string `json:"skills,omitempty"`
	ExperienceYears int      `json:"experience_years,omitempty"`
}

var (
	emailRe    = regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	phoneRe    = regexp.MustCompile(`(?:\+90|0)[\s\-]?(?:\d[\s\-]?){9,10}`)
	yearsExpRe = regexp.MustCompile(`(\d{1,2})\s*(?:years?|yil|yıl)\s*(?:experience|deneyim)?`)
)

// Common tech skills to look for.
var knownSkills = []string{
	"Go", "Golang", "Python", "Java", "JavaScript", "TypeScript",
	"React", "Angular", "Vue", "Node.js", "Docker", "Kubernetes",
	"AWS", "Azure", "GCP", "PostgreSQL", "MySQL", "MongoDB",
	"Redis", "Kafka", "RabbitMQ", "GraphQL", "REST",
	"CI/CD", "Git", "Linux", "Terraform", "Ansible",
	"C#", ".NET", "PHP", "Ruby", "Rust", "Scala", "Kotlin", "Swift",
	"Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
	"SQL", "NoSQL", "HTML", "CSS", "SASS", "Webpack",
	"Agile", "Scrum", "Jira", "Confluence",
}

// ExtractFields extracts structured data from raw CV text using regex/NER.
func ExtractFields(text string) (*CVFields, error) {
	fields := &CVFields{}

	// Extract email.
	if match := emailRe.FindString(text); match != "" {
		fields.Email = strings.ToLower(match)
	}

	// Extract phone.
	if match := phoneRe.FindString(text); match != "" {
		fields.Phone = normalizePhone(match)
	}

	// Extract skills.
	fields.Skills = ExtractSkills(text)

	// Extract experience years.
	fields.ExperienceYears = ExtractExperienceYears(text)

	// Try to extract name from first non-empty line.
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && len(line) < 100 && !emailRe.MatchString(line) && !phoneRe.MatchString(line) {
			fields.Name = line
			break
		}
	}

	return fields, nil
}

// ExtractSkills scans the text for known technical skills.
func ExtractSkills(text string) []string {
	lower := strings.ToLower(text)
	found := make([]string, 0, 8)
	seen := make(map[string]bool, 16)
	for _, skill := range knownSkills {
		if strings.Contains(lower, strings.ToLower(skill)) && !seen[skill] {
			found = append(found, skill)
			seen[skill] = true
		}
	}
	return found
}

// ExtractExperienceYears extracts years of experience from CV text.
func ExtractExperienceYears(text string) int {
	lower := strings.ToLower(text)
	matches := yearsExpRe.FindAllStringSubmatch(lower, -1)
	maxYears := 0
	for _, m := range matches {
		if len(m) >= 2 {
			if y, err := strconv.Atoi(m[1]); err == nil && y > maxYears && y <= 50 {
				maxYears = y
			}
		}
	}
	return maxYears
}

func normalizePhone(phone string) string {
	var digits strings.Builder
	digits.WriteString("+90")
	for _, c := range phone {
		if c >= '0' && c <= '9' {
			digits.WriteRune(c)
		}
	}
	s := digits.String()
	// Remove leading country code duplication.
	if strings.HasPrefix(s, "+900") {
		s = "+90" + s[4:]
	}
	if strings.HasPrefix(s, "+9090") {
		s = "+90" + s[5:]
	}
	return s
}
