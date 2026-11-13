"""Prepare source-preserving A reference and export its exact embedded images."""
from pathlib import Path
import base64, re, hashlib, json, subprocess

root = Path(__file__).resolve().parents[1]
demo = root / 'demo'
source = demo / 's01-r2-live.html'
raw_bytes = subprocess.check_output(['git', 'show', 'f67505dcf27d724b4378d195e13424fb95f77eb2:app/prototype/parallel/core-journey-fix-01/demo/s01-r2-live.html'], cwd=root)
raw = raw_bytes.decode('utf-8')
photos = re.findall(r'src="(data:image/[^" ]+)"', raw)
assert len(photos) == 2
assets = demo / 'assets'
records = []
for i, photo in enumerate(photos, 1):
    data = base64.b64decode(photo.split(',', 1)[1])
    (assets / f's01-r2-a-{i}.webp').write_bytes(data)
    records.append({'asset': f's01-r2-a-{i}.webp', 'sha256': hashlib.sha256(data).hexdigest()})
evidence = root / 'evidence' / 'vis-rebuild-03c'
evidence.mkdir(parents=True, exist_ok=True)
# Frozen PR26 static template before dynamic binding; never change this to improve a score.
(evidence / 'A-R2-reference.html').write_text(raw.replace('  <script src="s01-r2-bind.js"></script>', ''), encoding='utf-8')
(evidence / 'reference-source.json').write_text(json.dumps({'base': 'f67505dcf27d724b4378d195e13424fb95f77eb2', 'template_sha256': hashlib.sha256(raw_bytes).hexdigest(), 'photos': records}, indent=2), encoding='utf-8')
print('A_REFERENCE_EXPORTED', records)
