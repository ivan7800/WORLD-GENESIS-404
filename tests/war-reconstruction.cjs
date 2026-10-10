const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8'),nodes=new Map();
function el(id=''){return {value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})}})}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id)},createElement(){return el()},createTextNode(s){return {textContent:s}},querySelectorAll(){return []},addEventListener(){},body:{classList:{toggle(){return false}}}};
const storage=new Map(),ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});vm.runInContext(source,ctx);const run=code=>vm.runInContext(code,ctx);
run('var testC=state.civs[0],testCity=testC.cities[0];testC.wood=300;testC.stone=300;testC.wealth=300;testCity.infrastructure={road:3,port:0};testCity.buildings={homes:5,farms:5,workshops:5,markets:5}');
assert.equal(run('damageCityFromWar(testCity,2)'),10);
assert.equal(run('testCity.infrastructure.road'),1);
assert.equal(run('testCity.buildings.homes'),3);
assert.equal(run('testCity.warDamage'),10);
const snapshot=run('JSON.stringify(state)');run('restore('+JSON.stringify(snapshot)+')');
assert.equal(run('state.schemaVersion'),19);
assert.equal(run('state.civs[0].cities[0].warDamage'),10);
run('testC=state.civs[0];testCity=testC.cities[0];state.year=3;');
const wood=run('testC.wood');run('reconstructionStep()');
assert.equal(run('testC.wood'),wood-5);
assert.equal(run('testCity.warDamage'),9);
assert.equal(run('testCity.infrastructure.road'),2);
const invalid=JSON.parse(run('JSON.stringify(state)'));invalid.civs[0].cities[0].warDamage=-5;
assert.equal(run('valid('+JSON.stringify(invalid)+')'),false);
// Earlier saves without warDamage migrate with a zero value.
const old=JSON.parse(run('JSON.stringify(state)'));old.schemaVersion=12;delete old.civs[0].cities[0].warDamage;
run('restore('+JSON.stringify(JSON.stringify(old))+')');
assert.equal(run('state.schemaVersion'),19);
assert.equal(run('state.civs[0].cities[0].warDamage'),0);
console.log('PASS: siege/conquest damage core, paid reconstruction, persistence and v12 migration');
