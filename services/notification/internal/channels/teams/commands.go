package teams

import (
	"strings"
)

// Slash command router. Microsoft Teams messaging extensions and @mentions
// deliver "messageType": "message" activities whose `text` is the raw chat
// content. We strip the bot mention and match the remaining verb.
//
// Supported:
//   - pulse         → return pulse survey link for the mentioning user
//   - feedback      → open a feedback modal (Action.ShowCard adaptive card)
//   - help          → list supported commands
//   - anything else → polite fallback

// Command is the parsed slash verb.
type Command string

// Known commands.
const (
	CmdPulse    Command = "pulse"
	CmdFeedback Command = "feedback"
	CmdHelp     Command = "help"
	CmdUnknown  Command = ""
)

// ParseCommand strips the bot mention and returns the first verb token.
func ParseCommand(text string) (Command, string) {
	s := stripMentions(text)
	s = strings.TrimSpace(s)
	if s == "" {
		return CmdUnknown, ""
	}
	parts := strings.Fields(s)
	verb := strings.ToLower(parts[0])
	rest := ""
	if len(parts) > 1 {
		rest = strings.Join(parts[1:], " ")
	}
	switch verb {
	case "pulse", "pulse'um", "/pulse":
		return CmdPulse, rest
	case "feedback", "geribildirim", "/feedback":
		return CmdFeedback, rest
	case "help", "yardım", "/help":
		return CmdHelp, rest
	}
	return CmdUnknown, verb
}

// stripMentions removes Teams-style <at>UpCore</at> markup.
func stripMentions(s string) string {
	// crude but sufficient — Teams wraps mentions in <at>...</at>.
	for {
		i := strings.Index(s, "<at>")
		if i < 0 {
			break
		}
		j := strings.Index(s[i:], "</at>")
		if j < 0 {
			break
		}
		s = s[:i] + s[i+j+len("</at>"):]
	}
	return s
}

// HelpCard returns the help adaptive card.
func HelpCard() Envelope {
	card := NewAdaptiveCard()
	card.Body = []any{
		Title("UpCore Bot · Komutlar"),
		Body("**@UpCore pulse** — Haftalık pulse anketi linkini getirir."),
		Body("**@UpCore feedback** — Yönetici veya ekibiniz için anonim geribildirim gönderir."),
		Body("**@UpCore help** — Bu listeyi gösterir."),
	}
	return Envelope{
		Type:        "message",
		Summary:     "UpCore bot komutları",
		Attachments: []Attachment{{ContentType: "application/vnd.microsoft.card.adaptive", Content: card}},
	}
}
