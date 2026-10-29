import json,hashlib,urllib.request,concurrent.futures
from pathlib import Path
base='https://test.touhou.vip/'
def get(path,small=False):
 req=urllib.request.Request(base+path,headers={'Range':'bytes=0-0'} if small else {})
 with urllib.request.urlopen(req,timeout=40) as r:return r.status,dict(r.headers),r.read(),r.url
m=json.loads(get('runtime-manifest.json')[2]);receipt=json.loads(Path('artifacts/th13-port-20261029/deployment-receipt.json').read_text());assert {g['root']:g['current']['generation'] for g in m['groups']}==receipt['runtimeGenerations']
def check(g):
 c=g['current'];root=g['root']+c['generation']+'/'
 names=c['files'] if g['root']=='runtime/th13/' else [next(f for f in c['files'] if f['path']==c['entry'])]
 for f in names:
  st,h,b,url=get(root+f['path']);assert st==200 and len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256'],root+f['path']
 return {'root':g['root'],'generation':c['generation'],'filesHashed':len(names)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:r=list(pool.map(check,m['groups']))
classic=[]
for n in range(1,6):
 st,h,b,url=get(f'th{n:02d}');assert st==200;classic.append({'url':url,'status':st,'bytes':len(b)})
resources=[]
for path,size in [('games/th13/th13.data',142788413),('games/th13/music/ogg/thbgm.ogg',57431845),('shared/msgothic.ttc',0),('shared/unifont.otf',0)]:
 st,h,b,url=get(path,True);assert st==206 and len(b)==1
 if size:assert h.get('Content-Range',h.get('content-range'))==f'bytes 0-0/{size}'
 resources.append({'path':path,'status':st,'contentRange':h.get('Content-Range',h.get('content-range'))})
Path('artifacts/th13-port-20261029/public-http.json').write_text(json.dumps({'runtimeGroups':r,'classics':classic,'resources':resources},indent=2)+'\n');print('PUBLIC PASS',len(r),'Runtime groups, 5 classics, TH13 code/data/music/fonts')
