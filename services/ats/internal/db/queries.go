package db

// SQL queries shared across repositories. Column lists mirror
// the app.requisitions / app.candidates / app.applications /
// app.application_events / app.interviews / app.offers / app.pipeline_stages
// tables in the ATS migrations.

const (
	// ---- Requisitions ----
	RequisitionCols = `id, tenant_id, position_id, title, description, requirements,
		headcount, location, employment_type, salary_min, salary_max,
		status, hiring_manager_id, recruiter_id,
		opened_at, closed_at, created_at, updated_at`

	QInsertRequisition = `
		INSERT INTO app.requisitions (
			id, tenant_id, position_id, title, description, requirements,
			headcount, location, employment_type, salary_min, salary_max,
			status, hiring_manager_id, recruiter_id,
			opened_at, closed_at, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :position_id, :title, :description, :requirements,
			:headcount, :location, :employment_type, :salary_min, :salary_max,
			:status, :hiring_manager_id, :recruiter_id,
			:opened_at, :closed_at, :created_at, :updated_at
		)`

	QSelectRequisitionByID = `
		SELECT ` + RequisitionCols + `
		FROM app.requisitions
		WHERE id = $1`

	QUpdateRequisition = `
		UPDATE app.requisitions SET
			position_id = :position_id,
			title = :title,
			description = :description,
			requirements = :requirements,
			headcount = :headcount,
			location = :location,
			employment_type = :employment_type,
			salary_min = :salary_min,
			salary_max = :salary_max,
			status = :status,
			hiring_manager_id = :hiring_manager_id,
			recruiter_id = :recruiter_id,
			opened_at = :opened_at,
			closed_at = :closed_at,
			updated_at = :updated_at
		WHERE id = :id`

	// ---- Candidates ----
	CandidateCols = `id, tenant_id, email, first_name, last_name, phone,
		linkedin_url, cv_blob_path, cv_text_extracted, source,
		referrer_employee_id, tags, gdpr_consent, gdpr_consent_at,
		created_at, updated_at, deleted_at`

	QInsertCandidate = `
		INSERT INTO app.candidates (
			id, tenant_id, email, first_name, last_name, phone,
			linkedin_url, cv_blob_path, cv_text_extracted, source,
			referrer_employee_id, tags, gdpr_consent, gdpr_consent_at,
			created_at, updated_at
		) VALUES (
			:id, :tenant_id, :email, :first_name, :last_name, :phone,
			:linkedin_url, :cv_blob_path, :cv_text_extracted, :source,
			:referrer_employee_id, :tags, :gdpr_consent, :gdpr_consent_at,
			:created_at, :updated_at
		)`

	QSelectCandidateByID = `
		SELECT ` + CandidateCols + `
		FROM app.candidates
		WHERE id = $1 AND deleted_at IS NULL`

	QSelectCandidateByEmail = `
		SELECT ` + CandidateCols + `
		FROM app.candidates
		WHERE tenant_id = $1 AND email = $2 AND deleted_at IS NULL`

	QUpdateCandidate = `
		UPDATE app.candidates SET
			email = :email,
			first_name = :first_name,
			last_name = :last_name,
			phone = :phone,
			linkedin_url = :linkedin_url,
			cv_blob_path = :cv_blob_path,
			cv_text_extracted = :cv_text_extracted,
			source = :source,
			referrer_employee_id = :referrer_employee_id,
			tags = :tags,
			gdpr_consent = :gdpr_consent,
			gdpr_consent_at = :gdpr_consent_at,
			updated_at = :updated_at
		WHERE id = :id AND deleted_at IS NULL`

	// ---- Applications ----
	ApplicationCols = `id, tenant_id, candidate_id, requisition_id,
		current_stage, stage_entered_at, score, rejection_reason,
		applied_at, updated_at`

	QInsertApplication = `
		INSERT INTO app.applications (
			id, tenant_id, candidate_id, requisition_id,
			current_stage, stage_entered_at, score, rejection_reason,
			applied_at, updated_at
		) VALUES (
			:id, :tenant_id, :candidate_id, :requisition_id,
			:current_stage, :stage_entered_at, :score, :rejection_reason,
			:applied_at, :updated_at
		)`

	QSelectApplicationByID = `
		SELECT ` + ApplicationCols + `
		FROM app.applications
		WHERE id = $1`

	QSelectApplicationByCandidateRequisition = `
		SELECT ` + ApplicationCols + `
		FROM app.applications
		WHERE candidate_id = $1 AND requisition_id = $2`

	QUpdateApplicationStage = `
		UPDATE app.applications
		SET current_stage = $2, stage_entered_at = $3, updated_at = $3,
			rejection_reason = $4
		WHERE id = $1`

	QUpdateApplicationScore = `
		UPDATE app.applications
		SET score = $2, updated_at = $3
		WHERE id = $1`

	// ---- Application Events ----
	AppEventCols = `id, tenant_id, application_id, event_type,
		from_stage, to_stage, actor_id, payload, created_at`

	QInsertAppEvent = `
		INSERT INTO app.application_events (
			id, tenant_id, application_id, event_type,
			from_stage, to_stage, actor_id, payload, created_at
		) VALUES (
			:id, :tenant_id, :application_id, :event_type,
			:from_stage, :to_stage, :actor_id, :payload, :created_at
		)`

	QSelectEventsByApplication = `
		SELECT ` + AppEventCols + `
		FROM app.application_events
		WHERE application_id = $1
		ORDER BY created_at ASC`

	// ---- Interviews ----
	InterviewCols = `id, tenant_id, application_id, round, scheduled_at,
		duration_minutes, interviewer_ids, location, meeting_url,
		status, feedback, overall_score, recommendation,
		created_at, updated_at`

	QInsertInterview = `
		INSERT INTO app.interviews (
			id, tenant_id, application_id, round, scheduled_at,
			duration_minutes, interviewer_ids, location, meeting_url,
			status, feedback, overall_score, recommendation,
			created_at, updated_at
		) VALUES (
			:id, :tenant_id, :application_id, :round, :scheduled_at,
			:duration_minutes, :interviewer_ids, :location, :meeting_url,
			:status, :feedback, :overall_score, :recommendation,
			:created_at, :updated_at
		)`

	QSelectInterviewByID = `
		SELECT ` + InterviewCols + `
		FROM app.interviews
		WHERE id = $1`

	QUpdateInterview = `
		UPDATE app.interviews SET
			round = :round,
			scheduled_at = :scheduled_at,
			duration_minutes = :duration_minutes,
			interviewer_ids = :interviewer_ids,
			location = :location,
			meeting_url = :meeting_url,
			status = :status,
			feedback = :feedback,
			overall_score = :overall_score,
			recommendation = :recommendation,
			updated_at = :updated_at
		WHERE id = :id`

	QSelectInterviewsByApplication = `
		SELECT ` + InterviewCols + `
		FROM app.interviews
		WHERE application_id = $1
		ORDER BY round ASC, scheduled_at ASC`

	// ---- Offers ----
	OfferCols = `id, tenant_id, application_id, salary_try, bonus_try,
		start_date, expiry_date, benefits, status, document_id,
		sent_at, responded_at, created_by, created_at`

	QInsertOffer = `
		INSERT INTO app.offers (
			id, tenant_id, application_id, salary_try, bonus_try,
			start_date, expiry_date, benefits, status, document_id,
			sent_at, responded_at, created_by, created_at
		) VALUES (
			:id, :tenant_id, :application_id, :salary_try, :bonus_try,
			:start_date, :expiry_date, :benefits, :status, :document_id,
			:sent_at, :responded_at, :created_by, :created_at
		)`

	QSelectOfferByID = `
		SELECT ` + OfferCols + `
		FROM app.offers
		WHERE id = $1`

	QUpdateOffer = `
		UPDATE app.offers SET
			salary_try = :salary_try,
			bonus_try = :bonus_try,
			start_date = :start_date,
			expiry_date = :expiry_date,
			benefits = :benefits,
			status = :status,
			document_id = :document_id,
			sent_at = :sent_at,
			responded_at = :responded_at
		WHERE id = :id`

	QSelectOffersByApplication = `
		SELECT ` + OfferCols + `
		FROM app.offers
		WHERE application_id = $1
		ORDER BY created_at DESC`

	// ---- Pipeline Stages ----
	PipelineStageCols = `id, tenant_id, name, order_index, color, is_system, is_terminal`

	QInsertPipelineStage = `
		INSERT INTO app.pipeline_stages (
			id, tenant_id, name, order_index, color, is_system, is_terminal
		) VALUES (
			:id, :tenant_id, :name, :order_index, :color, :is_system, :is_terminal
		)`

	QSelectPipelineStageByID = `
		SELECT ` + PipelineStageCols + `
		FROM app.pipeline_stages
		WHERE id = $1`

	QSelectPipelineStagesByTenant = `
		SELECT ` + PipelineStageCols + `
		FROM app.pipeline_stages
		WHERE tenant_id = $1
		ORDER BY order_index ASC`

	QUpdatePipelineStage = `
		UPDATE app.pipeline_stages SET
			name = :name,
			order_index = :order_index,
			color = :color,
			is_terminal = :is_terminal
		WHERE id = :id AND is_system = false`
)
