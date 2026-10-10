const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../app.js','utf8');
function element(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const nodes=new Map();const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},createElement(){return element()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const context=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(src,context);
const run=x=>vm.runInContext(x,context);
assert.equal(run('state.schemaVersion'),19);
run('historicalStep()');assert.equal(run('state.civs[0].lifeHistory.phase'),'origen');
run('state.civs[0].cities.push(...Array.from({length:3},(_,i)=>({name:"Hist"+i,x:10+i*8,y:10,founded:1,buildings:{homes:1,farms:1,workshops:0,markets:0},pop:40,prosperity:50})));state.civs[0].population=500;state.year=30;historicalStep()');
assert.equal(run('state.civs[0].lifeHistory.phase'),'apogeo');
run('state.civs[0].cities.length=1;state.year=31;historicalStep()');assert.equal(run('state.civs[0].lifeHistory.phase'),'decadencia');
run('state.civs[0].alive=false;state.year=32;historicalStep()');assert.equal(run('state.civs[0].lifeHistory.extinctYear'),32);
assert(run('valid(JSON.parse(JSON.stringify(state)))'));
run('restore(JSON.stringify(state))');assert.equal(run('state.civs[0].lifeHistory.phase'),'extinción');
run('state.schemaVersion=16;state.civs.forEach(c=>delete c.lifeHistory);restore(JSON.stringify(state))');assert.equal(run('state.schemaVersion'),19);
console.log('PASS: nacimiento, apogeo, decadencia, extinción, historia persistente y migración v16→v17');
