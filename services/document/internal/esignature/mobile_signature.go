package esignature

// NewEImzalaProvider returns a provider bound to the e-İmzala API (V1 stub).
// Real integration lands in V2 once the provider contract is finalised.
func NewEImzalaProvider(apiKey, baseURL string) ESignatureProvider {
	// V1: both credentials are accepted but ignored — behaviour is identical
	// to the stub provider and keyed by the "eimzala" name so callers can
	// differentiate the session source.
	_ = apiKey
	_ = baseURL
	return NewStubProvider("eimzala")
}

// NewKamuSMProvider returns a provider bound to the Kamu SM QES gateway.
// V1 stub — real API integration lands in V2.
func NewKamuSMProvider(apiKey string) ESignatureProvider {
	_ = apiKey
	return NewStubProvider("kamu_sm")
}

// NewEDevletProvider returns a provider bound to the e-Devlet mobile
// signature (SMS OTP + signature). V1 stub.
func NewEDevletProvider(clientID string) ESignatureProvider {
	_ = clientID
	return NewStubProvider("edevlet")
}

// NewMobileSignatureProvider returns a provider bound to the generic GSM
// operator mobile-imza SOAP gateway. V1 stub.
func NewMobileSignatureProvider() ESignatureProvider {
	return NewStubProvider("mobile")
}
