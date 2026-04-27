# Remote Access Policy

**ID:** POL-11 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CISO
**Review cadence:** annual · **Frameworks:** SOC 2 CC6.6 · ISO 27001 A.6.7, A.8.1

## 1. Purpose
Secure remote access to UpCore production, corporate, and customer-data systems.

## 2. Scope
All remote connections by employees, contractors, and third parties.

## 3. Requirements
- Company-issued, MDM-enrolled device only.
- Full-disk encryption + EDR agent active.
- Strong Wi-Fi (WPA2+ or enterprise); no open networks without VPN.
- Screen lock ≤ 5 min, 15 min max.
- Work in non-public spaces when handling Restricted+.

## 4. Access paths
| System | Path | Auth |
|--------|------|------|
| Admin panel (`admin.upcore.io`) | Public HTTPS | Clerk SSO + MFA + IP allowlist |
| Production SSH | Azure Bastion only | SSH cert + MFA + PIM elevation |
| Production DB | Azure Bastion → jumphost → psql | Managed identity + PIM |
| Cloud console | Azure Portal | SSO + MFA + PIM |
| GitHub | SAML SSO | MFA (passkey preferred) |

## 5. Banned
- Direct SSH to production from non-Bastion paths.
- Splitting MFA factors across one device (TOTP + same-device push).
- Shared tunnels, port-forwarding to expose internal services on untrusted networks.
- Personal VPN services between laptop and UpCore (allowed only via corporate VPN).

## 6. Travel
- Notify People Ops + IT 7 days before high-risk travel (countries per TR MFA advisory).
- Optional clean laptop from IT pool.
- Mandatory password + key rotation on return.

## 7. Third parties
Time-boxed access (max contract duration); VPN + MFA; named accounts only.

## 8. Audit and evidence
- Bastion session recording retained 1 year.
- PIM elevation logs → Sentinel.
- Quarterly remote-access report to CISO.
