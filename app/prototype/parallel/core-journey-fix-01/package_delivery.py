from pathlib import Path
import hashlib,json,zipfile
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((R/'evidence/delivery-checks.json').read_text(encoding='utf-8'))['result']=='PASS'
archive=R/'Mini_Koala_CORE_JOURNEY_FIX_01_三项核心问题修复_2026-10-26.zip'
excluded={archive.name,'MANIFEST_SHA256.json','package-verification.json'}
files=[p for p in R.rglob('*') if p.is_file() and p.name not in excluded and not p.name.startswith('FAIL-') and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.log']]
manifest={str(p.relative_to(R)).replace('\\','/'):sha(p) for p in files}
(R/'MANIFEST_SHA256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in [*files,R/'MANIFEST_SHA256.json']:z.write(p,p.relative_to(R))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for n,h in manifest.items():assert hashlib.sha256(z.read(n)).hexdigest()==h,n
data={'file':archive.name,'sha256':sha(archive),'bytes':archive.stat().st_size,'files':len(manifest)+1,'manifest_entries':len(manifest),'crc':'PASS','member_hashes':'PASS'}
(R/'package-verification.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(data,ensure_ascii=False))
