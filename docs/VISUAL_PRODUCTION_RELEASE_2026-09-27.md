# RentSketch visual and planning release — 27 September 2026

## Product diagnosis

The previous result mixed three different promises: a dimensioned planning model,
a photograph with camera-matched rentals, and an estimated depth reconstruction.
Allowing an estimated photo mesh to orbit like a fully captured property exposed
unobserved surfaces, stretched images, and uncertain camera poses. Smoothing and
unlit photo materials could reduce artifacts, but could not recover the missing
observations. Backend deployment success was not evidence of visual quality.

The ordinary 3D model had separate weaknesses: inconsistent lighting between
views, uniform synthetic materials, prominent scenery boundaries, distant phone
cameras, rigid fabric, excessive point-light intensity, and space-consuming
controls. These needed direct visual changes and customer-flow verification.

The target remains one workspace where a customer can choose real inventory,
arrange it at meaningful dimensions, compare views, save a design, and produce a
clear proposal. Photographic appearance and dimensional authority must stay
separate. An attractive illustration does not verify product dimensions or safe
installation clearances.

## Implemented

| Area | Delivered behavior |
| --- | --- |
| Workspace | Compact inventory cards and introduction; responsive bottom drawer; stable 2D orientation with explicit Turn Plan; one designer workspace. |
| Arrangement | Multiple selection, edge/center alignment, equal gaps, group movement, repeated rows, bounds checks, connected dance floor, unique copies, exact rental quantities, and one-step Undo. |
| Lighting | Shared outdoor/studio reflection environment and lighting profiles; aligned sun direction; restrained night lighting; preserved photo exposure. |
| Materials | Physical-scale fabric weave, quieter wood grain, softer linen folds, tent sidewall drape, varied lawn and planting. |
| Motion | Local inflatable panel flex and bounce-floor compression with stationary bases; flowing water film; foam that emits, settles, and fades; running fan blur; controlled update rates and reduced-motion support. |
| Cameras | Larger phone framing, Overview/Entrance/Selected-item controls, saved close-ups, stable resize behavior, and Walk for modeled layouts with correct collision coordinates. |
| Assets | Versioned GLB manifest, integrity/budget validation, compact mobile variant, asynchronous fallback, isolated GPU ownership, and an original stanchion model family. |
| Staff | Product image/dimensions beside front/side/back/orbit model inspection. Inspection is read-only. |
| Photo Match | Guided measured ground calibration, explicit scale errors, lighting presets that preserve direction and masks, source exposure retained. |
| Estimated scans | Captured-viewpoint navigation, correct source aspect/horizon/roll projection, no unsupported orbit or free walk, explicit unverified geometry. |
| Presentation | Real PNG download, same-tab proposal, cover image, vector floor plan, rental quantities, browser print/PDF, six named views, and an optional saved opening view. Private crew/contact fields are excluded. |
| Performance | Sustained render-submission pressure changes resolution gradually; resize invalidates rendering; asynchronous assets cancel cleanly; shadow updates are throttled during motion. |
| Reconstruction foundation | Operator COLMAP CLI and validated artifact importer with full camera poses, source hashes, real reprojection residuals, separate physical scale and independent checks, and fail-closed publication flags. |

Existing catalog identities, prices, entitlement checks, placement dimensions,
and staff authorization remain authoritative. Visual asset availability never
silently changes a product's inventory or clearance requirements.

## Important limits

This release is an improved interactive planning product, **not a fully
photorealistic catalog or a verified property reconstruction service**.

- Most products, people, and surroundings remain procedural illustrations. One
  packaged GLB family is included. There is no new licensed skinned-guest library
  or complete authored model library for the most important rental SKUs.
- A single photograph cannot reveal the property behind the camera or behind
  foreground objects. Photo Match retains its known viewpoint.
- The browser scan still produces estimated limited-depth geometry. Captured
  viewpoints reduce misleading movement; they do not establish metric accuracy.
- The development environment has no COLMAP executable. The importer and job
  contract were tested with a known synthetic model; real SfM/dense processing
  was not run. No production reconstruction queue, worker, customer artifact
  import, or measured real-property benchmark is enabled by this release.
- Model inspection does not persist staff approval or certify manufacturer
  dimensions. Asset updates still require a reviewed software release.
- Render-submission timing is a responsiveness heuristic, not a true GPU frame
  benchmark or a guarantee for every phone.

## Verification and acceptance

Real Chromium verification uses isolated catalog, entitlement, and save APIs;
it does not place live bookings or charge customers. It exercises the actual
application, Three.js renderer, downloads, and print media. Evidence is retained
in the release QA directories and by the guided-preview CI workflow.

Coverage includes backyard, reception, and corporate layouts in 2D/day/night;
desktop and phone framing; 320/390px inventory and table detail; successful and
failed GLB loading; PNG composition; saved view persistence and reload; three
nonempty PDF pages; photo calibration and lighting controls; and model inspection.

Focused regressions cover arrangement bounds and Undo, material/mesh behavior,
asset lifecycle/security, camera normalization, photo projection, scan policy,
reconstruction artifact contracts, rendering hysteresis, and walking coordinates.
The existing Event Pass, ownership, sharing, dashboard session/MFA, tenant
isolation, upload, and private recovery suites remain release gates.

These checks establish tested behavior, not a claim that every security risk has
been found or that the rendered scene is photorealistic.

## Next production milestones

1. **Author the asset library.** Prioritize tents, prominent inflatables, tables,
   chairs, and linens by actual rental demand. Obtain consistent reference
   photography and measured dimensions; record usage rights; create standard
   and compact versions; inspect against real product photos. Replace generic
   human figures with licensed, rigged, restrained guest motion.
2. **Evaluate real venue captures.** Provision a controlled reconstruction
   runtime, process measured sample properties, review full camera poses and
   coverage, align ground, and compare independent dimensions. Keep failed or
   incomplete captures in Photo Match/captured-view mode.
3. **Integrate approved reconstructions.** Add resumable private uploads, bounded
   jobs, queue/worker monitoring, deletion/retention, reviewed collision proxies,
   and supported camera regions before enabling customer navigation. A visual
   mesh or splat is separate from authoritative measurements.
4. **Persist asset review.** Add per-SKU version provenance, review decisions,
   change history, rollback, and unavailable-model coverage reporting. Do not
   infer approval from an imported product count.
5. **Measure on actual phones and field setups.** Profile representative large
   scenes on target iOS/Android devices; collect capture failure rates and real
   installation feedback; tune budgets and simplify unsupported effects.

See `ASSET_PRODUCTION_CONTRACT.md` and `SELF_HOSTED_RECONSTRUCTION.md` for the
implemented contracts and exact boundaries.
