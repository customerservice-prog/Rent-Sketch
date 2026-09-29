# Phase 4: linens and tabletop accuracy

Source: Friendly public catalog and 40 website image references retrieved on 2026-09-29. The set includes 36 supported linen/tabletop rentals, three reference-only items (100ft aisle runner, linen clips, chair cover), and one bundle which is not a single 3D rental. No photo comparison automatically approves a product.

## Changes

- Read-only live website color enrichment joins exact, unique `fpr:` source slugs. Color options are not copied from a generic palette; failure/ambiguity stays unverified. Product prices, images, names, inventory and dimensions in storage are untouched.
- Round 90/108/120/132-inch cloth drops differ correctly on a nominal 60-inch table. Rectangular sizes are inches, not the accidentally named ft fields in imported linen records. Floor excess is shown rather than silently treating all cloths as floor length.
- The 60-inch fitted round cover and cocktail spandex cover have separate fit profiles. Spandex has a fitted waist and raised foot-pocket hems; polyester, satin and sequin use different materials. Coverage notes describe nominal calculations, not measured venue fits.
- Source-specific tabletop models: square 6-inch bread plate, fractional-size 10-5/8 dinner plate, clear-center chargers with clear/gold beads, distinct martini/wine/goblet/pilsner/mug/carafe shapes, shaped flatware and folded napkins. Marketing-photo extras are not automatically included.
- Main scene, Table Studio and Phase 4 audit share the production renderer. Existing scene positions, rotations, identities and quantities remain unchanged. Unsupported products do not get a fabricated replacement model.

## Limits

The footed-rocks glass photo shows a tall tumbler, conflicting with its name; the preview follows that photo and flags the conflict for review. Nominal plate/cloth sizes come from product titles. Other measurements and fine material/lighting properties remain planning approximations. Printed fabric detail and physical fit need owner/manufacturer confirmation. Existing website descriptions themselves contain inconsistent floor-length claims; this change does not rewrite them. No customer orders, emails, financial records or approval statuses are changed.

## Verification

The focused suite checks unit conversion, cloth drop, source/SKU matching, colors, outages, price preservation, geometry bounds, material differences and one-per-seat quantities. Browser evidence records each supported product at desktop and mobile sizes alongside the website image. The release is not considered live until the tested runtime files and the live color response are verified on production.
