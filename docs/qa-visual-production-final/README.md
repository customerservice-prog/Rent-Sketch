# Visual production QA — September 27, 2026

Verified the integrated `codex/visual-production-rebuild` working tree with real Chromium 153, WebGL/SwiftShader, and the production application modules. The test uses isolated catalog, entitlement, save, and restore endpoints; no customer project or production API was changed.

Run `NODE_PATH=<playwright-node-modules> RENTSKETCH_CHROMIUM=<optional-browser-path> node tests/visual-production-browser.cjs`. Set `RENTSKETCH_QA_OUT=qa-visual-production` in CI to retain its complete evidence. The default output is outside the checkout at `../qa-visual-production`.

## Verified

- Backyard birthday, 20×40 pole-tent reception, and 30×40 frame-tent company gathering at 1440px and 390px; actual 2D, daytime WebGL, and nighttime WebGL.
- Table Studio and rental catalog at 1440px, 390px, and 320px, without document horizontal overflow.
- Standard GLB delivery and real browser parsing; preserved placement and footprint; visible procedural fallback when the model download is blocked.
- PNG download at 2048×1267 with nonblank pixels; unchanged rental placements after export.
- Presentation on desktop and phone; named camera and opening view retained through actual fixture API save and page reload.
- Actual print CSS and generated three-page PDF: cover image, vector floor plan, rental quantities. All pages contain text.
- Photo scale setup at 390px/320px; invalid measurement rejected; measured width/depth accepted; all three workflow steps visible; overcast preset preserves the entered light direction.
- A photo-placed half-round table duplicated through the real Arrange dialog: original canonical coordinates/dimensions/rotation retained, copy advances by its rotated photo footprint plus the requested gap, and one Undo restores the complete prior scene.
- Ordinary Walk does not swallow `W/A/S/D` letters while typing into rental search.
- Model review's front, side, back, and overview controls, including mobile.

Both runs had zero JavaScript page errors. The first full run logged fixture-only `analytics-config.js` 404s; the fixture now serves an empty analytics configuration. The subsequent focused run has zero console errors, with only the intentional signed-out staff `/auth/me` 401 responses. Full and follow-up results remain separate in `results.json`.

## Evidence boundaries

These are deliberately composed QA layouts using supported Friendly visual profiles and a catalog subset; they do not establish live stock, availability, or prices. The photo is a deterministic interaction fixture, not a real property or a reconstruction-accuracy demonstration. Procedural surroundings remain illustrative. The shipped packaged stanchion is an authored illustration with unverified dimensions.

This software-rendered browser run does not establish frame rates on physical phones, surveyed property accuracy, or production deployment status. Those require separate evidence.

Eight representative screenshots are retained here; the full reproducible suite writes additional views, the downloaded PNG, and the PDF to its output directory.
