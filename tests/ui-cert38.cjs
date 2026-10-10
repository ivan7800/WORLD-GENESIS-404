// UI event binding and actions under simulated DOM; NOT browser E2E.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.strictEqual(new Set(ids).size,ids.length,'duplicate DOM id');
const nodes=new Map(), storage=new Map();let exportedFiles=0, keyboard;
function node(id=''){return {id,value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':id==='timelineNation'?'all':'',textContent:'',style:{},dataset:{},checked:true,children:[],listeners:{},classList:{add(){},remove(){},toggle(){return false}},addEventListener(k,fn){this.listeners[k]=fn},setAttribute(k,v){this[k]=v},click(){this.listeners.click?.({target:this})},append(...cs){this.children.push(...cs)},replaceChildren(...cs){this.children=cs},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})},set(o,k,v){o[k]=v;return true}})}}}
const document={getElementById(id){assert(ids.includes(id),`JS references absent HTML id: ${id}`);if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement(tag){const n=node();if(tag==='a')n.click=()=>exportedFiles++;return n},createTextNode(s){return {textContent:s}},querySelectorAll(selector){if(selector==='.tool')return tools;return []},addEventListener(type,cb){if(type==='keydown')keyboard=cb},body:{classList:{toggle(){return false}}}};
const tools=[...html.matchAll(/<button[^>]*data-tool="([^"]+)"/g)].map(m=>{let n=node(m[1]);n.dataset.tool=m[1];return n});
const ctx=vm.createContext({document,window:{addEventListener(){}},localStorage:{setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)??null}},devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});
vm.runInContext(fs.readFileSync(__dirname+'/../app.js','utf8'),ctx);const run=x=>vm.runInContext(x,ctx);
const buttons=['theme','generate','step','play','speed','godAid','godCalm','godFriend','godHostile','godPeace','godPact','save','load','export','import','zoomOut','zoomIn','resetView','tabHistory','tabNations','tabTimeline'];
for(const id of buttons)assert.strictEqual(typeof nodes.get(id)?.listeners.click,'function',`${id} missing handler`);
for(const id of ['layerBorders','layerNames','layerRoutes','importFile','timelineNation'])assert.strictEqual(typeof nodes.get(id)?.listeners.change,'function',`${id} missing change handler`);
assert.strictEqual(tools.length,8);for(const t of tools)assert.strictEqual(typeof t.listeners.click,'function',`tool ${t.dataset.tool} missing handler`);
const event=()=>({preventDefault(){},target:{matches(){return false}},code:'Space'});
assert.strictEqual(typeof keyboard,'function');
let year=run('state.year');nodes.get('step').click();assert.strictEqual(run('state.year'),year+1);
nodes.get('play').click();assert.strictEqual(run('playing'),true);nodes.get('play').click();assert.strictEqual(run('playing'),false);
nodes.get('speed').click();assert.strictEqual(nodes.get('speed').textContent,'2×');
nodes.get('zoomIn').click();assert(run('zoom')>1);nodes.get('resetView').click();assert.strictEqual(run('zoom'),1);
for(const [id,expected] of [['tabHistory','history'],['tabNations','nations'],['tabTimeline','timeline']]){nodes.get(id).click();assert.strictEqual(run('activeTab'),expected)}
for(const [id,flag] of [['layerBorders','showBorders'],['layerNames','showNames'],['layerRoutes','showRoutes']]){nodes.get(id).checked=false;nodes.get(id).listeners.change({target:nodes.get(id)});assert.strictEqual(run(flag),false);nodes.get(id).checked=true;nodes.get(id).listeners.change({target:nodes.get(id)});assert.strictEqual(run(flag),true)}
for(const t of tools){t.click();assert.strictEqual(run('tool'),t.dataset.tool)}
nodes.get('save').click();assert(storage.has('world-genesis-404-v1'));
nodes.get('export').click();assert.strictEqual(exportedFiles,1);assert.match(nodes.get('status').textContent,/exportada/i);
nodes.get('load').click();assert.match(nodes.get('status').textContent,/recuperado/i);
nodes.get('import').click();assert.strictEqual(typeof nodes.get('importFile').listeners.change,'function');
nodes.get('godCivilization').value=String(run('state.civs[0].id'));nodes.get('godRival').value=String(run('state.civs[1].id'));
for(const id of ['godAid','godCalm','godFriend','godHostile','godPeace','godPact']){nodes.get(id).click();assert(typeof nodes.get('status').textContent==='string')}
keyboard(event());assert.strictEqual(run('playing'),true);keyboard(event());assert.strictEqual(run('playing'),false);
nodes.get('generate').click();assert.strictEqual(run('state.year'),0);
// Real pointer interaction paths, with synthetic canvas lacking setPointerCapture.
const map=nodes.get('world');for(const kind of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])assert.strictEqual(typeof map.listeners[kind],'function',`map missing ${kind}`);
map.listeners.pointerdown({pointerId:1,clientX:300,clientY:200});
map.listeners.pointermove({pointerId:1,clientX:315,clientY:218});
map.listeners.pointerup({pointerId:1,clientX:315,clientY:218});
assert.strictEqual(run('pointer'),null);
map.listeners.pointerdown({pointerId:2,clientX:300,clientY:200});map.listeners.pointercancel();assert.strictEqual(run('pointer'),null);
map.listeners.pointerdown({pointerId:3,clientX:300,clientY:200});map.listeners.lostpointercapture();assert.strictEqual(run('pointer'),null);
console.log(`PASS: ${buttons.length} static button bindings, 5 change handlers, 8 toolbox handlers, click actions, export/save/load, keyboard, map layers and world generation (simulated DOM)`);
