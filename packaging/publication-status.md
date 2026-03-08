# Publication implementation status

## Debian

- Pre-flight audit: completed.
- Debian packaging skeleton: completed.
- Local package build attempt: blocked by missing build dependencies on host:
  - `debhelper-compat (= 13)`
  - `dh-python`
  - `python3-all`
- Lintian run: blocked until `lintian` is installed.
- ITP/RFS filing templates: prepared in `debian/`.

## F-Droid

- Android prototype: created in `android/`.
- Wrapper-first plus bundled fallback: implemented as product flavors.
- Metadata drafts: prepared in `fdroid/metadata/` and `android/fastlane/metadata/`.
- MR cover letter draft: prepared in `fdroid/mr-cover-letter.md`.
