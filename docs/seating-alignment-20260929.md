# Rotated-table seating alignment — 2026-09-29

The owner screenshot showed guests outside their chairs and intersecting two red rectangular tables. The defect was reproduced against production a55f64fb2ce883fad078eb128194e38470176349 using actual table/chair meshes and the production scene placement function.

## Cause and correction

The normal editor rotates a table by swapping its saved width/depth and advancing its angle. Unlike accessories and half-round tables, ordinary editor-owned tables were not recognized as holding an already-oriented footprint. The scene built the table from that swapped footprint and rotated its model again. Guest positions, generated independently from seating data, then disagreed with rendered chairs.

The correction recovers table-local dimensions for editor-owned saves, builds tables/chairs/linens/tabletop items locally, and applies the scene rotation once. Guest positions and 2D seats use the same local seat pattern plus one rotation. Decorative table styling follows that transform as well. Photo placement resolves local dimensions before applying its independent angle. Table collision bounds now follow the same physical footprint.

No save migration or automatic rearrangement is performed. Original IDs, positions, dimensions as stored, rotations, seats, chair choices, linen choices and rental identities remain intact. An explicit footprintOriented:false continues to represent an unswapped model-space item. Generic unflagged rectangles without tableId retain their prior semantics.

## Verification

The isolated mesh regression covers 224 combinations of table type, chair style, seat count and quarter-turn angle, checking guest centers/facing against actual rendered chair instance transforms and checking physical tabletop bounds. Editor tests exercise real rotation, duplication, matching chairs/linens, JSON save/reload, undo and redo. Photo tests include independent and arbitrary-angle placement. Existing furniture, photo, guest and Book Now contract tests are retained.

A browser harness runs the actual RentSketch renderer, compares the previous production implementation with this correction, and captures seated scenes at desktop and mobile sizes. It explicitly requires the baseline to fail alignment before accepting the correction. Production deployment and served-file verification are separate from this isolated QA.

## Boundaries

This repairs render/seat orientation; it does not invent additional space or rearrange genuinely overlapping customer rentals. The decorative crowd remains capped on mobile and does not change rental seat quantities. No guest-model artwork, pricing, stock, checkout/payment/calendar code, customer order or visual-approval record is changed. Phase 6 accessory work remains separate.
