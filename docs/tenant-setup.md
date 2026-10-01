# Tenant Setup

A tenant is one rental company. Every tenant is a real database row with its own products, designs, requests, billing state, integration credentials and Design Intelligence.

## Creating a tenant

### Self-service signup

A company can create its workspace at `https://rentsketch.com/business/signup.html`. The public signup endpoint creates the tenant, owner user, owner membership, and a 14-day trial. No credit card is required to begin the trial.

### Platform-admin / internal tenant

A platform admin can provision an internal or complimentary tenant directly when needed. Friendly Party Rental was originally provisioned this way.

## Customer designer

`https://rentsketch.com/designer/?tenant=YOUR_SLUG`

The designer loads tenant branding and products. Products can map to an existing shared visual, or use **Measured Generic Rental** for a neutral 2D/3D planning volume based on the supplied footprint when no dedicated model exists.

## Roles

`tenant_memberships.role` is enforced as:

- `viewer`: read-only requests and Sales Insights.
- `staff`: viewer access plus request status work, customer design review, quote approval and approved deposit links.
- `admin`: staff access plus product/catalog edits, branding, Stripe Connect, embed/domain configuration and visual audit.
- `owner`: admin access plus subscription billing and rental-system integration credentials.

Platform admins remain separately authorized by the configured platform-admin identity.

## Rental-system integration

Owners can create a one-time integration key in Dashboard → Install & share. Use the key with `POST /api/tenants/:slug/integrations/order-attribution` to return actual booked totals/line items from ERS, TapGoods, Goodshuffle or custom middleware.

Outbound signed webhook events include design and quote lifecycle events. See `docs/webhooks.md`.

## Billing and deposits

Business subscription checkout/portal uses Stripe when configured. Rental deposit checkout is separate: a staff member must approve the quote total first. The customer payment link is signed, and Checkout is created from the server-stored approved deposit amount, never from a browser-submitted layout estimate.
