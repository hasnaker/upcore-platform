package channels

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
)

// NetgsmChannel delivers SMS via the Netgsm API (Turkish SMS provider).
type NetgsmChannel struct {
	username   string
	password   string
	senderName string
	baseURL    string
	client     *http.Client
	log        zerolog.Logger
}

// NewNetgsmChannel constructs a Netgsm SMS channel.
func NewNetgsmChannel(username, password, senderName string, log zerolog.Logger) *NetgsmChannel {
	return &NetgsmChannel{
		username:   username,
		password:   password,
		senderName: senderName,
		baseURL:    "https://api.netgsm.com.tr/sms/send/get",
		client:     &http.Client{},
		log:        log,
	}
}

// Name returns the channel identifier.
func (n *NetgsmChannel) Name() domain.NotifChannel {
	return domain.ChannelSMS
}

// netgsmResponse is the XML response from the Netgsm API.
type netgsmResponse struct {
	XMLName xml.Name `xml:"mainbody"`
	Code    string   `xml:"header>responsecode"`
	MsgID   string   `xml:"header>msgID"`
}

// Send delivers an SMS notification via Netgsm.
func (ng *NetgsmChannel) Send(ctx context.Context, notif *domain.Notification) (string, error) {
	if strings.TrimSpace(notif.RecipientPhone) == "" {
		return "", fmt.Errorf("%w: no recipient phone", domain.ErrMissingRecipient)
	}

	body := ""
	if notif.Body != nil {
		body = *notif.Body
	}

	params := url.Values{
		"usercode": {ng.username},
		"password": {ng.password},
		"gsmno":    {notif.RecipientPhone},
		"message":  {body},
		"msgheader": {ng.senderName},
	}

	ng.log.Debug().
		Str("to", notif.RecipientPhone).
		Msg("sending SMS via Netgsm")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		ng.baseURL+"?"+params.Encode(), nil)
	if err != nil {
		return "", fmt.Errorf("%w: build request: %v", domain.ErrProviderError, err)
	}

	resp, err := ng.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("%w: netgsm request: %v", domain.ErrProviderError, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("%w: read response: %v", domain.ErrProviderError, err)
	}

	// Parse response. Netgsm returns "00" or "01" for success.
	responseStr := strings.TrimSpace(string(respBody))
	parts := strings.Split(responseStr, " ")
	code := parts[0]

	switch code {
	case "00", "01":
		msgID := ""
		if len(parts) > 1 {
			msgID = parts[1]
		}
		return msgID, nil
	case "30":
		return "", fmt.Errorf("%w: netgsm auth failed", domain.ErrProviderError)
	case "40":
		return "", fmt.Errorf("%w: netgsm sender not defined", domain.ErrProviderError)
	case "70":
		return "", fmt.Errorf("%w: netgsm parameter error", domain.ErrProviderError)
	default:
		return "", fmt.Errorf("%w: netgsm error code %s", domain.ErrProviderError, code)
	}
}
