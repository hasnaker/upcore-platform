# Playbook 04 — DDoS / Volumetric Attack

**Severity default:** SEV-2 (degraded) / SEV-1 (sustained outage)

## Triggers
- Azure Front Door WAF rate-limit alerts.
- Latency spike + bandwidth saturation.
- L7 attack: surge on authentication / search endpoints.
- Extortion email ("pay or DDoS continues").

## Immediate (0–15 min)
1. IC declares, pages Platform + Networking.
2. Verify: is this DDoS (volumetric/protocol/application) or a real-traffic spike? Check geo, ASN, request-pattern anomalies in Front Door analytics.
3. Enable Azure DDoS Protection Standard if not already active (should be always-on for production).
4. Elevate WAF rules from Detection → Prevention for the attack signature.

## Contain
### Volumetric (L3/4)
- Azure DDoS Protection Standard absorbs; engage Azure DDoS Rapid Response team via portal ticket if > 10 Gbps.
- Geo-blocking if attack is from specific regions.

### Protocol (SYN flood, etc.)
- Front Door terminates TCP; typically absorbed automatically.

### Application (L7)
- Enable WAF managed rule `Microsoft_BotManagerRuleSet_1.0`.
- Rate-limit suspicious fingerprints (IP + header + path).
- Enable challenge (JS + CAPTCHA) on high-cost endpoints (signup, login, search).
- Shed load: throttle known-abusive tenants via api-gateway.

## Communicate
| Audience | When | How | Owner |
|----------|------|-----|-------|
| Status page | T+10 min of confirmed impact | Public status + RSS | Comms |
| Customers | If > 30 min impact | Email | Comms |
| Azure DDoS Rapid Response | For > 10 Gbps or sustained | Portal P1 | Ops |
| Law enforcement | If extortion received | SSM / Savcılık | Legal |

**Do NOT pay extortion.**

## Monitor & recover
- Watch traffic return to baseline.
- Keep WAF elevated 24 h post-attack.
- Review attack signature; add permanent rules if recurrent.

## Learn
- Did SLO breach? Update DR/BCP capacity plan.
- Were origin servers exposed? Move to private-link-only + WAF.
- Caching policy tightened (cache hit rate target: > 85% on public endpoints).

## Evidence checklist
- [ ] Traffic samples (pcap or Azure Flow Logs)
- [ ] Attack signature + rate
- [ ] WAF block counts
- [ ] Status-page history
- [ ] Azure support case numbers
