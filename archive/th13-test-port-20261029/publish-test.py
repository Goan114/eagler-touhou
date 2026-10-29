from pathlib import Path
import json,subprocess,os
base=Path('/opt/th13-test-20261029');root=Path('/var/www/eagler-touhou-test/releases/th13-full-20261029');current=Path('/var/www/eagler-touhou-test/current');main=Path('/var/www/eagler-touhou/current')
release=json.loads((root/'release-manifest.json').read_text());site=json.loads((root/'site-manifest.json').read_text());assert site['shared']['testBuild'] is True and 'th13' in site['games'] and 'th12' in site['games'];assert site['shared']['netplayRelay']=='wss://test.touhou.vip/eagler-netplay/'
mr=json.loads((main/'runtime-manifest.json').read_text());tr=json.loads((root/'runtime-manifest.json').read_text());assert {g['root']:g['current']['generation'] for g in mr['groups']}=={g['root']:g['current']['generation'] for g in tr['groups'] if g['root']!='runtime/th13/'}
conf=Path('/etc/nginx/sites-enabled/test.touhou.vip');assert conf.read_bytes()==(base/'nginx-before.conf').read_bytes(),'Test Nginx configuration changed concurrently'
main_before={'current':str(main.resolve()),'releaseId':json.loads((main/'release-manifest.json').read_text())['releaseId']};old=str(current.resolve());conf.write_bytes((base/'nginx-after.conf').read_bytes())
try:subprocess.run(['nginx','-t'],check=True,capture_output=True)
except:
 conf.write_bytes((base/'nginx-before.conf').read_bytes());raise
subprocess.run(['systemctl','reload','nginx'],check=True)
link=current.parent/'.current-th13-20261029';assert not link.exists() and not link.is_symlink();link.symlink_to(root);os.replace(link,current)
main_after={'current':str(main.resolve()),'releaseId':json.loads((main/'release-manifest.json').read_text())['releaseId']};assert main_before==main_after
receipt={'site':'https://test.touhou.vip/','previous':old,'current':str(current.resolve()),'releaseId':release['releaseId'],'games':list(site['games']),'runtimeGenerations':{g['root']:g['current']['generation'] for g in tr['groups']},'mainBefore':main_before,'mainAfter':main_after,'nginxReload':True,'relayRestart':False}
(base/'deployment-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
