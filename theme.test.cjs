const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'theme.js'),'utf8');

function browser({saved=null,systemDark=false,blocked=false}={}){
  const events={},attributes={},writes=[];
  const root={dataset:{},style:{}};
  const icon={textContent:''};
  const button={hidden:true,setAttribute:(k,v)=>attributes[k]=v,querySelector:()=>icon,addEventListener:(k,f)=>events['button:'+k]=f};
  const system={matches:systemDark,addEventListener:(k,f)=>events['system:'+k]=f};
  const document={documentElement:root,readyState:'loading',querySelectorAll:()=>[button],addEventListener:(k,f)=>events[k]=f};
  const window={matchMedia:()=>system,localStorage:{getItem:()=>{if(blocked)throw Error('blocked');return saved},setItem:(k,v)=>{if(blocked)throw Error('blocked');writes.push([k,v])}},addEventListener:(k,f)=>events[k]=f};
  vm.runInNewContext(source,{window,document});
  return {root,button,attributes,events,writes,system};
}

test('System appearance is applied before rendering and follows changes until a manual choice',()=>{
  const b=browser({systemDark:true});
  assert.equal(b.root.dataset.theme,'dark');
  b.events.DOMContentLoaded();
  assert.equal(b.button.hidden,false);
  assert.equal(b.attributes['aria-pressed'],'true');
  b.system.matches=false;b.events['system:change']();
  assert.equal(b.root.dataset.theme,'light');
  b.events['button:click']();
  assert.equal(b.root.dataset.theme,'dark');
  assert.deepEqual(b.writes,[['run-relais-theme','dark']]);
  b.system.matches=false;b.events['system:change']();
  assert.equal(b.root.dataset.theme,'dark');
});
test('Explicit light and dark choices survive page loads and sync between tabs',()=>{
  for(const saved of ['dark','light']){
    const b=browser({saved,systemDark:saved==='light'});
    assert.equal(b.root.dataset.theme,saved);
    b.events.DOMContentLoaded();
    b.events.storage({key:'run-relais-theme',newValue:saved==='dark'?'light':'dark'});
    assert.equal(b.root.dataset.theme,saved==='dark'?'light':'dark');
    b.events.storage({key:'unrelated',newValue:'light'});
    assert.equal(b.root.dataset.theme,saved==='dark'?'light':'dark');
    b.events.storage({key:null,newValue:null});
    assert.equal(b.root.dataset.theme,b.system.matches?'dark':'light');
  }
});
test('Unavailable storage and invalid preferences do not break the switch',()=>{
  for(const options of [{blocked:true},{saved:'invalid'}]){
    const b=browser(options);b.events.DOMContentLoaded();
    b.events['button:click']();assert.equal(b.root.dataset.theme,'dark');
    b.events['button:click']();assert.equal(b.root.dataset.theme,'light');
    assert.equal(b.attributes['aria-pressed'],'false');
  }
});
