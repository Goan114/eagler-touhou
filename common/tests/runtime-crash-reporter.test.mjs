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
  for(let n=0;n<300;n++){world.console.error(n,cyclic);api.sample();}
  api.fatal('failure');const report=api.report();
  assert.equal(report.logs.length,200);assert.equal(report.samples.length,60);
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
  assert.equal(api.report().summary.maximumSampleGapMs,6500);assert.equal(api.report().summary.maximumLongTaskMs,0);
});

test('TH12 reports named world, UFO, boss, spell and authoritative player state',()=>{
  const {api}=fixture('th12');const heap=new Uint8Array(8192),w=new Uint32Array(heap.buffer),f=new Float32Array(heap.buffer);
  w.set([1,1,1,100,95,2,1,0,12,1],4);
  f.set([50,20,30,1000,400,5,2,20,1234,99,30,200,1,0,0,0,0,2,1,3,100000,2,1,1,2,3,-1,8,.5,2,6,7,2000,10,1500,4,120,800,0,3,1000],64);
  const put=(at,v)=>{heap.set(new TextEncoder().encode(JSON.stringify(v)+'\0'),at);return at;};
  const state=put(1024,{stage:3,players:[{seat:0,selection:5,held:9},{seat:1,selection:0,held:1}]});
  const spell=put(2048,{active:true,name:'test spell',id:17});
  api.bindCore({HEAPU8:heap,_th12_mp_status:()=>16,_th12_mp_state:()=>state,_th12_hud:()=>256,_th12_hud_size:()=>41,_th12_spell:()=>spell},
    {context:()=>({session:{stage:3}})});api.fatal('failed');const r=api.report(),last=r.samples[0];
  assert.equal(last.world.ufoKind,-1);assert.equal(last.world.bulletCount,200);assert.equal(last.world.bossLife,1500);
  assert.equal(last.spell.name,'test spell');assert.equal(last.multiplayer.players[0].selection,5);
  assert.equal(r.summary.stage,3);assert.equal(r.summary.localSeat,1);assert.equal(r.summary.unconfirmedFrames,4);
  assert.equal(r.reporterVersion,2);
});
test('TH15 reports live stage, audio queue, pause and native error with no simulation calls',()=>{
  const {api}=fixture('th15');const heap=new Uint8Array(2048),w=new Uint32Array(heap.buffer);
  w.set([101,500,0,6,1,0],4);w.set([1,30,900,0,4410,12,0,0,0,123,0],16);
  new Int32Array(heap.buffer).set([2,1,0,3,0,0,120],40);heap.set(new TextEncoder().encode('native failure\0'),512);
  api.bindCore({HEAPU8:heap,_th15_frame:()=>101,_th15_phase:()=>1,_eagler_replay_state:()=>16,_th15_audio_statistics:()=>64,
    _th15_mp_result_status:()=>160,_th15_mp_error:()=>512,_th15_mp_pump:()=>assert.fail('must not pump')});
  api.fatal('failed');const r=api.report(),last=r.samples[0];assert.equal(r.summary.stage,6);
  assert.equal(last.audio.queuedFrames,4410);assert.equal(last.pause.age,120);assert.equal(last.nativeError,'native failure');
});
test('RTC statistics retain link quality without candidate addresses or credentials',async()=>{
  const {api,world}=fixture('th15');let calls=0;
  const reports=new Map([['t',{type:'transport',selectedCandidatePairId:'p'}],['p',{type:'candidate-pair',state:'succeeded',localCandidateId:'l',remoteCandidateId:'r',currentRoundTripTime:.12,bytesReceived:600}],
    ['l',{candidateType:'relay',protocol:'udp',address:'192.0.2.1',usernameFragment:'private-user'}],['r',{candidateType:'host',protocol:'udp',address:'198.51.100.1'}],
    ['d',{type:'data-channel',messagesReceived:44,bytesReceived:300}]]);
  const peer={pc:{async getStats(){++calls;return reports;}}};world.__eaglerPeerTransport={route:'rtc',received:[],peers:new Map([[0,peer]])};
  api.bindCore({HEAPU8:new Uint8Array(128)});await new Promise(r=>setImmediate(r));api.sample();api.fatal('lost');
  const r=api.report(),rtc=r.transport.peers[0].rtc;
  assert.equal(rtc.pair.currentRoundTripTime,.12);assert.equal(rtc.local.type,'relay');assert.equal(rtc.channels[0].messagesReceived,44);assert.equal(calls,1);
  for(const value of ['192.0.2.1','198.51.100.1','private-user'])assert.ok(!JSON.stringify(r).includes(value));
});
test('progress and sampling metadata distinguish a stalled world from a responsive browser',()=>{
  const {api,world,listeners}=fixture('th15');let time=0,frame=100;world.performance.now=()=>time;
  api.bindCore({HEAPU8:new Uint8Array(128),_th15_frame:()=>frame});time=1000;frame=160;api.sample();time=2000;api.sample();
  listeners.get('offline')({});api.fatal('lost');const r=api.report();
  assert.equal(r.samples[1].progress.simulationFps,60);assert.equal(r.samples[2].progress.simulationFps,0);
  assert.equal(r.capture.lastSampleAgeMs,0);assert.equal(r.lifecycle[0].type,'offline');assert.equal(r.capture.wasmReadsAfterFatal,false);
});
test('WebSocket credentials are removed from error text',()=>{
  const {api}=fixture();api.fatal('failed wss://user:pass@example.test/path?member=private#secret');
  const text=JSON.stringify(api.report());for(const secret of ['user:pass','member=private','#secret'])assert.ok(!text.includes(secret));
});
