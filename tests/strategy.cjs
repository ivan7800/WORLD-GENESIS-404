const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');
const nodes=new Map();
function node(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})},set(o,k,v){o[k]=v;return true}})}}}
const doc={getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement(){return node()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map(),ctx=vm.createContext({document:doc,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});
vm.runInContext(source,ctx);
const run=x=>vm.runInContext(x,ctx);
const traits=JSON.parse(run('JSON.stringify(state.civs.map(c=>civTrait(c)))'));
assert(traits.every(x=>['Agraria','Mercantil','Expansionista','Erudita','Militarista'].includes(x)));
const original=run('JSON.stringify(state)');
for(let i=0;i<500;i++)run('yearStep()');
assert(run('state.civs.every(c=>c.cities.reduce((sum,x)=>sum+x.pop,0)===c.population)'));
run('restore('+JSON.stringify(original)+')');
assert.deepStrictEqual(JSON.parse(run('JSON.stringify(state.civs.map(c=>civTrait(c)))')),traits);
assert.strictEqual(run('state.year'),0);
assert(run('state.civs.every(c=>typeof civicPriority(c)==="string"||civicPriority(c)===null)'));
console.log('PASS: traits, strategy selection, 500-year simulation, old save compatibility');
