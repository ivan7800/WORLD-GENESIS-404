const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');
const nodes=new Map(),storage=new Map();
function node(id=''){return {id,value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',innerHTML:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(name,cb){(this.listeners??={})[name]=cb},click(){this.listeners?.click?.({target:this})},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})},set(o,k,v){o[k]=v;return true}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement(){return node()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const localStorage={setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)??null}};
const context=vm.createContext({document,window:{addEventListener(){}},localStorage,devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});
vm.runInContext(source,context,{filename:'app.js'});
const run=s=>vm.runInContext(s,context);
assert.strictEqual(run('state.year'),0);assert.ok(run('state.civs.length')>=1);
for(let i=0;i<1000;i++)run('yearStep()');
assert.strictEqual(run('state.year'),1000);
assert.ok(run('state.civs.every(c=>Number.isFinite(c.population)&&c.population>=0&&c.cities.every(city=>city.pop>=0))'));
assert.ok(run('state.civs.every(c=>c.cities.reduce((n,city)=>n+city.pop,0)===c.population)'),'population distribution must match nations');
run('recalculateTerritory()');assert.ok(run('state.civs.every(c=>c.territory>=0)'));
const snapshot=run('JSON.stringify(state)');storage.set('world-genesis-404-v1',snapshot);
nodes.get('load').click();assert.strictEqual(run('state.year'),1000);
const bad=JSON.stringify({...JSON.parse(snapshot),tiles:[]});
assert.throws(()=>run('restore('+JSON.stringify(bad)+')'),/inválido/);
assert.strictEqual(run('state.year'),1000,'invalid restore must preserve existing world');
console.log('PASS: generation, 1000 years, population consistency, territory, save/restore, invalid import preservation');
// Malformed nested structures must be rejected without replacing the current game.
for(const malformed of [
 {...JSON.parse(snapshot),civs:[null]},
 {...JSON.parse(snapshot),events:[null]},
 {...JSON.parse(snapshot),civs:[]},
 {...JSON.parse(snapshot),civs:[{...JSON.parse(snapshot).civs[0],cities:[null]}]},
]){
 assert.throws(()=>run('restore('+JSON.stringify(JSON.stringify(malformed))+')'));
 assert.strictEqual(run('state.year'),1000);
}
assert.throws(()=>run('restore('+JSON.stringify('x'.repeat(2000001))+')'),/demasiado grande/);
assert.strictEqual(run('state.year'),1000);
console.log('PASS: invalid nested data, empty civilization set, oversized JSON preserve current game');
// Individual controls exercised in the simulated DOM (not equivalent to browser E2E).
const initialYear=run('state.year');nodes.get('step').click();assert.strictEqual(run('state.year'),initialYear+1);
nodes.get('speed').click();assert.strictEqual(nodes.get('speed').textContent,'2×');
nodes.get('zoomIn').click();assert.ok(run('zoom')>1);
nodes.get('zoomOut').click();assert.ok(run('zoom')<=1.01);
nodes.get('tabNations').click();assert.strictEqual(run('activeTab'),'nations');
nodes.get('tabHistory').click();assert.strictEqual(run('activeTab'),'history');
nodes.get('save').click();assert.ok(storage.has('world-genesis-404-v1'));
nodes.get('play').click();assert.strictEqual(run('playing'),true);
nodes.get('play').click();assert.strictEqual(run('playing'),false);
console.log('PASS: simulated step, speed, zoom, tabs, save and play/pause handlers');
