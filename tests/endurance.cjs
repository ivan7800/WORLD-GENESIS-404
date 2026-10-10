const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../app.js','utf8');
function element(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const nodes=new Map();const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},createElement(){return element()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const context=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(src,context);
function run(x){return vm.runInContext(x,context)}
const results=[];
for(const seed of [404113,71,8821]){
 nodes.get('seed').value=String(seed);run('generate()');
 let maxPop=0,maxCities=0,maxCivs=0;
 for(let year=1;year<=300;year++){
  run('yearStep()');
  const stats=run('({year:state.year,pop:state.civs.reduce((n,c)=>n+c.population,0),cities:state.civs.reduce((n,c)=>n+c.cities.length,0),civs:state.civs.length,alive:state.civs.filter(c=>c.alive).length,war:state.wars.filter(w=>w.active).length,bad:state.civs.some(c=>![c.population,c.food,c.wood,c.stone,c.wealth,c.unrest,c.mandate,c.cohesion].every(v=>Number.isFinite(v)&&v>=0)),badBuildings:state.civs.some(c=>c.cities.some(t=>Object.values(t.buildings).some(v=>!Number.isFinite(v)||v<0)))})');
  assert.equal(stats.year,year);assert.equal(stats.bad,false,`invalid civ stats ${seed}/${year}`);assert.equal(stats.badBuildings,false,`invalid buildings ${seed}/${year}`);
  assert(stats.civs<=20&&stats.cities<=200&&stats.war<=3,`bound ${seed}/${year}`);
  maxPop=Math.max(maxPop,stats.pop);maxCities=Math.max(maxCities,stats.cities);maxCivs=Math.max(maxCivs,stats.civs);
 }
 results.push({seed,years:300,...run('({population:state.civs.reduce((n,c)=>n+c.population,0),alive:state.civs.filter(c=>c.alive).length,cities:state.civs.reduce((n,c)=>n+c.cities.length,0),wars:state.wars.filter(w=>w.active).length})'),maxPop,maxCities,maxCivs});
}
console.log('PASS: 3 seeds x 300 years, finite resources, nonnegative buildings, bounded scale');console.log(JSON.stringify(results,null,2));
