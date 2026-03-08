# F-Droid submission checklist

## What is prepared

- Android project in `android/` with two flavors:
  - `wrapper` (loads `https://eos-app.net/`)
  - `bundled` (loads bundled offline asset fallback)
- F-Droid metadata draft in `fdroid/metadata/net.eos.app.yml`
- fastlane metadata in `android/fastlane/metadata/android/en-US/`

## What to run before submitting MR

1. Build release APK/AAB locally for both flavors.
2. Confirm no proprietary SDK dependencies are used.
3. Confirm reproducibility notes and signed tags for release.
4. Generate screenshots for store metadata.
5. Submit metadata MR to `fdroiddata`.

## Submission notes

- Primary candidate: `bundledRelease` (more likely accepted by policy review).
- Keep `wrapperRelease` as fallback/experimental target.
