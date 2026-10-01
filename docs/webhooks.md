# Webhooks and rental-system integration

RentSketch can notify a tenant backend about customer/design activity and can accept final booked-order attribution from an external rental system.

## Outbound webhook setup

Configure `webhookUrl` and `webhookSecret` on the tenant (admin role or higher). RentSketch signs the exact JSON request body with HMAC-SHA256 and sends the hex digest in `X-RentSketch-Signature`.

Live outbound event types:

- `design.created`
- `design.updated`
- `quote_request.created`
- `quote_request.approved`
- `quote_request.updated`
- `quote_request.booked`

Verify the signature using the configured webhook secret and a constant-time comparison.

## Inbound booked-order attribution

The tenant owner can create a dedicated integration key in Dashboard → Install & share. The raw key is shown once; RentSketch stores only its SHA-256 hash.

Endpoint:

`POST /api/tenants/:slug/integrations/order-attribution`

Header: `X-RentSketch-Integration-Key: rsi_...`

The JSON body accepts `quoteRequestId` or `designId`, required `externalOrderId`, `source`, `status` (`booked`, `updated`, or `canceled`), `orderTotalCents`, and `lineItems[]`.

This lets Sales Insights attribute real booked revenue and real booked line items without sharing a dashboard password.

## Delivery visibility

Outbound and inbound integration activity is recorded in `integration_events` and surfaced in the tenant integration panel. Outbound webhook delivery is still best-effort; there is no guaranteed retry queue. External systems should remain idempotent and can use quote/design IDs as reconciliation keys.
