Title: Add Eos Breathing Room (net.eos.app)

## Summary

- Add metadata for `net.eos.app`.
- Add wrapper and bundled Android build variants.
- Include FOSS-only dependencies and no proprietary SDKs.

## Build details

- Repository: https://github.com/istax/eos.git
- Subdir: `android`
- Proposed builds:
  - `wrapperRelease`
  - `bundledRelease`

## Notes for reviewers

- `bundledRelease` is preferred as policy-friendly fallback.
- No tracking/analytics SDK included.
- License: MIT.
