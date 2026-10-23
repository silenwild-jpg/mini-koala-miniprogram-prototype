"""Validate packaged bytes and literal HTML/CSS links; dynamic navigation requires E2E."""
from pathlib import Path
import hashlib,json,re,sys,posixpath
from urllib.parse import unquote
root=Path(__file__).resolve().parents[1]
manifest=root/'RELEASE_MANIFEST.json'
def source_files():
 return sorted(p for p in root.rglob('*') if p.is_file() and p!=manifest and 'outputs' not in p.relative_to(root).parts and '__pycache__' not in p.parts)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if '--write-manifest' in sys.argv:
 # H01-007-S5: version string follows the candidate; an existing 'changes' record (docs/H01_007_CHANGE_MANIFEST.json summary) is carried over instead of being dropped on rewrite.
 prev=json.loads(manifest.read_text(encoding='utf-8')) if manifest.is_file() else {}
 payload={**prev,'version':prev.get('version','H01-007 P1 Minimal Fix Candidate 2026-10-13'),'baseline':prev.get('baseline','H01-004B Help Float Candidate 2026-10-13 (sha256 ed87033141944066265d3984ee4e10411d8ea6af84288eb9daabffc1e87c29ca) + H01-007 S1-S4'),'release_gate':'HOLD','scope':'Excludes generated outputs and Python cache','changes':prev.get('changes',[]),'files':[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in source_files()]}
 manifest.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Manifest written:',len(payload['files']));sys.exit(0)
if not manifest.is_file():raise SystemExit('FAIL: missing RELEASE_MANIFEST.json')
entries=json.loads(manifest.read_text(encoding='utf-8'))['files'];errors=[]
for entry in entries:
 p=root/entry['path']
 if not p.is_file():errors.append('Missing: '+entry['path'])
 elif digest(p)!=entry['sha256']:errors.append('Changed: '+entry['path'])
expected={entry['path'] for entry in entries};extra={p.relative_to(root).as_posix() for p in source_files()}-expected
if extra:errors.extend('Unlisted: '+p for p in sorted(extra))
checked=0
for p in [root/'index.html',root/'START_HERE.html',root/'H01_LIFESTYLE_START.html',*sorted((root/'prototype').rglob('*.html')),*sorted((root/'prototype').rglob('*.css'))]:
 s=p.read_text(encoding='utf-8');refs=[]
 if p.suffix=='.html':refs+=re.findall(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']',s,re.I)
 refs+=re.findall(r'url\(\s*["\']?([^\)"\']+)',s)
 for v in refs:
  if re.match(r'^(https?:|data:|tel:|mailto:|javascript:|#|//)',v):continue
  v=unquote(v.split('?')[0].split('#')[0])
  if not v or '${' in v:continue
  checked+=1
  if not (p.parent/v).is_file():errors.append('Broken literal link: '+str(p.relative_to(root))+' -> '+v)
print(json.dumps({'files_checked':len(entries),'literal_links_checked':checked,'errors':errors,'browser_e2e':'NOT_VERIFIED'},ensure_ascii=False,indent=2))
raise SystemExit(1 if errors else 0)
