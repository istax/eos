# Eos Breathing Room

Eos is a guided breathing and mindfulness web app with gentle audio cues,
custom breathing patterns, and PWA/offline support.

## Local development

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000`.

## Static deployment

The live static bundle is in `docs/` and is published via GitHub Pages/custom
domain.

## Licensing

This project is released under the MIT License. See `LICENSE`.

## Packaging targets

- Debian package sources in `debian/`
- Android/F-Droid wrapper prototype in `android/`
