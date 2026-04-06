package domain

import "fmt"

// EmploymentStatus enumerates employee lifecycle states.
type EmploymentStatus string

const (
	StatusActive     EmploymentStatus = "active"
	StatusOnLeave    EmploymentStatus = "on_leave"
	StatusSuspended  EmploymentStatus = "suspended"
	StatusTerminated EmploymentStatus = "terminated"
	StatusRetired    EmploymentStatus = "retired"
)

// ValidStatuses lists all legal status values.
var ValidStatuses = []EmploymentStatus{
	StatusActive, StatusOnLeave, StatusSuspended, StatusTerminated, StatusRetired,
}

// IsValid reports whether the status is a known value.
func (s EmploymentStatus) IsValid() bool {
	switch s {
	case StatusActive, StatusOnLeave, StatusSuspended, StatusTerminated, StatusRetired:
		return true
	}
	return false
}

// String satisfies fmt.Stringer.
func (s EmploymentStatus) String() string { return string(s) }

// EmploymentType enumerates the contract arrangement.
type EmploymentType string

const (
	TypeFullTime  EmploymentType = "full_time"
	TypePartTime  EmploymentType = "part_time"
	TypeContract  EmploymentType = "contract"
	TypeIntern    EmploymentType = "intern"
	TypeFreelance EmploymentType = "freelance"
)

// IsValid reports whether the employment type is legal.
func (t EmploymentType) IsValid() bool {
	switch t {
	case TypeFullTime, TypePartTime, TypeContract, TypeIntern, TypeFreelance:
		return true
	}
	return false
}

// Gender enumerates gender values accepted by the DB check constraint.
type Gender string

const (
	GenderFemale    Gender = "kadın"
	GenderMale      Gender = "erkek"
	GenderUnknown   Gender = "belirtilmek_istemiyor"
	GenderOther     Gender = "diğer"
)

// IsValid reports whether the gender is legal.
func (g Gender) IsValid() bool {
	switch g {
	case GenderFemale, GenderMale, GenderUnknown, GenderOther:
		return true
	}
	return false
}

// MaritalStatus enumerates marital status values.
type MaritalStatus string

const (
	MaritalSingle   MaritalStatus = "bekâr"
	MaritalMarried  MaritalStatus = "evli"
	MaritalDivorced MaritalStatus = "boşanmış"
	MaritalWidowed  MaritalStatus = "dul"
	MaritalUnknown  MaritalStatus = "belirtilmek_istemiyor"
)

// IsValid reports whether the marital status is legal.
func (m MaritalStatus) IsValid() bool {
	switch m {
	case MaritalSingle, MaritalMarried, MaritalDivorced, MaritalWidowed, MaritalUnknown:
		return true
	}
	return false
}

// TerminationReason enumerates the reason an employee leaves.
type TerminationReason string

const (
	TermResignation   TerminationReason = "istifa"
	TermMutual        TerminationReason = "karşılıklı_fesih"
	TermContractEnd   TerminationReason = "iş_sözleşmesi_feshi"
	TermRetirement    TerminationReason = "emeklilik"
	TermEmployerFire  TerminationReason = "işveren_feshi"
	TermOther         TerminationReason = "diğer"
)

// IsValid reports whether the reason is legal.
func (r TerminationReason) IsValid() bool {
	switch r {
	case TermResignation, TermMutual, TermContractEnd, TermRetirement, TermEmployerFire, TermOther:
		return true
	}
	return false
}

// CanTransition reports whether an employee may move from one status to another.
// The state machine is permissive on administrative corrections but blocks
// illegal transitions (e.g. terminated -> terminated).
func CanTransition(from, to EmploymentStatus) bool {
	if !from.IsValid() || !to.IsValid() {
		return false
	}
	if from == to {
		return false
	}
	switch from {
	case StatusActive:
		// active can go anywhere else
		return true
	case StatusOnLeave:
		// on_leave -> active, suspended, terminated, retired
		return to != StatusOnLeave
	case StatusSuspended:
		return to == StatusActive || to == StatusTerminated
	case StatusTerminated:
		// terminated can only be reinstated to active
		return to == StatusActive
	case StatusRetired:
		return false
	}
	return false
}

// TransitionError explains why a transition was rejected.
type TransitionError struct {
	From EmploymentStatus
	To   EmploymentStatus
}

// Error satisfies error.
func (e *TransitionError) Error() string {
	return fmt.Sprintf("invalid status transition: %s -> %s", e.From, e.To)
}
