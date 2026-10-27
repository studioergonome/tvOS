"""Check the actual archive, including CSP hashes after the LG packager runs."""
import base64,hashlib,io,json,re,subprocess,sys,tarfile
from pathlib import Path
package=Path(sys.argv[1])
archive=tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['ar','p',str(package),'data.tar.gz'])),mode='r:gz')
files={m.name for m in archive.getmembers() if m.isfile()}
root='usr/palm/applications/com.tvos.launcher/'
manifest=json.loads(archive.extractfile(root+'appinfo.json').read())
assert manifest['id']=='com.tvos.launcher' and manifest['title']=='tvOS'
for key in ('main','icon','largeIcon'):assert root+manifest[key] in files,key
assert not any('node_modules' in f or '/reference/' in f or f.endswith(('.m3u','.env','.map')) for f in files)
html=archive.extractfile(root+'index.html').read().decode()
csp=re.search(r'http-equiv="Content-Security-Policy" content="([^"]*)',html).group(1)
assert "'unsafe-inline'" not in csp and "'unsafe-eval'" not in csp
for tag,expected in [('style',1),('script',2)]:
    chunks=re.findall('<'+tag+r'>([\s\S]*?)</'+tag+'>',html)
    assert len(chunks)==expected,(tag,len(chunks))
    for text in chunks:
        digest=base64.b64encode(hashlib.sha256(text.encode()).digest()).decode()
        assert "'sha256-"+digest+"'" in csp,tag+' hash mismatch'
assert '<script src=' not in html and '<link rel="stylesheet"' not in html
print('Verified archive resources, embedded-code hashes and private-file exclusions.')
