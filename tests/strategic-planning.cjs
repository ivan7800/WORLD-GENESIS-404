const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8'),nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map(),ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=x=>vm.runInContext(x,ctx);
assert.equal(run('state.schemaVersion'),19);
run('(()=>{const c=state.civs[0];c.food=500;c.production=25;c.unrest=0;c.mandate=80;strategicAIStep()})()');
assert(run('state.civs[0].strategyPlan.until>state.year'));
const original=run('state.civs[0].strategyPlan.action');
run('(()=>{const c=state.civs[0];c.food=500;c.production=25;c.unrest=0;c.mandate=80;state.year+=2;strategicAIStep()})()');
assert.equal(run('state.civs[0].strategyPlan.action'),original);
run('(()=>{const c=state.civs[0];c.food=0;c.production=-5;strategicAIStep()})()');
assert.equal(run('state.civs[0].strategyPlan.action'),'abastecer');
const exported=run('JSON.stringify(state)');run('restore('+JSON.stringify(exported)+')');assert.equal(run('state.civs[0].strategyPlan.action'),'abastecer');
const legacy=JSON.parse(exported);legacy.schemaVersion=18;for(const c of legacy.civs)delete c.strategyPlan;
run('restore('+JSON.stringify(JSON.stringify(legacy))+')');assert.equal(run('state.schemaVersion'),19);
for(let i=0;i<80;i++)run('yearStep()');
assert(run('state.civs.every(c=>Number.isFinite(c.food)&&c.food>=0&&Number.isFinite(c.wealth)&&c.wealth>=0)'));
console.log('PASS: multi-year plans, commitment, emergency override, save, migration, 80 years');
