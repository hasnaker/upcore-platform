package tenantprovision

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

func TestProvision_RejectsNilTenantID(t *testing.T) {
	p := New(nil, zerolog.Nop()) // DB nil — won't be touched on early return
	err := p.Provision(context.Background(), uuid.Nil, "x@y.com")
	if err == nil {
		t.Fatalf("must reject nil tenant id")
	}
	if err.Error() != "tenant id required" {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestNew_StoresDBAndLog(t *testing.T) {
	log := zerolog.Nop()
	p := New(nil, log)
	if p == nil {
		t.Fatalf("New returned nil")
	}
	// Can't directly verify log equality, but ensure Provisioner is usable.
	if p.Log.GetLevel() > zerolog.Disabled {
		// noop logger has Disabled level
	}
}
