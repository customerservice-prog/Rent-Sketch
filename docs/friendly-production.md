# Friendly Party Rental in Production: Current State

This is the current production-state companion for the RentSketch multi-tenant customer-planning platform.

## What is live

- Postgres-backed tenants, users, memberships, products, designs, revisions, quote requests, payments, integrations and Design Intelligence.
- Friendly Party Rental (`friendly`) and Friendly Party Rental NYC (`friendly-nyc`) are independent real tenants.
- The public designer loads tenant branding and product data from the API.
- Customer layouts persist as real projects, revisions and alternatives.
- Quote requests are persisted, shown in the tenant dashboard, can notify staff/customer by email when mail delivery is configured, and can emit signed webhook events.
- Sales Insights is tenant-scoped and excludes QA/synthetic and empty layout rows from learning.
- Hourly tenant intelligence snapshots support 7/30/90-day trends once enough actual snapshot history exists.
- Final booked order totals and line items can be recorded manually or returned by a rental-system integration for real revenue attribution.
- Staff can approve a quote total and issue a signed deposit-payment link. Stripe Checkout is created only from the server-stored approved total/deposit; a customer layout estimate is never charge authority.
- Stripe business subscriptions, Event Pass checkout, and Stripe Connect deposit settlement are live paths where configured.
- Self-service business signup creates a tenant owner and 14-day trial.
- Hosted links, iframe embeds and the versioned embed loader are live.

## Visual mapping

Tenant products can select a shared visual model in the Products dashboard. Products without a dedicated audited model can use the explicit **Measured Generic Rental** visual. That path preserves the tenant product identity and measured footprint in 2D/3D rather than silently dropping the item. A measured generic planning volume is not a claim that RentSketch has reproduced the product's exact appearance.

Dedicated procedural/photo-referenced models still require visual audit for physical accuracy.

## Roles

Tenant roles are enforced as a hierarchy:

- **viewer** — read-only tenant views such as requests and Sales Insights.
- **staff** — sales/request work, customer design review and quote approval.
- **admin** — staff capabilities plus product/catalog, branding, Stripe Connect and install/domain configuration.
- **owner** — admin capabilities plus subscription billing and integration credential rotation.
- **platform_admin** — RentSketch operator access across tenants.

Server authorization remains authoritative even when UI controls are hidden.

## Notifications

When mail delivery is configured, a new quote request can send a staff notification to the tenant contact email and a customer receipt that lists the submitted setup and explicitly states that nothing is booked or charged until the rental company confirms it.

Webhook/integration delivery is separate and documented in `docs/webhooks.md`.

## Important boundaries

RentSketch does **not** claim real-time rental availability unless a supported external system provides it. A design or visual suggestion is planning guidance, not a site/installation approval. Tenant Sales Insights does not invent sales-lift percentages; booked revenue appears only when an actual booked total is recorded or returned by an integration. Photo Match and scan-derived context must retain their existing uncertainty/measurement disclosures.
