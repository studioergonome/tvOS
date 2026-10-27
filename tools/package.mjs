import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
const cached=path.join(homedir(),'.cache/tvos-webos-tools/node_modules/.bin/ares-package');
const command=process.env.TVOS_ARES_PACKAGE||(existsSync(cached)?cached:'ares-package');
execFileSync(command,['dist/app','-o','dist'],{stdio:'inherit'});

const {readFileSync}=await import('node:fs');
const manifest=JSON.parse(readFileSync('dist/app/appinfo.json','utf8'));
execFileSync('python3',['tools/verify-package.py',`dist/${manifest.id}_${manifest.version}_all.ipk`],{stdio:'inherit'});
