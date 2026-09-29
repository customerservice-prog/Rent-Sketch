import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
test('every production frontend module parses before a visual release',()=>{
 const script="const fs=require('node:fs'),vm=require('node:vm');let count=0;for(const f of [...fs.readdirSync('js',{recursive:true}).filter(x=>x.endsWith('.js')).map(x=>'js/'+x),'script.js','dashboard/app.js']){try{new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});count++;}catch(error){console.error(f,error.message);process.exit(1);}}console.log(count+' frontend modules parsed');";
 const r=spawnSync(process.execPath,['--experimental-vm-modules','-e',script],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);console.log(r.stdout.trim());
});
test('photo-referenced furniture maintains geometry, SKU and layout contracts',()=>{
 const r=spawnSync(process.execPath,['--experimental-vm-modules','tests/furniture-accuracy-mesh.cjs'],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);console.log(r.stdout.trim());
});
