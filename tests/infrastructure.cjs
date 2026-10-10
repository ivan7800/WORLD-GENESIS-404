const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8'),nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map(),ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=code=>vm.runInContext(code,ctx);
run('state.tiles.fill(2);const c=state.civs[0],city=c.cities[0];c.wood=150;c.stone=150;c.wealth=500;');
assert.equal(run("investInfrastructure(c,city,'road')"),true);
assert.equal(run('city.infrastructure.road'),1);
assert.equal(run('c.wood'),140);
assert.equal(run('c.stone'),143);
const before=run('c.wealth');run('infrastructureStep()');assert(run('c.wealth')<before);
run('state.tiles.fill(0);state.tiles[index(city.x,city.y)]=2');
assert.equal(run("investInfrastructure(c,city,'port')"),true);assert.equal(run('city.infrastructure.port'),1);
const snap=run('JSON.stringify(state)');run('restore('+JSON.stringify(snap)+')');assert.equal(run('state.civs[0].cities[0].infrastructure.port'),1);
const old=JSON.parse(snap);old.schemaVersion=11;delete old.civs[0].cities[0].infrastructure;
run('restore('+JSON.stringify(JSON.stringify(old))+')');assert.equal(run('state.schemaVersion'),19);assert.equal(run('state.civs[0].cities[0].infrastructure.road'),0);
// Maritime corridors require both endpoints with ports.
run('state.tiles.fill(0);const a=state.civs[0],b=state.civs[1];for(const c of [a,b]){const city=c.cities[0];state.tiles[index(city.x,city.y)]=2;ensureInfrastructure(city);city.infrastructure.port=0}');
assert.equal(run("chooseTradeCorridor(state.civs[0],state.civs[1])"),null);
run('state.civs[0].cities[0].infrastructure.port=1;state.civs[1].cities[0].infrastructure.port=1');
assert.equal(run("chooseTradeCorridor(state.civs[0],state.civs[1]).mode"),'sea');
console.log('PASS: road building, payment, upkeep, port geography, migration v11→v12, seaborne port requirement');
