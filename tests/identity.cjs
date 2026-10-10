const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');const nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map();const ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=x=>vm.runInContext(x,ctx);
assert.equal(run('state.schemaVersion'),19);
assert(run('state.civs.every(c=>BELIEFS.includes((ensureIdentity(c),c.belief))&&CUSTOMS.includes(c.custom))'));
run("(()=>{const c=state.civs[0];c.cohesion=50;c.unrest=90;for(let i=0;i<10;i++)identityStep()})()");
assert(run('state.civs[0].cohesion<50'));
const old=JSON.parse(run('JSON.stringify(state)'));old.schemaVersion=13;
for(const c of old.civs){delete c.belief;delete c.custom;delete c.cohesion}
run('restore('+JSON.stringify(JSON.stringify(old))+')');
assert.equal(run('state.schemaVersion'),19);
assert(run('state.civs.every(c=>BELIEFS.includes(c.belief)&&CUSTOMS.includes(c.custom))'));
const roundtrip=run('JSON.stringify(state)');run('restore('+JSON.stringify(roundtrip)+')');
for(let i=0;i<300;i++)run('yearStep()');
assert(run('state.civs.every(c=>c.cohesion>=0&&c.cohesion<=100)'));
console.log('PASS: identidad, tensión, migración v13, guardado y 300 años');
