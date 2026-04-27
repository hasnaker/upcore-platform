package db

// SQL queries shared across repositories. Column list mirrors
// the app.employees / app.employment_history / app.employee_contacts
// tables in migrations 007_employees.up.sql and 008_employee_contacts.up.sql.

const (
	// Employee columns used in SELECT statements.
	EmployeeCols = `id, tenant_id, user_id, external_id, employee_no, tckn,
		ad, soyad, dogum_tarihi, dogum_yeri, cinsiyet, medeni_hali, uyruk,
		email_is, email_kisisel, telefon_is, telefon_kisisel,
		adres, sehir, ulke, posta_kodu,
		avatar_url, avatar_updated_at,
		department_id, position_id, manager_id,
		hire_date, tenure_months, probation_end_date,
		termination_date, termination_reason,
		employment_status, employment_type, work_location, contract_type,
		salary_gross, salary_net, salary_currency,
		bank_iban, sgk_no, notes, metadata,
		created_at, updated_at, deleted_at`

	QInsertEmployee = `
		INSERT INTO app.employees (
			id, tenant_id, user_id, external_id, employee_no, tckn,
			ad, soyad, dogum_tarihi, dogum_yeri, cinsiyet, medeni_hali, uyruk,
			email_is, email_kisisel, telefon_is, telefon_kisisel,
			adres, sehir, ulke, posta_kodu,
			department_id, position_id, manager_id,
			hire_date, probation_end_date,
			employment_status, employment_type, work_location, contract_type,
			salary_gross, salary_net, salary_currency,
			bank_iban, sgk_no, notes, metadata,
			created_at, updated_at
		) VALUES (
			:id, :tenant_id, :user_id, :external_id, :employee_no, :tckn,
			:ad, :soyad, :dogum_tarihi, :dogum_yeri, :cinsiyet, :medeni_hali, :uyruk,
			:email_is, :email_kisisel, :telefon_is, :telefon_kisisel,
			:adres, :sehir, :ulke, :posta_kodu,
			:department_id, :position_id, :manager_id,
			:hire_date, :probation_end_date,
			:employment_status, :employment_type, :work_location, :contract_type,
			:salary_gross, :salary_net, :salary_currency,
			:bank_iban, :sgk_no, :notes, :metadata,
			:created_at, :updated_at
		)`

	QSelectEmployeeByID = `
		SELECT ` + EmployeeCols + `
		FROM app.employees
		WHERE id = $1 AND deleted_at IS NULL`

	QSelectEmployeeByEmployeeNo = `
		SELECT ` + EmployeeCols + `
		FROM app.employees
		WHERE tenant_id = $1 AND employee_no = $2 AND deleted_at IS NULL`

	QSelectEmployeeByEmail = `
		SELECT ` + EmployeeCols + `
		FROM app.employees
		WHERE tenant_id = $1 AND email_is = $2 AND deleted_at IS NULL`

	QSelectEmployeeByTCKN = `
		SELECT ` + EmployeeCols + `
		FROM app.employees
		WHERE tenant_id = $1 AND tckn = $2 AND deleted_at IS NULL`

	QUpdateEmployee = `
		UPDATE app.employees SET
			user_id = :user_id,
			external_id = :external_id,
			tckn = :tckn,
			ad = :ad,
			soyad = :soyad,
			dogum_tarihi = :dogum_tarihi,
			dogum_yeri = :dogum_yeri,
			cinsiyet = :cinsiyet,
			medeni_hali = :medeni_hali,
			uyruk = :uyruk,
			email_is = :email_is,
			email_kisisel = :email_kisisel,
			telefon_is = :telefon_is,
			telefon_kisisel = :telefon_kisisel,
			adres = :adres,
			sehir = :sehir,
			ulke = :ulke,
			posta_kodu = :posta_kodu,
			avatar_url = :avatar_url,
			avatar_updated_at = :avatar_updated_at,
			department_id = :department_id,
			position_id = :position_id,
			manager_id = :manager_id,
			hire_date = :hire_date,
			probation_end_date = :probation_end_date,
			termination_date = :termination_date,
			termination_reason = :termination_reason,
			employment_status = :employment_status,
			employment_type = :employment_type,
			work_location = :work_location,
			contract_type = :contract_type,
			salary_gross = :salary_gross,
			salary_net = :salary_net,
			salary_currency = :salary_currency,
			bank_iban = :bank_iban,
			sgk_no = :sgk_no,
			notes = :notes,
			metadata = :metadata,
			updated_at = :updated_at
		WHERE id = :id AND deleted_at IS NULL`

	QSoftDeleteEmployee = `
		UPDATE app.employees
		SET deleted_at = $2, updated_at = $2
		WHERE id = $1 AND deleted_at IS NULL`

	QNextEmployeeNoSeq = `
		SELECT COALESCE(MAX(
			NULLIF(regexp_replace(employee_no, '[^0-9]', '', 'g'), '')::int
		), 0) + 1
		FROM app.employees
		WHERE tenant_id = $1`

	// Employment history
	EmploymentHistoryCols = `id, tenant_id, employee_id, change_type,
		old_department_id, new_department_id,
		old_position_id, new_position_id,
		old_manager_id, new_manager_id,
		old_salary, new_salary,
		effective_date, reason, approved_by, metadata, created_at`

	QInsertEmploymentHistory = `
		INSERT INTO app.employment_history (
			id, tenant_id, employee_id, change_type,
			old_department_id, new_department_id,
			old_position_id, new_position_id,
			old_manager_id, new_manager_id,
			old_salary, new_salary,
			effective_date, reason, approved_by, metadata, created_at
		) VALUES (
			:id, :tenant_id, :employee_id, :change_type,
			:old_department_id, :new_department_id,
			:old_position_id, :new_position_id,
			:old_manager_id, :new_manager_id,
			:old_salary, :new_salary,
			:effective_date, :reason, :approved_by, :metadata, :created_at
		)`

	QSelectHistoryByEmployee = `
		SELECT ` + EmploymentHistoryCols + `
		FROM app.employment_history
		WHERE employee_id = $1
		ORDER BY effective_date DESC, created_at DESC
		LIMIT $2 OFFSET $3`

	QCountHistoryByEmployee = `
		SELECT COUNT(*) FROM app.employment_history WHERE employee_id = $1`

	// Emergency contacts
	EmployeeContactCols = `id, tenant_id, employee_id, contact_type, full_name, relationship,
		phone_primary, phone_secondary, email, address, notes, is_primary,
		created_at, updated_at, deleted_at`

	QInsertEmployeeContact = `
		INSERT INTO app.employee_contacts (
			id, tenant_id, employee_id, contact_type, full_name, relationship,
			phone_primary, phone_secondary, email, address, notes, is_primary,
			created_at, updated_at
		) VALUES (
			:id, :tenant_id, :employee_id, :contact_type, :full_name, :relationship,
			:phone_primary, :phone_secondary, :email, :address, :notes, :is_primary,
			:created_at, :updated_at
		)`

	QSelectContactsByEmployee = `
		SELECT ` + EmployeeContactCols + `
		FROM app.employee_contacts
		WHERE employee_id = $1 AND deleted_at IS NULL
		ORDER BY is_primary DESC, created_at ASC`

	QSelectContactByID = `
		SELECT ` + EmployeeContactCols + `
		FROM app.employee_contacts
		WHERE id = $1 AND deleted_at IS NULL`

	QUpdateContact = `
		UPDATE app.employee_contacts SET
			contact_type = :contact_type,
			full_name = :full_name,
			relationship = :relationship,
			phone_primary = :phone_primary,
			phone_secondary = :phone_secondary,
			email = :email,
			address = :address,
			notes = :notes,
			is_primary = :is_primary,
			updated_at = :updated_at
		WHERE id = :id AND deleted_at IS NULL`

	QSoftDeleteContact = `
		UPDATE app.employee_contacts
		SET deleted_at = $2, updated_at = $2
		WHERE id = $1 AND deleted_at IS NULL`

	QClearPrimaryContacts = `
		UPDATE app.employee_contacts
		SET is_primary = false, updated_at = $2
		WHERE employee_id = $1 AND is_primary = true AND deleted_at IS NULL`
)
