# Versioned rental assets

The release-owned manifest is `js/data/packaged-assets.js`. The initial shipped
asset is a black retractable-belt stanchion, with four material draw calls:

| Variant | Bytes | Triangles |
| --- | ---: | ---: |
| Standard | 740,640 | 7,672 |
| Compact | 290,624 | 2,984 |

This is a project-owned authored illustration. It is **not** a manufacturer
model, product scan, or measurement certification. Its nominal 1.2 × 1.2 × 3.2 ft
envelope is illustrative. Existing catalog dimensions, original placements,
operating clearances, prices, product IDs and rotations remain authoritative.

## Delivery and ownership

`enhancePlacedVisual` immediately returns a wrapper containing the procedural
fallback. A valid model replaces it only after download, bounded GLB validation,
SHA-256 integrity verification, parsing, and physical-bound checks. Failure keeps
the fallback. Unknown saved asset versions also retain the procedural model.

Only downloaded, validated bytes are cached (8 entries / 12 MiB). Concurrent
placements share one download; every placement owns separately parsed geometry,
materials and textures. Removing a placement cannot dispose another placement's
GPU resources. `cancelAssetLoad` must run before recursive renderer disposal.
Late loads are disposed and never attached to an obsolete scene.

Files are specified in meters with Y-up, +Z-forward and ground-center origins.
The loader converts meters to feet, normalizes the visual's origin, and fits the
saved item's local physical envelope. The parent renderer applies placement and
rotation exactly once. The loader never modifies the item or planning footprint.

## Security and budgets

Tenant data cannot supply URLs, manifest entries, extensions or codecs. Only
release-approved versioned `/assets/models/.../*.glb` paths resolve. Redirects
and credentials are disabled; downloads have a 15-second limit and stream byte
caps. The parser rejects external/data URIs, unsupported extensions, malformed
buffers/accessors, cyclic/shared node graphs and geometry/image budget excesses.
Embedded PNG/JPEG dimensions are limited to 2048 per axis. GLTFLoader permits
only internally generated blob resource requests after validation.

The first asset uses no textures, animations, external resource references or
third-party licenses. Mobile selects the compact model; slow/failed downloads
retain the already-available procedural visual.

## Review and adding assets

The authenticated Products screen has an **Inspect model** action for supported
equipment, furniture and tents. It shows catalog photo and supplied dimensions
beside a fixed public visual review page with front, side, back and orbit views.
The page exposes only public built-in model definitions. Closing it or losing the
parent staff session removes the preview and private product context.

Review is read-only. It does not approve manufacturer measurements or mutate a
tenant's product data. Asset replacement still passes through a software release.

To add a production model:

1. Obtain product/reference/texture usage rights and record their source.
2. Author standard and compact GLBs with the same grounded origin and envelope.
3. Keep product dimensions and clearance evidence separate from model appearance.
4. Create a new immutable version path and manifest entry, budgets and SHA-256.
5. Test model load, dimensions, selection IDs, lifecycle, failure fallback and
   desktop/mobile framing. Inspect front, back, side and material close-ups.
6. Ship the files and the manifest together. Never overwrite a released version.

Rebuild the initial original model with `node scripts/build-packaged-assets.mjs`
after installing the existing test dependencies. The deterministic output hashes
are checked by `tests/packaged-assets.test.mjs`. Any intentional geometry/material
change requires a new version and new hashes before release.

Full catalog model authoring, skinned-character production, manufacturer
certification, and staff-persisted approval workflows remain separate work.
