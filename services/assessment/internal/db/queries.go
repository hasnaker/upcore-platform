package db

// Column lists used in SELECT statements.
const (
	AssessmentCols = `id, tenant_id, employee_id, candidate_email, candidate_name,
		instrument_code, status, candidate_token, assigned_by, expires_at,
		metadata, created_at, updated_at, deleted_at`

	SessionCols = `id, assessment_id, tenant_id, status, started_at, completed_at,
		time_limit_seconds, elapsed_seconds, current_item_index, total_items,
		cheating_metrics, browser_fingerprint, ip_address, user_agent,
		created_at, updated_at`

	ResponseCols = `id, session_id, assessment_id, tenant_id, item_code,
		item_index, response_value, response_text, time_spent_seconds,
		created_at`

	ScoreCols = `id, assessment_id, tenant_id, scale_code, scale_name,
		raw_score, t_score, percentile, risk_level, norm_group,
		metadata, scored_at, created_at`
)

// Assessment queries.
const (
	QInsertAssessment = `INSERT INTO app.assessments (
		id, tenant_id, employee_id, candidate_email, candidate_name,
		instrument_code, status, candidate_token, assigned_by, expires_at,
		metadata, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :employee_id, :candidate_email, :candidate_name,
		:instrument_code, :status, :candidate_token, :assigned_by, :expires_at,
		:metadata, :created_at, :updated_at
	)`

	QSelectAssessmentByID = `SELECT ` + AssessmentCols + `
		FROM app.assessments
		WHERE id = $1 AND deleted_at IS NULL`

	QSelectAssessmentByToken = `SELECT ` + AssessmentCols + `
		FROM app.assessments
		WHERE candidate_token = $1 AND deleted_at IS NULL`

	QUpdateAssessment = `UPDATE app.assessments SET
		status = :status,
		metadata = :metadata,
		updated_at = :updated_at
		WHERE id = :id AND deleted_at IS NULL`
)

// Session queries.
const (
	QInsertSession = `INSERT INTO app.assessment_sessions (
		id, assessment_id, tenant_id, status, started_at, time_limit_seconds,
		elapsed_seconds, current_item_index, total_items,
		cheating_metrics, browser_fingerprint, ip_address, user_agent,
		created_at, updated_at
	) VALUES (
		:id, :assessment_id, :tenant_id, :status, :started_at, :time_limit_seconds,
		:elapsed_seconds, :current_item_index, :total_items,
		:cheating_metrics, :browser_fingerprint, :ip_address, :user_agent,
		:created_at, :updated_at
	)`

	QSelectSessionByID = `SELECT ` + SessionCols + `
		FROM app.assessment_sessions
		WHERE id = $1`

	QSelectSessionsByAssessment = `SELECT ` + SessionCols + `
		FROM app.assessment_sessions
		WHERE assessment_id = $1
		ORDER BY created_at DESC`

	QUpdateSession = `UPDATE app.assessment_sessions SET
		status = :status,
		completed_at = :completed_at,
		elapsed_seconds = :elapsed_seconds,
		current_item_index = :current_item_index,
		cheating_metrics = :cheating_metrics,
		updated_at = :updated_at
		WHERE id = :id`
)

// Response queries.
const (
	QInsertResponse = `INSERT INTO app.assessment_responses (
		id, session_id, assessment_id, tenant_id, item_code,
		item_index, response_value, response_text, time_spent_seconds,
		created_at
	) VALUES (
		:id, :session_id, :assessment_id, :tenant_id, :item_code,
		:item_index, :response_value, :response_text, :time_spent_seconds,
		:created_at
	)`

	QSelectResponsesByAssessment = `SELECT ` + ResponseCols + `
		FROM app.assessment_responses
		WHERE assessment_id = $1
		ORDER BY item_index ASC`

	QSelectResponsesBySession = `SELECT ` + ResponseCols + `
		FROM app.assessment_responses
		WHERE session_id = $1
		ORDER BY item_index ASC`
)

// Score queries.
const (
	QInsertScore = `INSERT INTO app.assessment_scores (
		id, assessment_id, tenant_id, scale_code, scale_name,
		raw_score, t_score, percentile, risk_level, norm_group,
		metadata, scored_at, created_at
	) VALUES (
		:id, :assessment_id, :tenant_id, :scale_code, :scale_name,
		:raw_score, :t_score, :percentile, :risk_level, :norm_group,
		:metadata, :scored_at, :created_at
	)`

	QSelectScoresByAssessment = `SELECT ` + ScoreCols + `
		FROM app.assessment_scores
		WHERE assessment_id = $1
		ORDER BY scale_code ASC`

	QDeleteScoresByAssessment = `DELETE FROM app.assessment_scores
		WHERE assessment_id = $1`
)

// List query helpers.
const (
	QListAssessments = `SELECT ` + AssessmentCols + `
		FROM app.assessments
		WHERE tenant_id = $1 AND deleted_at IS NULL`

	QCountAssessments = `SELECT COUNT(*)
		FROM app.assessments
		WHERE tenant_id = $1 AND deleted_at IS NULL`
)
