// Development-only inspector client, restricted to this app through a local tunnel.
export async function connectTV(port){
 if(!Number.isInteger(Number(port))||port<1024||port>65535)throw new Error('Invalid local inspector port.');
 const list=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const target=list.find(t=>t.url?.includes('/applications/com.tvos.launcher/index.html'));
 if(!target)throw new Error('tvOS is not running.');
 const ws=new WebSocket(target.webSocketDebuggerUrl.replace('localhost','127.0.0.1'));await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let id=0;const pending=new Map();
 ws.onmessage=e=>{const r=JSON.parse(e.data),p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);r.error?p.reject(new Error(r.error.message)):p.resolve(r.result);}};
 function command(method,params={}){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(new Error(method+' timed out.'));},15000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
 return {command,async evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;},close(){ws.close();for(const p of pending.values())clearTimeout(p.timer);}};
}
