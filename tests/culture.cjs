const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');const nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map();const ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=x=>vm.runInContext(x,ctx);
assert.equal(run('state.schemaVersion'),19);assert(run('state.civs.every(c=>typeof c.culture==="string" && c.culture.length>0)'));
const old=JSON.parse(run('JSON.stringify(state)'));old.schemaVersion=7;for(const c of old.civs){delete c.culture;delete c.epoch;delete c.parentId;delete c.cultureFounded;delete c.epochStart}
run('restore('+JSON.stringify(JSON.stringify(old))+')');assert.equal(run('state.schemaVersion'),19);assert(run('state.civs.every(c=>c.culture && c.epoch)'));
run(`(()=>{const c=state.civs[0];c.cities.push({name:'Provincia Rebelde',x:c.x+7,y:c.y,founded:3,buildings:{homes:2,farms:2,workshops:0,markets:0},pop:0,prosperity:10});c.population=400;c.food=0;c.production=-100;c.unrest=99;c.crisisYears=9;state.year=10;distributePopulation(c);internalCrisisStep(()=>0)})()`);
assert(run('state.civs.some(c=>c.parentId===state.civs[0].id && c.culture===state.civs[0].culture)'));
assert(run('ancestralConnections(state.civs[0]).descendants.length>=1'));
run(`(()=>{let c=state.civs[0];c.epoch='formación';c.epochStart=0;c.food=10000;c.wealth=400;c.unrest=0;c.production=100;c.population=100;state.year=50;culturalStep()})()`);
assert.equal(run('state.civs[0].epoch'),'esplendor');assert(run('state.events.some(e=>e.title==="Ciclo histórico")'));
const save=run('JSON.stringify(state)');run('restore('+JSON.stringify(save)+')');assert(run('state.civs.some(c=>c.parentId===state.civs[0].id)'));
for(let i=0;i<300;i++)run('yearStep()');assert(run('state.civs.every(c=>c.cities.reduce((n,t)=>n+t.pop,0)===c.population)'));
console.log('PASS: cultura determinista, migración v7, genealogía política, fases históricas, guardado y 300 años');
