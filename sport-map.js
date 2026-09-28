/* Map integration is opt-in via explicit save/open actions. */
(() => {
  'use strict';
  let current=null;
  const button=document.getElementById('save-local-route'),after=document.getElementById('after-route'),message=document.getElementById('local-route-status');
  window.addEventListener('run-relais-route-clear',()=>{current=null;if(button)button.disabled=true;if(after)after.hidden=true;if(message)message.textContent='Enregistrement local, sans compte ni synchronisation.';});
  window.addEventListener('run-relais-route-ready',event=>{current=event.detail;if(button)button.disabled=false;const end=current.stops.at(-1);if(after){after.href=`apres-sortie.html?lat=${encodeURIComponent(end[0])}&lon=${encodeURIComponent(end[1])}`;after.hidden=false;}});
  button?.addEventListener('click',()=>{if(!current)return;try{const C=window.RunSport,store=C.createStore(window.localStorage);const signature=JSON.stringify(current.stops);store.update(s=>{if(!s.favorites.some(f=>f.kind==='route'&&JSON.stringify(f.stops)===signature))s.favorites.push({...current,id:C.uid(),kind:'route',name:`Parcours piéton · ${current.kilometers.toFixed(2)} km`,createdAt:new Date().toISOString()});});message.textContent='Parcours enregistré sur cet appareil. Retrouve-le dans Mon espace ; aucune synchronisation en ligne.';}catch(error){message.textContent='Le parcours n’a pas pu être enregistré sur cet appareil. '+error.message;}});
})();
