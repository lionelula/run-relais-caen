/* Loop proposals use real pedestrian routing. Seed points are never drawn as routes. */
(function(root){
  'use strict';
  const radians=x=>x*Math.PI/180;
  const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180;
  function distance(a,b){const lat=radians(b[0]-a[0]),lon=radians(b[1]-a[1]);return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(lat/2)**2+Math.cos(radians(a[0]))*Math.cos(radians(b[0]))*Math.sin(lon/2)**2)));}
  function destination(start,km,bearing){const d=km/6371,b=radians(bearing),lat=radians(start[0]),lon=radians(start[1]);const endLat=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(b));const endLon=lon+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(endLat));return [endLat*180/Math.PI,endLon*180/Math.PI];}
  const inside=(p,b)=>validPoint(p)&&p[0]>=b.south&&p[0]<=b.north&&p[1]>=b.west&&p[1]<=b.east;
  function candidate(start,target,heading,places,bounds){
    const via=[];
    for(const bearing of [heading-30,heading+30]){
      const seed=destination(start,target/3/1.3,bearing);
      if(!inside(seed,bounds))return null;
      const close=places.map(p=>p.coordinates).filter(p=>inside(p,bounds)&&distance(start,p)>.2&&via.every(v=>distance(v,p)>.2)).map(p=>({p,d:distance(seed,p)})).filter(x=>x.d<Math.min(.6,target/8)).sort((a,b)=>a.d-b.d)[0];
      const point=close?close.p:seed;
      if(via.some(v=>distance(v,point)<.2))return null;
      via.push([...point]);
    }
    return via;
  }
  async function propose(start,target,options){
    const {bounds,places=[],signal,onProgress=()=>{},requestRoute=root.WalkingRoutes.requestRoute}=options;
    if(!inside(start,bounds)||!Number.isFinite(target)||target<2||target>20)throw Error('Choisis un départ dans Caen la Mer et une distance entre 2 et 20 km.');
    const heading=options.heading==='auto'||options.heading==null?null:Number(options.heading);
    if(heading!==null&&![0,90,180,270].includes(heading))throw Error('Choisis une direction valide.');
    let best=null,scale=target,lastError=null;
    const tried=new Set();
    for(let i=0;i<4;i++){
      if(signal?.aborted)throw new DOMException('Recherche annulée.','AbortError');
      const bearing=(heading??90)+(i<2?0:heading===null?(i-1)*90:(i===2?25:-25));
      const via=candidate(start,scale,bearing,places,bounds);
      if(!via){scale=target;continue;}
      const key=JSON.stringify(via);if(tried.has(key)){scale*=.85;continue;}tried.add(key);
      onProgress(i+1);
      const controller=new AbortController();
      const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
      const timer=setTimeout(cancel,12000);
      try{
        const route=await requestRoute(start,start,controller.signal,undefined,via);
        if(signal?.aborted)throw new DOMException('Recherche annulée.','AbortError');
        if(!Array.isArray(route.points)||route.points.length<3||!route.points.every(validPoint)||distance(route.points[0],route.points.at(-1))>.03||!Number.isFinite(route.kilometers)||route.kilometers<=0)throw Error('Le service n’a pas renvoyé une boucle piétonne complète.');
        const error=Math.abs(route.kilometers-target)/target;
        if(!best||error<best.error)best={route,via,target,error};
        if(error<=.2)break;
        scale=Math.max(target*.45,Math.min(target*1.5,scale*target/route.kilometers));
      }catch(error){
        if(signal?.aborted)throw error;
        lastError=error;
        if(error.status===429||error instanceof TypeError)break;
        scale=target;
      }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
    }
    if(signal?.aborted)throw new DOMException('Recherche annulée.','AbortError');
    if(!best)throw lastError||Error('Aucune boucle trouvée dans cette zone. Essaie une autre direction, une distance plus courte ou un autre départ.');
    return best;
  }
  const api={distance,candidate,propose};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LoopRoutes=api;
})(typeof globalThis!=='undefined'?globalThis:window);
