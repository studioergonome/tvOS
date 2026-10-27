// Keep the old image opaque beneath the incoming fade, avoiding a dip to black.
export function fadeArtwork(container,incoming,{duration=1800,reduced=false,onStart=()=>{},onMidpoint=()=>{},frame=callback=>requestAnimationFrame(callback),delay=setTimeout}={}){
 const previous=container.querySelector('img');
 incoming.className='artwork-next';incoming.style.transitionDuration=(reduced?0:duration)+'ms';container.append(incoming);
 return new Promise(resolve=>frame(()=>frame(()=>{
  onStart();
  incoming.classList.add('artwork-visible');
  delay(onMidpoint,reduced?0:200);
  delay(()=>{previous?.remove();incoming.classList.remove('artwork-next','artwork-visible');resolve();},reduced?0:duration+80);
 })));
}
