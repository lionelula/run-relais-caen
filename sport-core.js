/* Pure, versioned local domain. No authentication, billing, GPS or network. */
(function(root){
  'use strict';
  const sports={running:'Running',trail:'Trail',cycling:'Vélo',mtb:'VTT',hiking:'Randonnée',fitness:'Fitness',strength:'Musculation',swimming:'Natation',outdoor:'Outdoor',other:'Autre'};
  const objectives={'10':{label:'10 km',weeks:8,minutes:20,km:8,long:70},'15':{label:'15 km',weeks:10,minutes:35,km:12,long:90},'21':{label:'Semi-marathon · 21,1 km',weeks:12,minutes:50,km:18,long:120},'42':{label:'Marathon · 42,195 km',weeks:20,minutes:90,km:40,long:150}};
  const templates=[{id:'run50',sport:'running',title:'50 km de running ce mois-ci',unit:'km',target:50},{id:'cycle100',sport:'cycling',title:'100 km à vélo ce mois-ci',unit:'km',target:100},{id:'walk3',sport:'hiking',title:'3 randonnées ce mois-ci',unit:'activities',target:3}];
  const weekdays=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  // Pick the most evenly spaced subset if current practice allows fewer sessions.
  function selectTrainingDays(days,count){
    const choices=[];
    function pick(from,result){if(result.length===count){choices.push(result);return;}for(let i=from;i<days.length;i++)pick(i+1,[...result,days[i]]);}
    pick(0,[]);
    const score=choice=>{const sorted=[...choice].sort((a,b)=>a-b);return sorted.reduce((sum,d,i)=>sum+Math.pow(((sorted[(i+1)%sorted.length]-d+7)%7)||7,2),0);};
    return choices.sort((a,b)=>score(a)-score(b))[0];
  }
  const uid=()=>root.crypto?.randomUUID?.() || 'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  function today(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
  function day(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return NaN;const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?d.getTime()/86400000:NaN;}
  const addDays=(s,n)=>new Date((day(s)+n)*86400000).toISOString().slice(0,10);
  function number(value,min,max,label){const n=Number(value);if(value===''||value==null||!Number.isFinite(n)||n<min||n>max)throw Error(`${label} : indique une valeur entre ${min} et ${max}.`);return n;}
  function cleanProfile(input){
    if(!sports[input.sport])throw Error('Choisis un sport.');
    if(!['beginner','regular','experienced'].includes(input.level))throw Error('Choisis ton niveau.');
    const frequency=number(input.sessions,2,5,'Séances par semaine');if(!Number.isInteger(frequency))throw Error('Choisis un nombre entier de séances.');
    const p={alias:String(input.alias||'').trim().slice(0,40),sport:input.sport,level:input.level,sessions:frequency,sports:[...new Set([input.sport,...(Array.isArray(input.sports)?input.sports.filter(s=>sports[s]):[])])],preferences:String(input.preferences||'').slice(0,200)};
    if(p.sport!=='running')return p;
    if(input.trainingDays!==undefined){
      if(!Array.isArray(input.trainingDays)||input.trainingDays.some(d=>d===''||d==null||!Number.isInteger(Number(d))||Number(d)<0||Number(d)>6))throw Error('Choisis des jours de semaine valides.');
      p.trainingDays=[...new Set(input.trainingDays.map(Number))].sort((a,b)=>a-b);
      if(p.trainingDays.length!==frequency)throw Error(`Choisis exactement ${frequency} jours, un par séance disponible.`);
    }
    if(!objectives[input.objective])throw Error('Choisis une distance.');
    if(!Number.isFinite(day(input.targetDate)))throw Error('Indique une date cible valide.');
    if(!['finish','improve','performance'].includes(input.priority))throw Error('Choisis une priorité.');
    Object.assign(p,{objective:input.objective,targetDate:input.targetDate,priority:input.priority,targetMinutes:input.targetMinutes===''||input.targetMinutes==null?null:number(input.targetMinutes,15,900,'Objectif en minutes'),usualKm:number(input.usualKm,0,100,'Distance habituelle'),weekKm:number(input.weekKm,0,200,'Kilomètres hebdomadaires'),weekMinutes:number(input.weekMinutes,0,1800,'Minutes hebdomadaires'),maxMinutes:number(input.maxMinutes,0,360,'Durée maximale'),currentSessions:number(input.currentSessions,0,7,'Séances actuelles'),experience:input.experience});
    if(!['none','10','21','42'].includes(p.experience))throw Error('Indique ton expérience en course.');
    if(p.weekKm<p.usualKm||p.weekMinutes<p.maxMinutes)throw Error('Le total hebdomadaire doit être au moins égal à une sortie habituelle / maximale.');
    if((p.weekKm===0)!==(p.weekMinutes===0)||(!p.currentSessions&&(p.weekKm>0||p.weekMinutes>0)))throw Error('Vérifie la cohérence des kilomètres, des minutes et des séances actuelles.');
    p.recentDistance=['5','10'].includes(input.recentDistance)?Number(input.recentDistance):null;
    p.recentMinutes=p.recentDistance&&input.recentMinutes!==''?number(input.recentMinutes,12,180,'Temps récent'):null;
    if(p.recentDistance&&!p.recentMinutes)throw Error('Renseigne le temps récent ou choisis « Aucun temps récent ».');
    if(p.currentSessions&&!Number.isInteger(p.currentSessions))throw Error('Indique un nombre entier de séances actuelles.');
    if(p.weekKm>0&&(p.weekMinutes/p.weekKm<3||p.weekMinutes/p.weekKm>15))throw Error('Vérifie les minutes et kilomètres hebdomadaires : leur rapport semble incohérent pour ce modèle running.');
    return p;
  }
  function generate(input,start=today()){
    const p=cleanProfile(input);if(p.sport!=='running')return {status:'unsupported',profile:p,reasons:['Les plans de ce sport sont prévus pour la suite. Ton profil multisport peut déjà être enregistré.']};
    const o=objectives[p.objective];const days=day(p.targetDate)-day(start);const weeks=Math.ceil(days/7);const reasons=[];
    if(!Number.isFinite(days)||days<=0)reasons.push('Choisis une date future.');
    else if(days<o.weeks*7)reasons.push(`Ce générateur demande au moins ${o.weeks} semaines pour cet objectif. Il ne compresse pas une préparation.`);
    if(weeks>26)reasons.push('L’objectif est à plus de 26 semaines : enregistre-le et reviens plus près de la date pour établir le programme.');
    if(p.maxMinutes<o.minutes||p.weekKm<o.km||p.weekMinutes<40||p.currentSessions<2)reasons.push(`La base attendue pour ce modèle est au moins ${o.minutes} minutes en continu, ${o.km} km par semaine et deux sorties régulières. Commence par construire cette base.`);
    if(p.objective==='21'&&p.sessions<3)reasons.push('Ce modèle de semi-marathon demande au moins 3 séances disponibles par semaine.');
    if(p.objective==='42'&&(p.sessions<4||p.currentSessions<3||!['21','42'].includes(p.experience)))reasons.push('Ce modèle marathon est limité aux sportifs ayant déjà terminé un semi et pratiquant régulièrement, avec 4 créneaux disponibles minimum.');
    if(p.weekKm>100||p.weekMinutes>750)reasons.push('Ton volume dépasse le champ de ce générateur général : une programmation individualisée est préférable.');
    if(reasons.length)return {status:'review',profile:p,reasons};
    const id=uid();const frequency=Math.min(p.sessions,p.currentSessions+1);
    const trainingDays=p.trainingDays?selectTrainingDays(p.trainingDays,frequency):null;
    const startWeekday=new Date(start+'T12:00:00Z').getUTCDay();
    const schedule=trainingDays?trainingDays.map(d=>(d-startWeekday+7)%7).sort((a,b)=>a-b):{2:[1,4],3:[0,2,5],4:[0,2,4,6],5:[0,1,3,4,6]}[frequency];
    const pace=p.recentMinutes?p.recentMinutes/p.recentDistance:null;
    const notes=[`${frequency} séances retenues sur ${p.sessions} créneaux disponibles ; au plus une séance supplémentaire par rapport à ton rythme actuel.`,`Le volume part de tes ${p.weekMinutes} minutes hebdomadaires déclarées, sans dépasser ta sortie la plus longue au départ.`,`Allègement toutes les quatre semaines et réduction avant l’échéance. Les durées sont des repères, à revoir selon tes sensations.`];
    if(trainingDays){notes.push(`Jours retenus : ${schedule.map(offset=>weekdays[(startWeekday+offset)%7].toLowerCase()).join(', ')}. La course reste à ta date cible, même si elle tombe un autre jour. Aucune séance ajoutée pour compenser la fin du programme.`);if(trainingDays.some(d=>trainingDays.includes((d+1)%7)))notes.push('Certains jours choisis se suivent. Si possible, espace-les en revenant au questionnaire.');}
    if(p.targetMinutes)notes.push(`Ton souhait de ${p.targetMinutes} min est mémorisé, sans promesse de résultat ni accélération imposée pour l’atteindre.`);
    if(pace)notes.push(`Référence déclarée : ${p.recentDistance} km en ${p.recentMinutes} min. Elle sert à contextualiser ton objectif ; le programme se règle au ressenti, pas sur une allure médicale ou garantie.`);
    if(pace&&p.targetMinutes&&p.targetMinutes/Number(p.objective)<pace)notes.push('Le chrono souhaité demande une allure plus rapide que ta référence récente sur une distance égale ou plus courte. Ce programme ne valide pas sa faisabilité : revois-le avec un entraîneur.');
    const startTotal=Math.min(p.weekMinutes,frequency*p.maxMinutes*.82);
    const growth=p.level==='beginner'||p.weekKm<20?.03:.05;
    let peak=startTotal;let peakLong=Math.min(p.maxMinutes,startTotal*(frequency===2?.55:.38),p.usualKm>0?p.usualKm*(p.weekMinutes/p.weekKm)*1.15:p.maxMinutes);
    const quality=p.level!=='beginner'&&p.currentSessions>=3&&p.priority!=='finish';
    const result=[];
    for(let w=0;w<weeks;w++){
      const last=w===weeks-1, taper=w>=weeks-2, recovery=(w+1)%4===0&&!taper;
      if(w>0&&!taper&&!recovery){peak=Math.min(startTotal*1.55,peak*(1+growth));peakLong=Math.min(o.long,peakLong*(1+growth));}
      const factor=last?.55:taper?.75:recovery?.8:1;
      const total=Math.floor(peak*factor);const long=Math.floor(Math.min(peakLong*factor,total*(frequency===2?.55:.42)));
      const ordinary=Math.min(long,Math.floor((total-long)/(frequency-1)));
      let workouts=Array.from({length:frequency},(_,i)=>{
        const isLong=i===frequency-1;const duration=Math.max(5,isLong?long:ordinary);
        const varied=quality&&i===1&&!isLong&&!recovery&&!taper&&w>1&&duration>=30;
        const repeats=varied?Math.min(6,Math.floor((duration-20)/2)):0;
        const description=varied?`10 min faciles, ${repeats} × (1 min soutenue, sans sprint + 1 min facile), puis ${duration-10-repeats*2} min faciles. Remplace par un footing facile en cas de fatigue.`:`${duration} min en endurance facile, à une intensité permettant de parler. Début et fin très tranquilles ; marche possible.`;
        return {id:`${id}-w${w+1}-s${i+1}`,planId:id,week:w+1,date:addDays(start,w*7+schedule[i]),type:varied?'varied':isLong?'long':'easy',duration,distance:null,description,completed:false,completedAt:null};
      });
      if(last){
        // Keep only sessions before the target, never prescribe after the event.
        workouts=workouts.filter(x=>day(x.date)<day(p.targetDate)-1).slice(0,frequency-1);
        workouts.push({id:`${id}-event`,planId:id,week:w+1,completed:false,completedAt:null,date:p.targetDate,type:'event',duration:null,distance:Number(p.objective)==21?21.1:Number(p.objective)==42?42.195:Number(p.objective),description:'Échéance de ton objectif, à réévaluer selon ta préparation et tes sensations. La terminer ou tenir un chrono n’est pas garanti.'});
      }
      result.push({number:w+1,kind:last?'event':taper?'taper':recovery?'recovery':'build',plannedMinutes:workouts.reduce((s,x)=>s+(x.duration||0),0),workouts});
    }
    return {status:'ready',profile:p,plan:{schemaVersion:1,algorithmVersion:'local-general-v2-days',id,userId:'local-device',sport:'running',objective:p.objective,targetDate:p.targetDate,targetMinutes:p.targetMinutes,priority:p.priority,startDate:start,duration:weeks,sessionsPerWeek:frequency,trainingDays,weeks:result,notes,createdAt:new Date().toISOString()}};
  }
  function progress(plan,date=today()){
    const all=plan.weeks.flatMap(w=>w.workouts);const completed=all.filter(w=>w.completed).length;
    const current=Math.max(1,Math.min(plan.duration,Math.floor((day(date)-day(plan.startDate))/7)+1));
    const currentWorkouts=plan.weeks[current-1].workouts;const next=all.find(w=>!w.completed&&w.date>=date)||null;
    return {completed,total:all.length,percent:Math.round(completed/all.length*100),current,currentDone:currentWorkouts.filter(w=>w.completed).length,currentRemaining:currentWorkouts.filter(w=>!w.completed).length,next,overdue:all.filter(w=>!w.completed&&w.date<date).length};
  }
  function cleanActivity(input,date=today()){
    if(!sports[input.sport])throw Error('Choisis un sport.');
    if(!Number.isFinite(day(input.date))||day(input.date)>day(date))throw Error('La date de la sortie doit être valide et ne pas être dans le futur.');
    return {id:input.id||uid(),userId:'local-device',source:'manual',sport:input.sport,date:input.date,duration:number(input.duration,1,1440,'Durée'),distance:input.distance===''||input.distance==null?null:number(input.distance,0,1000,'Distance'),elevation:input.elevation===''||input.elevation==null?null:number(input.elevation,0,12000,'Dénivelé'),notes:String(input.notes||'').slice(0,1000),routeId:input.routeId||null,workoutId:input.workoutId||null,createdAt:new Date().toISOString()};
  }
  function challengeProgress(challenge,activities){const matching=activities.filter(a=>a.sport===challenge.sport&&a.date>=challenge.startDate&&a.date<=challenge.endDate);return challenge.unit==='activities'?matching.length:Math.round(matching.reduce((sum,a)=>sum+(a.distance||0),0)*100)/100;}
  function empty(){return {schemaVersion:1,profile:null,plan:null,goals:[],activities:[],favorites:[],eventDrafts:[],challenges:[]};}
  function validState(s){return s&&s.schemaVersion===1&&['goals','activities','favorites','eventDrafts','challenges'].every(k=>Array.isArray(s[k]))&&(!s.plan||(s.plan.schemaVersion===1&&Array.isArray(s.plan.weeks)&&s.plan.weeks.length>0&&s.plan.weeks.every(w=>Array.isArray(w.workouts))))&&(!s.profile||(typeof s.profile==='object'&&sports[s.profile.sport]));}
  function createStore(storage){
    const key='run-relais-sport-v1';let memory=empty(),issue='';let blocked=false;
    function read(){try{const raw=storage.getItem(key);if(raw){const parsed=JSON.parse(raw);if(!validState(parsed))throw Error('Données locales incompatibles.');memory=parsed;}else memory=empty();}catch(e){issue='Le stockage local est indisponible ou illisible. Exporte tes données avant de réinitialiser cet espace.';blocked=true;}return JSON.parse(JSON.stringify(memory));}
    function update(fn){const state=read();fn(state);if(!validState(state))throw Error('Format de données invalide.');if(blocked)throw Error(issue);try{storage.setItem(key,JSON.stringify(state));memory=state;return state;}catch(e){issue='Enregistrement impossible sur cet appareil. Vérifie l’espace disponible ou les réglages du navigateur.';throw Error(issue);}}
    return {read,update,get issue(){return issue;},clear(){storage.removeItem(key);memory=empty();issue='';blocked=false;},key};
  }
  const api={sports,objectives,templates,weekdays,uid,today,day,addDays,cleanProfile,generate,progress,cleanActivity,challengeProgress,createStore,empty,validState};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.RunSport=api;
})(typeof globalThis!=='undefined'?globalThis:window);
