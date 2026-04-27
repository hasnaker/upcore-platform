package event

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
)

// Topics consumed by the notification service.
const (
	TopicUserCreated           = "auth.user.created.v1"
	TopicTenantUserInvited     = "tenant.user.invited.v1"
	TopicLeaveSubmitted        = "leave.request.submitted.v1"
	TopicLeaveApproved         = "leave.request.approved.v1"
	TopicLeaveRejected         = "leave.request.rejected.v1"
	TopicAssessmentInvited     = "assessment.invited.v1"
	TopicSurveyDistributed     = "survey.distributed.v1"
	TopicSurveyReminderDue     = "survey.reminder.due.v1"
	TopicInterventionAssigned  = "intervention.assigned.v1"
	TopicDocumentExpiring      = "document.expiring.v1"
	TopicOfferSent             = "ats.offer.sent.v1"
	TopicInterviewScheduled    = "ats.interview.scheduled.v1"
	TopicMobilitySubmitted     = "mobility.application.submitted.v1"
	TopicInvoiceFailed         = "tenant.invoice.failed.v1"
	TopicPulseReminder         = "pulse.reminder.v1"
)

// NotificationDispatcher is the interface the subscriber uses to send notifications.
type NotificationDispatcher interface {
	SendFromEvent(ctx context.Context, tenantID uuid.UUID, templateCode string, channel domain.NotifChannel, recipientUserID *uuid.UUID, recipientEmail string, vars map[string]any, category domain.Category) error
}

// Subscriber listens to cross-service events and maps them to notification
// template codes, then dispatches via the notification pipeline.
type Subscriber struct {
	dispatcher NotificationDispatcher
	appBaseURL string
	log        zerolog.Logger
}

// NewSubscriber constructs a Subscriber.
func NewSubscriber(dispatcher NotificationDispatcher, log zerolog.Logger) *Subscriber {
	return &Subscriber{dispatcher: dispatcher, log: log}
}

// WithAppBaseURL overrides the tenant-app base URL used to build deep links
// in outgoing notification emails. Default is https://app.upcore.io.
func (s *Subscriber) WithAppBaseURL(u string) *Subscriber {
	s.appBaseURL = strings.TrimSpace(u)
	return s
}

// Start begins listening to all subscribed topics. In production this
// connects to Azure Service Bus.
func (s *Subscriber) Start(ctx context.Context) error {
	s.log.Info().Msg("notification event subscriber started (waiting for Service Bus connection)")
	<-ctx.Done()
	return ctx.Err()
}

// HandleUserCreated sends a welcome email on auth.user.created.v1.
func (s *Subscriber) HandleUserCreated(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	userID := s.parseUUID(payload, "user_id")
	email := stringVal(payload, "email")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "welcome", domain.ChannelEmail, &userID, email,
		map[string]any{
			"first_name": stringVal(payload, "first_name"),
			"email":      email,
			"locale":     "tr-TR",
		}, domain.CategoryWelcome)
}

// HandleLeaveSubmitted notifies the manager on leave.request.submitted.v1.
func (s *Subscriber) HandleLeaveSubmitted(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	managerID := s.parseUUID(payload, "manager_id")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "leave_request_submitted", domain.ChannelEmail, &managerID, "",
		map[string]any{
			"employee_name": stringVal(payload, "employee_name"),
			"leave_type":    stringVal(payload, "leave_type"),
			"start_date":    stringVal(payload, "start_date"),
			"end_date":      stringVal(payload, "end_date"),
			"locale":        "tr-TR",
		}, domain.CategoryLeave)
}

// HandleLeaveApproved notifies the employee on leave.request.approved.v1.
func (s *Subscriber) HandleLeaveApproved(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	employeeID := s.parseUUID(payload, "employee_id")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "leave_request_approved", domain.ChannelEmail, &employeeID, "",
		map[string]any{
			"leave_type":  stringVal(payload, "leave_type"),
			"start_date":  stringVal(payload, "start_date"),
			"end_date":    stringVal(payload, "end_date"),
			"approved_by": stringVal(payload, "approved_by"),
			"locale":      "tr-TR",
		}, domain.CategoryLeave)
}

// HandleLeaveRejected notifies the employee on leave.request.rejected.v1.
func (s *Subscriber) HandleLeaveRejected(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	employeeID := s.parseUUID(payload, "employee_id")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "leave_request_rejected", domain.ChannelEmail, &employeeID, "",
		map[string]any{
			"leave_type":  stringVal(payload, "leave_type"),
			"reason":      stringVal(payload, "reason"),
			"rejected_by": stringVal(payload, "rejected_by"),
			"locale":      "tr-TR",
		}, domain.CategoryLeave)
}

// HandleAssessmentInvited sends assessment invitation email.
func (s *Subscriber) HandleAssessmentInvited(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	recipientID := s.parseUUID(payload, "recipient_id")
	email := stringVal(payload, "email")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "assessment_invitation", domain.ChannelEmail, &recipientID, email,
		map[string]any{
			"assessment_name": stringVal(payload, "assessment_name"),
			"due_date":        stringVal(payload, "due_date"),
			"link":            stringVal(payload, "link"),
			"locale":          "tr-TR",
		}, domain.CategoryAssessment)
}

// HandleSurveyDistributed sends survey distribution email.
func (s *Subscriber) HandleSurveyDistributed(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	recipientID := s.parseUUID(payload, "recipient_id")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "survey_invitation", domain.ChannelEmail, &recipientID, "",
		map[string]any{
			"survey_name": stringVal(payload, "survey_name"),
			"due_date":    stringVal(payload, "due_date"),
			"link":        stringVal(payload, "link"),
			"locale":      "tr-TR",
		}, domain.CategorySurvey)
}

// HandleInterventionAssigned sends a consent-request email. The publisher
// (intervention service) embeds intervention metadata in the event payload —
// title, description, evidence tier, expected effect size, duration weeks
// and assignment_id — so the notification template can render a scientifically
// grounded consent request with a deep link to /portal/muhadale/{assignmentId}.
func (s *Subscriber) HandleInterventionAssigned(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	employeeID := s.parseUUID(payload, "employee_id")
	assignmentID := s.parseUUID(payload, "assignment_id")

	title := stringVal(payload, "intervention_type")
	if title == "" {
		title = stringVal(payload, "intervention")
	}

	appBase := strings.TrimRight(s.appBaseURL, "/")
	if appBase == "" {
		appBase = "https://app.upcore.io"
	}
	consentLink := stringVal(payload, "consent_link")
	if consentLink == "" && assignmentID != uuid.Nil {
		consentLink = appBase + "/portal/muhadale/" + assignmentID.String()
	}

	vars := map[string]any{
		"intervention_type":    title,
		"description":          stringVal(payload, "description"),
		"evidence_tier":        stringVal(payload, "evidence_tier"),
		"expected_effect_size": stringVal(payload, "expected_effect_size"),
		"duration_weeks":       stringVal(payload, "duration_weeks"),
		"time_to_effect_weeks": stringVal(payload, "time_to_effect_weeks"),
		"consent_link":         consentLink,
		"reminder":             stringVal(payload, "reminder"),
		"locale":               "tr-TR",
	}
	return s.dispatcher.SendFromEvent(ctx, tenantID, "intervention_consent_request",
		domain.ChannelEmail, &employeeID, "", vars, domain.CategoryIntervention)
}

// HandleDocumentExpiring sends document expiry alert.
func (s *Subscriber) HandleDocumentExpiring(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	ownerID := s.parseUUID(payload, "owner_id")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "document_expiring", domain.ChannelEmail, &ownerID, "",
		map[string]any{
			"document_name": stringVal(payload, "document_name"),
			"expiry_date":   stringVal(payload, "expiry_date"),
			"days_left":     stringVal(payload, "days_left"),
			"locale":        "tr-TR",
		}, domain.CategoryDocument)
}

// HandleInvoiceFailed sends invoice failure alert to admin.
func (s *Subscriber) HandleInvoiceFailed(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	adminID := s.parseUUID(payload, "admin_id")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "invoice_failed", domain.ChannelEmail, &adminID, "",
		map[string]any{
			"invoice_number": stringVal(payload, "invoice_number"),
			"amount":         stringVal(payload, "amount"),
			"reason":         stringVal(payload, "reason"),
			"locale":         "tr-TR",
		}, domain.CategorySystem)
}

// HandleInterviewScheduled sends the candidate an interview invitation email.
// Payload: candidate_email, candidate_name, company_name, position_title,
// interview_date, interview_time, format, location, duration, interviewers.
func (s *Subscriber) HandleInterviewScheduled(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	candidateEmail := stringVal(payload, "candidate_email")
	if candidateEmail == "" {
		s.log.Warn().Msg("interview scheduled without candidate_email — skipping notif")
		return nil
	}
	vars := map[string]any{
		"candidate_name": stringVal(payload, "candidate_name"),
		"company_name":   stringVal(payload, "company_name"),
		"position_title": stringVal(payload, "position_title"),
		"interview_date": stringVal(payload, "interview_date"),
		"interview_time": stringVal(payload, "interview_time"),
		"format":         stringVal(payload, "format"),
		"location":       stringVal(payload, "location"),
		"duration":       stringVal(payload, "duration"),
		"interviewers":   stringVal(payload, "interviewers"),
		"locale":         "tr-TR",
	}
	return s.dispatcher.SendFromEvent(ctx, tenantID, "interview_invitation",
		domain.ChannelEmail, nil, candidateEmail, vars, domain.CategoryATS)
}

// HandleOfferSent notifies the candidate the offer letter is ready.
// Payload: candidate_email, candidate_name, position_title, accept_url.
func (s *Subscriber) HandleOfferSent(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	candidateEmail := stringVal(payload, "candidate_email")
	if candidateEmail == "" {
		return nil
	}
	vars := map[string]any{
		"candidate_name": stringVal(payload, "candidate_name"),
		"position_title": stringVal(payload, "position_title"),
		"accept_url":     stringVal(payload, "accept_url"),
		"locale":         "tr-TR",
	}
	return s.dispatcher.SendFromEvent(ctx, tenantID, "offer_sent",
		domain.ChannelEmail, nil, candidateEmail, vars, domain.CategoryATS)
}

// HandleTenantUserInvited sends a Slack DM (and email) on tenant.user.invited.v1.
// The Slack DM requires an active installation and a resolvable Slack user
// (either by explicit slack_user_id in the payload or by e-mail lookup).
func (s *Subscriber) HandleTenantUserInvited(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	userID := s.parseUUID(payload, "user_id")
	email := stringVal(payload, "email")

	vars := map[string]any{
		"first_name":       stringVal(payload, "first_name"),
		"company_name":     stringVal(payload, "company_name"),
		"login_url":        stringVal(payload, "login_url"),
		"email":            email,
		"locale":           "tr-TR",
		"slack_user_id":    stringVal(payload, "slack_user_id"),
		"slack_channel_id": stringVal(payload, "slack_channel_id"),
	}

	// Best-effort Slack DM; email is always sent via welcome template.
	_ = s.dispatcher.SendFromEvent(ctx, tenantID, "welcome", domain.ChannelSlack,
		&userID, email, vars, domain.CategoryWelcome)
	return s.dispatcher.SendFromEvent(ctx, tenantID, "welcome", domain.ChannelEmail,
		&userID, email, vars, domain.CategoryWelcome)
}

// HandleInterventionAssignedSlack sends a Slack DM (if opted-in) on intervention.assigned.v1.
// The tenant-level allow_dm_interventions flag is enforced by the Slack
// channel driver, so this handler always attempts delivery; rejection is
// mapped to domain.ErrOptedOut and swallowed by the outer dispatcher.
func (s *Subscriber) HandleInterventionAssignedSlack(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	employeeID := s.parseUUID(payload, "employee_id")
	email := stringVal(payload, "email")
	vars := map[string]any{
		"intervention_type": stringVal(payload, "intervention_type"),
		"description":       stringVal(payload, "description"),
		"consent_link":      stringVal(payload, "consent_link"),
		"slack_user_id":     stringVal(payload, "slack_user_id"),
		"locale":            "tr-TR",
	}
	return s.dispatcher.SendFromEvent(ctx, tenantID, "intervention_consent_request",
		domain.ChannelSlack, &employeeID, email, vars, domain.CategoryIntervention)
}

// HandlePulseReminder sends a Slack pulse reminder to the tenant default
// channel (or a specific Slack user) on pulse.reminder.v1.
func (s *Subscriber) HandlePulseReminder(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	userID := s.parseUUID(payload, "user_id")
	var userPtr *uuid.UUID
	if userID != uuid.Nil {
		userPtr = &userID
	}
	vars := map[string]any{
		"pulse_title":     stringVal(payload, "pulse_title"),
		"pulse_url":       stringVal(payload, "pulse_url"),
		"due_date":        stringVal(payload, "due_date"),
		"slack_channel_id": stringVal(payload, "slack_channel_id"),
		"slack_user_id":   stringVal(payload, "slack_user_id"),
		"locale":          "tr-TR",
	}
	return s.dispatcher.SendFromEvent(ctx, tenantID, "pulse_reminder",
		domain.ChannelSlack, userPtr, "", vars, domain.CategorySurvey)
}

// parsePayload decodes the event envelope and extracts the inner payload.
func (s *Subscriber) parsePayload(data []byte) map[string]any {
	var env struct {
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		s.log.Error().Err(err).Msg("unmarshal event envelope")
		return map[string]any{}
	}
	var payload map[string]any
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		s.log.Error().Err(err).Msg("unmarshal event payload")
		return map[string]any{}
	}
	return payload
}

func (s *Subscriber) parseUUID(m map[string]any, key string) uuid.UUID {
	if v, ok := m[key]; ok {
		if str, ok := v.(string); ok {
			if id, err := uuid.Parse(str); err == nil {
				return id
			}
		}
	}
	return uuid.Nil
}

func stringVal(m map[string]any, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
