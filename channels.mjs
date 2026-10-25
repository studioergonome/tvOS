export function filterChannels(channels,country=''){
 if(!country)return channels;
 return channels.filter(c=>country==='ZZ'?!(c.countries?.length):c.countries?.includes(country));
}
export function channelCountries(channels){
 const result=new Set();for(const c of channels){if(c.countries?.length)c.countries.forEach(code=>result.add(code));else result.add('ZZ');}return [...result];
}
