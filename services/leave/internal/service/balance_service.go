package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/leave/internal/calculator"
	"github.com/upcore/leave/internal/domain"
	"github.com/upcore/leave/internal/event"
	"github.com/upcore/leave/internal/repository"
)

// EmployeeLookup abstracts the tenure/age info needed to compute balance.
// Implementations should talk to the employee service (HTTP or a cached view).
type EmployeeLookup interface {
	Get(ctx context.Context, tenantID, employeeID uuid.UUID) (hireDate, birthDate time.Time, err error)
}

// StaticEmployeeLookup is a deterministic lookup used for tests / local dev.
type StaticEmployeeLookup struct {
	HireDate  time.Time
	BirthDate time.Time
}

// Get implements EmployeeLookup.
func (l StaticEmployeeLookup) Get(_ context.Context, _ uuid.UUID, _ uuid.UUID) (time.Time, time.Time, error) {
	return l.HireDate, l.BirthDate, nil
}

// BalanceService computes and maintains balances.
type BalanceService struct {
	tx              TxRunner
	balances        repository.LeaveBalanceRepository
	types           repository.LeaveTypeRepository
	publisher       event.Publisher
	carryOverDefault int
	proRateFirstYear bool
	log              zerolog.Logger
}

// NewBalanceService constructs a balance service.
func NewBalanceService(
	tx TxRunner,
	balances repository.LeaveBalanceRepository,
	types repository.LeaveTypeRepository,
	publisher event.Publisher,
	carryOverDefault int,
	proRateFirstYear bool,
	log zerolog.Logger,
) *BalanceService {
	return &BalanceService{
		tx: tx, balances: balances, types: types, publisher: publisher,
		carryOverDefault: carryOverDefault, proRateFirstYear: proRateFirstYear, log: log,
	}
}

// Get returns all balances for an employee in a given year.
func (s *BalanceService) Get(ctx context.Context, tenantID, employeeID uuid.UUID, year int) ([]*domain.LeaveBalance, error) {
	if year == 0 {
		year = time.Now().UTC().Year()
	}
	return s.balances.ListByEmployee(ctx, tenantID, employeeID, year)
}

// EnsureAnnualBalance computes (or refreshes) the annual balance for an
// employee + year. Safe to call repeatedly: it recalculates `accrued_days`
// without touching `used/pending`. Returns the bracket leave type ID and the
// updated balance.
func (s *BalanceService) EnsureAnnualBalance(ctx context.Context, tenantID, employeeID uuid.UUID, year int, lookup EmployeeLookup) (*domain.LeaveBalance, error) {
	hire, birth, err := lookup.Get(ctx, tenantID, employeeID)
	if err != nil {
		return nil, err
	}
	accrued := calculator.ComputeYearlyAccrual(hire, birth, year, s.proRateFirstYear)
	// choose the correct bracket leave type
	code := yillikCodeForTenure(calculator.TenureMonths(hire, time.Date(year, 12, 31, 0, 0, 0, 0, time.UTC)))
	lt, err := s.types.GetByCode(ctx, code, tenantID)
	if err != nil {
		return nil, err
	}
	var balance *domain.LeaveBalance
	err = s.tx.RunInTx(ctx, func(tx repository.Querier) error {
		existing, err := s.balances.Get(ctx, tenantID, employeeID, lt.ID, year)
		if err != nil && !errors.Is(err, domain.ErrLeaveBalanceNotFound) {
			return err
		}
		now := time.Now().UTC()
		if existing == nil {
			b := &domain.LeaveBalance{
				TenantID:      tenantID,
				EmployeeID:    employeeID,
				LeaveTypeID:   lt.ID,
				Year:          year,
				AccruedDays:   accrued,
				LastAccrualAt: &now,
			}
			if err := s.balances.Create(ctx, tx, b); err != nil {
				return err
			}
			balance = b
			return nil
		}
		// update accrued only
		existing.AccruedDays = accrued
		existing.LastAccrualAt = &now
		if err := s.balances.UpdateAbsolute(ctx, tx, existing); err != nil {
			return err
		}
		balance = existing
		return nil
	})
	if err != nil {
		return nil, err
	}

	_ = s.publisher.Publish(ctx, event.TopicBalanceAccrued, event.BalanceUpdated{
		TenantID: tenantID, EmployeeID: employeeID, LeaveTypeID: lt.ID, Year: year,
		RemainingDays: balance.Available(), UpdatedAt: time.Now().UTC(),
	})
	return balance, nil
}

// CarryOver moves unused days from a prior year into the current year, capped
// at 2x annual entitlement (per 4857 common practice).
func (s *BalanceService) CarryOver(ctx context.Context, tenantID, employeeID uuid.UUID, fromYear int, lookup EmployeeLookup) error {
	hire, birth, err := lookup.Get(ctx, tenantID, employeeID)
	if err != nil {
		return err
	}
	entitlement := calculator.EntitlementAsOf(hire, birth, time.Date(fromYear, 12, 31, 0, 0, 0, 0, time.UTC))
	capDays := float64(domain.MaxCarryOver(entitlement))
	toYear := fromYear + 1

	balances, err := s.balances.ListByEmployee(ctx, tenantID, employeeID, fromYear)
	if err != nil {
		return err
	}
	return s.tx.RunInTx(ctx, func(tx repository.Querier) error {
		for _, b := range balances {
			available := b.Available()
			amount := calculator.CarryOverAmount(available, capDays)
			if amount <= 0 {
				continue
			}
			// fetch target year balance (create if missing)
			target, err := s.balances.Get(ctx, tenantID, employeeID, b.LeaveTypeID, toYear)
			if err != nil && !errors.Is(err, domain.ErrLeaveBalanceNotFound) {
				return err
			}
			if target == nil {
				if err := s.balances.Create(ctx, tx, &domain.LeaveBalance{
					TenantID: tenantID, EmployeeID: employeeID, LeaveTypeID: b.LeaveTypeID,
					Year: toYear, CarriedOver: amount,
				}); err != nil {
					return err
				}
				continue
			}
			if _, err := s.balances.ApplyDelta(ctx, tx, tenantID, employeeID, b.LeaveTypeID, toYear,
				repository.BalanceDelta{CarriedOver: amount}); err != nil {
				return err
			}
		}
		return nil
	})
}

// Adjust makes a manual admin adjustment to a balance (positive or negative).
// Creates a zero balance row on the fly when none exists yet.
func (s *BalanceService) Adjust(ctx context.Context, tenantID, employeeID, leaveTypeID uuid.UUID, year int, delta float64, reason string) error {
	return s.tx.RunInTx(ctx, func(tx repository.Querier) error {
		if _, err := s.balances.Get(ctx, tenantID, employeeID, leaveTypeID, year); err != nil {
			if !errors.Is(err, domain.ErrLeaveBalanceNotFound) {
				return err
			}
			if err := s.balances.Create(ctx, tx, &domain.LeaveBalance{
				TenantID: tenantID, EmployeeID: employeeID, LeaveTypeID: leaveTypeID, Year: year,
			}); err != nil {
				return err
			}
		}
		_, err := s.balances.ApplyDelta(ctx, tx, tenantID, employeeID, leaveTypeID, year,
			repository.BalanceDelta{Adjusted: delta})
		if err != nil {
			return err
		}
		s.log.Info().Str("employee_id", employeeID.String()).Float64("delta", delta).
			Str("reason", reason).Msg("balance adjusted")
		return nil
	})
}

// yillikCodeForTenure selects the correct seed code for an employee's tenure.
func yillikCodeForTenure(tenureMonths int) string {
	tenureYears := tenureMonths / 12
	switch {
	case tenureYears < 5:
		return domain.CodeYillik1_5Yil
	case tenureYears < 15:
		return domain.CodeYillik5_15Yil
	default:
		return domain.CodeYillik15PlusYil
	}
}
