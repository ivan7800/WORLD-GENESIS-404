// Reduced-duration functional smoke: the original smoke.cjs retains its full 1000-year workload.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');
const nodes=new Map(),storage=new Map();
function node(id=''){return {id,value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',innerHTML:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(name,cb){(this.listeners??={})[name]=cb},click(){this.listeners?.click?.({target:this})},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})},set(o,k,v){o[k]=v;return true}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement(){return node()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const localStorage={setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)??null}};
const context=vm.createContext({document,window:{addEventListener(){}},localStorage,devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});
vm.runInContext(source,context,{filename:'app.js'});
const run=s=>vm.runInContext(s,context);
const {performance}=require('node:perf_hooks');
const samples=[];
for(const seed of [404113,71,8821]){
 nodes.get('seed').value=String(seed);run('generate()');
 const begin=performance.now();
 for(let i=0;i<100;i++)run('yearStep()');
 samples.push({seed,years:100,elapsedMs:Math.round(performance.now()-begin),cities:run('state.civs.reduce((n,c)=>n+c.cities.length,0)'),year:run('state.year')});
 assert.strictEqual(samples.at(-1).year,100);
 assert(run('state.civs.every(c=>Number.isFinite(c.population)&&c.population>=0)'));
}
console.log('PASS: benchmark 3 seeds x 100 years (machine-dependent wall time)');
console.log(JSON.stringify(samples,null,2));
