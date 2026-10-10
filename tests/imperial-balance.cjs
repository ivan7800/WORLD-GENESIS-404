const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../app.js','utf8');
function element(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const nodes=new Map();const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},createElement(){return element()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const context=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(src,context);
function run(x){return vm.runInContext(x,context)}
// Pruebas unitarias de la presión imperial con estado real del motor.
run('generate()');
const baseline=run('imperialStrain(state.civs[0])');
assert.equal(baseline,0,'una sola ciudad no debe sufrir presión imperial');
run(`(function(){const c=state.civs[0];c.cities=[{x:5,y:5},{x:15,y:15},{x:25,y:25},{x:35,y:35},{x:45,y:45},{x:55,y:55},{x:65,y:65}].map((p,i)=>({name:'A'+i,...p,pop:30,prosperity:40,buildings:{homes:1,farms:1,workshops:0,markets:0}}));c.food=0;c.wealth=0;c.cohesion=30;c.population=500;ensureUnrest(c);ensureGovernment(c);})()`);
const high=run('imperialStrain(state.civs[0])');
assert(high>=4,'la dispersión territorial debe crear presión');
run('state.civs[0].wealth=5000;state.civs[0].food=1000;state.civs[0].cohesion=90');
const cushioned=run('imperialStrain(state.civs[0])');
assert(cushioned<high,'riqueza y cohesión deben aliviar la presión');
console.log('PASS: presión imperial, límites y amortiguación económica-cultural');
