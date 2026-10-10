const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');
const nodes=new Map(),storage=new Map(),all=[];let downloads=[];
function node(id=''){const n={id,value:id==='seed'?'404113':id==='civCount'?'5':id==='worldName'?'Aetheria':'',textContent:'',style:{},dataset:{},checked:true,disabled:false,children:[],classList:{add(){},remove(){},toggle(){return false}},addEventListener(name,cb){(this.listeners??={})[name]=cb},click(){this.listeners?.click?.({target:this,preventDefault(){}})},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},getBoundingClientRect(){return {width:950,height:600,left:0,top:0}},get clientWidth(){return 950},get clientHeight(){return 600},getContext(){return new Proxy({setTransform(){}},{get(o,k){return o[k]||(()=>{})},set(o,k,v){o[k]=v;return true}})}};all.push(n);return n}
const toolNames=['inspect','fertile','drought','settle','quake','flood','fire','blessing'];const tools=toolNames.map(t=>{const n=node();n.dataset.tool=t;return n});
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement(){return node()},createTextNode(s){return {textContent:s}},querySelectorAll(sel){return sel==='.tool'?tools:[]},addEventListener(){},body:{classList:{toggle(){return false}}}};
const localStorage={setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)??null}};
const context=vm.createContext({document,window:{addEventListener(){}},localStorage,devicePixelRatio:1,clearInterval(){},setInterval(){return 1},setTimeout(){},URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},Blob,console,confirm(){return true}});
vm.runInContext(source,context,{filename:'app.js'});const run=s=>vm.runInContext(s,context);
function test(name,fn){fn();console.log('PASS',name)}
function selectTool(name){tools.find(t=>t.dataset.tool===name).click();assert.strictEqual(run('tool'),name)}
function validPosition(predicate){return run(`state.tiles.findIndex((t,i)=>${predicate})`)}
function selectAt(i){run(`selectCell(${i%112},${Math.floor(i/112)})`)}
test('8 selectable tools',()=>toolNames.forEach(selectTool));
test('fertilize land',()=>{selectTool('fertile');const i=validPosition('t===4||t===1');assert.ok(i>=0);selectAt(i);assert.strictEqual(run(`state.tiles[${i}]`),2)});
test('drought changes terrain',()=>{selectTool('drought');const i=validPosition('t>=2');selectAt(i);assert.strictEqual(run(`state.tiles[${i}]`),1)});
test('quake event',()=>{selectTool('quake');const n=run('state.events.length');selectAt(validPosition('t>=2'));assert.strictEqual(run('state.events[0].title'),'Terremoto')});
test('flood event',()=>{selectTool('flood');selectAt(validPosition('t===2'));assert.strictEqual(run('state.events[0].title'),'Inundación')});
test('fire event',()=>{selectTool('fire');selectAt(validPosition('t===3'));assert.strictEqual(run('state.events[0].title'),'Incendio')});
test('blessing affects civilization',()=>{selectTool('blessing');const p=run('state.civs[0].cities[0]');run(`selectCell(${p.x},${p.y})`);assert.ok(run('state.climateEffects.some(e=>e.type==="blessing")'))});
test('found new settlement',()=>{selectTool('settle');let n=run('state.civs.reduce((s,c)=>s+c.cities.length,0)');let ok=false;for(let i=0;i<112*76;i++){if(run(`state.tiles[${i}]<2`))continue;const x=i%112,y=Math.floor(i/112);if(run(`state.civs.some(c=>c.cities.some(t=>Math.hypot(t.x-${x},t.y-${y})<6))`))continue;selectAt(i);if(run('state.civs.reduce((s,c)=>s+c.cities.length,0)')>n){ok=true;break}}assert.ok(ok)});
test('inspector and building click with resource deduction',()=>{selectTool('inspect');const c=run('state.civs[0]');const city=run('state.civs[0].cities[0]');run('state.civs[0].wood=1000;state.civs[0].stone=1000');run('selectCity(state.civs[0],state.civs[0].cities[0])');const grid=nodes.get('details').children.find(e=>e.className==='building-grid');assert.ok(grid);assert.strictEqual(grid.children.length,4);const button=grid.children[0].children[1];const old=run('state.civs[0].cities[0].buildings.homes');button.click();assert.strictEqual(run('state.civs[0].cities[0].buildings.homes'),old+1);assert.ok(run('state.civs[0].wood')<1000)});
test('save/restore and year advancement',()=>{nodes.get('save').click();const n=run('state.year');for(let i=0;i<250;i++)run('yearStep()');nodes.get('load').click();assert.strictEqual(run('state.year'),n)});
test('invalid input preserves state',()=>{const y=run('state.year');assert.throws(()=>run(`restore('{"a":1}')`));assert.strictEqual(run('state.year'),y)});
console.log('BETA SIMULATED TESTS COMPLETED');
