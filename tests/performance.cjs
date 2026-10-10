const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8'),nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map(),ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=code=>vm.runInContext(code,ctx);
// Test fast corridor reuse is limited to one commercial turn, without stale terrain paths.
run("state.tiles.fill(2)");
const cities=JSON.parse(run('JSON.stringify(state.civs.slice(0,2).map(c=>c.cities[0]))'));
const x=cities[0],y=cities[1];
run("routeCache.active=true;invalidateTransportCache()");
run(`transportPath({x:${x.x},y:${x.y}},{x:${y.x},y:${y.y}},'land')`);
let before=run('routeCache.hits');
run(`transportPath({x:${x.x},y:${x.y}},{x:${y.x},y:${y.y}},'land')`);
assert.equal(run('routeCache.hits'),before+1);
assert(run('routeCache.paths.size<=256'));
run('routeCache.active=false;invalidateTransportCache()');
let cost=run(`transportPath({x:5,y:5},{x:12,y:5},'land').cost`);
run('for(let i=6;i<12;i++)state.tiles[index(i,5)]=4');
assert(run(`transportPath({x:5,y:5},{x:12,y:5},'land').path.some(v=>v[1]!==5)`));
assert.equal(run('routeCache.paths.size'),0);
console.log('PASS: cache hit, bounded memory, changes in terrain cannot stale direct queries');
