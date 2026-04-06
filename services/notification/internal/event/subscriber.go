package event

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
)

// Topics consumed by the notification service.
const (
	TopicUserCreated           = "auth.user.created.v1"
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
)

// NotificationDispatcher is the interface the subscriber uses to send notifications.
type NotificationDispatcher interface {
	SendFromEvent(ctx context.Context, tenantID uuid.UUID, templateCode string, channel domain.NotifChannel, recipientUserID *uuid.UUID, recipientEmail string, vars map[string]any, category domain.Category) error
}

// Subscriber listens to cross-service events and maps them to notification
// template codes, then dispatches via the notification pipeline.
type Subscriber struct {
	dispatcher NotificationDispatcher
	log        zerolog.Logger
}

// NewSubscriber constructs a Subscriber.
func NewSubscriber(dispatcher NotificationDispatcher, log zerolog.Logger) *Subscriber {
	return &Subscriber{dispatcher: dispatcher, log: log}
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

// HandleInterventionAssigned sends consent request email.
func (s *Subscriber) HandleInterventionAssigned(ctx context.Context, data []byte) error {
	payload := s.parsePayload(data)
	tenantID := s.parseUUID(payload, "tenant_id")
	employeeID := s.parseUUID(payload, "employee_id")

	return s.dispatcher.SendFromEvent(ctx, tenantID, "intervention_consent_request", domain.ChannelEmail, &employeeID, "",
		map[string]any{
			"intervention_type": stringVal(payload, "intervention_type"),
			"description":      stringVal(payload, "description"),
			"consent_link":     stringVal(payload, "consent_link"),
			"locale":           "tr-TR",
		}, domain.CategoryIntervention)
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
