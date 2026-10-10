const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8'),nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map(),ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=code=>vm.runInContext(code,ctx);
// Flat land supports a route; central mountain ridge increases its weighted cost.
const plain=JSON.parse(run("JSON.stringify((()=>{state.tiles.fill(2);return transportPath({x:5,y:5},{x:12,y:5},'land')})())"));
assert(plain&&plain.mode==='land'&&plain.cost===7);
const hills=JSON.parse(run("JSON.stringify((()=>{for(let x=6;x<12;x++)state.tiles[index(x,5)]=4;return transportPath({x:5,y:5},{x:12,y:5},'land')})())"));
assert(hills&&hills.cost<21&&hills.path.some(([x,y])=>y!==5),'must route around high-cost mountains');
// A full-width water barrier blocks land paths but permits maritime paths if city ports exist.
const disconnected=run("(()=>{state.tiles.fill(2);for(let x=0;x<W;x++)state.tiles[index(x,20)]=0;return transportPath({x:5,y:15},{x:5,y:25},'land')===null})()");
assert(disconnected);
const sea=JSON.parse(run("JSON.stringify((()=>{state.tiles.fill(0);state.tiles[index(5,15)]=2;state.tiles[index(5,25)]=2;return transportPath({x:5,y:15},{x:5,y:25},'sea')})())"));
assert(sea&&sea.mode==='sea'&&sea.path.every(([x,y])=>run(`state.tiles[index(${x},${y})]<=1`)));
// Normal trading and recovery preserve both goods and total money, including freight.
run("generate();const [a,b]=state.civs;a.food=800;b.food=0;a.wealth=20;b.wealth=5000;signTreaty(a,b,'comercio',20)");
const before=JSON.parse(run('JSON.stringify(state.civs.slice(0,2).map(c=>({food:c.food,wealth:c.wealth})))'));
run('tradeStep()');const after=JSON.parse(run('JSON.stringify(state.civs.slice(0,2).map(c=>({food:c.food,wealth:c.wealth})))'));
for(const field of ['food','wealth'])assert.equal(before.reduce((a,c)=>a+c[field],0),after.reduce((a,c)=>a+c[field],0));
const route=JSON.parse(run('JSON.stringify(state.tradeRoutes[0])'));
assert(route.path?.length>1&&Number.isFinite(route.cost)&&['sea','land'].includes(route.mode));
const snapshot=run('JSON.stringify(state)');run('restore('+JSON.stringify(snapshot)+')');assert.equal(run('state.tradeRoutes[0].mode'),route.mode);
console.log('PASS: geography, mountain detour, land isolation, maritime path, conserved payments, persistence');
