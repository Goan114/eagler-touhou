import {readFile,writeFile,cp,mkdir,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {writeReleaseManifest,verifyReleaseManifest,verifyReleaseManifestDeclaration} from '../../launcher/lib/release-manifest.mjs';
import {writeLegacySiteManifestAlias} from '../../launcher/compat/site-manifest.mjs';
import {verifyRuntimePublication} from '../../launcher/lib/runtime-generations.mjs';
const base='/opt/th13-test-20261029',root='/var/www/eagler-touhou-test/releases/th13-full-20261029',mini=resolve(base,'mini');
const read=async(p)=>JSON.parse(await readFile(p,'utf8')),write=(p,d)=>writeFile(p,JSON.stringify(d,null,2)+'\n');
await verifyReleaseManifestDeclaration(root);
const original=await read(resolve(root,'release-manifest.json'));
for(const file of original.files){const bytes=await readFile(resolve(root,file.path));if((bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)&&file.path!=='sync-version.json')throw Error('Base mismatch: '+file.path);}
await write(resolve(base,'main-before.json'),{current:'/var/www/eagler-touhou/current',releaseId:original.releaseId,runtime:await read(resolve(root,'runtime-manifest.json'))});
const site=await read(resolve(root,'site-manifest.json')),small=await read(resolve(mini,'site-manifest.json')),oldTest=await read('/var/www/eagler-touhou-test/current/site-manifest.json');
site.profile='web-validation-th13-full-test';site.shared.testBuild=true;site.shared.netplayRelay=oldTest.shared.netplayRelay;delete site.shared.netplayRelayFallbacks;delete site.shared.netplayTelemetry;
site.games.th13=small.games.th13;await cp(resolve(mini,'runtime/th13'),resolve(root,'runtime/th13'),{recursive:true});await cp(resolve(mini,'th13.package.json'),resolve(root,'th13.package.json'));await cp(resolve(mini,'assets/th13-card.webp'),resolve(root,'assets/th13-card.webp'));
const rm=await read(resolve(root,'runtime-manifest.json')),miniRm=await read(resolve(mini,'runtime-manifest.json'));rm.groups.push(...miniRm.groups);await write(resolve(root,'runtime-manifest.json'),rm);
const catalog=await read(resolve(root,'release-catalog.json')),mc=await read(resolve(mini,'release-catalog.json'));Object.assign(catalog.games,mc.games);await write(resolve(root,'release-catalog.json'),catalog);await write(resolve(root,'site-manifest.json'),site);await writeLegacySiteManifestAlias(root,site);await verifyRuntimePublication(root,site);
const deployment=await read(resolve(root,'deployment.json'));deployment.games=Object.keys(site.games);deployment.profile=site.profile;deployment.authority='private';deployment.generatedAt=new Date().toISOString();
// Re-identify the bounded composition before the standard frontend refresher.
const walk=async(dir,prefix='')=>{const out=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='.tmp')continue;const path=prefix+e.name;if(e.isDirectory())out.push(...await walk(resolve(dir,e.name),path+'/'));else if(e.isFile()&&!['deployment.json','release-manifest.json','checksums.txt'].includes(path)){const b=await readFile(resolve(root,path));out.push({path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}else if(!e.isFile())throw Error('Unexpected symlink '+path);}return out;};
deployment.files=(await walk(root)).sort((a,b)=>a.path.localeCompare(b.path,'en'));await write(resolve(root,'deployment.json'),deployment);
await writeReleaseManifest(root,{profile:site.profile,sources:{...original.sources,...(await read(resolve(mini,'release-manifest.json'))).sources},parameters:{...original.parameters,th13Implementation:'PR159',testBaseRelease:original.releaseId}});
await verifyReleaseManifest(root);console.log(JSON.stringify({candidate:root,games:deployment.games,th13:small.games.th13.runtime}));
