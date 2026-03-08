# Debian pre-flight and submission status

## Pre-flight audit

- License file present (`LICENSE`, MIT/Expat compatible).
- Project metadata present (`README.md`, homepage, maintainer email).
- Dependency model identified from `requirements.txt`:
  - fastapi
  - uvicorn
  - jinja2
  - python-multipart
- Network access at build-time: not required for app runtime assets.
- Runtime model: Python FastAPI app serving local static files/templates.

## Packaging artifacts added

- `debian/control`
- `debian/changelog`
- `debian/rules`
- `debian/source/format`
- `debian/copyright`
- `debian/eos-breathing-room.install`
- `debian/eos-breathing-room.service`
- `debian/README.Debian`

## Sponsor workflow templates

- `debian/wnpp-itp-template.txt`
- `debian/rfs-template.txt`

## Remaining sponsor-side actions

1. File ITP bug in Debian BTS using `wnpp-itp-template.txt`.
2. Upload source package to mentors.debian.net.
3. File RFS bug using `rfs-template.txt`.
4. Iterate on sponsor feedback and lintian output.
