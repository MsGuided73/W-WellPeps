# Telehealth subdomain DNS

The telehealth backend is Scriptful's GEN Health platform. The intake / portal
subdomain (planned: `intake.wellpeps.com`) points at Scriptful, not at the
marketing site.

Legacy OpenLoop records (A, SendGrid CNAMEs, MX, ACME challenge) were retired
on 2026-09-11 and must not be re-added in Cloudflare.

When Scriptful supplies the custom-domain records from GEN Health
`/settings/branding`, record them here as `intake.wellpeps.com-dns-records.json`
so the Cloudflare zone can be reconciled against a known-good list.
