const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');const nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map();const ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=x=>vm.runInContext(x,ctx);
assert.equal(run('state.schemaVersion'),19);
assert(run('state.civs.every(c=>(ensureIntrigue(c),c.spyNetwork>=0&&c.spyNetwork<=100))'));
run("(()=>{const [a,b]=state.civs;a.relations[b.id]=-90;b.relations[a.id]=-90;a.spyNetwork=100;a.wealth=100;b.spyNetwork=0;b.wealth=90;state.year=30;a.lastPlot=0;b.lastPlot=0;espionageStep(()=>0)})()");
assert(run('state.civs[0].wealth<100'));
assert(run('state.civs[1].subversion>0 || state.civs[1].wealth<90'));
run("(()=>{const c=state.civs[1];c.subversion=80;c.unrest=90;c.mandate=10;c.lastPlot=0;state.year=40;espionageStep(()=>0)})()");
assert(run('state.events.some(e=>e.title==="Golpe de Estado")'));
let old=JSON.parse(run('JSON.stringify(state)'));old.schemaVersion=15;for(const c of old.civs){delete c.spyNetwork;delete c.subversion;delete c.lastPlot}
run('restore('+JSON.stringify(JSON.stringify(old))+')');
assert.equal(run('state.schemaVersion'),19);
assert(run('state.civs.every(c=>Number.isInteger(c.spyNetwork)&&c.subversion===0)'));
let bad=JSON.parse(run('JSON.stringify(state)'));bad.civs[0].spyNetwork=10000;
assert.equal(run('valid('+JSON.stringify(JSON.stringify(bad))+')'),false);
for(let i=0;i<150;i++)run('yearStep()');
assert(run('state.civs.every(c=>c.spyNetwork>=0&&c.spyNetwork<=100&&c.subversion>=0&&c.subversion<=100)'));
console.log('PASS: espionage, damage, coups, v15 migration, validation, 150 years');
