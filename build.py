from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re, hashlib, json

root = Path(__file__).resolve().parent

def read(name):
    return (root / name).read_text('utf-8-sig')

def module(name, binding=None, preamble=''):
    source = read(name)
    names = re.findall(r'^export (?:function|class|const) (\w+)', source, re.M)
    source = re.sub(r'^import .*;\n', '', source, flags=re.M)
    source = re.sub(r'^export ', '', source, flags=re.M)
    if binding:
        return f'const {binding}=(()=>{{\n{preamble}\n{source}\nreturn {{{",".join(names)}}};\n}})();\n'
    return source

js = module('core.mjs','Core') + module('view.mjs','Graphics','const {jobs,papers}=Core;')
js += module('sdk.mjs','Host') + 'const C=Core,{View}=Graphics,{bridge}=Host;\n' + module('app.mjs')
html = read('index-source.html').replace('<link rel="stylesheet" href="style.css">', '<style>'+read('style.css')+'</style>')
html = html.replace('<script type="module" src="app.mjs"></script>', '<script>(()=>{\n'+js+'\n})();</script>')
for name in ('index.html','standalone.html'):
    (root / name).write_text(html,'utf-8',newline='\n')
archive = root.parent / 'PARCEL-PRESS.zip'
with ZipFile(archive,'w',ZIP_DEFLATED,compresslevel=9) as zipped:
    for file in sorted(root.iterdir()):
        if file.is_file():
            zipped.write(file,file.name)
with ZipFile(archive) as zipped:
    assert zipped.testzip() is None
    assert zipped.read('index.html') == zipped.read('standalone.html')
    assert all(zipped.read(name) == (root/name).read_bytes() for name in zipped.namelist())
    data = {'files':len(zipped.namelist()),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
(root.parent/'parcel-press-package.json').write_text(json.dumps(data,indent=2),'utf-8')
print(json.dumps(data))
