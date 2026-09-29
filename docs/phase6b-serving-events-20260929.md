# Phase 6B — servingware, beverage stations and event equipment

Baseline: e20f7131fbeb41e0961b9c3310287024ace6d4fc, the deployed Phase 6A release retaining the rotated-table seating correction.

## Scope and evidence

This batch covers 43 explicit `fpr:` source records: 40 physical planning-model variants and three reference-only conflicts. The canonical Friendly website product photograph for each source was captured separately; the fresh reference capture verified one active tenant product and one website item per source slug. Names, prices, stock and rental terms are not inferred from those photographs. Matching a similar name cannot select these models.

The first actual rendered comparisons exposed problems not caught by identity tests. Before publication, the tray and utility-tub walls were rebuilt as continuous surfaces; the telephone dial was attached to its sloped housing; the dispenser's stacked-box seams were removed; round chafers received shallow cylindrical rims and the soup vessel a deeper body; the handwash basin was recessed; and backdrop leaves, texture scale and visual thickness were corrected. Model envelope scaling is now independent of scene scaling and equivalent materials are batched without dropping geometry.

## Appearance and selection

Servingware: separate rectangular lift-off, roll-top, round gold-handle, round silver-handle and deep soup chafers; black insulated 10-gallon and 2.5-gallon carriers; coffee urn; ribbed clear pitcher; metal wine bucket; black serving bowl; white rim bowl; flute and highball; connected tongs; gold cake server; shallow sheet pan; two metal shakers as one rental set; five-arm candelabra with empty candle cups; low gold 14-inch cake plateau; one three-tier stand; and glass/gold card box. These remain tabletop selections on an existing table, not extra freestanding machines. Selected per-table/per-seat quantities continue through the existing event summary.

Event equipment: open bus bin, white chest freezer, telephone-style audio guest book, illustrative oversized card examples, laptop, extra speaker/tripod, movie-screen package, patio heater, foot-pump handwashing unit, portable restroom, white arbor, circular wedding arch, mirror-style sign, easel, greenery panel, sequin curtain, barrel cover and tied leg drape. Source photos are product references, not promises that their pictured flowers, candles, signs, people, balloons, accounts, supplies or unrelated support furniture are included.

The movie-screen source remains one package. Its screen, projector, support, speaker and blower are shown as compact component previews from the source description, not separate billable lines or a measured projection/anchoring layout. The laptop and additional speaker remain their own products. Covers and drapes do not add barrels, ballast, poles or tents. The 2.5-gallon carrier's legacy slug begins `25-`; it must not be interpreted as a 25-gallon unit.

## Dimensions and unresolved references

Dimensions are source-supplied where usable fields exist; otherwise they are explicitly approximate planning profiles. A volume label does not establish physical size. The 8x8 backdrop designation describes its upright face, not an eight-foot-deep footprint. Only an explicit ground-depth field confirms a support footprint. Thin fabric/foliage geometry is not stretched across the approximate space reserved for supports. Existing saved positions, width/depth, model dimensions and rotation are not rewritten or automatically rearranged.

Three source conflicts deliberately have no claimed physical model:

- Glass Water Pitcher (64 oz): title/description say glass; the canonical photo shows a reflective metal pitcher.
- Round Gold Metal Display Dish: its single-dish title reuses the two tiered-stand photograph.
- Hexagon Wedding Arch: the canonical photo appears to show a peaked seven-sided frame rather than the named hexagon.

The audit explains each conflict. A previously saved selection retains its source identity and neutral footprint instead of silently receiving an unrelated shape. No product is automatically approved. Unpublished measurements, required clearances, structural strength, food-service suitability, heating/fuel requirements, restroom service, reflection fidelity and fine decorative artwork are not certified by the model.

## Integration and verification boundaries

The main customer renderer, legacy accessory adapter, tabletop rendering and catalog audit share the same model factories. The ordinary event-summary and Book Now code is retained. Exact source IDs, rental quantities and variant identity pass to Friendly's existing cart and checkout; prices, availability, delivery, tax and payment are resolved there. There is no separate booking database or calendar introduced by this batch.

Tests cover source-only identity, hidden-price identity retention, tabletop and set quantities, saved modern/legacy orientation, finite geometry and bounded material batches. Mesh tests inspect actual tray edge coverage, telephone dial attachment, open vessel interiors, frame openings and visual panel depth rather than relying only on labels. Existing Phase 6A, seating, linen and booking regressions are retained. Browser comparisons cover each source on desktop/mobile with explicit reference-conflict and unknown-product states.

Production byte verification and live mixed serving/equipment cart tests are separate from isolated QA. Only a completed production check establishes that the tested release is served. Browser test carts are isolated, non-read requests are blocked, and no real order, payment, email, calendar entry, price, inventory quantity or approval record is written. This batch is not the final full-catalog approval sweep.

Final inspection refinements: round chafer burner holders have connecting supports; spoon-ended tongs render both sides and remain joined; foliage uses a deterministic non-striped distribution. These are visual changes only, not fuel, extra utensils or added decorations.
