# Self-hosted captured-venue processing

`scripts/reconstruct-venue.mjs` is a runnable operator CLI, separate from the
existing browser depth preview. It never uploads photos to a reconstruction
provider, publishes an artifact, changes production configuration, or enables
customer navigation. The browser solver remains an estimated limited-depth
preview; this adapter is a foundation for a different, fully posed pipeline.

## Runtime and execution

Install a compatible COLMAP build on a controlled workstation or compute worker.
The CLI probes modern `FeatureExtraction/FeatureMatching.use_gpu` or older
`SiftExtraction/SiftMatching.use_gpu` options and runs sparse extraction/matching
on CPU. Dense PatchMatch needs a supported dense stereo runtime/GPU. The current
development environment has **no COLMAP executable**. Import and contract tests
run here; actual SfM/dense image reconstruction has not been run here.

Official processing reference: https://colmap.github.io/tutorial
Camera models: https://colmap.github.io/cameras.html

Prepare sharp overlapping JPG/PNG images. Keep the same lens/zoom for a shared
camera job. Avoid people moving through the scene. More coverage requires actual
additional viewpoints, not panning in place. Use `singleCamera:false` when image
intrinsics genuinely differ; grouping/calibration still needs operator review.

Create a job file next to an `images` directory:

```json
{
  "version": 1,
  "jobId": "venue-2026-001",
  "imagesDirectory": "images",
  "cameraModel": "SIMPLE_RADIAL",
  "singleCamera": true,
  "matching": "sequential"
}
```

```sh
node scripts/reconstruct-venue.mjs --job /captures/venue/job.json --output /jobs/venue-001 --dry-run
node scripts/reconstruct-venue.mjs --job /captures/venue/job.json --output /jobs/venue-001
node scripts/reconstruct-venue.mjs --job /captures/venue/job.json --output /jobs/venue-001-dense --dense
```

Use `--colmap /absolute/path/to/colmap` for a specific installation. Jobs require
a new or empty output directory. Source folders cannot contain symlinks.
Commands use structured arguments without a shell. Each stage writes state and
logs; failed stages remain failed and produce no completed venue artifact.
Multiple disconnected sparse components require review instead of a silent
largest-component choice or invented merge. Processing is explicit and local;
no production job queue, upload endpoint, runtime installation or worker hosting
is automatically provisioned by this tool.

## Scale and independent checks

First reconstruct an unscaled model. Review sparse point IDs against the actual
photos and identify stable, independently measured physical endpoints. For a
new job, add a **scale** segment and separate **checks**:

```json
{
  "scale": { "pointIds": [101, 205], "distanceFt": 12 },
  "checks": [
    { "id": "patio-width", "pointIds": [301, 407], "distanceFt": 8 },
    { "id": "rear-fence-span", "pointIds": [512, 638], "distanceFt": 15 }
  ]
}
```

These numbers are an example, not supplied measurements. Add these fields to
the original job. Reuse its reviewed COLMAP text model in a **new** output:

```sh
node scripts/reconstruct-venue.mjs --job /captures/venue/scaled-job.json --output /jobs/venue-001-checked --import-model /jobs/venue-001/colmap-text
```

Checks never alter scale, poses or points. Reusing the scale segment or
duplicating a check is rejected. A passing check only corroborates that segment,
within 5% or 0.25 ft, whichever is larger. It does not certify the venue. Multiple
checkpoints across depths and image regions are necessary for field evaluation.

## Artifact contract

`venue-artifact.json` contains versioned calibrated intrinsics, all registered
camera rotations/translations and centers, sparse points with observing image
IDs, source-image SHA-256 fingerprints, provenance, scale, independent residuals,
and optional local dense artifact paths. Its reprojection residuals are
recomputed from intrinsics/poses/observations, not invented quality scores.

Coordinates retain the COLMAP world orientation. Camera poses use COLMAP's
world-to-camera quaternion/translation convention; cameras look +Z with image
+Y down. Physical scale multiplies both points and camera translations. Without
a scale segment, units remain **arbitrary**. Ground alignment remains unresolved.
Dense PLY files retain original COLMAP units and require the recorded scale
factor. Poisson meshing can fill unsupported holes; its result is never assumed
to be observed or navigable everywhere.

All artifacts remain `reconstructed-unreviewed`, with
`eligibleForCustomerNavigation:false`, `siteDimensionsVerified:false` and
`mayClaimMetricAccuracy:false`. The current application does not automatically
import this artifact as a captured venue. Before that integration can be enabled,
review ground alignment, usable observed surfaces, occlusion/collision proxies,
novel-view quality, capture coverage, phone performance and representative field
accuracy. A visual mesh or splat must remain separate from verified measurements.

## Verification

```sh
node --test tests/reconstruction-artifact.test.mjs tests/scan-navigation.test.mjs
```

The known-model fixture is synthetic and the CLI test imports its actual text
files. Tests cover camera convention and scaling, independent checks, malformed
poses/tracks/path names, image fingerprints, unavailable runtime, fresh output,
and fail-closed release flags. They do **not** establish photo reconstruction
quality or field accuracy. No independently surveyed real-property dataset is
available in this repository.
