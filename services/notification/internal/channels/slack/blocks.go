package slack

// Block Kit primitives. Slack deprecated the legacy "attachments" surface;
// all outbound messages built by UpCore use Block Kit only.

// Block is the base interface implemented by every Block Kit element that can
// appear in a chat.postMessage `blocks` array.
type Block interface {
	blockType() string
}

// Text is the shared text object used by section, header, context, etc.
type Text struct {
	Type     string `json:"type"`     // "plain_text" or "mrkdwn"
	Text     string `json:"text"`
	Emoji    bool   `json:"emoji,omitempty"`
	Verbatim bool   `json:"verbatim,omitempty"`
}

// PlainText builds a plain_text text object (emoji enabled by default).
func PlainText(s string) *Text {
	return &Text{Type: "plain_text", Text: s, Emoji: true}
}

// Mrkdwn builds a mrkdwn text object.
func Mrkdwn(s string) *Text {
	return &Text{Type: "mrkdwn", Text: s}
}

// SectionBlock is a block of text optionally with an accessory element.
type SectionBlock struct {
	Type      string   `json:"type"`
	Text      *Text    `json:"text,omitempty"`
	Fields    []*Text  `json:"fields,omitempty"`
	Accessory any      `json:"accessory,omitempty"`
	BlockID   string   `json:"block_id,omitempty"`
}

func (SectionBlock) blockType() string { return "section" }

// NewSection returns a section with mrkdwn text.
func NewSection(md string) *SectionBlock {
	return &SectionBlock{Type: "section", Text: Mrkdwn(md)}
}

// HeaderBlock is a plain_text header (bold, large).
type HeaderBlock struct {
	Type string `json:"type"`
	Text *Text  `json:"text"`
}

func (HeaderBlock) blockType() string { return "header" }

// NewHeader returns a header block.
func NewHeader(s string) *HeaderBlock {
	return &HeaderBlock{Type: "header", Text: PlainText(s)}
}

// DividerBlock renders a visual divider.
type DividerBlock struct {
	Type string `json:"type"`
}

func (DividerBlock) blockType() string { return "divider" }

// NewDivider returns a divider block.
func NewDivider() *DividerBlock {
	return &DividerBlock{Type: "divider"}
}

// ContextBlock is a row of small elements (e.g., source attribution).
type ContextBlock struct {
	Type     string `json:"type"`
	Elements []any  `json:"elements"`
}

func (ContextBlock) blockType() string { return "context" }

// NewContext builds a context block from text elements.
func NewContext(elements ...*Text) *ContextBlock {
	els := make([]any, 0, len(elements))
	for _, e := range elements {
		els = append(els, e)
	}
	return &ContextBlock{Type: "context", Elements: els}
}

// ActionsBlock contains up to 25 interactive elements (buttons, selects).
type ActionsBlock struct {
	Type     string `json:"type"`
	Elements []any  `json:"elements"`
	BlockID  string `json:"block_id,omitempty"`
}

func (ActionsBlock) blockType() string { return "actions" }

// NewActions builds an actions row.
func NewActions(id string, elements ...any) *ActionsBlock {
	return &ActionsBlock{Type: "actions", BlockID: id, Elements: elements}
}

// Button is an interactive button element.
type Button struct {
	Type     string `json:"type"`
	Text     *Text  `json:"text"`
	Value    string `json:"value,omitempty"`
	URL      string `json:"url,omitempty"`
	Style    string `json:"style,omitempty"`    // primary, danger
	ActionID string `json:"action_id,omitempty"`
}

// NewLinkButton returns a link-style button (opens URL, no interaction event).
func NewLinkButton(label, urlStr string) *Button {
	return &Button{Type: "button", Text: PlainText(label), URL: urlStr}
}

// NewPrimaryButton returns a primary-styled button that fires an action.
func NewPrimaryButton(label, actionID, value string) *Button {
	return &Button{Type: "button", Text: PlainText(label), ActionID: actionID, Value: value, Style: "primary"}
}

// Message is the top-level chat.postMessage / webhook payload shape.
type Message struct {
	Channel     string  `json:"channel,omitempty"`
	Text        string  `json:"text"`                   // plain-text fallback for notifications + accessibility
	Blocks      []Block `json:"blocks,omitempty"`
	ThreadTS    string  `json:"thread_ts,omitempty"`
	UnfurlLinks bool    `json:"unfurl_links,omitempty"`
	Mrkdwn      bool    `json:"mrkdwn,omitempty"`
}

// WelcomeMessage builds the "tenant.user.invited" DM.
func WelcomeMessage(firstName, companyName, loginURL string) *Message {
	if firstName == "" {
		firstName = "Merhaba"
	}
	return &Message{
		Text: firstName + ", UpCore'a hoş geldin! " + companyName,
		Blocks: []Block{
			NewHeader("UpCore'a Hoş Geldin " + emojiWave()),
			NewSection("*" + firstName + "*, *" + companyName + "* UpCore hesabın hazır. Aşağıdaki linkten giriş yapabilir, pulse anketlerine katılabilirsin."),
			NewActions("welcome_actions", NewLinkButton("UpCore'a Git", loginURL)),
			NewContext(Mrkdwn("_UpCore · bilim-temelli İK platformu_")),
		},
	}
}

// InterventionDM builds a consent-respecting DM for intervention assignment.
// This is ONLY sent when the tenant has opted in (KVKK compliance).
func InterventionDM(interventionType, description, consentURL string) *Message {
	return &Message{
		Text: "UpCore Koruma: önerilen müdahale — " + interventionType,
		Blocks: []Block{
			NewHeader("UpCore Koruma · Yeni Öneri"),
			NewSection("*Önerilen müdahale:* " + interventionType + "\n" + description),
			NewSection("Katılım tamamen isteğe bağlıdır. Onam vermeden herhangi bir veri paylaşılmaz."),
			NewActions("intervention_actions", NewLinkButton("Onay Ekranına Git", consentURL)),
			NewContext(Mrkdwn("_KVKK Madde 6 — açık rıza · istediğin zaman geri çekebilirsin._")),
		},
	}
}

// PulseReminder builds the weekly pulse reminder for a channel or DM.
func PulseReminder(pulseTitle, pulseURL string, dueISO string) *Message {
	return &Message{
		Text: "UpCore pulse: " + pulseTitle,
		Blocks: []Block{
			NewHeader(pulseTitle),
			NewSection("Bu haftanın pulse anketi hazır. 2 dakikanı alacak."),
			NewContext(Mrkdwn("Son tarih: *" + dueISO + "*")),
			NewActions("pulse_actions", NewLinkButton("Pulse'a Katıl", pulseURL)),
		},
	}
}

// PlainDM builds a simple text + single section Block Kit message.
func PlainDM(title, body string) *Message {
	return &Message{
		Text: title + " — " + body,
		Blocks: []Block{
			NewHeader(title),
			NewSection(body),
		},
	}
}

// FeedbackSentConfirmation builds the ephemeral confirmation for /upcore-feedback.
func FeedbackSentConfirmation(targetDisplay string) *Message {
	return &Message{
		Text: "Geri bildirim iletildi.",
		Blocks: []Block{
			NewSection(":white_check_mark: Geri bildirimin *" + targetDisplay + "* kişisine iletildi. Anonim paylaşıldı, teşekkürler!"),
			NewContext(Mrkdwn("_UpCore · sürekli geri bildirim · veriler tenant'ına özeldir._")),
		},
	}
}

func emojiWave() string { return ":wave:" }
