/** L3/mounted synthetic DOM. No network or browser layout claim.
 * Proves independent named selections preserve the native wire configuration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {installMountedDom} from './mounted-dom-environment.mjs';
const project = fileURLToPath(new URL('../../', import.meta.url));
test('named character and spell selectors keep other fields, wire indices, locale and phase gates', async () => {
  const env=installMountedDom(), React=await import('react'), {createRoot}=await import('react-dom/client');
  const work=await mkdtemp(resolve(project,'.cache/loadout-fields-'));let root;
  try {
    await build({absWorkingDir:project,stdin:{resolveDir:project,loader:'ts',contents:`
      export {RoomLoadoutFields} from './app/components/room/RoomLoadoutFields.tsx';
      export {LocaleProvider} from './app/i18n.tsx';
      export {PRODUCT_GAMES} from './src/contracts/product-catalog.mts';
      export {UI_MESSAGES} from './src/launcher/i18n.mts';
    `},outfile:resolve(work,'actual.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',logLevel:'silent',
    plugins:[{name:'authored-mts',setup(ctx){ctx.onResolve({filter:/^\.\.?\/.*\.mjs$/},args=>{const p=resolve(dirname(args.importer),args.path).replace(/\.mjs$/,'.mts');if(existsSync(p))return {path:p};});}}]});
    const {RoomLoadoutFields,LocaleProvider,PRODUCT_GAMES,UI_MESSAGES}=await import(pathToFileURL(resolve(work,'actual.mjs')).href);
    const mp=PRODUCT_GAMES.th075.multiplayer;
    // Native Application::prepare_multiplayer uses shot % 3 and shot / 3.
    for (const [index,l] of mp.loadouts.entries()) {
      assert.equal(index,l.character*9+l.shot);assert.deepEqual(l.selection.map(s=>s.value),[l.character,l.shot%3,Math.floor(l.shot/3)]);
      for(const locale of ['zh-CN','en'])for(const {labelKey} of l.selection)assert.ok(UI_MESSAGES[locale][labelKey]);
    }
    const node=env.document.createElement('div');env.document.body.append(node);root=createRoot(node);
    let state={product:'th075mp',preferredLoadout:0,connected:true,room:{synced:true,phase:'lobby'},seat:0,loadoutPending:false,launchBusy:false,spectatorRequested:false},locale='zh-CN';
    const calls=[],service={changeLoadout(delta){calls.push(delta);state={...state,preferredLoadout:state.preferredLoadout+delta};}};
    async function render(){await React.act(async()=>root.render(React.createElement(LocaleProvider,{locale},React.createElement(RoomLoadoutFields,{state,service}))));}
    const select=i=>node.querySelector('#mpLoadoutField'+i);
    async function change(i,value){await React.act(async()=>{select(i).value=String(value);select(i).dispatchEvent(new env.window.Event('change',{bubbles:true}));});await render();}
    await render();assert.deepEqual([0,1,2].map(i=>select(i).options.length),[11,3,3]);
    assert.equal(select(1).options[0].text,'灵符「梦想妙珠」');assert.equal(select(2).options[0].text,'神灵「梦想封印」');
    await change(1,2);assert.equal(state.preferredLoadout,2);assert.equal(select(2).value,'0');
    await change(2,1);assert.equal(state.preferredLoadout,5);assert.equal(select(1).value,'2');
    await change(0,10);assert.equal(state.preferredLoadout,95);assert.deepEqual([0,1,2].map(i=>select(i).value),['10','2','1']);
    assert.equal(select(1).selectedOptions[0].text,'华符「破山炮」');assert.equal(select(2).selectedOptions[0].text,'极光「华严明星」');assert.deepEqual(calls,[2,3,90]);
    locale='en';await render();assert.equal(select(0).selectedOptions[0].text,'Hong Meiling');assert.match(select(2).selectedOptions[0].text,/Flower Adornment Star/);
    for(const patch of [{loadoutPending:true},{connected:false},{room:{synced:true,phase:'running'}}]){const previous=state;state={...state,...patch};await render();assert.ok([0,1,2].every(i=>select(i).disabled));state=previous;}
    state={...state,product:'th09mp',preferredLoadout:0};await render();assert.equal(node.children.length,0);
    assert.deepEqual(env.errors,[]);
  } finally {if(root)await React.act(async()=>root.unmount());env.close();await rm(work,{recursive:true,force:true});}
});
