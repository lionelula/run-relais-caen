const test=require('node:test'),assert=require('node:assert/strict');
const {requestPosition,inside}=require('./geolocation.js');
const good={coords:{latitude:49.18355,longitude:-.3625,accuracy:20}};
test('HTTPS and API unavailable fail without requesting a position',async()=>{
  let calls=0;
  await assert.rejects(requestPosition({secure:false,geolocation:{getCurrentPosition(){calls++}}}),/HTTPS/);
  await assert.rejects(requestPosition(),/navigateur/);assert.equal(calls,0);
});
test('one position request returns coordinates and accuracy with bounded fresh lookup',async()=>{
  let calls=0;
  const value=await requestPosition({geolocation:{getCurrentPosition(ok,fail,options){calls++;assert.deepEqual(options,{enableHighAccuracy:true,maximumAge:0,timeout:12000});ok(good);}}});
  assert.deepEqual(value,{coordinates:[49.18355,-.3625],accuracy:20});assert.equal(calls,1);
});
for(const [code,message] of [[1,/refusée/],[2,/indisponible/],[3,/temps/]])test(`native error ${code} gives a manual fallback`,async()=>{
  await assert.rejects(requestPosition({geolocation:{getCurrentPosition(ok,fail){fail({code});}}}),message);
});
test('invalid results are rejected',async()=>{
  for(const coords of [{latitude:NaN,longitude:0,accuracy:1},{latitude:91,longitude:0,accuracy:1},{latitude:0,longitude:181,accuracy:1},{latitude:0,longitude:0,accuracy:-1}]){
    await assert.rejects(requestPosition({geolocation:{getCurrentPosition(ok){ok({coords});}}}),/invalide/);
  }
});
test('cancelled request ignores late callbacks and permits a fresh request',async()=>{
  const controller=new AbortController();let late;
  const pending=requestPosition({signal:controller.signal,geolocation:{getCurrentPosition(ok){late=ok;}}});
  controller.abort();await assert.rejects(pending,{name:'AbortError'});late(good);
  assert.deepEqual(await requestPosition({geolocation:{getCurrentPosition(ok){ok(good);}}}),{coordinates:[49.18355,-.3625],accuracy:20});
});
test('pre-aborted requests never invoke the API',async()=>{
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(requestPosition({signal:controller.signal,geolocation:{getCurrentPosition(){calls++}}}),{name:'AbortError'});assert.equal(calls,0);
});
test('watchdog recovers when the browser never responds',async()=>{
  await assert.rejects(requestPosition({maxWait:5,geolocation:{getCurrentPosition(){}}}),/temps/);
});
test('synchronous browser failure is handled',async()=>{
  await assert.rejects(requestPosition({geolocation:{getCurrentPosition(){throw Error('blocked')}}}),/bloquée/);
});
test('region bounds include the edges and reject outside coordinates',()=>{
  const bounds={south:49.05,north:49.34,west:-.59,east:-.14};
  assert.equal(inside([49.05,-.59],bounds),true);assert.equal(inside([49.34,-.14],bounds),true);
  assert.equal(inside([49.04,-.3],bounds),false);assert.equal(inside([48.85,2.35],bounds),false);
});
