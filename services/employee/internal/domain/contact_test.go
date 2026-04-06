package domain

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestEmergencyContact_Validate(t *testing.T) {
	c := &EmergencyContact{
		TenantID:     uuid.New(),
		EmployeeID:   uuid.New(),
		FullName:     "Anne Kişisi",
		PhonePrimary: "+905551111111",
	}
	c.ApplyDefaults()
	assert.NoError(t, c.Validate())
	assert.Equal(t, ContactEmergency, c.ContactType)
}

func TestEmergencyContact_ValidateErrors(t *testing.T) {
	c := &EmergencyContact{
		TenantID:     uuid.New(),
		EmployeeID:   uuid.New(),
		FullName:     "",
		PhonePrimary: "",
	}
	c.ApplyDefaults()
	err := c.Validate()
	assert.Error(t, err)
	ve, ok := err.(*ValidationError)
	assert.True(t, ok)
	assert.Contains(t, ve.Fields, "full_name")
	assert.Contains(t, ve.Fields, "phone_primary")
}

func TestEmergencyContact_InvalidEmail(t *testing.T) {
	badEmail := "not-an-email"
	c := &EmergencyContact{
		TenantID: uuid.New(), EmployeeID: uuid.New(),
		FullName: "X", PhonePrimary: "+905551111111",
		Email: &badEmail,
	}
	c.ApplyDefaults()
	err := c.Validate()
	assert.Error(t, err)
}

func TestRelationship_IsValid(t *testing.T) {
	assert.True(t, RelMother.IsValid())
	assert.True(t, RelFather.IsValid())
	assert.True(t, RelSpouse.IsValid())
	assert.False(t, Relationship("unknown").IsValid())
}

func TestContactType_IsValid(t *testing.T) {
	assert.True(t, ContactEmergency.IsValid())
	assert.True(t, ContactNextOfKin.IsValid())
	assert.False(t, ContactType("unknown").IsValid())
}
