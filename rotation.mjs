// A slide earns its full dwell time; page/network startup does not consume it.
export function createRotationClock(callback,{delay=10000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let timer=null;
 return {schedule(){if(timer!==null)clearTimer(timer);timer=setTimer(()=>{timer=null;callback();},delay);},stop(){if(timer!==null)clearTimer(timer);timer=null;}};
}
