# Workspace visual production verification

Captured with real Chromium 153 against the local designer and an isolated catalog/access/save API. These are test furniture scenes, not a claim about full production inventory or reconstructed venue accuracy.

Verified at 1440 × 1000, 390 × 844, and 320 × 740:

- At least one complete product card is visible immediately on each phone viewport, including its name and price.
- Expand / Reduce changes the mobile drawer while keeping controls in the viewport.
- Product photo, fallback, source-label, identity, and dimension provenance remain intact.
- Category selection, placement, chair choices and counts, duplication/rotation routes, 2D/3D switching, and Table Studio operate normally.
- Half-round table/chair registration agrees in actual 2D and Three meshes at four quarter turns.
- Exact product identities and placements survive a real isolated save/reload.
- The actual mobile Arrange panel moves multiple selected rentals as one action; one Undo restores them all.
- Duplicating a row adds unique objects with the exact product and chair quantities in the rental estimate; one Undo removes the row.

The furniture-plan and photo-plan DOM tests also verify that viewport resizing preserves plan orientation and that the explicit Turn plan control changes presentation without changing saved coordinates.

Commands:

```
node --test tests/inventory-media.test.mjs tests/arrangement.test.mjs
node --experimental-vm-modules tests/furniture-plan-dom.cjs
node --experimental-vm-modules tests/photo-plan-dom.cjs
node --experimental-vm-modules tests/premium-inventory-dom.cjs
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules RENTSKETCH_CHROMIUM=/tmp/rs-chrome/chromium RENTSKETCH_QA_OUT=docs/qa-visual-production-workspace node tests/furniture-catalog-browser.cjs
```

Snapshots were taken during the coordinated visual build. Final combined scene, material, camera, photo, and presentation verification is recorded separately.
