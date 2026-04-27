package teams

// Adaptive Card 1.5 builders. Microsoft Teams renders Adaptive Cards inline
// inside activities. These helpers target two primary scenarios:
//
//   - Intervention consent card (KVKK explicit opt-in)
//   - Weekly pulse reminder card (1-click link-out)
//
// Spec: https://adaptivecards.io/explorer/ (v1.5)

// Envelope is an Adaptive Card attachment wrapped in a Bot Framework activity.
type Envelope struct {
	Type         string       `json:"type"`         // "message"
	Text         string       `json:"text,omitempty"`
	Attachments  []Attachment `json:"attachments"`
	Summary      string       `json:"summary,omitempty"`
	TextFormat   string       `json:"textFormat,omitempty"`
	AttachLayout string       `json:"attachmentLayout,omitempty"`
}

// Attachment wraps an adaptive card in the Bot Framework attachment shape.
type Attachment struct {
	ContentType string `json:"contentType"` // application/vnd.microsoft.card.adaptive
	Content     any    `json:"content"`
}

// AdaptiveCard is the top-level Adaptive Card 1.5 document.
type AdaptiveCard struct {
	Schema   string `json:"$schema"`
	Type     string `json:"type"`
	Version  string `json:"version"`
	Body     []any  `json:"body"`
	Actions  []any  `json:"actions,omitempty"`
	Speak    string `json:"speak,omitempty"`
	Lang     string `json:"lang,omitempty"`
}

// NewAdaptiveCard returns an empty Adaptive Card 1.5 shell.
func NewAdaptiveCard() *AdaptiveCard {
	return &AdaptiveCard{
		Schema:  "http://adaptivecards.io/schemas/adaptive-card.json",
		Type:    "AdaptiveCard",
		Version: "1.5",
		Lang:    "tr-TR",
	}
}

// TextBlock is an Adaptive Card TextBlock element.
type TextBlock struct {
	Type   string `json:"type"`
	Text   string `json:"text"`
	Size   string `json:"size,omitempty"`
	Weight string `json:"weight,omitempty"`
	Color  string `json:"color,omitempty"`
	Wrap   bool   `json:"wrap,omitempty"`
	Spacing string `json:"spacing,omitempty"`
}

// Title, Subtitle, Body helpers for consistent typography.
func Title(s string) TextBlock    { return TextBlock{Type: "TextBlock", Text: s, Size: "Large", Weight: "Bolder", Wrap: true} }
func Subtitle(s string) TextBlock { return TextBlock{Type: "TextBlock", Text: s, Size: "Medium", Weight: "Bolder", Wrap: true} }
func Body(s string) TextBlock     { return TextBlock{Type: "TextBlock", Text: s, Wrap: true} }
func Caption(s string) TextBlock  { return TextBlock{Type: "TextBlock", Text: s, Size: "Small", Color: "Accent", Wrap: true} }

// OpenURLAction creates an Action.OpenUrl.
func OpenURLAction(title, href string) map[string]any {
	return map[string]any{
		"type":  "Action.OpenUrl",
		"title": title,
		"url":   href,
	}
}

// SubmitAction creates an Action.Submit with data payload.
func SubmitAction(title string, data map[string]any) map[string]any {
	return map[string]any{
		"type":  "Action.Submit",
		"title": title,
		"data":  data,
	}
}

// InterventionConsentCard builds the KVKK intervention consent adaptive card.
//
// kvkkURL points to the KVKK portal disclosure page; acceptURL / declineURL
// are magic-link endpoints on the intervention service that record consent.
func InterventionConsentCard(employeeName, interventionTitle, description, kvkkURL, acceptURL, declineURL string) Envelope {
	card := NewAdaptiveCard()
	card.Body = []any{
		Title("UpCore · Müdahale Önerisi"),
		Body("Merhaba " + employeeName + ", iyilik durumunu iyileştirmek üzere size önerilen bir müdahale var."),
		Subtitle(interventionTitle),
		Body(description),
		TextBlock{Type: "TextBlock", Text: "Bu müdahaleye katılımınız **tamamen gönüllüdür**. Dilediğiniz zaman onayınızı geri çekebilirsiniz.", Wrap: true, Color: "Attention"},
		map[string]any{
			"type": "TextBlock",
			"text": "[KVKK Aydınlatma Metni](" + kvkkURL + ")",
			"wrap": true,
		},
	}
	card.Actions = []any{
		OpenURLAction("Onaylıyorum", acceptURL),
		OpenURLAction("Reddediyorum", declineURL),
	}
	return Envelope{
		Type:        "message",
		Summary:     "UpCore müdahale önerisi",
		Attachments: []Attachment{{ContentType: "application/vnd.microsoft.card.adaptive", Content: card}},
	}
}

// PulseReminderCard builds the weekly pulse reminder card.
func PulseReminderCard(surveyTitle, surveyURL string, dueInDays int) Envelope {
	card := NewAdaptiveCard()
	card.Body = []any{
		Title("Haftalık Pulse Anketi"),
		Body("Bu haftaki kısa anketinizi doldurmayı unutmayın."),
		Subtitle(surveyTitle),
		Caption("Son tarih: " + pluralDays(dueInDays)),
	}
	card.Actions = []any{
		OpenURLAction("Anketi Aç", surveyURL),
	}
	return Envelope{
		Type:        "message",
		Summary:     "UpCore pulse hatırlatıcı",
		Attachments: []Attachment{{ContentType: "application/vnd.microsoft.card.adaptive", Content: card}},
	}
}

func pluralDays(n int) string {
	if n <= 0 {
		return "bugün"
	}
	if n == 1 {
		return "yarın"
	}
	return itoa(n) + " gün"
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	neg := n < 0
	if neg {
		n = -n
	}
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}
