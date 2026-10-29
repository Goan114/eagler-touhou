import {readFile,writeFile} from 'node:fs/promises';
import {writeReleaseManifest,verifyReleaseManifest} from '../../launcher/lib/release-manifest.mjs';
const root='/var/www/eagler-touhou-test/releases/th13-full-20261029';
const release=await verifyReleaseManifest(root),p=JSON.parse(await readFile('/opt/th13-test-20261029/launcher/self-host-provenance.json','utf8'));
await writeReleaseManifest(root,{profile:release.profile,sources:{...release.sources,launcher:p.launcherSource},parameters:{...release.parameters,th13Source:p.launcherSource.revision}});
const final=await verifyReleaseManifest(root);console.log(JSON.stringify({releaseId:final.releaseId,source:p.launcherSource.revision}));
