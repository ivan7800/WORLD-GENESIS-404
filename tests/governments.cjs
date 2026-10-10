const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');const nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map();const ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=x=>vm.runInContext(x,ctx);
assert.equal(run('state.schemaVersion'),19);
assert(run('state.civs.every(c=>(ensureGovernment(c),GOVERNMENTS.includes(c.government)&&c.mandate>=0&&c.mandate<=100))'));
run("(()=>{const c=state.civs[0];c.government='República';c.lastElection=0;c.ruler={name:'Primera',born:-30,reignStart:0};c.mandate=30;state.year=12;governmentStep(()=>0.4)})()");
assert.equal(run('state.civs[0].lastElection'),12);
assert(run("state.civs[0].ruler.name!=='Primera'"));
run("(()=>{const c=state.civs[0];c.government='Consejo';c.lastElection=12;state.year=32;governmentStep(()=>0.4)})()");
assert.equal(run('state.civs[0].lastElection'),32);
run("(()=>{const c=state.civs[0];c.government='Monarquía';c.lastElection=32;c.mandate=40;state.year=33;governmentStep(()=>0.4)})()");
assert.equal(run('state.civs[0].lastElection'),32);
const old=JSON.parse(run('JSON.stringify(state)'));old.schemaVersion=14;
for(const c of old.civs){delete c.government;delete c.mandate;delete c.lastElection;delete c.governmentSince}
run('restore('+JSON.stringify(JSON.stringify(old))+')');
assert.equal(run('state.schemaVersion'),19);
assert(run('state.civs.every(c=>GOVERNMENTS.includes(c.government))'));
const before=run('JSON.stringify(state)');run('restore('+JSON.stringify(before)+')');
for(let i=0;i<200;i++)run('yearStep()');
assert(run('state.civs.every(c=>GOVERNMENTS.includes(c.government)&&c.mandate>=0&&c.mandate<=100)'));
console.log('PASS: governments, elections, rotation, monarchy, migration v14, 200 years');
