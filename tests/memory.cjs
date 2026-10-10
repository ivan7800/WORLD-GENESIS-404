const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');const nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map();const ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=x=>vm.runInContext(x,ctx);
assert.equal(run('state.schemaVersion'),19);
run(`(()=>{const a=state.civs[0],b=state.civs[1];a.cities.push({name:'Fortaleza Perdida',x:a.x+1,y:a.y,founded:1,buildings:{homes:1,farms:1,workshops:0,markets:0},pop:0,prosperity:50});a.population=500;distributePopulation(a);rememberLoss(a,b,a.cities[1]);b.cities.push(a.cities.pop());strategicMemoryStep()})()`);
assert.equal(run('state.civs[0].goal.type'),'recuperar');
assert.equal(run('state.civs[0].goal.targetId'),1);
assert.equal(run('state.civs[0].grievances.length'),1);
const before=run('JSON.stringify(state)');run('restore('+JSON.stringify(before)+')');
assert.equal(run('state.civs[0].goal.type'),'recuperar');
assert.equal(run('state.civs[0].grievances[0].city'),'Fortaleza Perdida');
const outdated=JSON.parse(before);outdated.schemaVersion=8;for(const c of outdated.civs){delete c.goal;delete c.grievances}
run('restore('+JSON.stringify(JSON.stringify(outdated))+')');
assert.equal(run('state.schemaVersion'),19);assert(run('state.civs.every(c=>c.goal && Array.isArray(c.grievances))'));
for(let i=0;i<300;i++)run('yearStep()');
assert(run('state.civs.every(c=>c.cities.reduce((n,t)=>n+t.pop,0)===c.population)'));
console.log('PASS: territorial memory, reconquest goal, v8 migration, save/restore, 300-year simulation');
