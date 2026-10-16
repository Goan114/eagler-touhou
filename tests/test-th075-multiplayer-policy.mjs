/** L3/module. Preconditions: compiled product contracts. Mutations: none.
 * Proves: TH075 two-seat optional rollback policy, spell bounds and spectator wire identity. */
import assert from 'node:assert/strict';
import {PRODUCT_GAMES} from '../lib/contracts/product-catalog.mjs';
import {isSpectatorFrameForRoom} from '../server/spectator-frame.mjs';
const mp=PRODUCT_GAMES.th075.multiplayer;
assert.deepEqual(mp.playerCounts,[2]);assert.equal(mp.loadouts.length,99);
assert.equal(mp.inputTiming.rollbackLimit,8);assert.equal(mp.inputTiming.measuredStartup,true);
for(let c=0;c<11;c++)for(let shot=0;shot<9;shot++)assert.ok(mp.loadouts.some(v=>v.character===c&&v.shot===shot));
const timing=new Uint8Array(40),v=new DataView(timing.buffer);
timing.set([69,80,84,77,1,1,3,0]);v.setUint32(8,3,true);v.setUint32(24,90000,true);v.setUint32(32,1,true);v.setUint32(36,117,true);
assert.equal(isSpectatorFrameForRoom('th075mp-1234',timing,2),true);
assert.equal(isSpectatorFrameForRoom('th075mp-1234',timing,3),false);
assert.equal(isSpectatorFrameForRoom('th08mp-1234',timing,2),false);
timing[5]=0;timing[6]=0;timing[7]=8;v.setUint32(32,0,true);assert.equal(isSpectatorFrameForRoom('th075mp-1234',timing,2),true);
timing[7]=9;assert.equal(isSpectatorFrameForRoom('th075mp-1234',timing,2),false);
timing[5]=2;assert.equal(isSpectatorFrameForRoom('th075mp-1234',timing,2),false);
const frame=new Uint8Array(48);frame.set([69,80,78,80,4,3,2,0]);
assert.equal(isSpectatorFrameForRoom('th075mp-1234',frame,2),true);
frame[1]=56;assert.equal(isSpectatorFrameForRoom('th075mp-1234',frame,2),false);
console.log('TH075 catalog, 99 spell loadouts, optional rollback and spectator identities PASS');
