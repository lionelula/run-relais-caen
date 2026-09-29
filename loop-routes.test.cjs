const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('./loop-routes.js');
const start=[49.183,-.362],bounds={south:49.05,north:49.34,west:-.59,east:-.14};
const route=(a,via,km)=>({points:[a,...via,a],stops:[a,...via,a],kilometers:km,seconds:km*720,instructions:[{text:'Test'}]});
test('loop requests close at the origin with distinct intermediate points and expose the real result',async()=>{
  const calls=[];const found=await L.propose(start,8,{bounds,heading:'90',requestRoute:async(a,b,signal,fetcher,via)=>{calls.push([a,b,via]);return route(a,via,8.7);}});
  assert.equal(calls.length,1);assert.deepEqual(calls[0][0],calls[0][1]);assert.equal(calls[0][2].length,2);
  assert(L.distance(...calls[0][2])>.2);assert.equal(found.route.kilometers,8.7);assert.equal(found.target,8);
});
test('search is bounded and returns the closest actual route when target cannot be met',async()=>{
  let calls=0;const distances=[14,11,12,13];const found=await L.propose(start,8,{bounds,requestRoute:async(a,b,s,f,via)=>route(a,via,distances[calls++])});
  assert(calls<=4);assert.equal(found.route.kilometers,11);assert(found.error>.2);
});
test('no fabricated fallback on failure, rate limiting, invalid input or open geometry',async()=>{
  let calls=0;await assert.rejects(()=>L.propose(start,8,{bounds,requestRoute:async()=>{calls++;const e=Error('Busy');e.status=429;throw e;}}));assert.equal(calls,1);
  await assert.rejects(()=>L.propose(start,8,{bounds,requestRoute:async()=>{throw new TypeError('Network');}}));
  await assert.rejects(()=>L.propose(start,8,{bounds,requestRoute:async(a,b,s,f,via)=>({...route(a,via,8),points:[a,...via]})}));
  await assert.rejects(()=>L.propose(start,30,{bounds,requestRoute:()=>assert.fail('must not request')}));
  await assert.rejects(()=>L.propose([0,0],8,{bounds,requestRoute:()=>assert.fail('must not request')}));
});
test('cancellation discards an in-flight result and pre-cancelled searches make no request',async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(()=>L.propose(start,8,{bounds,signal:controller.signal,requestRoute:async(a,b,s,f,via)=>{calls++;controller.abort();return route(a,via,8);}}));
  await assert.rejects(()=>L.propose(start,8,{bounds,signal:controller.signal,requestRoute:()=>assert.fail('must not request')}));assert.equal(calls,1);
});
