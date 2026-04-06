package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// JDRDemands captures the "İş Talepleri" (job demands) dimension of the
// Job Demands-Resources model. All scores are on a 1-10 scale.
type JDRDemands struct {
	Workload      int `json:"is_yuku"`
	Emotional     int `json:"duygusal_yuk"`
	Cognitive     int `json:"bilissel_yuk"`
	TimePressure  int `json:"zaman_baskisi"`
	RoleConflict  int `json:"rol_catismasi"`
	RoleAmbiguity int `json:"rol_belirsizligi"`
}

// JDRResources captures the "İş Kaynakları" (job resources) dimension.
type JDRResources struct {
	Autonomy         int `json:"ozerklik"`
	Feedback         int `json:"geri_bildirim"`
	SocialSupport    int `json:"sosyal_destek"`
	Growth           int `json:"gelisim_firsati"`
	SkillVariety     int `json:"beceri_cesitliligi"`
	TaskSignificance int `json:"gorev_onemi"`
}

// JDRProfile is the combined profile attached to a position.
type JDRProfile struct {
	Demands   JDRDemands   `json:"talepler"`
	Resources JDRResources `json:"kaynaklar"`
}

// Validate ensures all scores are within the 1-10 range (0 allowed for unset).
func (d *JDRDemands) Validate() error {
	for name, v := range map[string]int{
		"is_yuku":          d.Workload,
		"duygusal_yuk":     d.Emotional,
		"bilissel_yuk":     d.Cognitive,
		"zaman_baskisi":    d.TimePressure,
		"rol_catismasi":    d.RoleConflict,
		"rol_belirsizligi": d.RoleAmbiguity,
	} {
		if err := checkScore(name, v); err != nil {
			return err
		}
	}
	return nil
}

// Validate ensures all resource scores are within [0,10].
func (r *JDRResources) Validate() error {
	for name, v := range map[string]int{
		"ozerklik":              r.Autonomy,
		"geri_bildirim":         r.Feedback,
		"sosyal_destek":         r.SocialSupport,
		"gelisim_firsati":       r.Growth,
		"beceri_cesitliligi":    r.SkillVariety,
		"gorev_onemi":           r.TaskSignificance,
	} {
		if err := checkScore(name, v); err != nil {
			return err
		}
	}
	return nil
}

// Validate combines demands + resources validation.
func (p *JDRProfile) Validate() error {
	if err := p.Demands.Validate(); err != nil {
		return err
	}
	return p.Resources.Validate()
}

// DemandScore returns the mean of demand scores (ignoring zeros).
func (d *JDRDemands) DemandScore() float64 {
	return averageNonZero(d.Workload, d.Emotional, d.Cognitive, d.TimePressure, d.RoleConflict, d.RoleAmbiguity)
}

// ResourceScore returns the mean of resource scores (ignoring zeros).
func (r *JDRResources) ResourceScore() float64 {
	return averageNonZero(r.Autonomy, r.Feedback, r.SocialSupport, r.Growth, r.SkillVariety, r.TaskSignificance)
}

// BurnoutRiskProxy returns demands/resources ratio; higher => higher risk.
// Returns 0 when resources is zero (avoid divide-by-zero).
func (p *JDRProfile) BurnoutRiskProxy() float64 {
	d := p.Demands.DemandScore()
	r := p.Resources.ResourceScore()
	if r == 0 {
		return 0
	}
	return d / r
}

// --- Scanner / Valuer for sqlx JSONB columns ---

// Scan implements sql.Scanner for JDRDemands.
func (d *JDRDemands) Scan(src any) error {
	raw, err := toBytes(src)
	if err != nil {
		return err
	}
	if len(raw) == 0 {
		*d = JDRDemands{}
		return nil
	}
	return json.Unmarshal(raw, d)
}

// Value implements driver.Valuer for JDRDemands.
func (d JDRDemands) Value() (driver.Value, error) {
	return json.Marshal(d)
}

// Scan implements sql.Scanner for JDRResources.
func (r *JDRResources) Scan(src any) error {
	raw, err := toBytes(src)
	if err != nil {
		return err
	}
	if len(raw) == 0 {
		*r = JDRResources{}
		return nil
	}
	return json.Unmarshal(raw, r)
}

// Value implements driver.Valuer for JDRResources.
func (r JDRResources) Value() (driver.Value, error) {
	return json.Marshal(r)
}

func toBytes(src any) ([]byte, error) {
	if src == nil {
		return nil, nil
	}
	switch v := src.(type) {
	case []byte:
		return v, nil
	case string:
		return []byte(v), nil
	default:
		return nil, fmt.Errorf("jdr profile: unsupported scan type %T", src)
	}
}

func checkScore(name string, v int) error {
	if v < 0 || v > 10 {
		return fmt.Errorf("%s: %w", name, ErrInvalidJDRScore)
	}
	return nil
}

func averageNonZero(vs ...int) float64 {
	sum := 0
	n := 0
	for _, v := range vs {
		if v > 0 {
			sum += v
			n++
		}
	}
	if n == 0 {
		return 0
	}
	return float64(sum) / float64(n)
}
