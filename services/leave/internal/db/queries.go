package db

// SQL queries shared across repositories. All tables live in the `app` schema.

const (
	// ===== Leave types =====

	QInsertLeaveType = `
		INSERT INTO app.leave_types (
			id, tenant_id, code, name_tr, name_en, description_tr, category, is_paid,
			requires_document, accrual_method, max_days_per_year, max_days_per_event,
			carry_over_allowed, carry_over_max_days, min_tenure_months, legal_reference,
			active, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :code, :name_tr, :name_en, :description_tr, :category, :is_paid,
			:requires_document, :accrual_method, :max_days_per_year, :max_days_per_event,
			:carry_over_allowed, :carry_over_max_days, :min_tenure_months, :legal_reference,
			:active, :created_at, :updated_at
		)`

	QSelectLeaveTypeByID = `
		SELECT id, tenant_id, code, name_tr, name_en, description_tr, category, is_paid,
			requires_document, accrual_method, max_days_per_year, max_days_per_event,
			carry_over_allowed, carry_over_max_days, min_tenure_months, legal_reference,
			active, created_at, updated_at
		FROM app.leave_types WHERE id = $1`

	QSelectLeaveTypeByCode = `
		SELECT id, tenant_id, code, name_tr, name_en, description_tr, category, is_paid,
			requires_document, accrual_method, max_days_per_year, max_days_per_event,
			carry_over_allowed, carry_over_max_days, min_tenure_months, legal_reference,
			active, created_at, updated_at
		FROM app.leave_types
		WHERE code = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
		ORDER BY tenant_id NULLS LAST LIMIT 1`

	QListLeaveTypesForTenant = `
		SELECT id, tenant_id, code, name_tr, name_en, description_tr, category, is_paid,
			requires_document, accrual_method, max_days_per_year, max_days_per_event,
			carry_over_allowed, carry_over_max_days, min_tenure_months, legal_reference,
			active, created_at, updated_at
		FROM app.leave_types
		WHERE active = true AND (tenant_id = $1 OR tenant_id IS NULL)
		ORDER BY category, name_tr`

	QUpdateLeaveType = `
		UPDATE app.leave_types SET
			name_tr = :name_tr,
			name_en = :name_en,
			description_tr = :description_tr,
			is_paid = :is_paid,
			requires_document = :requires_document,
			accrual_method = :accrual_method,
			max_days_per_year = :max_days_per_year,
			max_days_per_event = :max_days_per_event,
			carry_over_allowed = :carry_over_allowed,
			carry_over_max_days = :carry_over_max_days,
			min_tenure_months = :min_tenure_months,
			legal_reference = :legal_reference,
			active = :active,
			updated_at = :updated_at
		WHERE id = :id`

	QDeactivateLeaveType = `UPDATE app.leave_types SET active = false, updated_at = now() WHERE id = $1`

	// ===== Leave requests =====

	QInsertLeaveRequest = `
		INSERT INTO app.leave_requests (
			id, tenant_id, employee_id, leave_type_id, start_date, end_date,
			start_half_day, end_half_day, total_days, reason, status, requested_at,
			approved_by, approved_at, rejected_reason, cancelled_at, document_urls,
			metadata, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :employee_id, :leave_type_id, :start_date, :end_date,
			:start_half_day, :end_half_day, :total_days, :reason, :status, :requested_at,
			:approved_by, :approved_at, :rejected_reason, :cancelled_at, :document_urls,
			:metadata, :created_at, :updated_at
		)`

	QSelectLeaveRequestByID = `
		SELECT id, tenant_id, employee_id, leave_type_id, start_date, end_date,
			start_half_day, end_half_day, total_days, reason, status, requested_at,
			approved_by, approved_at, rejected_reason, cancelled_at, document_urls,
			metadata, created_at, updated_at
		FROM app.leave_requests WHERE id = $1 AND tenant_id = $2`

	QUpdateLeaveRequest = `
		UPDATE app.leave_requests SET
			leave_type_id = :leave_type_id,
			start_date = :start_date,
			end_date = :end_date,
			start_half_day = :start_half_day,
			end_half_day = :end_half_day,
			total_days = :total_days,
			reason = :reason,
			status = :status,
			approved_by = :approved_by,
			approved_at = :approved_at,
			rejected_reason = :rejected_reason,
			cancelled_at = :cancelled_at,
			document_urls = :document_urls,
			metadata = :metadata,
			updated_at = :updated_at
		WHERE id = :id AND tenant_id = :tenant_id`

	QUpdateLeaveRequestStatus = `
		UPDATE app.leave_requests SET
			status = $3,
			approved_by = $4,
			approved_at = $5,
			rejected_reason = $6,
			cancelled_at = $7,
			updated_at = now()
		WHERE id = $1 AND tenant_id = $2`

	QDeleteLeaveRequest = `DELETE FROM app.leave_requests WHERE id = $1 AND tenant_id = $2`

	QListRequestsByEmployee = `
		SELECT id, tenant_id, employee_id, leave_type_id, start_date, end_date,
			start_half_day, end_half_day, total_days, reason, status, requested_at,
			approved_by, approved_at, rejected_reason, cancelled_at, document_urls,
			metadata, created_at, updated_at
		FROM app.leave_requests
		WHERE tenant_id = $1 AND employee_id = $2
		ORDER BY start_date DESC
		LIMIT $3 OFFSET $4`

	QListRequestsByTenantStatus = `
		SELECT id, tenant_id, employee_id, leave_type_id, start_date, end_date,
			start_half_day, end_half_day, total_days, reason, status, requested_at,
			approved_by, approved_at, rejected_reason, cancelled_at, document_urls,
			metadata, created_at, updated_at
		FROM app.leave_requests
		WHERE tenant_id = $1 AND status = $2
		ORDER BY start_date ASC
		LIMIT $3 OFFSET $4`

	QListOverlappingRequests = `
		SELECT id, tenant_id, employee_id, leave_type_id, start_date, end_date,
			start_half_day, end_half_day, total_days, reason, status, requested_at,
			approved_by, approved_at, rejected_reason, cancelled_at, document_urls,
			metadata, created_at, updated_at
		FROM app.leave_requests
		WHERE tenant_id = $1 AND employee_id = $2
		  AND status IN ('pending','manager_approved','approved','taken')
		  AND start_date <= $4 AND end_date >= $3
		  AND ($5::uuid IS NULL OR id <> $5)`

	QListRequestsByDateRange = `
		SELECT id, tenant_id, employee_id, leave_type_id, start_date, end_date,
			start_half_day, end_half_day, total_days, reason, status, requested_at,
			approved_by, approved_at, rejected_reason, cancelled_at, document_urls,
			metadata, created_at, updated_at
		FROM app.leave_requests
		WHERE tenant_id = $1 AND start_date <= $3 AND end_date >= $2
		  AND status IN ('pending','manager_approved','approved','taken')
		ORDER BY start_date ASC`

	QListRequestsForEmployees = `
		SELECT id, tenant_id, employee_id, leave_type_id, start_date, end_date,
			start_half_day, end_half_day, total_days, reason, status, requested_at,
			approved_by, approved_at, rejected_reason, cancelled_at, document_urls,
			metadata, created_at, updated_at
		FROM app.leave_requests
		WHERE tenant_id = $1
		  AND employee_id = ANY($2::uuid[])
		  AND start_date <= $4 AND end_date >= $3
		ORDER BY start_date ASC`

	// ===== Leave balances =====

	QInsertLeaveBalance = `
		INSERT INTO app.leave_balances (
			id, tenant_id, employee_id, leave_type_id, year,
			accrued_days, used_days, pending_days, carried_over, adjusted_days,
			last_accrual_at, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :employee_id, :leave_type_id, :year,
			:accrued_days, :used_days, :pending_days, :carried_over, :adjusted_days,
			:last_accrual_at, :created_at, :updated_at
		)`

	QSelectLeaveBalance = `
		SELECT id, tenant_id, employee_id, leave_type_id, year,
			accrued_days, used_days, pending_days, carried_over, adjusted_days,
			remaining_days, last_accrual_at, created_at, updated_at
		FROM app.leave_balances
		WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4`

	QSelectLeaveBalanceForUpdate = `
		SELECT id, tenant_id, employee_id, leave_type_id, year,
			accrued_days, used_days, pending_days, carried_over, adjusted_days,
			remaining_days, last_accrual_at, created_at, updated_at
		FROM app.leave_balances
		WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4
		FOR UPDATE`

	QListLeaveBalancesByEmployee = `
		SELECT id, tenant_id, employee_id, leave_type_id, year,
			accrued_days, used_days, pending_days, carried_over, adjusted_days,
			remaining_days, last_accrual_at, created_at, updated_at
		FROM app.leave_balances
		WHERE tenant_id = $1 AND employee_id = $2 AND year = $3
		ORDER BY leave_type_id`

	QUpdateLeaveBalanceDelta = `
		UPDATE app.leave_balances SET
			accrued_days = accrued_days + $5,
			used_days = used_days + $6,
			pending_days = pending_days + $7,
			adjusted_days = adjusted_days + $8,
			carried_over = carried_over + $9,
			last_accrual_at = CASE WHEN $10::boolean THEN now() ELSE last_accrual_at END,
			updated_at = now()
		WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND year = $4
		RETURNING remaining_days`

	QUpdateLeaveBalanceAbsolute = `
		UPDATE app.leave_balances SET
			accrued_days = :accrued_days,
			used_days = :used_days,
			pending_days = :pending_days,
			carried_over = :carried_over,
			adjusted_days = :adjusted_days,
			last_accrual_at = :last_accrual_at,
			updated_at = now()
		WHERE tenant_id = :tenant_id AND employee_id = :employee_id
		  AND leave_type_id = :leave_type_id AND year = :year`
)
