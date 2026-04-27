package domain

import "testing"

func TestPersonnelType_IsKamu(t *testing.T) {
	kamu := []PersonnelType{PersonnelType657, PersonnelType4B, PersonnelType4C}
	for _, p := range kamu {
		if !p.IsKamu() {
			t.Errorf("%s kamu olmalı", p)
		}
	}
	ozel := []PersonnelType{PersonnelType4857, PersonnelTypeStajyer, PersonnelTypeEmekliSozlesme}
	for _, p := range ozel {
		if p.IsKamu() {
			t.Errorf("%s kamu olmamalı", p)
		}
	}
}

func TestPersonnelType_RequiresKadro(t *testing.T) {
	if !PersonnelType657.RequiresKadro() {
		t.Error("657 kadro gerektirir")
	}
	for _, p := range []PersonnelType{PersonnelType4B, PersonnelType4C, PersonnelType4857} {
		if p.RequiresKadro() {
			t.Errorf("%s kadro gerektirmemeli", p)
		}
	}
}

func TestKadroCoords_Validate(t *testing.T) {
	good := KadroCoords{KadroDerece: 5, Kademe: 3, HizmetSinifi: HizmetGIH}
	if err := good.Validate(); err != nil {
		t.Errorf("valid kadro: %v", err)
	}

	bad := KadroCoords{KadroDerece: 20, Kademe: 3}
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["kadro_derece"] != "must_be_1_to_15" {
		t.Errorf("expected derece error: %v", err)
	}

	badSinifi := KadroCoords{KadroDerece: 5, Kademe: 3, HizmetSinifi: "XX"}
	err = badSinifi.Validate()
	ve, _ = err.(*ValidationError)
	if ve == nil || ve.Fields["hizmet_sinifi"] != "invalid" {
		t.Errorf("expected hizmet_sinifi error: %v", err)
	}
}

func TestHizmetSinifi_IsValid(t *testing.T) {
	all := []HizmetSinifi{HizmetGIH, HizmetTH, HizmetSH, HizmetEOH, HizmetAH, HizmetDH, HizmetMBH, HizmetEH, HizmetYH}
	for _, h := range all {
		if !h.IsValid() {
			t.Errorf("%s valid olmalı", h)
		}
	}
}

func TestPersonnelType_IsValid(t *testing.T) {
	all := []PersonnelType{
		PersonnelType657, PersonnelType4B, PersonnelType4C,
		PersonnelType4857, PersonnelTypeStajyer, PersonnelTypeEmekliSozlesme,
	}
	for _, p := range all {
		if !p.IsValid() {
			t.Errorf("%s valid olmalı", p)
		}
	}
	if PersonnelType("bogus").IsValid() {
		t.Error("bilinmeyen tip invalid olmalı")
	}
}
