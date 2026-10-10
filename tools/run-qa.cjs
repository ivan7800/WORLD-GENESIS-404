// Node-only test runner; bounded durations, explicit timeout classifications.
'use strict';
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const tests=fs.readdirSync(path.join(root,'tests')).filter(x=>x.endsWith('.cjs')).sort();
const perTest=Number(process.env.WG_QA_TIMEOUT_MS)||15000;
const results=[];
for(const name of tests){
 const start=Date.now();
 const child=spawnSync(process.execPath,[path.join(root,'tests',name)],{encoding:'utf8',timeout:perTest,maxBuffer:1024*1024});
 const status=child.error&&child.error.code==='ETIMEDOUT'?'TIMEOUT':child.status===0?'PASS':'FAIL';
 results.push({test:name,status,ms:Date.now()-start,detail:(child.stderr||child.stdout||'').trim().slice(-220)});
 console.log(`${status.padEnd(7)} ${name.padEnd(30)} ${results.at(-1).ms}ms`);
}
fs.writeFileSync(path.join(root,'QA-RESULTS-1.0-RC2.json'),JSON.stringify({timeoutMs:perTest,results},null,2)+'\n');
console.log('SUMMARY',Object.fromEntries(['PASS','FAIL','TIMEOUT'].map(s=>[s,results.filter(r=>r.status===s).length])));
process.exitCode=results.some(r=>r.status!=='PASS')?1:0;
