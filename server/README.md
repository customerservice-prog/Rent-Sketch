# RentSketch Server

Production Node/Postgres backend for the multi-tenant RentSketch platform.

## Production capabilities

- Tenant/user/session authentication with MFA/account-security support.
- Enforced tenant roles: viewer, staff, admin, owner.
- Tenant products and shared visual mapping, including a measured generic physical-rental fallback.
- Persisted customer designs, revisions, alternatives and sharing.
- Quote-request pipeline with staff/customer notifications when mail is configured.
- Tenant Sales Insights / Design Intelligence with tenant-scoped hourly snapshots.
- Booked revenue and line-item attribution from the dashboard or external rental systems.
- Signed outbound design/quote webhooks and hashed inbound integration keys.
- Server-approved rental-deposit checkout through Stripe Connect.
- Event Pass checkout and recovery.
- Business subscription billing and Stripe customer portal.
- Self-service tenant signup.

## Core routes

- `GET /health`
- `POST /api/auth/login`
- `GET /api/tenants/:slug`
- `GET /api/tenants/:slug/products`
- `POST/PATCH /api/tenants/:slug/designs`
- `POST /api/tenants/:slug/quote-requests`
- `POST /api/tenants/:slug/quote-requests/:id/approve`
- `GET /api/tenants/:slug/quote-requests/:id/pay?token=...`
- `GET /api/tenants/:slug/design-intelligence`
- `GET /api/tenants/:slug/design-suggestions`
- `POST /api/tenants/:slug/integrations/order-attribution`

## Important payment boundary

A customer layout estimate is not payment authority. Rental deposits are created only after authenticated rental staff approve a quote total. The public payment URL contains a signed capability, while the amount itself is read from the server-side approved quote record.

## Remaining platform boundaries

RentSketch does not provide authoritative real-time rental availability unless an external rental system supplies it. Generic measured visual mapping preserves physical footprint and product identity but does not claim a photorealistic custom model. Outbound webhook delivery is best-effort and currently has no guaranteed retry queue.
