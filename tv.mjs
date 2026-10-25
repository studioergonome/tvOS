// webOS service bridge. No network listener, pairing prompt or shell commands.
export function createTV(host=globalThis){
 const pending=new Set();
 const available=!!(host.PalmServiceBridge||host.webOS?.service?.request);
 function call(method,parameters={}){
  return new Promise((resolve,reject)=>{
   if(!available){reject(new Error('Available when running on the LG TV.'));return;}
   let bridge,finished=false;
   const finish=(data,error)=>{if(finished)return;finished=true;clearTimeout(timer);pending.delete(bridge);if(error||data?.returnValue===false)reject(new Error('The TV could not complete this action.'));else resolve(data);};
   const timer=setTimeout(()=>finish(null,true),6000);
   try{
    if(host.webOS?.service?.request){bridge=host.webOS.service.request('luna://com.webos.applicationManager',{method,parameters,onSuccess:data=>finish(data),onFailure:()=>finish(null,true)});}
    else{bridge=new host.PalmServiceBridge();bridge.onservicecallback=message=>{try{finish(JSON.parse(message));}catch{finish(null,true);}};bridge.call('luna://com.webos.applicationManager/'+method,JSON.stringify(parameters));}
    if(!finished)pending.add(bridge);
   }catch{finish(null,true);}
  });
 }
 const known={'Apple TV':['com.apple.appletv'],'Prime Video':['amazon'],'Netflix':['netflix'],'Stremio':['io.strem.tv']};
 let appList=null;
 const resolved=new Map(),statuses=new Map();
 function status(id){if(!statuses.has(id))statuses.set(id,call('getAppLoadStatus',{appId:id}).then(r=>r.exist===true).catch(()=>false));return statuses.get(id);}
 async function installed(){if(!appList)appList=call('listLaunchPoints').then(r=>r.launchPoints||[]).catch(()=>[]);return appList;}
 async function resolve(name){
  if(resolved.has(name))return resolved.get(name);
  // Public per-app probes work even when LG denies enumeration to sideloaded apps.
  const candidates=known[name]||[],checks=await Promise.all(candidates.map(status));
  let id=candidates.find((_,i)=>checks[i]);
  if(!id){const apps=await installed();const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');const match=apps.find(a=>normalize(a.title)===normalize(name));id=match?.appId||match?.id;}
  if(id)resolved.set(name,id);return id||null;
 }
 return {
  available,
  async checkApps(){return Promise.all(Object.keys(known).map(async name=>({name,id:await resolve(name)})));},
  async launch(name){
   if(!available)throw new Error('Available when running on the LG TV.');
   const id=await resolve(name);
   if(!id)throw new Error(name+' could not be identified by the TV.');
   await call('launch',{id});
  },
  async live(){await call('launch',{id:'com.webos.app.livetv'});},
  async input(number){if(!Number.isInteger(number)||number<1||number>4)throw new Error('Invalid HDMI input.');await call('launch',{id:'com.webos.app.hdmi'+number});},
  platformBack(){if(host.webOS?.platformBack)host.webOS.platformBack();else if(host.PalmSystem?.platformBack)host.PalmSystem.platformBack();},
 };
}
