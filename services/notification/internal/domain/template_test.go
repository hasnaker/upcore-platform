package domain

import (
	"strings"
	"testing"
)

// TestTemplateValidate_RequiresKey asserts the template_key field.
func TestTemplateValidate_RequiresKey(t *testing.T) {
	tpl := &Template{
		Key:     "",
		Channel: ChannelEmail,
		Locale:  "tr-TR",
		Body:    "Merhaba {{.Name}}",
	}
	err := tpl.Validate()
	if err == nil || !strings.Contains(err.Error(), "template_key") {
		t.Fatalf("expected template_key error, got %v", err)
	}
}

// TestTemplateValidate_RequiresBody asserts the body field cannot be blank.
func TestTemplateValidate_RequiresBody(t *testing.T) {
	tpl := &Template{
		Key:     "welcome",
		Channel: ChannelEmail,
		Locale:  "tr-TR",
		Body:    "",
	}
	if err := tpl.Validate(); err == nil {
		t.Fatal("expected body error")
	}
}

// TestTemplateValidate_HappyPath should not return an error for a well-formed template.
func TestTemplateValidate_HappyPath(t *testing.T) {
	subj := "Hosgeldiniz"
	tpl := &Template{
		Key:     "welcome",
		Channel: ChannelEmail,
		Locale:  "tr-TR",
		Subject: &subj,
		Body:    "Merhaba {{.Name}}, UpCore'a hos geldiniz.",
	}
	if err := tpl.Validate(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
