import {build} from 'esbuild';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import {readFile,writeFile,mkdir,cp,rm,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'dist/app');
await mkdir(path.join(root,'dist'),{recursive:true});
await rm(out,{recursive:true,force:true});await mkdir(out);
for(const folder of ['fonts','icons','logos','branding'])await cp(path.join(root,'assets',folder),path.join(out,'assets',folder),{recursive:true});
const manifest=JSON.parse(await readFile(path.join(root,'webos/appinfo.json'),'utf8'));
manifest.icon='assets/branding/icon.png';manifest.largeIcon='assets/branding/largeIcon.png';
// Export deployment sizes from the unchanged supplied master using macOS's image tool.
for(const [size,name] of [[80,'icon.png'],[130,'largeIcon.png']])execFileSync('sips',['-z',String(size),String(size),path.join(root,'assets/branding/app-logo-1024.png'),'--out',path.join(out,'assets/branding',name)],{stdio:'ignore'});
await writeFile(path.join(out,'appinfo.json'),JSON.stringify(manifest,null,2)+'\n');
let html=await readFile(path.join(root,'index.html'),'utf8');
// Reference-only promotional photo stays outside the distributable. Real TMDB art replaces the local neutral fallback.
html=html.replace('src="assets/reference/studio.jpg"','src="assets/branding/fallback.svg"').replace('alt="The Studio promotional artwork, Apple TV Press"','alt=""');
html=html.replace('<title>tvOS · Preview</title>','<title>tvOS</title>').replace(/style\.css\?v=[^"]+/,'style.css').replace(/<script type="module" src="app.js\?v=\d+"><\/script>/,'<script src="app.js"></script>').replace(/channels\.js\?v=\d+/,'channels.js');
if(!html.includes('media-src '))html=html.replace("font-src 'self';", "media-src https: http:; font-src 'self';");
html=html.replace('<h1>The Studio</h1>','<h1></h1>').replace('A little Hollywood. A lot of drama.','');
await writeFile(path.join(out,'index.html'),html);
await writeFile(path.join(out,'assets/branding/fallback.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="g"><stop stop-color="#294a56"/><stop offset="1" stop-color="#14202e"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#g)"/></svg>');
await build({entryPoints:[path.join(root,'tools/tv-entry.mjs')],outfile:path.join(out,'app.js'),bundle:true,format:'iife',target:'chrome68',minify:true,legalComments:'eof'});
let css=(await readFile(path.join(root,'style.css'),'utf8')).replaceAll('cqw','vw').replaceAll(':focus-visible',':focus').replaceAll('linear-gradient(#fff 0 0)','linear-gradient(#fff,#fff)');
css+='\n'+await readFile(path.join(root,'tools/webos5.css'),'utf8');
const sheet=postcss.parse(css);
sheet.walkRules(rule=>{
 if(!rule.selector.includes(':is('))return;
 const ast=selectorParser().astSync(rule.selector);
 // Expand :is() lists so Chromium 68 does not discard focus and hover styles.
 let changed=true;
 while(changed){changed=false;for(const sel of [...ast.nodes]){let found;sel.walkPseudos(p=>{if(!found&&p.value===':is')found=p;});if(!found)continue;const choices=found.nodes;for(const choice of choices){const clone=sel.clone();let target;clone.walkPseudos(p=>{if(!target&&p.value===':is')target=p;});target.replaceWith(...choice.nodes.map(n=>n.clone()));ast.insertBefore(sel,clone);}sel.remove();changed=true;}}
 rule.selector=ast.toString();
});
sheet.walkDecls('inset',decl=>{const parts=decl.value.split(/\s+(?![^()]*\))/);const [a,b=a,c=a,d=b]=parts;['top','right','bottom','left'].forEach((prop,i)=>decl.cloneBefore({prop,value:[a,b,c,d][i]}));decl.remove();});
// min() is newer than the target; the fixed app stage is 16:9.
sheet.walkDecls('width',d=>{if(d.value==='min(100vw,calc(100vh * 16 / 9))')d.value='100vw';});
await writeFile(path.join(out,'style.css'),sheet.toString());
const playlistDir=process.env.TVOS_PLAYLIST_DIR?.replace(/^~(?=\/)/,process.env.HOME);
if(playlistDir)execFileSync('python3',[path.join(root,'tools/export_playlists.py'),playlistDir,path.join(out,'channels.js')],{stdio:'inherit'});
else{await cp(path.join(root,'channels.js'),path.join(out,'channels.js'));console.log('No playlist directory supplied: metadata-only build.');}
// webOS 5.x file origins do not match CSP 'self'. Embed code with exact hashes
// rather than enabling file-scheme scripts or unsafe-inline execution.
const inlineStyle=await readFile(path.join(out,'style.css'),'utf8');
const inlineApp=(await readFile(path.join(out,'app.js'),'utf8')).replace(/<\/script/gi,'<\\/script');
const inlineChannels=(await readFile(path.join(out,'channels.js'),'utf8')).replaceAll('<','\\u003c');
const hash=value=>"'sha256-"+createHash('sha256').update(value).digest('base64')+"'";
html=html.replace(/<link rel="stylesheet" href="style.css">/,()=>'<style>'+inlineStyle+'</style>')
 .replace(/<script src="channels.js"><\/script>/,()=>'<script>'+inlineChannels+'</script>')
 .replace(/<script src="app.js"><\/script>/,()=>'<script>'+inlineApp+'</script>')
 .replace("script-src 'self';",'script-src '+hash(inlineChannels)+' '+hash(inlineApp)+';')
 .replace("style-src 'self';",'style-src '+hash(inlineStyle)+';')
 .replace("img-src 'self' data:","img-src 'self' file: data:")
 .replace("font-src 'self';","font-src 'self' file:;");
html=html.replace('APPLE TV · FEATURED SERIES','');
await writeFile(path.join(out,'index.html'),html);
// Only the hash-checked copies embedded in index.html are needed at runtime.
for(const file of ['app.js','channels.js','style.css'])await rm(path.join(out,file));
for(const file of ['LICENSE'])await cp(path.join(root,file),path.join(out,file));
const sum=createHash('sha256').update(inlineApp).digest('hex');
await writeFile(path.join(root,'dist/build-info.json'),JSON.stringify({version:manifest.version,target:'webOS 5.x / Chromium 68',privatePlaylists:!!playlistDir,scriptSHA256:sum,hardwareValidated:false},null,2)+'\n');
console.log('Built dist/app for webOS 5.x. Hardware validation pending.');
