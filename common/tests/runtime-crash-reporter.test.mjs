import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../browser/runtime-crash-reporter.js',import.meta.url),'utf8');
function fixture(game='th15',multiplayer=true) {
  const listeners=new Map(),shown=[],timers=[];
  const url=new URL(`https://test.example/runtime/${game}/${multiplayer?'multiplayer/':''}${'a'.repeat(64)}/${game}.html?room=private`);
  const world={console:{warn(){},error(){}},location:url,navigator:{userAgent:'test-browser',language:'zh-CN',languages:['zh-CN'],onLine:true},
    document:{currentScript:{src:new URL('runtime-crash-reporter.js',url).href},readyState:'loading',addEventListener(){},visibilityState:'visible'},
    performance:{memory:{usedJSHeapSize:100,totalJSHeapSize:200,jsHeapSizeLimit:1000}},
    innerWidth:400,innerHeight:800,devicePixelRatio:2,URL,TextDecoder,Uint8Array,Uint32Array,Int32Array,Float32Array,ArrayBuffer,Error,
    fetch:async()=>({ok:false}),setInterval:f=>timers.push(f),
    addEventListener:(event,callback)=>listeners.set(event,callback),
    __eaglerCrashReportHostV1:{show:value=>shown.push(value)}};
  world.window=world;world.parent=world;
  vm.runInNewContext(source,world);
  return {world,api:world.__eaglerCrashReporterV1,listeners,shown,timers};
}
test('abort preserves stderr, state, memory and stacks without calling crashed WASM',()=>{
  const {world,api,shown}=fixture();let calls=0;
  const core={HEAPU8:new Uint8Array(4096),_th15_frame:()=>{++calls;return 88124;},_th15_phase:()=>1};
  api.bindCore(core,{build:{version:'test',execution:{sha256:'wasm-identity'}},context:()=>({stage:6,spell:'Pristine Lunacy',token:'private'})});
  world.console.error('Cannot enlarge memory');const before=calls;
  core.onAbort('Aborted()');api.sample();
  const report=api.report();
  assert.equal(calls,before);assert.equal(report.game,'th15');assert.equal(report.multiplayer,true);
  assert.equal(report.samples[0].frame,88124);assert.equal(report.samples[0].gameState.stage,6);
  assert.equal(report.wasmMemoryBytes,4096);assert.equal(report.logs[0].values[0],'Cannot enlarge memory');
  assert.match(report.errors[0].error.stack,/Aborted/);assert.equal(report.runtime.build.execution.sha256,'wasm-identity');
  assert.equal(report.samples[0].gameState.token,undefined);assert.ok(shown.length);
  assert.ok(!JSON.stringify(report).includes('room=private'));
});
test('warnings stay nonfatal; unhandled rejection and native errors retain original causes',()=>{
  const {world,api,listeners}=fixture('th12',false);
  world.console.warn('music not ready');assert.equal(api.report(),undefined);
  const error=new Error('Junko opening');listeners.get('unhandledrejection')({reason:error});
  api.fatal(error,{source:'native-fatal'});api.fatal(error,{source:'native-fatal'});
  assert.equal(api.report().errors.length,2);assert.equal(api.report().errors[0].error.stack,error.stack);
  assert.equal(api.report().game,'th12');assert.equal(api.report().multiplayer,false);
});
test('rolling history stays bounded and circular values serialize safely',()=>{
  const {api,world}=fixture();const cyclic={};cyclic.self=cyclic;
  api.bindCore({HEAPU8:new Uint8Array(1024)});
  for(let n=0;n<150;n++){world.console.error(n,cyclic);api.sample();}
  api.fatal('failure');const report=api.report();
  assert.equal(report.logs.length,100);assert.equal(report.samples.length,30);
  assert.match(JSON.stringify(report),/circular/);
});
test('TH12 native gameplay getters wait until a session exists',()=>{
  const {api}=fixture('th12',false);let reads=0,session=null;
  const core={HEAPU8:new Uint8Array(1024),_th12_hud:()=>{++reads;return 0;}};
  api.bindCore(core,{context:()=>({session})});assert.equal(reads,0);
  session={stage:1};api.sample();assert.equal(reads,1);
});

test('TH12 uses its eight-word rollback ABI without reading TH15 fields',()=>{
  const {api}=fixture('th12');
  const heap=new Uint8Array(160),words=new Uint32Array(heap.buffer);
  words.set([1,1,0,25705,25692,2,1,0,12],4);
  words.set([1,4577,0,25693,0,0xffffffff,25705,1],32);
  api.bindCore({HEAPU8:heap,_th12_mp_status:()=>16,_th12_mp_rollback_status:()=>128});
  api.fatal('connection lost');const r=api.report().samples[0].rollback;
  assert.equal(r.enabled,true);assert.equal(r.corrections,4577);assert.equal(r.replayedFrames,0);
  assert.equal(r.committedFrames,25693);assert.equal(r.rollbackRequest,null);assert.equal(r.frontier,25705);
  assert.equal(r.correcting,false);assert.equal(r.worldReady,true);
  for(const name of ['lastDepth','peakDepth','replayRemaining','fenceFrame','presentationFps'])assert.equal(r[name],undefined);
});
test('TH15 keeps its separate nine-word rollback ABI',()=>{
  const {api}=fixture('th15');const heap=new Uint8Array(128);
  new Uint32Array(heap.buffer).set([1,1,50,75,3,12,4,101,5990],4);
  api.bindCore({HEAPU8:heap,_th15_mp_rollback_status:()=>16});api.fatal('failure');
  const r=api.report().samples[0].rollback;
  assert.equal(r.corrections,50);assert.equal(r.peakDepth,12);assert.equal(r.presentationFps,59.9);
});
test('transport history and final recovery state omit connection credentials',()=>{
  const {api,world}=fixture('th12');
  const peer={pc:{connectionState:'connected',iceConnectionState:'disconnected',configuration:{credential:'private-turn'}},
    inputDc:{readyState:'open',bufferedAmount:12},controlDc:{readyState:'open',bufferedAmount:32},
    lastReceivedAt:Date.now()-6000,lastInputSentAt:Date.now(),restartAttempts:1,restartInFlight:true,
    adaptive:{snapshot:()=>({selected:'primary',epoch:0,standbyReady:false})}};
  world.__eaglerPeerTransport={route:'rtc',received:[],receivedHead:0,peers:new Map([[0,peer]]),iceServers:[{credential:'private-turn'}]};
  api.bindCore({HEAPU8:new Uint8Array(128)});peer.restartAttempts=2;
  api.fatal('RTC peer P1 ICE restart exhausted');const r=api.report();
  assert.equal(r.samples[0].transport.peers[0].restartAttempts,1);
  assert.equal(r.transport.peers[0].restartAttempts,2);
  assert.equal(r.transport.peers[0].iceConnectionState,'disconnected');
  assert.ok(r.transport.peers[0].receivedAgeMs>=6000);
  assert.equal(r.transport.peers[0].adaptive.selected,'primary');
  assert.ok(!JSON.stringify(r).includes('private-turn'));
});

test('sample gaps expose main-thread stalls before connection recovery expires',()=>{
  const {api,world}=fixture('th12');let time=0;world.performance.now=()=>time;
  api.bindCore({HEAPU8:new Uint8Array(128)});time=1000;api.sample();time=7500;api.sample();
  api.fatal('connection recovery exhausted');const samples=api.report().samples;
  assert.equal(samples[0].sampleGapMs,null);assert.equal(samples[1].sampleGapMs,1000);
  assert.equal(samples[2].sampleGapMs,6500);
});
