const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');const nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map();const ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=x=>vm.runInContext(x,ctx);
assert.equal(run('state.schemaVersion'),19);
assert(run('state.civs.every(c=>STRATEGIC_DOCTRINES.includes(strategicDoctrine(c)))'));
assert(run('state.civs.every(c=>strategicDoctrine(c)===strategicDoctrine(c))'));
run('(()=>{const c=state.civs[0];c.food=0;c.production=-5;c.wealth=100;state.year=5;strategicAIStep()})()');
assert.equal(run('state.civs[0].strategyAction'),'abastecer');
assert(run('state.civs[0].food>=14 && state.civs[0].wealth===90'));
assert(run('state.events.some(e=>e.title==="Consejo estratégico")'));
run('(()=>{const c=state.civs[0];c.food=500;c.production=20;c.unrest=90;c.mandate=10;c.wealth=100;state.year=10;strategicAIStep()})()');
assert.equal(run('state.civs[0].strategyAction'),'estabilizar');
assert(run('state.civs[0].unrest<90 && state.civs[0].wealth===92'));
for(let i=0;i<120;i++)run('yearStep()');
assert(run('state.civs.every(c=>Number.isFinite(c.wealth)&&c.wealth>=0&&Number.isFinite(c.food)&&c.food>=0)'));
console.log('PASS: strategic profiles, resource-backed decisions, chronicles, 120 years');
