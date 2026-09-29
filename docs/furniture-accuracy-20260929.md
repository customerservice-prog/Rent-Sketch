# Phase 3: Friendly furniture photo-reference pass

Reference set: 14 active `fpr:` table/chair products retrieved from the live RentSketch catalog and matched by exact source slug to Friendly's public `/api/items` records on 2026-09-29. Reference pictures were downloaded from each Friendly website record's `picture` URL. Both angled and front views were generated with the same `makeTable`/`makeChair` production renderer.

## Scope

- Chairs: Gold, White and Mahogany Chiavari; White Plastic Folding; White Resin Folding; Cross-Back Farmhouse; Queen Tiffany Throne; King Throne.
- Tables: 5ft Round; 6ft Plastic Folding; 8ft Wood Banquet; Cocktail; Sweetheart 60in Half-Round; 4ft Fill & Chill.

## Corrections

Chiavari back spindles and lower stretchers, distinct flat resin supports versus thin tubular plastic supports, molded back/seat outlines, separate King/Queen structures, thicker ivory throne upholstery and frame detail. Bent folding table supports, protective dark rims, silver cocktail pedestal/feet and revised finish tones. The prior crossback/half-round renderer remains the underlying geometry, preserving its shape and seating contract.

The audit's furniture preview now renders the live production Three.js geometry rather than a cached illustrative PNG. Desktop/mobile browser tests exercise every current SKU, unknown products and context-loss fallback. A picture match is never an automatic approval.

## Runtime bugs caught by this pass

The pre-existing accessory inspector price string had a literal newline inside a quote, preventing module parsing. The pre-existing review request object had an extra closing brace. Both are repaired. Frontend syntax is checked across all modules before release, not inferred from Railway build status.

## Limits and unchanged data

The retrieved furniture rows contain no measured width/length metadata. Existing nominal/planning dimensions are preserved; photo proportions do not certify physical measurements. Full sculpted throne carvings, material/color under real lighting, exact hardware and upholstery details remain approximate. No approval statuses, live prices, inventory quantities, customer layouts, orders, leads or emails are changed by these geometry updates or QA captures.

## Regression contract

Stable product identity and variant SKU mapping, immutable scene data, table footprint/rotation, half-round same-side seating, exact chair instance quantities, linen preservation, bounded geometry, runtime syntax, and true 3D audit previews. Captured reports and screenshots are attached to the `Furniture accuracy evidence` and `Furniture audit browser verification` CI runs.
