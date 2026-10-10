const $=id=>document.getElementById(id);const W=112,H=76,SAVE='world-genesis-404-v1';const names=['Auralia','Valdrim','Solkara','Eryndor','Thalassa','Korvath','Nimara','Orthea','Lunaris'],colors=['#f5cb78','#d89199','#8ccef1','#dca9e6','#a0de98','#e89f6a','#f7e6a0','#abb6ff','#e2bd98'];let state,playing=false,timer=null,speed=1,tool='inspect',zoom=1,pan={x:0,y:0},pointer=null,drag=false,activeTab='history',showBorders=true,showNames=true,showRoutes=true;const canvas=$('world'),ctx=canvas.getContext('2d');
function rng(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}function clamp(v,min,max){return Math.max(min,Math.min(max,v))}function noise(x,y,s){let v=Math.sin(x*127.1+y*311.7+s*0.013)*43758.5453;return v-Math.floor(v)}function smooth(x,y,s){let a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return (noise(a,b,s)*(1-u)+noise(a+1,b,s)*u)*(1-v)+(noise(a,b+1,s)*(1-u)+noise(a+1,b+1,s)*u)*v}function terrain(x,y,seed){let nx=x/W-.5,ny=y/H-.5,r=Math.sqrt(nx*nx*.9+ny*ny*1.5);let z=smooth(x/26,y/26,seed)*.55+smooth(x/11,y/11,seed+29)*.3+smooth(x/4,y/4,seed+91)*.15-r*.6;return z<.31?0:z<.365?1:z<.57?2:z<.72?3:4}function index(x,y){return y*W+x}function isLand(t){return t>=2}function habitat(t){return t===2?1.2:t===3?1:t===4?.4:.1}function safeName(s){return String(s).trim().slice(0,32)||'Aetheria'}function generate(){stop();let seed=Number($('seed').value)||404113,r=rng(seed),tiles=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)tiles.push(terrain(x,y,seed));let civs=[],count=Number($('civCount').value);for(let k=0;k<count;k++){let spots=[];for(let y=4;y<H-4;y++)for(let x=4;x<W-4;x++)if(tiles[index(x,y)]===2||tiles[index(x,y)]===3){let min=civs.reduce((m,c)=>Math.min(m,Math.hypot(x-c.x,y-c.y)),Infinity);if(min>17)spots.push([x,y])}if(!spots.length)break;let [x,y]=spots[Math.floor(r()*spots.length)];civs.push({id:k,name:names[k],color:colors[k],x,y,population:Math.round(85+r()*110),food:100,wealth:55,wood:35,stone:15,territory:0,production:0,tech:0,cities:[{name:`${names[k]} Prime`,x,y,founded:0,buildings:{homes:2,farms:1,workshops:0,markets:0},pop:0,prosperity:50}],alive:true,relations:{}})}if(!civs.length){$('status').textContent='La semilla no contiene terreno habitable suficiente; prueba otra.';return}state={schemaVersion:19,snapshots:[],climateEffects:[],treaties:[],tradeRoutes:[],wars:[],ownership:[],name:safeName($('worldName').value),seed,year:0,tiles,civs,events:[],nextId:count};recalculateTerritory();ensureDiplomacy();ensureTreaties();ensureTradeRoutes();civs.forEach(distributePopulation);civs.forEach(c=>log('Fundación',`El pueblo de ${c.name} funda ${c.cities[0].name} junto a las primeras tierras fértiles.`));zoom=1;pan={x:0,y:0};recordSnapshot();refresh();$('status').textContent='Nuevo mundo creado: '+state.name}function log(title,description){state.events.unshift({year:state.year,title,description});state.events=state.events.slice(0,300)}function recalculateTerritory(){
  const ownership=new Array(W*H).fill(-1), score=new Float32Array(W*H).fill(-1);
  for(const c of state.civs){c.territory=0;if(!c.alive)continue;
    for(const city of c.cities){const radius=clamp(5+Math.floor(c.tech/300),5,11);
      for(let y=Math.max(0,city.y-radius);y<=Math.min(H-1,city.y+radius);y++)
        for(let x=Math.max(0,city.x-radius);x<=Math.min(W-1,city.x+radius);x++){
          const i=index(x,y),distance=Math.hypot(city.x-x,city.y-y),influence=radius-distance;
          if(isLand(state.tiles[i])&&influence>=0&&influence>score[i]){score[i]=influence;ownership[i]=c.id}
        }
    }
  }
  state.ownership=ownership;
  const lookup=new Map(state.civs.map(c=>[c.id,c]));
  for(const owner of ownership){if(owner>=0){const c=lookup.get(owner);if(c)c.territory++}}
}
const BUILDINGS={homes:{label:'Viviendas',wood:10,stone:2},farms:{label:'Granjas',wood:9,stone:1},workshops:{label:'Talleres',wood:14,stone:6},markets:{label:'Mercados',wood:12,stone:5}};
function normalizeCity(city){if(!city.buildings||typeof city.buildings!=='object')city.buildings={homes:2,farms:1,workshops:0,markets:0};for(const key of Object.keys(BUILDINGS))city.buildings[key]=clamp(Number.isSafeInteger(city.buildings[key])?city.buildings[key]:0,0,100);city.pop=Number.isFinite(city.pop)?Math.max(0,Math.round(city.pop)):0;city.prosperity=Number.isFinite(city.prosperity)?clamp(city.prosperity,0,100):50;city.shortage=Boolean(city.shortage);city.warDamage=Number.isSafeInteger(city.warDamage)?clamp(city.warDamage,0,100):0;}
// Phase 19: city-owned infrastructure. Levels represent maintained links and a coastal dock.
function coastal(city){if(!state)return false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=city.x+dx,y=city.y+dy;if(x>=0&&x<W&&y>=0&&y<H&&Math.abs(dx)+Math.abs(dy)<=2&&state.tiles[index(x,y)]<=1)return true}return false}
function ensureInfrastructure(city){if(!city.infrastructure||typeof city.infrastructure!=='object')city.infrastructure={road:0,port:0};for(const key of ['road','port'])city.infrastructure[key]=Number.isSafeInteger(city.infrastructure[key])?clamp(city.infrastructure[key],0,key==='road'?3:1):0;if(city.infrastructure.port&&!coastal(city))city.infrastructure.port=0;return city.infrastructure}
function investInfrastructure(c,city,kind){const infra=ensureInfrastructure(city);if(!c.alive||!['road','port'].includes(kind))return false;if(kind==='port'&&!coastal(city))return false;if(infra[kind]>=(kind==='road'?3:1))return false;const cost=kind==='road'?{wood:10,stone:7,wealth:5}:{wood:20,stone:12,wealth:15};if(Object.keys(cost).some(key=>c[key]<cost[key]))return false;for(const key of Object.keys(cost))c[key]-=cost[key];infra[kind]++;log('Infraestructura',`${city.name} construye ${kind==='road'?'una mejora de caminos':'un puerto'}.`);return true}
function infrastructureStep(){for(const c of state.civs.filter(c=>c.alive)){if(state.year%12===0&&c.wealth>95&&c.wood>45&&c.stone>25){const coastalCity=c.cities.find(city=>coastal(city)&&ensureInfrastructure(city).port===0);const roadCity=c.cities.find(city=>ensureInfrastructure(city).road<3);if(coastalCity&&civTrait(c)==='Mercantil')investInfrastructure(c,coastalCity,'port');else if(roadCity)investInfrastructure(c,roadCity,'road')}for(const city of c.cities){const infra=ensureInfrastructure(city);const upkeep=infra.road+infra.port*3;if(c.wealth>=upkeep)c.wealth-=upkeep;else if((infra.road||infra.port)&&state.year%4===0){if(infra.road)infra.road--;else infra.port=0;log('Deterioro',`La falta de mantenimiento deteriora las comunicaciones de ${city.name}.`)}}}}
// Phase 20: capped, paid reconstruction after military damage.
function damageCityFromWar(city,severity){
 normalizeCity(city);const infra=ensureInfrastructure(city);
 const lostRoad=Math.min(infra.road,severity>=2?2:1),lostPort=severity>=2&&infra.port?1:0;
 infra.road-=lostRoad;infra.port-=lostPort;
 const lostBuildings={};for(const key of ['homes','farms','workshops','markets']){
   const lost=Math.min(city.buildings[key],severity>=2?2:1);
   city.buildings[key]-=lost;lostBuildings[key]=lost;
 }
 const total=lostRoad+lostPort+Object.values(lostBuildings).reduce((a,b)=>a+b,0);
 if(total){city.warDamage=clamp((Number.isSafeInteger(city.warDamage)?city.warDamage:0)+total,0,100);
  city.prosperity=Math.max(0,city.prosperity-5*severity);
  log('Daños de guerra',`${city.name} sufre daños en caminos, puerto o edificios (${total} elementos dañados).`)}
 return total;
}
function reconstructionStep(){
 for(const civ of state.civs.filter(c=>c.alive))for(const city of civ.cities){
  const pending=Number.isSafeInteger(city.warDamage)?clamp(city.warDamage,0,100):0;
  if(!pending||state.year%3!==0)continue;
  const cost={wood:5,stone:3,wealth:4};
  if(Object.keys(cost).some(key=>!Number.isFinite(civ[key])||civ[key]<cost[key]))continue;
  for(const key of Object.keys(cost))civ[key]-=cost[key];
  const infra=ensureInfrastructure(city);
  if(infra.road<3)infra.road++;
  else if(coastal(city)&&infra.port<1)infra.port++;
  else{normalizeCity(city);const key=Object.keys(BUILDINGS).sort((a,b)=>city.buildings[a]-city.buildings[b])[0];if(city.buildings[key]<100)city.buildings[key]++}
  city.warDamage=pending-1;city.prosperity=Math.min(100,city.prosperity+3);
  if(city.warDamage===0)log('Reconstrucción',`${city.name} termina sus reparaciones tras la guerra.`);
 }
}
function distributePopulation(c){c.cities.forEach(normalizeCity);let allocated=0;for(let i=0;i<c.cities.length;i++){const city=c.cities[i];city.pop=i===c.cities.length-1?Math.max(0,c.population-allocated):Math.floor(c.population/c.cities.length);allocated+=city.pop}}
function yearlyResources(c){
  let plains=0,forests=0,quarries=0;
  for(let i=0;i<state.ownership.length;i++)if(state.ownership[i]===c.id){const t=state.tiles[i];if(t===2)plains++;else if(t===3)forests++;else if(t===4)quarries++}
  c.cities.forEach(normalizeCity);
  const buildings=c.cities.reduce((a,city)=>{for(const key of Object.keys(BUILDINGS))a[key]+=city.buildings[key];return a},{homes:0,farms:0,workshops:0,markets:0});
  const output=Math.round(plains*.75+forests*.15+buildings.farms*13);
  const consumed=Math.ceil(c.population*.17),surplus=output-consumed;
  c.food=clamp((c.food||0)+surplus,0,1000000);
  c.wood=clamp((c.wood||0)+Math.max(1,Math.round(forests*.14))-Math.ceil(buildings.workshops*.25),0,1000000);
  // Small-scale quarrying of nearby stone prevents permanent resource deadlocks on maps without mountains.
  c.stone=clamp((c.stone||0)+Math.max(1,Math.round(quarries*.18)),0,1000000);
  const workshopOutput=Math.min(buildings.workshops*3,Math.floor((c.wood+c.stone)/10));
  const tradeIncome=buildings.markets*2+workshopOutput;
  c.wealth=clamp((c.wealth||0)+tradeIncome+Math.floor(Math.max(0,surplus)*.02)-c.cities.length,0,99999);
  c.production=surplus;c.trade=tradeIncome;c.housing=buildings.homes*110;c.jobs=buildings.farms*70+buildings.workshops*45+buildings.markets*35;
  return surplus;
}
// Traits are derived from seed and ID: older save files need no destructive migration.
const CIV_TRAITS=['Agraria','Mercantil','Expansionista','Erudita','Militarista'];
function civTrait(c){return CIV_TRAITS[Math.floor(rng(state.seed+c.id*7919+71)()*CIV_TRAITS.length)];}
function civicPriority(c){
 const trait=civTrait(c);
 if(c.food<Math.max(90,c.population*.45)||c.production<0)return 'farms';
 if(c.population>=Math.max(1,c.housing)*.85)return 'homes';
 if(trait==='Agraria'&&c.food<c.population*1.5)return 'farms';
 if(trait==='Mercantil'&&c.wealth<600)return 'markets';
 if(trait==='Erudita'&&c.wealth<250)return 'workshops';
 if(c.wealth<90)return 'workshops';
 return trait==='Mercantil'?'markets':trait==='Agraria'?'farms':trait==='Expansionista'?'homes':null;
}
// Alpha 0.24: deterministic strategic doctrine, explained in the chronicles.
const STRATEGIC_DOCTRINES=['Pacifista','Comercial','Expansionista','Oportunista'];
function strategicDoctrine(c){return STRATEGIC_DOCTRINES[Math.floor(rng(state.seed+c.id*1217+24024)()*STRATEGIC_DOCTRINES.length)]}
function strategicDecision(c){
 const doctrine=strategicDoctrine(c);ensureMemory(c);
 if(c.food<Math.max(50,c.population*.4)||c.production<0)return {action:'abastecer',reason:'escasez alimentaria'};
 if((c.unrest||0)>55||(c.mandate||50)<25)return {action:'estabilizar',reason:'crisis institucional'};
 if(c.goal.type==='recuperar'&&doctrine!=='Pacifista')return {action:'reconquistar',reason:'agravio territorial'};
 if(doctrine==='Comercial')return {action:'comerciar',reason:'vocación mercantil'};
 if(doctrine==='Expansionista')return {action:'expandir',reason:'doctrina territorial'};
 if(doctrine==='Oportunista')return {action:c.wealth>170?'presionar':'acumular',reason:'oportunidad estratégica'};
 return {action:'consolidar',reason:'preferencia por la estabilidad'};
}
// Alpha 0.30: multi-year planning with emergency overrides and bounded persistence.
const STRATEGIC_ACTIONS=['abastecer','estabilizar','reconquistar','comerciar','expandir','presionar','acumular','consolidar'];
function ensureStrategicPlan(c){
 const p=c.strategyPlan;
 if(!p||!STRATEGIC_ACTIONS.includes(p.action)||!Number.isSafeInteger(p.started)||!Number.isSafeInteger(p.until)||p.started>state.year||p.until<p.started||p.until>state.year+25){c.strategyPlan=null}
 return c.strategyPlan;
}
function strategicPlanning(c){
 const proposed=strategicDecision(c),current=ensureStrategicPlan(c);
 const emergency=proposed.action==='abastecer'||proposed.action==='estabilizar';
 if(current&&current.until>state.year&&!(emergency&&current.action!==proposed.action))return current;
 const span=proposed.action==='expandir'||proposed.action==='reconquistar'?12:8;
 c.strategyPlan={action:proposed.action,reason:proposed.reason,started:state.year,until:state.year+span};
 log('Plan estratégico',`${c.name} adopta ${proposed.action} hasta el año ${c.strategyPlan.until}: ${proposed.reason}.`);
 return c.strategyPlan;
}
function strategicAIStep(){
 for(const c of state.civs.filter(c=>c.alive&&c.cities.length)){
  const decision=strategicPlanning(c),previous=c.strategyAction;
  c.strategyAction=decision.action;
  if(previous!==decision.action){log('Consejo estratégico',`${c.name} (${strategicDoctrine(c)}) prioriza ${decision.action}: ${decision.reason}.`)}
  // Limited, resource-backed decisions: no wealth or materials generated from nothing.
  if(state.year%5!==0)continue;
  if(decision.action==='estabilizar'&&c.wealth>=12){c.wealth-=8;c.unrest=clamp((c.unrest||0)-6,0,100);c.mandate=clamp((c.mandate||50)+3,0,100)}
  else if(decision.action==='abastecer'&&c.wealth>=22){c.wealth-=10;c.food=clamp(c.food+14,0,1000000)}
  else if(decision.action==='comerciar'&&c.wealth>=40){const city=c.cities.find(x=>ensureInfrastructure(x).road<3);if(city&&c.wood>=10&&c.stone>=7)investInfrastructure(c,city,'road')}
  else if(decision.action==='presionar'&&c.wealth>=25&&c.spyNetwork<90){c.wealth-=5;c.spyNetwork=clamp((c.spyNetwork||0)+5,0,100)}
 }
}
function settlementScore(c,x,y){
 const t=state.tiles[index(x,y)],trait=civTrait(c);
 let score=habitat(t)*10;
 for(let yy=Math.max(0,y-3);yy<=Math.min(H-1,y+3);yy++)for(let xx=Math.max(0,x-3);xx<=Math.min(W-1,x+3);xx++){
  const biome=state.tiles[index(xx,yy)];
  if(biome===2)score+=trait==='Agraria'?1.4:.65;
  if(biome===3)score+=.45;
  if(biome===4)score+=trait==='Erudita'?.55:.3;
 }
 return score;
}
function urbanDevelopment(c,r){
  c.cities.forEach(normalizeCity);const city=c.cities[Math.floor(r()*c.cities.length)];if(!city)return;
  const b=city.buildings;
  const choice=civicPriority(c);
  if(!choice||r()>.65)return;
  const cost=BUILDINGS[choice];if(c.wood<cost.wood||c.stone<cost.stone)return;
  // Preserve settlement materials when a realm has enough population to expand.
  if(c.cities.length<10&&c.population>=190*c.cities.length&&(c.wood-cost.wood<20||c.stone-cost.stone<8))return;
  c.wood-=cost.wood;c.stone-=cost.stone;b[choice]++;
  log('Desarrollo urbano',`${city.name} construye ${cost.label.toLowerCase()} para atender a sus habitantes.`);
}
function buildInSelectedCity(c,city,key){if(!BUILDINGS[key]||!c.alive)return;normalizeCity(city);const cost=BUILDINGS[key];if(city.buildings[key]>=100||c.wood<cost.wood||c.stone<cost.stone){$('status').textContent='No hay materiales suficientes o se alcanzó el límite por edificio.';return}c.wood-=cost.wood;c.stone-=cost.stone;city.buildings[key]++;log('Construcción',`${city.name} inaugura ${cost.label.toLowerCase()}.`);recalculateTerritory();refresh();selectCity(c,city);$('status').textContent=`${cost.label} construidas en ${city.name}.`}
function selectCity(c,city){normalizeCity(city);$('details').replaceChildren();const title=document.createElement('strong');title.textContent=city.name;title.style.color=c.color;const desc=document.createElement('p');desc.textContent=`${c.name} · Fundada año ${city.founded} · ${city.pop.toLocaleString('es-ES')} habitantes estimados · Prosperidad ${Math.round(city.prosperity)}%`;
const supply=document.createElement('p');supply.textContent=`Reservas nacionales: ${Math.round(c.food)} alimentos · ${Math.round(c.wood)} madera · ${Math.round(c.stone)} piedra · ${Math.round(c.wealth)} riqueza.`;
const grid=document.createElement('div');grid.className='building-grid';for(const [key,item]of Object.entries(BUILDINGS)){const wrapper=document.createElement('div');wrapper.className='building-row';const label=document.createElement('span');label.textContent=`${item.label}: ${city.buildings[key]}`;const button=document.createElement('button');button.textContent=`+ (${item.wood}M / ${item.stone}P)`;button.title=`Construir ${item.label.toLowerCase()}`;button.disabled=!c.alive||c.wood<item.wood||c.stone<item.stone||city.buildings[key]>=100;button.addEventListener('click',()=>buildInSelectedCity(c,city,key));wrapper.append(label,button);grid.append(wrapper)}const infra=ensureInfrastructure(city);const infrastructure=document.createElement('div');infrastructure.className='building-grid';const caption=document.createElement('strong');caption.textContent=`INFRAESTRUCTURAS · Caminos ${infra.road}/3 · Puerto ${infra.port}/1`;infrastructure.append(caption);for(const kind of ['road','port']){if(kind==='port'&&!coastal(city))continue;const button=document.createElement('button');button.textContent=kind==='road'?'Mejorar caminos (10M / 7P / 5 riqueza)':'Construir puerto (20M / 12P / 15 riqueza)';button.disabled=!c.alive||infra[kind]>=(kind==='road'?3:1)||(kind==='road'?(c.wood<10||c.stone<7||c.wealth<5):(c.wood<20||c.stone<12||c.wealth<15));button.addEventListener('click',()=>{if(investInfrastructure(c,city,kind)){refresh();selectCity(c,city)}});infrastructure.append(button)}$('details').append(title,desc,supply,grid,infrastructure)}


// ALPHA 0.4: gobernantes, dinastías y diplomacia, con datos deterministas por semilla/año.
const FIRST_NAMES=['Aren','Liora','Darian','Neris','Kael','Mara','Soren','Veya','Tarin','Elara','Orin','Selene'];
const DYNASTIES=['del Alba','de la Bruma','del Roble','del Río','de la Corona','de la Piedra'];
function monarchName(c,sequence){const r=rng(state.seed+c.id*7127+sequence*7919);return FIRST_NAMES[Math.floor(r()*FIRST_NAMES.length)]+' '+(c.dynasty||DYNASTIES[c.id%DYNASTIES.length]);}
function initializeHistory(c){
  if(typeof c.dynasty!=='string'||c.dynasty.length>48)c.dynasty=DYNASTIES[c.id%DYNASTIES.length];
  if(!Number.isSafeInteger(c.succession)||c.succession<0)c.succession=0;
  if(!c.ruler||typeof c.ruler!=='object'||typeof c.ruler.name!=='string'||!Number.isFinite(c.ruler.born)||!Number.isFinite(c.ruler.reignStart)){
    c.ruler={name:monarchName(c,c.succession),born:state.year-25,reignStart:state.year};
  }
  if(!Array.isArray(c.rulers))c.rulers=[];
  if(!Array.isArray(c.legacies))c.legacies=[];
  c.rulers=c.rulers.slice(-35);c.legacies=c.legacies.slice(-30);
  if(!c.relations||typeof c.relations!=='object')c.relations={};
}
// ALPHA 0.13: cultura heredable, genealogía política y ciclos históricos.
const CULTURES=['Los Pueblos del Alba','Los Clanes de la Bruma','Las Gentes del Roble','Los Hijos del Río','La Liga de la Corona','Los Custodios de Piedra','Los Navegantes del Norte','Los Caminantes de la Estepa'];
function ensureCulture(c){
 if(typeof c.culture!=='string'||!c.culture||c.culture.length>70)c.culture=CULTURES[Math.floor(rng(state.seed+c.id*31+117)()*CULTURES.length)];
 if(!Number.isSafeInteger(c.parentId)||c.parentId<0||c.parentId===c.id)c.parentId=null;
 if(!Number.isSafeInteger(c.cultureFounded)||c.cultureFounded<0)c.cultureFounded=Math.max(0,Math.min(state.year,c.cities[0]?.founded??0));
 if(!['formación','esplendor','estabilidad','decadencia'].includes(c.epoch))c.epoch='formación';
 if(!Number.isSafeInteger(c.epochStart)||c.epochStart<0||c.epochStart>state.year)c.epochStart=state.year;
}

// ALPHA 0.21: fictional beliefs, inherited customs and internal cohesion.
const BELIEFS=['Culto de las Estrellas','Orden del Bosque','Camino de las Mareas','Tradición de la Llama','Vigilia de los Ancestros','Círculo del Horizonte'];
const CUSTOMS=['Consejo de Ancianos','Ferias de Primavera','Juramento de Hospitalidad','Fiesta de la Cosecha','Asamblea de Artesanos','Ritos del Solsticio'];
function ensureIdentity(c){
 const seed=rng(state.seed+c.id*179+21021);
 if(!BELIEFS.includes(c.belief))c.belief=BELIEFS[Math.floor(seed()*BELIEFS.length)];
 if(!CUSTOMS.includes(c.custom))c.custom=CUSTOMS[Math.floor(seed()*CUSTOMS.length)];
 c.cohesion=clamp(Number.isFinite(c.cohesion)?c.cohesion:60,0,100);
}
function identityStep(){
 for(const c of state.civs.filter(n=>n.alive)){
  ensureIdentity(c);
  const neighbors=state.civs.filter(n=>n.alive&&n.id!==c.id&&Number.isFinite(c.relations?.[n.id]));
  let friction=0;
  for(const other of neighbors){ensureIdentity(other);if(other.belief!==c.belief&&c.relations[other.id]<-35)friction++;}
  const pressure=(c.unrest>55?3:0)+(friction>0?Math.min(2,friction):0);
  const stability=(c.unrest<30&&c.food>20?2:0)+(c.epoch==='esplendor'?1:0);
  const previous=c.cohesion;
  c.cohesion=clamp(c.cohesion+stability-pressure,0,100);
  if(previous>=25&&c.cohesion<25)log('Crisis de identidad',`${c.name} atraviesa tensiones entre tradiciones y fronteras políticas.`);
  c.unrest=clamp(c.unrest+(c.cohesion<25?2:0)-(c.cohesion>75?1:0),0,100);
 }
}

function culturalStep(){
 for(const c of state.civs.filter(x=>x.alive)){
  ensureCulture(c);ensureIdentity(c);
  const prosperous=c.food>c.population*.6&&c.wealth>100&&c.unrest<32;
  const falling=c.unrest>65||c.production<0||c.food<10;
  const next=falling?'decadencia':prosperous?'esplendor':c.unrest<40?'estabilidad':'formación';
  if(next!==c.epoch&&state.year-c.epochStart>=12){
   c.epoch=next;c.epochStart=state.year;
   const text=`${c.name}, pueblo de ${c.culture}, entra en una etapa de ${next}.`;
   log('Ciclo histórico',text);initializeHistory(c);
   c.legacies.push({year:state.year,title:'Ciclo histórico',description:text});c.legacies=c.legacies.slice(-30);
  }
 }
}
function ancestralConnections(c){
 const descendants=state.civs.filter(x=>x.parentId===c.id);
 const ancestor=state.civs.find(x=>x.id===c.parentId);
 return {ancestor,descendants};
}
// ALPHA 0.14: memory of lost cities, diplomatic grievances and persistent goals.
function ensureMemory(c){
 if(!Array.isArray(c.grievances))c.grievances=[];
 c.grievances=c.grievances.filter(g=>g&&Number.isSafeInteger(g.rivalId)&&g.rivalId!==c.id&&typeof g.city==='string'&&g.city.length<=100&&Number.isSafeInteger(g.year)&&g.year<=state.year).slice(-12);
 if(!c.goal||typeof c.goal!=='object'||!['prosperar','consolidar','recuperar','defender'].includes(c.goal.type))c.goal={type:'consolidar',since:state.year};
}
function rememberLoss(victim,aggressor,city){
 ensureMemory(victim);
 victim.grievances.push({rivalId:aggressor.id,city:city.name,year:state.year});
 victim.grievances=victim.grievances.slice(-12);
 victim.goal={type:'recuperar',targetId:aggressor.id,city:city.name,since:state.year};
}
function strategicMemoryStep(){
 for(const c of state.civs.filter(c=>c.alive)){
  ensureMemory(c);
  const current=c.grievances.findLast(g=>state.civs.some(o=>o.id===g.rivalId&&o.alive&&o.cities.some(city=>city.name===g.city)));
  let next;
  if(current)next={type:'recuperar',targetId:current.rivalId,city:current.city,since:c.goal.type==='recuperar'?c.goal.since:state.year};
  else if(c.production<0||c.food<20||c.unrest>60)next={type:'consolidar',since:c.goal.type==='consolidar'?c.goal.since:state.year};
  else if(c.wealth<100)next={type:'prosperar',since:c.goal.type==='prosperar'?c.goal.since:state.year};
  else next={type:'defender',since:c.goal.type==='defender'?c.goal.since:state.year};
  if(c.goal.type!==next.type||c.goal.targetId!==next.targetId){c.goal=next;log('Objetivo estratégico',`${c.name} adopta un objetivo: ${next.type}${next.city?' '+next.city:''}.`)}
  if(state.year%8===0&&current){const rival=state.civs.find(o=>o.id===current.rivalId);if(rival?.alive)addRelation(c,rival,-3)}
 }
}
function ensureDiplomacy(){
 for(const c of state.civs){initializeHistory(c);ensureCulture(c);ensureMemory(c);ensureGovernment(c)}
 for(let i=0;i<state.civs.length;i++)for(let j=i+1;j<state.civs.length;j++){
   const a=state.civs[i],b=state.civs[j];let score=Number(a.relations[b.id]);
   if(!Number.isFinite(score))score=Math.round((rng(state.seed+a.id*37+b.id*101)()-.5)*64);
   score=clamp(Math.round(score),-100,100);a.relations[b.id]=score;b.relations[a.id]=score;
 }
}
// Phase 22: political constitutions with bounded, persistent effects.
const GOVERNMENTS=['Monarquía','República','Consejo'];
function ensureGovernment(c){
 ensureIntrigue(c);
 const pick=rng(state.seed+c.id*421+22022);
 if(!GOVERNMENTS.includes(c.government))c.government=GOVERNMENTS[Math.floor(pick()*GOVERNMENTS.length)];
 c.mandate=clamp(Number.isFinite(c.mandate)?c.mandate:65,0,100);
 c.lastElection=Number.isSafeInteger(c.lastElection)&&c.lastElection>=0&&c.lastElection<=state.year?c.lastElection:state.year;
 c.governmentSince=Number.isSafeInteger(c.governmentSince)&&c.governmentSince>=0&&c.governmentSince<=state.year?c.governmentSince:state.year;
}
function governmentStep(r){
 for(const c of state.civs.filter(c=>c.alive)){
  ensureGovernment(c);
  const bad=c.production<0||c.food<20||c.unrest>55;
  c.mandate=clamp(c.mandate+(bad?-3:1)+(c.cohesion<30?-1:0),0,100);
  // Republics renew leadership regularly; councils elect a rotating speaker.
  const cycle=c.government==='República'?12:c.government==='Consejo'?20:0;
  if(cycle&&state.year-c.lastElection>=cycle){
   const former=c.ruler;
   c.rulers.push({...former,reignEnd:state.year});c.rulers=c.rulers.slice(-35);
   c.succession++;
   c.ruler={name:monarchName(c,c.succession),born:state.year-(30+Math.floor(r()*26)),reignStart:state.year};
   c.lastElection=state.year;c.mandate=clamp(c.mandate+18,0,100);
   log(c.government==='República'?'Elecciones':'Renovación del consejo',`${c.name} designa a ${c.ruler.name} para encabezar su ${c.government.toLowerCase()}.`);
  }
  if(c.mandate<15&&c.unrest>65&&state.year-c.governmentSince>=15&&state.year%10===0){
   const before=c.government;const options=GOVERNMENTS.filter(g=>g!==before);
   c.government=options[Math.floor(r()*options.length)];c.governmentSince=state.year;c.lastElection=state.year;c.mandate=45;
   log('Reforma política',`${c.name} abandona ${before.toLowerCase()} y adopta ${c.government.toLowerCase()} tras una crisis institucional.`);
  }
 }
}
// Alpha 0.23 — bounded covert operations and domestic political intrigue.
function ensureIntrigue(c){
 c.spyNetwork=clamp(Number.isSafeInteger(c.spyNetwork)?c.spyNetwork:Math.floor(rng(state.seed+c.id*173+23023)()*24),0,100);
 c.subversion=clamp(Number.isFinite(c.subversion)?c.subversion:0,0,100);
 c.lastPlot=Number.isSafeInteger(c.lastPlot)&&c.lastPlot>=0&&c.lastPlot<=state.year?c.lastPlot:0;
}
function espionageStep(r){
 const alive=state.civs.filter(c=>c.alive&&c.cities.length);
 for(const c of alive){
  ensureIntrigue(c);ensureGovernment(c);ensureUnrest(c);
  // Networks grow slowly with investment, but consume funds and cannot exceed 100.
  if(state.year%4===0&&c.wealth>=16&&c.spyNetwork<85){c.wealth-=3;c.spyNetwork=clamp(c.spyNetwork+4,0,100)}
  c.subversion=clamp(c.subversion-2,0,100);
  if(c.subversion>30){c.unrest=clamp(c.unrest+Math.ceil(c.subversion/24),0,100);c.mandate=clamp(c.mandate-2,0,100)}
 }
 if(state.year%3===0){
  for(const a of alive){
   if(a.spyNetwork<20||a.wealth<10||state.year-a.lastPlot<6)continue;
   const targets=alive.filter(b=>b!==a&&Number(a.relations?.[b.id])<=-25&&!activeWar(a,b));
   if(!targets.length||r()>.13)continue;
   const b=targets[Math.floor(r()*targets.length)];ensureIntrigue(b);
   a.lastPlot=state.year;a.wealth-=6;
   const success=clamp(.28+(a.spyNetwork-b.spyNetwork)*.004, .08,.68);
   if(r()<success){
    const sabotage=r()<.5;
    if(sabotage){const stolen=Math.min(b.wealth,5+Math.floor(r()*9));b.wealth-=stolen;b.subversion=clamp(b.subversion+12,0,100);
     log('Sabotaje económico',`Una operación encubierta atribuida a ${a.name} causa pérdidas de ${stolen} de riqueza en ${b.name}.`)}
    else{b.subversion=clamp(b.subversion+23,0,100);b.mandate=clamp(b.mandate-6,0,100);
     log('Conspiración',`Agentes vinculados a ${a.name} alimentan tensiones políticas en ${b.name}.`)}
   }else if(r()<.5){addRelation(a,b,-9);log('Espías descubiertos',`${b.name} denuncia una operación clandestina de ${a.name}.`)}
  }
 }
 // Rare domestic coups: meaningful political consequences, strict cooldown.
 for(const c of alive){
  if(c.subversion>=55&&c.unrest>=58&&c.mandate<=30&&state.year-c.lastPlot>=8&&r()<.1){
   const before=c.government,options=GOVERNMENTS.filter(g=>g!==before);
   c.government=options[Math.floor(r()*options.length)];c.governmentSince=state.year;c.lastElection=state.year;
   c.mandate=40;c.subversion=clamp(c.subversion-45,0,100);c.unrest=clamp(c.unrest-15,0,100);c.lastPlot=state.year;
   log('Golpe de Estado',`Una conspiración derriba el gobierno de ${c.name}: ${before} es sustituida por ${c.government}.`);
  }
 }
}
function diplomaticStatus(value){return value>=50?'Alianza':value>=20?'Cooperación':value<=-55?'Hostilidad':value<=-20?'Tensión':'Neutralidad'}
function addRelation(a,b,delta){const score=clamp((Number(a.relations[b.id])||0)+delta,-100,100);a.relations[b.id]=score;b.relations[a.id]=score;return score}
function historyStep(r){
 const alive=state.civs.filter(c=>c.alive);
 for(const c of alive){
   initializeHistory(c);
   const age=state.year-c.ruler.born, reign=state.year-c.ruler.reignStart;
   if(c.government==='Monarquía'&&(age>=80||(age>51&&r()<Math.min(.1,(age-48)*.0027)))){
     const previous=c.ruler;
     c.rulers.push({...previous,reignEnd:state.year});c.rulers=c.rulers.slice(-35);c.succession++;
     if(r()<.13){c.dynasty=DYNASTIES[Math.floor(r()*DYNASTIES.length)];log('Cambio de dinastía',`La casa ${c.dynasty} obtiene el trono de ${c.name} tras la muerte de ${previous.name}.`)}
     c.ruler={name:monarchName(c,c.succession),born:state.year-(20+Math.floor(r()*21)),reignStart:state.year};
     log('Sucesión',`${previous.name} muere tras ${reign} años de reinado. ${c.ruler.name} asume el gobierno de ${c.name}.`);
     c.legacies.push({year:state.year,title:'Sucesión',description:`${previous.name} → ${c.ruler.name}`});
   }
   if(state.year%18===0&&c.population>90&&r()<.44){
     const milestone=c.production<0?'Crisis de cosechas':c.wealth>200?'Época de prosperidad':'Reformas del reino';
     const detail=milestone==='Crisis de cosechas'?'ordena distribuir las reservas':milestone==='Época de prosperidad'?'impulsa nuevas rutas mercantiles':'promueve leyes para sus ciudades';
     log(milestone,`${c.ruler.name} ${detail} en ${c.name}.`);
     c.legacies.push({year:state.year,title:milestone,description:`Reinado de ${c.ruler.name}`});
   }
   c.legacies=c.legacies.slice(-30);
 }
 if(state.year%5===0&&alive.length>=2){
   const candidates=[];for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++)candidates.push([alive[i],alive[j]]);
   const [a,b]=candidates[Math.floor(r()*candidates.length)];const before=diplomaticStatus(a.relations[b.id]);
   const disposition=(civTrait(a)==='Militarista'||civTrait(b)==='Militarista')?-.25:(civTrait(a)==='Mercantil'&&civTrait(b)==='Mercantil')?.2:0;const delta=(r()<.5+disposition?-1:1)*(4+Math.floor(r()*17));const after=diplomaticStatus(addRelation(a,b,delta));
   if(before!==after){log('Diplomacia',`${a.name} y ${b.name} pasan de ${before.toLowerCase()} a ${after.toLowerCase()} tras negociaciones y disputas fronterizas.`)}
   else if(r()<.22)log('Embajada',`${a.ruler.name} y ${b.ruler.name} intercambian emisarios. Relación: ${after.toLowerCase()}.`);
 }
}
// ALPHA 0.27: el tamaño y la dispersión territorial generan costes de cohesión.
// Se evita penalizar reinos pequeños o ciudades conquistadas sin población.
function imperialStrain(c){
 if(!c.alive||c.cities.length<4)return 0;
 const capital=c.cities[0];
 const meanDistance=c.cities.reduce((sum,city)=>sum+Math.hypot(city.x-capital.x,city.y-capital.y),0)/c.cities.length;
 const sprawl=Math.max(0,c.cities.length-4)*1.1+Math.max(0,meanDistance-12)*.20;
 const resources=c.wealth>=c.cities.length*12&&c.food>=c.population*.3?1.5:0;
 const cohesion=Number.isFinite(c.cohesion)?c.cohesion:60;
 return clamp(Math.round(Math.max(0,sprawl-resources-(cohesion>=75?1.5:0))),0,12);
}
function imperialBalanceStep(){
 for(const c of state.civs){
  if(!c.alive||!c.cities.length)continue;
  const strain=imperialStrain(c);
  c.imperialPressure=strain;
  if(strain===0)continue;
  ensureUnrest(c);ensureGovernment(c);
  // Administración distante: desgaste moderado, compensable con prosperidad y cohesión.
  c.unrest=clamp(c.unrest+strain*.55,0,100);
  if(strain>=5)c.mandate=clamp(c.mandate-.3,0,100);
  if(state.year%25===0&&strain>=4)log('Tensión imperial',`La extensión territorial de ${c.name} dificulta la administración de sus ${c.cities.length} ciudades.`);
 }
}
// ALPHA 0.12: unrest is driven by observable shortages, population pressure and war.
function ensureUnrest(c){
 c.unrest=clamp(Number.isFinite(c.unrest)?c.unrest:8,0,100);
 c.crisisYears=clamp(Number.isSafeInteger(c.crisisYears)?c.crisisYears:0,0,1000);
}
function internalCrisisStep(r){
 const active=state.civs.filter(c=>c.alive&&c.cities.length);
 for(const c of active){
  ensureUnrest(c);
  const war=state.wars.some(w=>w.active&&(w.a===c.id||w.b===c.id));
  const poor=c.food<Math.max(12,c.population*.15)||c.production<0;
  const housing=c.housing>0&&c.population>c.housing;
  const lowProsperity=c.cities.reduce((sum,t)=>sum+t.prosperity,0)/c.cities.length<35;
  ensureGovernment(c);
  const legitimacy=c.mandate<25?4:c.mandate>75?-2:0;
  const stress=(poor?9:0)+(housing?4:0)+(lowProsperity?5:0)+(war?4:0)+legitimacy;
  c.unrest=clamp(c.unrest+stress-(stress===0?6:2),0,100);
  c.crisisYears=stress>=5?c.crisisYears+1:Math.max(0,c.crisisYears-2);
  if(c.unrest>=55&&c.crisisYears>=3&&state.year%5===0){
    log('Crisis interna',`El descontento en ${c.name} alcanza ${Math.round(c.unrest)} puntos por la escasez, la presión urbana o los conflictos.`);
    c.wealth=Math.max(0,c.wealth-3);
  }
  if(c.unrest>=85&&c.crisisYears>=5&&c.cities.length>=2&&state.civs.length<20&&r()<.28){
    const candidates=c.cities.filter(city=>city!==c.cities[0]);
    candidates.sort((a,b)=>a.prosperity-b.prosperity||a.founded-b.founded);
    const city=candidates[0];if(!city)continue;
    const founded=state.nextId=Math.max(Number.isSafeInteger(state.nextId)?state.nextId:0,...state.civs.map(x=>x.id+1));
    state.nextId++;
    const previousCityPop=city.pop;
    const transferred=clamp(Math.round(previousCityPop),1,Math.max(1,c.population-1));
    if(c.population<=1)continue;
    const name=`${city.name.slice(0,23)} Libre ${founded}`;
    const capital={...city,buildings:{...city.buildings},pop:transferred,prosperity:clamp(city.prosperity+20,0,100)};
    c.cities.splice(c.cities.indexOf(city),1);
    c.population-=transferred;
    const rebel={id:founded,name,color:colors[founded%colors.length],x:capital.x,y:capital.y,
     population:transferred,food:Math.floor(c.food*.20),wealth:Math.floor(c.wealth*.20),
     wood:Math.floor(c.wood*.20),stone:Math.floor(c.stone*.20),territory:0,production:0,tech:Math.floor(c.tech*.8),
     cities:[capital],alive:true,relations:{},belief:c.belief,custom:c.custom,cohesion:Math.max(25,(c.cohesion||60)-15),unrest:22,crisisYears:0,culture:c.culture,parentId:c.id,cultureFounded:state.year,epoch:'formación',epochStart:state.year};
    c.food-=rebel.food;c.wealth-=rebel.wealth;c.wood-=rebel.wood;c.stone-=rebel.stone;
    c.unrest=clamp(c.unrest-35,0,100);c.crisisYears=0;
    state.civs.push(rebel);
    initializeHistory(rebel);initializeHistory(c);ensureCulture(rebel);ensureGovernment(rebel);
    for(const other of state.civs){if(other.id===rebel.id)continue;let relation=other.id===c.id?-75:0;
      rebel.relations[other.id]=relation;other.relations[rebel.id]=relation;}
    distributePopulation(c);distributePopulation(rebel);
    rememberLoss(c,rebel,capital);
    log('Independencia',`${capital.name} se separa de ${c.name} y funda ${rebel.name}. Una nueva dinastía toma el poder, conservando la cultura de ${c.culture}.`);
    c.legacies.push({year:state.year,title:'Secesión',description:`Independencia de ${rebel.name}`});
    // Keep a bounded legacy and ensure wars remain referentially valid.
    c.legacies=c.legacies.slice(-30);
  }
 }
}
// ALPHA 0.5: conflicto persistente, desgaste y conquista de ciudades.
function ensureWars(){
 if(!Array.isArray(state.wars))state.wars=[];
 const ids=new Set(state.civs.map(c=>c.id));
 state.wars=state.wars.filter(w=>w&&Number.isInteger(w.a)&&Number.isInteger(w.b)&&w.a!==w.b&&ids.has(w.a)&&ids.has(w.b)&&Number.isFinite(w.started)&&w.started<=state.year).slice(-24);
 for(const w of state.wars){w.active=Boolean(w.active);w.turns=clamp(Number.isInteger(w.turns)?w.turns:0,0,1000);w.score=clamp(Number.isFinite(w.score)?w.score:0,-100,100)}
}
function activeWar(a,b){return state.wars.find(w=>w.active&&((w.a===a.id&&w.b===b.id)||(w.a===b.id&&w.b===a.id)))}
function military(c){return Math.max(1,Math.round(c.population*.09+c.wealth*.11+c.tech*.15+c.cities.length*12))}
function adjacentPowers(a,b){return a.cities.some(x=>b.cities.some(y=>Math.hypot(x.x-y.x,x.y-y.y)<24))}
// Tratados bilaterales: un solo registro por pareja, nunca un tratado con uno mismo.
function treaty(a,b){return state.treaties.find(t=>(t.a===a.id&&t.b===b.id)||(t.a===b.id&&t.b===a.id))}
function ensureTreaties(){
 if(!Array.isArray(state.treaties))state.treaties=[];
 const ids=new Set(state.civs.map(c=>c.id)),seen=new Set();
 state.treaties=state.treaties.filter(t=>{
  if(!t||!Number.isSafeInteger(t.a)||!Number.isSafeInteger(t.b)||t.a===t.b||!ids.has(t.a)||!ids.has(t.b)||!['comercio','defensa','alianza','tregua'].includes(t.type)||!Number.isSafeInteger(t.until)||t.until<=state.year||t.until>state.year+100)return false;
  const key=[Math.min(t.a,t.b),Math.max(t.a,t.b)].join(':');if(seen.has(key))return false;seen.add(key);return true;
 }).slice(-60)
}
function signTreaty(a,b,type,duration){
 if(!a.alive||!b.alive||a.id===b.id||activeWar(a,b))return false;
 ensureTreaties();state.treaties=state.treaties.filter(t=>!((t.a===a.id&&t.b===b.id)||(t.a===b.id&&t.b===a.id)));
 state.treaties.push({a:Math.min(a.id,b.id),b:Math.max(a.id,b.id),type,until:state.year+duration});
 log('Acuerdo diplomático',`${a.name} y ${b.name} firman un acuerdo de ${type} hasta el año ${state.year+duration}.`);return true;
}
// Phase 16: bilateral physical trade corridors and conserved goods/currency.
function ensureTradeRoutes(){
 if(!Array.isArray(state.tradeRoutes))state.tradeRoutes=[];
 const validIds=new Set(state.civs.map(c=>c.id));
 state.tradeRoutes=state.tradeRoutes.filter(t=>t&&Number.isSafeInteger(t.a)&&Number.isSafeInteger(t.b)&&t.a!==t.b&&validIds.has(t.a)&&validIds.has(t.b)&&Number.isSafeInteger(t.year)&&t.year<=state.year&&['active','blocked'].includes(t.status)).slice(-60);
}
// Phase 18: weighted A* transport over traversable land or coastal sea corridors.
// Terrain remains unchanged: these are natural transit corridors, not built roads.
// Alpha 0.33: bounded corridor cache. Invalidate whenever terrain or world changes.
const routeCache={tiles:null,paths:new Map(),hits:0,misses:0,active:false};
function invalidateTransportCache(){routeCache.paths.clear();routeCache.tiles=null}
function transportPath(start,end,mode){
 if(!routeCache.active)return computeTransportPath(start,end,mode);
 if(routeCache.tiles!==state.tiles){routeCache.tiles=state.tiles;routeCache.paths.clear()}
 const key=`${mode}:${start.x},${start.y}:${end.x},${end.y}`;
 if(routeCache.paths.has(key)){routeCache.hits++;return routeCache.paths.get(key)}
 routeCache.misses++;
 const result=computeTransportPath(start,end,mode);
 if(routeCache.paths.size>=256)routeCache.paths.delete(routeCache.paths.keys().next().value);
 routeCache.paths.set(key,result);
 return result;
}
function computeTransportPath(start,end,mode){
 const allowed=mode==='land'?t=>t>=2:t=>t<=1;
 const entry=(city)=>{if(mode==='land')return [index(city.x,city.y)];const cells=[];for(let yy=Math.max(0,city.y-2);yy<=Math.min(H-1,city.y+2);yy++)for(let xx=Math.max(0,city.x-2);xx<=Math.min(W-1,city.x+2);xx++)if(Math.abs(xx-city.x)+Math.abs(yy-city.y)<=2&&allowed(state.tiles[index(xx,yy)]))cells.push(index(xx,yy));return cells};
 const starts=entry(start),ends=new Set(entry(end));if(!starts.length||!ends.size)return null;
 const size=W*H,dist=new Float64Array(size).fill(Infinity),prev=new Int32Array(size).fill(-1),closed=new Uint8Array(size),heap=[];
 const push=(i,g)=>{const h=Math.hypot(i%W-end.x,Math.floor(i/W)-end.y)*(mode==='sea'?.7:1);let k=heap.length;heap.push({i,f:g+h});while(k>0){let parent=(k-1)>>1;if(heap[parent].f<=heap[k].f)break;[heap[k],heap[parent]]=[heap[parent],heap[k]];k=parent}};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;while(true){let l=k*2+1,r=l+1,m=k;if(l<heap.length&&heap[l].f<heap[m].f)m=l;if(r<heap.length&&heap[r].f<heap[m].f)m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m}}return first.i};
 for(const i of starts){dist[i]=0;push(i,0)}let terminal=-1;
 while(heap.length){const i=pop();if(closed[i])continue;closed[i]=1;if(ends.has(i)){terminal=i;break}const x=i%W,y=(i/W)|0;
 for(let dir=0;dir<4;dir++){const xx=x+(dir===0?1:dir===1?-1:0),yy=y+(dir===2?1:dir===3?-1:0);if(xx<0||xx>=W||yy<0||yy>=H)continue;const j=index(xx,yy),t=state.tiles[j];if(!allowed(t)||closed[j])continue;const weight=mode==='sea'?(t===1?1.1:.7):(t===4?3.5:t===3?1.65:1);const next=dist[i]+weight;if(next<dist[j]){dist[j]=next;prev[j]=i;push(j,next)}}}
 if(terminal<0)return null;const path=[];for(let i=terminal;i>=0;i=prev[i]){path.push([i%W,(i/W)|0]);if(prev[i]<0)break}path.reverse();return {mode,path,cost:Math.round(dist[terminal]*10)/10,distance:path.length-1};
}
function chooseTradeCorridor(a,b){let best=null;for(const x of a.cities)for(const y of b.cities){for(const mode of ['land','sea']){const ix=ensureInfrastructure(x),iy=ensureInfrastructure(y);if(mode==='sea'&&(!ix.port||!iy.port))continue;const corridor=transportPath(x,y,mode);if(!corridor)continue;const discount=mode==='land'?1-.09*Math.min(ix.road,iy.road):.75;const effective={...corridor,cost:Math.round(corridor.cost*discount*10)/10};if(!best||effective.cost<best.cost)best={from:x.name,to:y.name,...effective}}}return best}
function tradeStep(){
 routeCache.active=true;invalidateTransportCache();
 ensureTradeRoutes();
 const routes=[];
 for(const pact of state.treaties.filter(t=>t.type==='comercio'&&t.until>state.year)){
  const a=state.civs.find(c=>c.id===pact.a),b=state.civs.find(c=>c.id===pact.b);
  if(!a?.alive||!b?.alive||!a.cities.length||!b.cities.length)continue;
  const best=chooseTradeCorridor(a,b);
  if(!best)continue;
  const conflict=state.wars.some(w=>w.active&&(w.a===a.id||w.b===a.id||w.a===b.id||w.b===b.id));
  const previous=state.tradeRoutes.find(t=>t.a===pact.a&&t.b===pact.b);
  const status=conflict?'blocked':'active';
  const route={a:pact.a,b:pact.b,from:best.from,to:best.to,distance:best.distance,mode:best.mode,cost:best.cost,path:best.path,status,year:state.year,goods:{food:0,wood:0,stone:0}};
  if(status==='active'){
   // Only move existing stocks: the importer pays the exporter, and neither may spend below zero.
   for(const key of ['food','wood','stone']){
    const threshold=key==='food'?c=>Math.max(45,Math.round(c.population*.38)):key==='wood'?()=>35:()=>20;
    const price=key==='food'?1:key==='wood'?2:3;
    const move=(seller,buyer,sign)=>{
     const surplus=Math.floor(seller[key]-threshold(seller));
     const shortage=Math.ceil(threshold(buyer)-buyer[key]);
     const freight=Math.max(1,Math.ceil(best.cost/20));const amount=Math.max(0,Math.min(Math.max(2,16-freight),surplus,shortage,Math.floor(buyer.wealth/(price+freight))));
     if(amount<=0)return;
     seller[key]-=amount;buyer[key]+=amount;buyer.wealth-=amount*(price+freight);seller.wealth=Math.min(99999,seller.wealth+amount*(price+freight));
     route.goods[key]+=amount*sign;
    };
    move(a,b,1);move(b,a,-1);
   }
  }
  routes.push(route);
  if(!previous||previous.status!==status)log('Ruta comercial',`${a.name} y ${b.name}: ruta ${status==='active'?'abierta':'interrumpida'} entre ${route.from} y ${route.to}.`);
  else if(state.year%15===0&&Object.values(route.goods).some(Boolean))log('Intercambio',`${a.name} y ${b.name} intercambian mercancías por la ruta ${route.from} — ${route.to}.`);
 }
 state.tradeRoutes=routes;routeCache.active=false;invalidateTransportCache();
}
function diplomacyStep(r){
 ensureTreaties();
 for(const t of state.treaties){const a=state.civs.find(c=>c.id===t.a),b=state.civs.find(c=>c.id===t.b);
  if(!a?.alive||!b?.alive||activeWar(a,b)){t.until=state.year;continue}
  // Commercial revenue now comes from actual resource exchanges in tradeStep().
  if(state.year%5===0&&t.type!=='tregua')addRelation(a,b,2);
 }
 state.treaties=state.treaties.filter(t=>t.until>state.year);
 tradeStep();
 if(state.year%6!==0)return;
 const alive=state.civs.filter(c=>c.alive);
 for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){
  const a=alive[i],b=alive[j],rel=a.relations[b.id]||0;
  if(treaty(a,b)||activeWar(a,b)||r()>.17)continue;
  if(rel>=70)signTreaty(a,b,'alianza',24);
  else if(rel>=50)signTreaty(a,b,'defensa',18);
  else if(rel>=28)signTreaty(a,b,'comercio',16);
 }
}
function diplomaticDefense(a,b){
 let bonus=0;
 for(const t of state.treaties){if(!['alianza','defensa'].includes(t.type))continue;
  const allyId=t.a===a.id?t.b:t.b===a.id?t.a:null;
  const ally=state.civs.find(c=>c.id===allyId&&c.alive);
  if(ally&&ally.id!==b.id&&!activeWar(ally,b))bonus+=military(ally)*(t.type==='alianza'?.22:.12);
 }return Math.round(bonus)
}
function endWar(w,reason){w.active=false;w.ended=state.year;const a=state.civs.find(c=>c.id===w.a),b=state.civs.find(c=>c.id===w.b);if(a&&b){addRelation(a,b,12);signTreaty(a,b,'tregua',12);const winner=w.score>15?a:w.score< -15?b:null,loser=winner==a?b:a;if(winner&&loser){const compensation=Math.min(30,Math.floor(loser.wealth*.12));loser.wealth-=compensation;winner.wealth=clamp(winner.wealth+compensation,0,99999)}log('Tratado de paz',`${a.name} y ${b.name} firman la paz. ${reason}`)}}
function warfareStep(r){
 ensureWars();const byId=new Map(state.civs.map(c=>[c.id,c]));
 for(const w of state.wars.filter(w=>w.active)){
  const a=byId.get(w.a),b=byId.get(w.b);
  if(!a?.alive||!b?.alive){endWar(w,'El conflicto termina por la caída de una de las potencias.');continue}
  w.turns++;
  const strengthA=military(a)+diplomaticDefense(a,b),strengthB=military(b)+diplomaticDefense(b,a);
  const attacker=r()<strengthA/(strengthA+strengthB)?a:b,defender=attacker===a?b:a;
  const lossA=Math.min(a.population,Math.max(1,Math.round(a.population*(.002+r()*.004))));
  const lossB=Math.min(b.population,Math.max(1,Math.round(b.population*(.002+r()*.004))));
  a.population-=lossA;b.population-=lossB;
  a.wealth=Math.max(0,a.wealth-Math.ceil(3+r()*7));b.wealth=Math.max(0,b.wealth-Math.ceil(3+r()*7));
  a.food=Math.max(0,a.food-Math.ceil(lossA*.7));b.food=Math.max(0,b.food-Math.ceil(lossB*.7));
  // Una conquista exige ventaja y una ciudad enemiga cercana a otra propia.
  const targets=defender.cities.filter(city=>attacker.cities.some(base=>Math.hypot(base.x-city.x,base.y-city.y)<=24));
  const recapture=attacker.goal?.type==='recuperar'&&attacker.goal.targetId===defender.id;
  const attackChance=clamp(.05+(military(attacker)/Math.max(1,military(defender))-1)*.07+(recapture?.06:0),.015,.26);
  if(targets.length&&r()<attackChance){
    const city=targets.slice().sort((x,y)=>(settlementScore(attacker,y.x,y.y)+(recapture&&y.name===attacker.goal.city?10:0))-(settlementScore(attacker,x.x,x.y)+(recapture&&x.name===attacker.goal.city?10:0)))[0];
    if(defender.cities.length===1&&defender.population>20&&r()<.65){damageCityFromWar(city,1);log('Asedio',`${attacker.name} asedia ${city.name}, pero sus defensores resisten.`)}
    else{
      defender.cities.splice(defender.cities.indexOf(city),1);attacker.cities.push(city);
      const refugees=Math.min(defender.population,Math.max(5,Math.floor(city.pop*.35)));
      defender.population-=refugees;attacker.population+=Math.floor(refugees*.5);
      normalizeCity(city);damageCityFromWar(city,2);city.prosperity=Math.max(10,city.prosperity-25);
      rememberLoss(defender,attacker,city);
      log('Conquista',`${attacker.name} conquista ${city.name}, anteriormente bajo el control de ${defender.name}.`);
      w.score=clamp(w.score+(attacker===a?25:-25),-100,100);
      if(defender.cities.length===0){defender.alive=false;defender.population=0;log('Caída del reino',`${defender.name} pierde su última ciudad y deja de existir como Estado.`);endWar(w,'La última ciudad del reino derrotado ha caído.');}
    }
  }else if(w.turns%3===0)log('Batalla',`Los ejércitos de ${a.name} y ${b.name} se enfrentan. Ambos reinos pierden población y riqueza.`);
  if(w.active&&(w.turns>=18||((w.turns>=4)&&r()<.055))){endWar(w,`Tras ${w.turns} años de enfrentamientos, cesan las hostilidades.`)}
 }
 const alive=state.civs.filter(c=>c.alive&&c.cities.length);
 if(state.year%4===0&&state.wars.filter(w=>w.active).length<3){
  const pairs=[];for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){
   const a=alive[i],b=alive[j];if(!activeWar(a,b)&&!treaty(a,b)&&adjacentPowers(a,b)&&(a.relations[b.id]<=-40||a.goal?.type==='recuperar'&&a.goal.targetId===b.id||b.goal?.type==='recuperar'&&b.goal.targetId===a.id)&&!state.wars.some(w=>!w.active&&w.ended>state.year-12&&((w.a===a.id&&w.b===b.id)||(w.a===b.id&&w.b===a.id))))pairs.push([a,b])
  }
  if(pairs.length&&r()<.4){const [a,b]=pairs[Math.floor(r()*pairs.length)];state.wars.push({a:a.id,b:b.id,started:state.year,active:true,turns:0,score:0});addRelation(a,b,-12);log('Declaración de guerra',`${a.name} y ${b.name} entran en guerra por rivalidades fronterizas.`)}
 }
 state.wars=state.wars.slice(-24);
 for(const c of state.civs)if(c.alive)distributePopulation(c);
}
function showWars(c){const panel=document.createElement('div');panel.className='diplomacy';const t=document.createElement('strong');t.textContent='Conflictos militares';panel.append(t);const relevant=state.wars.filter(w=>w.a===c.id||w.b===c.id).slice(-5).reverse();if(!relevant.length){const p=document.createElement('p');p.textContent='Sin conflictos registrados.';panel.append(p)}for(const w of relevant){const other=state.civs.find(n=>n.id===(w.a===c.id?w.b:w.a));const p=document.createElement('p');p.textContent=`${w.active?'⚔ EN GUERRA':'Paz'} con ${other?.name||'desconocido'} · Desde ${w.started}${w.active?'':` hasta ${w.ended??state.year}`}`;panel.append(p)}return panel}
function showDiplomacy(c){const panel=document.createElement('div');panel.className='diplomacy';const heading=document.createElement('strong');heading.textContent='Relaciones diplomáticas';panel.append(heading);ensureMemory(c);const covert=document.createElement('p');ensureIntrigue(c);covert.textContent=`Inteligencia: ${c.spyNetwork}/100 · Subversión: ${Math.round(c.subversion)}/100`;panel.append(covert);const strategy=document.createElement('p');strategy.textContent=`Doctrina estratégica: ${strategicDoctrine(c)} · Decisión: ${c.strategyAction||strategicDecision(c).action} · Plan hasta ${c.strategyPlan?.until??"sin definir"}`;panel.append(strategy);const objective=document.createElement('p');objective.textContent=`Objetivo: ${c.goal.type}${c.goal.city?' · '+c.goal.city:''} · Agravios registrados: ${c.grievances.length}`;panel.append(objective);ensureTreaties();for(const t of state.treaties.filter(t=>t.a===c.id||t.b===c.id)){const other=state.civs.find(n=>n.id===(t.a===c.id?t.b:t.a));const p=document.createElement('p');p.textContent=`Pacto de ${t.type} con ${other?.name||'otro reino'} hasta ${t.until}`;panel.append(p)}ensureTradeRoutes();for(const t of state.tradeRoutes.filter(t=>t.a===c.id||t.b===c.id)){const p=document.createElement('p');p.textContent=`Ruta ${t.status==='active'?'activa':'interrumpida'}: ${t.from} ↔ ${t.to} (${t.mode==='sea'?'marítima':'terrestre'}, coste ${t.cost??t.distance}) · alimentos ${t.goods.food}, madera ${t.goods.wood}, piedra ${t.goods.stone}`;panel.append(p)}for(const other of state.civs){if(other.id===c.id)continue;const line=document.createElement('p');const n=c.relations[other.id]||0;line.textContent=`${other.name}: ${diplomaticStatus(n)} (${n>0?'+':''}${n})`;panel.append(line)}return panel}
// ALPHA 0.6: intervenciones persistentes, con efectos acotados y serializables.
function ensureClimate(){
 if(!Array.isArray(state.climateEffects))state.climateEffects=[];
 state.climateEffects=state.climateEffects.filter(e=>e&&Number.isInteger(e.civId)&&state.civs.some(c=>c.id===e.civId)&&['drought','blessing'].includes(e.type)&&Number.isSafeInteger(e.until)&&e.until>=state.year&&e.until<=state.year+40).slice(-32);
}
function regionalCities(x,y,radius){return state.civs.filter(c=>c.alive).flatMap(c=>c.cities.filter(city=>Math.hypot(city.x-x,city.y-y)<=radius).map(city=>({c,city})));}
function divineEvent(kind,x,y){
 const center=index(x,y),t=state.tiles[center],radius=kind==='quake'?5:kind==='flood'?4:kind==='fire'?4:6;
 const affected=regionalCities(x,y,radius+3);let changed=0;
 if(kind==='blessing'){
  const owner=state.civs.find(c=>c.alive&&c.id===state.ownership[center]);
  const target=owner||affected[0]?.c;
  if(!target){$('status').textContent='Selecciona una región poblada para conceder abundancia.';return false}
  ensureClimate();state.climateEffects=state.climateEffects.filter(e=>!(e.civId===target.id&&e.type==='blessing'));
  state.climateEffects.push({type:'blessing',civId:target.id,until:state.year+12});
  target.food=clamp(target.food+100,0,1000000);target.wealth=clamp(target.wealth+20,0,99999);
  log('Bendición de abundancia',`${target.name} recibe cosechas excepcionales durante 12 años.`);
  $('status').textContent=`Abundancia concedida a ${target.name} hasta el año ${state.year+12}.`;return true;
 }
 if(kind==='flood'&&t===4){$('status').textContent='Las montañas no pueden inundarse; elige una costa o llanura.';return false}
 if(kind==='fire'&&t!==3&&t!==2){$('status').textContent='El incendio necesita bosque o llanura.';return false}
 for(let yy=Math.max(0,y-radius);yy<=Math.min(H-1,y+radius);yy++)for(let xx=Math.max(0,x-radius);xx<=Math.min(W-1,x+radius);xx++){
  const d=Math.hypot(xx-x,yy-y),i=index(xx,yy),biome=state.tiles[i];if(d>radius)continue;
  const chance=noise(xx+state.year,yy,state.seed+kind.length);
  if(kind==='quake'&&biome>=2&&chance>.67){state.tiles[i]=biome===4?3:biome===3?4:1;changed++}
  if(kind==='flood'&&biome===2&&chance>.34){state.tiles[i]=1;changed++}
  if(kind==='fire'&&biome===3&&chance>.36){state.tiles[i]=2;changed++}
 }
 if(changed)invalidateTransportCache();
 let losses=0;
 for(const {c,city} of affected){
  const severity=kind==='quake'?.13:kind==='flood'?.09:.07;
  const n=Math.min(c.population,Math.ceil(city.pop*severity));c.population-=n;losses+=n;
  c.wealth=Math.max(0,c.wealth-(kind==='quake'?15:10));
  city.prosperity=clamp(city.prosperity-20,0,100);city.pop=Math.max(0,city.pop-n);
  if(kind==='quake'&&city.buildings){const keys=Object.keys(BUILDINGS).filter(k=>city.buildings[k]>0);if(keys.length){const k=keys[0];city.buildings[k]--;}}
 }
 const label={quake:'Terremoto',flood:'Inundación',fire:'Incendio'}[kind];
 log(label,`${label} en (${x}, ${y}): ${changed} casillas transformadas, ${losses} habitantes afectados.`);
 $('status').textContent=`${label}: ${changed} terrenos modificados y ${losses} pérdidas de población.`;
 for(const c of state.civs.filter(c=>c.alive))distributePopulation(c);
 return true;
}
function applyClimateEffects(){
 ensureClimate();
 for(const effect of state.climateEffects){const c=state.civs.find(c=>c.id===effect.civId&&c.alive);if(!c)continue;
  if(effect.type==='blessing'){c.food=clamp(c.food+Math.max(25,Math.round(c.population*.08)),0,1000000);c.wealth=clamp(c.wealth+3,0,99999)}
  if(effect.type==='drought'){c.food=Math.max(0,c.food-Math.max(30,Math.ceil(c.population*.22)));c.production-=Math.max(30,Math.ceil(c.population*.22))}
 }
 state.climateEffects=state.climateEffects.filter(e=>e.until>state.year);
}
// Archivo histórico compacto por civilización; no altera las decisiones económicas.
function ensureLifeHistory(c){
  if(!c.lifeHistory||typeof c.lifeHistory!=='object')c.lifeHistory={born:Number.isSafeInteger(c.foundedYear)?c.foundedYear:0,peakCities:0,peakPopulation:0,peakYear:0,phase:'origen',phaseSince:state.year,extinctYear:null,chronicle:[]};
  const h=c.lifeHistory;
  if(!Array.isArray(h.chronicle))h.chronicle=[];
  h.chronicle=h.chronicle.slice(-24);
  return h;
}
function historicalStep(){
  if(!state)return;
  for(const c of state.civs){
    const h=ensureLifeHistory(c),cities=c.cities.length,pop=Math.max(0,Math.round(c.population||0));
    if(cities>h.peakCities||(cities===h.peakCities&&pop>h.peakPopulation)){h.peakCities=cities;h.peakPopulation=pop;h.peakYear=state.year}
    const age=state.year-h.born;
    const territoryLoss=h.peakCities>=3&&cities<=Math.floor(h.peakCities*.6);
    let phase=!c.alive||pop<=0?'extinción':territoryLoss||((c.unrest||0)>80&&age>35)?'decadencia':cities>=4&&pop>=200?'apogeo':cities>=2||age>=50?'expansión':'origen';
    if(phase!==h.phase){h.phase=phase;h.phaseSince=state.year;h.chronicle.push({year:state.year,phase});h.chronicle=h.chronicle.slice(-24);
      if(phase==='extinción'){h.extinctYear=state.year;log('Fin de una civilización',`${c.name} desaparece tras ${age} años de historia.`)}
      else if(phase==='apogeo'||phase==='decadencia')log('Historia de los imperios',`${c.name} entra en su etapa de ${phase}.`);
    }
    if(phase==='extinción'&&h.extinctYear===null)h.extinctYear=state.year;
  }
}
function yearStep(){
  if(!state)return;
  state.year++;const r=rng(state.seed+state.year*10391);
  recalculateTerritory();
  const alive=state.civs.filter(c=>c.alive);
  for(const c of alive){
    ensureGovernment(c);
    const surplus=yearlyResources(c);
    if(c.government==='República')c.wealth=clamp(c.wealth+Math.min(3,c.cities.length),0,99999);
    else if(c.government==='Consejo')c.food=clamp(c.food+Math.min(4,c.cities.length*2),0,1000000);
    if(state.year%3===0)urbanDevelopment(c,r);
    let growth=surplus>=0?.018:-.042;
    if(c.housing>0&&c.population>c.housing)growth-=.023;
    if(c.food===0){growth=-.085;if(r()<.16)log('Hambruna',`${c.name} pierde población por falta de reservas y cosechas.`)}
    growth+=(r()-.5)*.018;
    c.population=Math.max(0,Math.round(c.population*(1+growth)));distributePopulation(c);for(const city of c.cities){city.shortage=c.production<0||c.population>c.housing;city.prosperity=clamp(city.prosperity+(city.shortage?-3:1)+(c.trade>0?1:0),0,100)}
    c.tech+=c.population>100?(civTrait(c)==='Erudita'?2:1):0;
    if(c.population===0){c.alive=false;log('Extinción',`${c.name} desaparece tras el colapso de su población.`);continue}
    if(c.population>(civTrait(c)==='Expansionista'?180:205)*c.cities.length&&c.cities.length<10&&c.wood>=20&&c.stone>=8&&state.year-(c.lastSettlementYear||-30)>=15){
      const options=[];
      for(let k=0;k<85;k++){
        const city=c.cities[Math.floor(r()*c.cities.length)];
        const x=clamp(city.x+Math.round((r()-.5)*24),2,W-3),y=clamp(city.y+Math.round((r()-.5)*24),2,H-3),i=index(x,y);
        if(state.tiles[i]===2||state.tiles[i]===3){
          if((state.ownership[i]===c.id||state.ownership[i]===-1)&&state.civs.every(n=>n.cities.every(t=>Math.hypot(t.x-x,t.y-y)>=6)))options.push({x,y,quality:settlementScore(c,x,y)+r()*.2});
        }
      }
      options.sort((a,b)=>b.quality-a.quality);
      if(options.length){const {x,y}=options[0],name=`${c.name} ${['Nova','Alta','Porto','Vale','Mont'][Math.floor(r()*5)]}`;
        c.cities.push({name,x,y,founded:state.year,buildings:{homes:1,farms:1,workshops:0,markets:0},pop:0,prosperity:50});c.wood-=20;c.stone-=8;c.lastSettlementYear=state.year;
        log('Colonización',`${c.name} invierte madera y piedra para fundar ${name}.`);
      }
    }
    if(c.tech%125===0)log('Descubrimiento',`Los estudiosos de ${c.name} alcanzan un nuevo nivel de conocimiento.`);
  }
  applyClimateEffects();
  infrastructureStep();
  reconstructionStep();
  diplomacyStep(r);
  historyStep(r);
  strategicMemoryStep();
  strategicAIStep();
  identityStep();
  governmentStep(r);
  espionageStep(r);
  warfareStep(r);
  imperialBalanceStep();
  internalCrisisStep(r);
  culturalStep();
  // Las migraciones trasladan habitantes, no los crean.
  const migrants=alive.filter(c=>c.alive&&c.production<0&&c.population>35);
  for(const origin of migrants){
    const destinations=alive.filter(c=>c.alive&&c.id!==origin.id&&c.production>15)
      .sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));
    if(!destinations.length)continue;
    const target=destinations[0],amount=Math.min(Math.floor(origin.population*.025),Math.floor(target.production*.3),25);
    if(amount>0){origin.population-=amount;target.population+=amount;distributePopulation(origin);distributePopulation(target);
      if(state.year%5===0)log('Migración',`${amount} habitantes de ${origin.name} emigran a ${target.name} buscando mejores cosechas.`);
    }
  }
  if(state.year%30===0)log('Cambio de era',`Comienza el año ${state.year}. Las sociedades del mundo siguen transformándose.`);
  recalculateTerritory();historicalStep();recordSnapshot();refresh();
}

// Alpha 0.29: time-series samples are bounded and stored inside local saves.
function ensureSnapshots(){if(!Array.isArray(state.snapshots))state.snapshots=[];state.snapshots=state.snapshots.slice(-150)}
function recordSnapshot(){ensureSnapshots();if(state.year!==0&&state.year%10!==0)return;const last=state.snapshots[state.snapshots.length-1];if(last&&last.year===state.year)return;state.snapshots.push({year:state.year,population:Math.round(state.civs.reduce((n,c)=>n+(c.population||0),0)),cities:state.civs.reduce((n,c)=>n+c.cities.length,0),civs:state.civs.map(c=>({id:c.id,population:Math.round(c.population||0),cities:c.cities.length}))});state.snapshots=state.snapshots.slice(-150)}
function renderTimeline(){const select=$('timelineNation'),chosen=select.value||'all',previous=chosen;select.replaceChildren();const globalOption=document.createElement('option');globalOption.value='all';globalOption.textContent='Todo el mundo';select.append(globalOption);for(const c of state.civs){const o=document.createElement('option');o.value=String(c.id);o.textContent=c.name;select.append(o)}select.value=previous;if(select.value!==previous)select.value='all';const id=select.value;const civ=id==='all'?null:state.civs.find(c=>String(c.id)===id);const samples=state.snapshots||[];const value=v=>civ?(v.civs.find(x=>x.id===civ.id)?.population||0):v.population;const top=Math.max(1,...samples.map(value));const summary=$('timelineSummary');summary.textContent=`${civ?civ.name:'Mundo'} · ${samples.length} registros de población · máximo ${Math.round(top).toLocaleString('es-ES')} habitantes · intervalo de 10 años`;const graph=$('timelineChart');graph.replaceChildren();for(const sample of samples){const bar=document.createElement('div');bar.className='timeline-bar';bar.style.height=`${Math.max(2,value(sample)/top*100)}%`;bar.title=`Año ${sample.year}: ${Math.round(value(sample)).toLocaleString('es-ES')} habitantes`;bar.setAttribute('aria-label',bar.title);graph.append(bar)}const listing=$('timelineEvents');listing.replaceChildren();const records=state.events.filter(e=>!civ||e.description.includes(civ.name)).slice(0,90);for(const e of records){const item=document.createElement('div');item.className='event';const stamp=document.createElement('small');stamp.textContent=`AÑO ${e.year}`;const heading=document.createElement('strong');heading.textContent=e.title;const body=document.createElement('p');body.textContent=e.description;item.append(stamp,heading,body);listing.append(item)}if(!records.length)listing.textContent='Sin acontecimientos registrados para este filtro.'}


// Fase 31: herramientas directas, acotadas y registradas en las crónicas.
function intervention(kind,civId,rivalId){
 if(!state)return false;
 const c=state.civs.find(x=>x.id===Number(civId)&&x.alive);
 const b=state.civs.find(x=>x.id===Number(rivalId)&&x.alive);
 if(!c){$('status').textContent='Selecciona una civilización viva.';return false}
 let message='';
 if(kind==='aid'){
  c.food=clamp(c.food+75,0,1000000);c.wood=clamp(c.wood+25,0,1000000);c.stone=clamp(c.stone+20,0,1000000);c.wealth=clamp(c.wealth+30,0,99999);
  message=`${c.name} recibe alimentos, materiales y riqueza.`;
 }else if(kind==='calm'){
  c.unrest=clamp((c.unrest||0)-25,0,100);ensureGovernment(c);c.mandate=clamp(c.mandate+15,0,100);
  message=`${c.name} recupera estabilidad y legitimidad.`;
 }else{
  if(!b||b.id===c.id){$('status').textContent='Elige dos civilizaciones vivas y diferentes.';return false}
  if(kind==='friend'){addRelation(c,b,25);message=`Mejoran las relaciones entre ${c.name} y ${b.name}.`}
  else if(kind==='hostile'){addRelation(c,b,-25);message=`Empeoran las relaciones entre ${c.name} y ${b.name}.`}
  else if(kind==='peace'){
   const w=activeWar(c,b);if(!w){$('status').textContent='Estos reinos no están en guerra.';return false}
   // Paz impuesta sin reparaciones ni vencedor: no pasar por endWar.
   w.active=false;w.ended=state.year;ensureTreaties();state.treaties=state.treaties.filter(t=>!((t.a===c.id&&t.b===b.id)||(t.a===b.id&&t.b===c.id)));
   state.treaties.push({a:Math.min(c.id,b.id),b:Math.max(c.id,b.id),type:'tregua',until:state.year+12});
   message=`Se impone una tregua de 12 años entre ${c.name} y ${b.name}.`;
  }else if(kind==='trade'){
   if(!signTreaty(c,b,'comercio',20)){$('status').textContent='No puede firmarse un pacto comercial durante una guerra.';return false}
   message=`${c.name} y ${b.name} acuerdan comerciar durante 20 años.`;
  }else return false;
 }
 log('Intervención del observador',message);$('status').textContent=message;refresh();return true;
}
function refreshGodSelectors(){
 const selectors=[$('godCivilization'),$('godRival')];const alive=state.civs.filter(c=>c.alive);
 for(let k=0;k<2;k++){
  const el=selectors[k],old=el.value;el.replaceChildren();
  for(const c of alive){const option=document.createElement('option');option.value=String(c.id);option.textContent=c.name;el.append(option)}
  el.value=alive.some(c=>String(c.id)===old)?old:String(alive[k%Math.max(1,alive.length)]?.id??'');
 }
}
for(const [button,kind] of [['godAid','aid'],['godCalm','calm'],['godFriend','friend'],['godHostile','hostile'],['godPeace','peace'],['godPact','trade']]){
 $(button).addEventListener('click',()=>intervention(kind,$('godCivilization').value,$('godRival').value));
}
function refresh(){if(!state)return;refreshGodSelectors();$('year').textContent='AÑO '+state.year;$('worldEra').textContent=state.year<100?'ERA DE LOS ORÍGENES':state.year<400?'ERA DE LOS REINOS':state.year<900?'ERA DE LOS IMPERIOS':'ERA DE LAS DINASTÍAS';$('mapTitle').replaceChildren();$('mapTitle').append(document.createTextNode(state.name+' '));let s=document.createElement('span');s.textContent='· Año '+state.year;$('mapTitle').append(s);$('population').textContent=state.civs.reduce((a,c)=>a+c.population,0).toLocaleString('es-ES');$('cities').textContent=state.civs.reduce((a,c)=>a+c.cities.length,0);$('empires').textContent=state.civs.filter(c=>c.alive).length;$('events').textContent=state.events.length;$('wars').textContent=(state.wars||[]).filter(w=>w.active).length;$('climateStatus').textContent=(state.climateEffects||[]).length?state.climateEffects.map(e=>`${e.type==='drought'?'☀ Sequía':'✦ Abundancia'}: ${state.civs.find(c=>c.id===e.civId)?.name||'Reino'} (hasta año ${e.until})`).join(' · '):'Clima estable';$('land').textContent=state.civs.reduce((a,c)=>a+(c.territory||0),0).toLocaleString('es-ES');const hist=$('history');hist.replaceChildren();for(const e of state.events.slice(0,55)){let d=document.createElement('div');d.className='event';let y=document.createElement('small');y.textContent='AÑO '+e.year;let b=document.createElement('strong');b.textContent=e.title;let p=document.createElement('p');p.textContent=e.description;d.append(y,b,p);hist.append(d)}if(activeTab==='timeline')renderTimeline();const nat=$('nations');nat.replaceChildren();for(const c of state.civs){let d=document.createElement('div');d.className='nation';let dot=document.createElement('i');dot.className='dot';dot.style.background=c.color;let b=document.createElement('strong');b.append(dot,document.createTextNode(c.name+(c.alive?'':' · EXTINTA')));let sm=document.createElement('small');sm.textContent=`${c.population.toLocaleString('es-ES')} habitantes · ${c.cities.length} ciudades · Malestar ${Math.round(c.unrest||0)}/100 · ${civTrait(c)} · Nivel ${Math.floor(c.tech/125)+1} · ${c.epoch||'formación'}`;d.append(b,sm);let reign=document.createElement('small');reign.textContent=c.ruler?`Gobierna ${c.ruler.name}`:'';d.append(reign);if((state.wars||[]).some(w=>w.active&&(w.a===c.id||w.b===c.id))){const war=document.createElement('small');war.textContent='⚔ EN GUERRA';d.append(war)}d.addEventListener('click',()=>{selectCiv(c);$('tabNations').click()});nat.append(d)}draw()}function selectCiv(c){$('details').replaceChildren();let title=document.createElement('strong');title.textContent=c.name;title.style.color=c.color;let p=document.createElement('p');p.textContent=`Cultura: ${civTrait(c)} · Prioridad: ${civicPriority(c)||'Estabilidad'} · Doctrina: ${strategicDoctrine(c)} · Plan: ${c.strategyAction||strategicDecision(c).action} (hasta ${c.strategyPlan?.until??"—"}) · Población: ${c.population.toLocaleString('es-ES')} · Ciudades: ${c.cities.length} · Territorio: ${c.territory} casillas · Alimentos: ${c.food} (${c.production>=0?'+':''}${c.production}/año) · Madera: ${c.wood} · Piedra: ${c.stone} · Riqueza: ${c.wealth} · Descontento: ${Math.round(c.unrest||0)}/100`;let city=document.createElement('p');city.textContent=c.cities.map(t=>`${t.name} (${t.founded})`).join(' · ');$('details').append(title,p,city);ensureCulture(c);ensureIdentity(c);const ancestry=ancestralConnections(c);const cultural=document.createElement('p');cultural.textContent=`Identidad: ${c.culture} · Etapa: ${c.epoch} (desde ${c.epochStart}) · Origen cultural: año ${c.cultureFounded}`+(ancestry.ancestor?` · Reino de origen: ${ancestry.ancestor.name}`:' · Reino originario')+(ancestry.descendants.length?` · Sucesores: ${ancestry.descendants.map(x=>x.name).join(', ')}`:'');$('details').append(cultural);const historic=document.createElement('p');const life=ensureLifeHistory(c);historic.textContent=`Historia: ${life.phase} (desde ${life.phaseSince}) · Apogeo registrado: ${life.peakCities} ciudades, ${life.peakPopulation} habitantes (año ${life.peakYear})`+(life.extinctYear!==null?` · Extinción: año ${life.extinctYear}`:'');$('details').append(historic);const political=document.createElement('p');ensureGovernment(c);political.textContent=`Gobierno: ${c.government} · Legitimidad: ${Math.round(c.mandate)}/100 · Desde: ${c.governmentSince}`;$('details').append(political);const identity=document.createElement('p');identity.textContent=`Creencias: ${c.belief} · Tradición: ${c.custom} · Cohesión: ${Math.round(c.cohesion)}/100`;$('details').append(identity);if(c.ruler){const ruler=document.createElement('p');ruler.textContent=`Gobernante: ${c.ruler.name} · Edad ${Math.max(0,state.year-c.ruler.born)} · Desde el año ${c.ruler.reignStart} · Dinastía ${c.dynasty}`;$('details').append(ruler)}$('details').append(showDiplomacy(c),showWars(c));if(c.legacies?.length){const archive=document.createElement('div');archive.className='diplomacy';const h=document.createElement('strong');h.textContent='Archivo de acontecimientos';archive.append(h);for(const e of c.legacies.slice(-8).reverse()){const line=document.createElement('p');line.textContent=`Año ${e.year} · ${e.title}: ${e.description}`;archive.append(line)}$('details').append(archive)}if(c.rulers.length){const former=document.createElement('p');former.textContent='Gobernantes anteriores: '+c.rulers.slice(-4).map(x=>x.name).join(' · ');$('details').append(former)}const buttons=document.createElement('div');buttons.className='city-links';for(const entry of c.cities){const b=document.createElement('button');b.textContent='⌂ '+entry.name;b.addEventListener('click',()=>selectCity(c,entry));buttons.append(b)}$('details').append(buttons)}function selectCell(x,y){let t=state.tiles[index(x,y)],near=state.civs.flatMap(c=>c.cities.map(city=>({c,city,d:Math.hypot(city.x-x,city.y-y)}))).sort((a,b)=>a.d-b.d)[0];if(tool==='fertile'){if(t===1||t===4){state.tiles[index(x,y)]=2;invalidateTransportCache();log('Bendición',`Las tierras en (${x}, ${y}) se vuelven fértiles.`)}else{$('status').textContent='Solo puedes fertilizar costas o montañas.'}}else if(tool==='drought'){if(t>=2){state.tiles[index(x,y)]=1;const owner=state.civs.find(c=>c.alive&&c.id===state.ownership[index(x,y)]);if(owner){ensureClimate();state.climateEffects=state.climateEffects.filter(e=>!(e.type==='drought'&&e.civId===owner.id));state.climateEffects.push({type:'drought',civId:owner.id,until:state.year+8})}log('Sequía',`Una región en (${x}, ${y}) queda devastada${owner?`; ${owner.name} sufrirá 8 años de escasez`:''}.`)}else $('status').textContent='No puedes secar este terreno.'}else if(['quake','flood','fire','blessing'].includes(tool)){divineEvent(tool,x,y)}else if(tool==='settle'){if(!isLand(t)){$('status').textContent='Debes elegir terreno firme.';return}if(near&&near.d<6){$('status').textContent='Demasiado cerca de otra ciudad.';return}let nearest=state.civs.filter(c=>c.alive).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(!nearest)return;let name=`${nearest.name} ${nearest.cities.length+1}`;nearest.cities.push({name,x,y,founded:state.year,buildings:{homes:1,farms:1,workshops:0,markets:0},pop:0,prosperity:50});log('Intervención divina',`Se funda ${name} por voluntad del observador.`)}else{let match=near&&near.d<5?near:null;$('details').replaceChildren();let strong=document.createElement('strong');strong.textContent=match?match.city.name:`Territorio (${x}, ${y})`;let p=document.createElement('p');p.textContent=`Bioma: ${['Océano','Costa','Llanura','Bosque','Montaña'][t]}. `+(match?`Fundada en el año ${match.city.founded}. Pertenece a ${match.c.name}.`:'Sin asentamiento próximo.');const owner=state.civs.find(c=>c.id===state.ownership[index(x,y)]);if(owner)p.textContent+=' Controlado por '+owner.name+'.';$('details').append(strong,p);if(match)selectCity(match.c,match.city)}recalculateTerritory();refresh()}function resize(){let rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw()}function layout(){let cw=canvas.clientWidth,ch=canvas.clientHeight;let sz=Math.min(cw/W,ch/H)*zoom;return {sz,ox:(cw-W*sz)/2+pan.x,oy:(ch-H*sz)/2+pan.y}}function draw(){if(!state||!ctx)return;let cw=canvas.clientWidth,ch=canvas.clientHeight;ctx.clearRect(0,0,cw,ch);ctx.fillStyle='#0c2635';ctx.fillRect(0,0,cw,ch);let {sz,ox,oy}=layout();const palette=['#164053','#316176','#829c71','#315a45','#8d8c85'];for(let y=0;y<H;y++)for(let x=0;x<W;x++){let t=state.tiles[index(x,y)],variation=noise(x,y,state.seed);ctx.fillStyle=palette[t];ctx.fillRect(ox+x*sz,oy+y*sz,sz+.45,sz+.45);if(sz>5&&t>=2&&variation>.83){ctx.fillStyle=t===3?'#173c32':'#9bad84';ctx.fillRect(ox+(x+.35)*sz,oy+(y+.28)*sz,Math.max(1,sz*.2),Math.max(1,sz*.35))}}// Phase 17: schematic links between actual trade-route endpoint cities.
  // Routes follow terrain-weighted corridors; no built road infrastructure or vessel simulation.
  if(showRoutes&&Array.isArray(state.tradeRoutes)&&sz>=1.2){
    ctx.save();
    for(const route of state.tradeRoutes){
      const a=state.civs.find(c=>c.id===route.a),b=state.civs.find(c=>c.id===route.b);
      const from=a?.cities.find(city=>city.name===route.from),to=b?.cities.find(city=>city.name===route.to);
      if(!from||!to)continue;
      const x1=ox+(from.x+.5)*sz,y1=oy+(from.y+.5)*sz,x2=ox+(to.x+.5)*sz,y2=oy+(to.y+.5)*sz;
      ctx.beginPath();ctx.moveTo(x1,y1);
      if(Array.isArray(route.path)&&route.path.length>1){for(const [px,py] of route.path)ctx.lineTo(ox+(px+.5)*sz,oy+(py+.5)*sz)}
      ctx.lineTo(x2,y2);
      ctx.strokeStyle=route.status==='active'?(route.mode==='sea'?'#8bd7fa':'#f8d685'):'#ee817a';
      ctx.lineWidth=Math.max(1.5,Math.min(3.5,sz*.35));
      ctx.globalAlpha=route.status==='active'?.85:.65;
      ctx.setLineDash(route.status==='blocked'?[3,5]:[7,4]);ctx.stroke();
      ctx.setLineDash([]);
      if(sz>=4){ctx.fillStyle=route.status==='active'?(route.mode==='sea'?'#8bd7fa':'#f8d685'):'#ee817a';
        ctx.beginPath();ctx.arc((x1+x2)/2,(y1+y2)/2,Math.max(2,sz*.32),0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  // Sombreado territorial semitransparente: no altera el bioma base.
  const civById=new Map(state.civs.map(c=>[c.id,c]));
  if(showBorders&&state.ownership)for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const owner=state.ownership[index(x,y)];if(owner<0)continue;
    const civ=civById.get(owner);if(!civ)continue;
    ctx.globalAlpha=.18;ctx.fillStyle=civ.color;ctx.fillRect(ox+x*sz,oy+y*sz,sz+.25,sz+.25);ctx.globalAlpha=1;
    if(sz>=3){ctx.strokeStyle=civ.color;ctx.lineWidth=Math.min(1.5,sz*.2);ctx.globalAlpha=.55;
      if(x===W-1||state.ownership[index(x+1,y)]!==owner){ctx.beginPath();ctx.moveTo(ox+(x+1)*sz,oy+y*sz);ctx.lineTo(ox+(x+1)*sz,oy+(y+1)*sz);ctx.stroke()}
      if(y===H-1||state.ownership[index(x,y+1)]!==owner){ctx.beginPath();ctx.moveTo(ox+x*sz,oy+(y+1)*sz);ctx.lineTo(ox+(x+1)*sz,oy+(y+1)*sz);ctx.stroke()}
      ctx.globalAlpha=1;
    }
  }
  for(const c of state.civs){for(const city of c.cities){let px=ox+(city.x+.5)*sz,py=oy+(city.y+.5)*sz;ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(px,py,Math.max(3,sz*.6),0,Math.PI*2);ctx.fill();ctx.strokeStyle='#10232b';ctx.lineWidth=2;ctx.stroke();if(showNames&&sz>4){ctx.fillStyle='#091318';ctx.font='bold 10px Segoe UI';ctx.fillText(city.name,px+7,py-6);ctx.fillStyle='#f5f0d4';ctx.fillText(city.name,px+6,py-7)}}}}function clientCell(e){let r=canvas.getBoundingClientRect(),{sz,ox,oy}=layout(),x=Math.floor((e.clientX-r.left-ox)/sz),y=Math.floor((e.clientY-r.top-oy)/sz);return {x,y}}function zoomTo(next){zoom=clamp(next,.7,4);$('zoomLabel').textContent=Math.round(zoom*100)+'%';draw()}function stop(){playing=false;clearInterval(timer);timer=null;$('play').textContent='▶ INICIAR'}function toggle(){if(playing){stop();return}playing=true;$('play').textContent='Ⅱ PAUSAR';timer=setInterval(yearStep,650/speed)}$('generate').addEventListener('click',()=>{if(confirm('Crear un mundo nuevo sustituirá el mundo actual en pantalla. Puedes exportarlo antes. ¿Continuar?'))generate()});$('step').addEventListener('click',yearStep);$('play').addEventListener('click',toggle);$('speed').addEventListener('click',()=>{speed=speed===1?2:speed===2?5:1;$('speed').textContent=speed+'×';if(playing){stop();toggle()}});document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>{tool=b.dataset.tool;document.querySelectorAll('.tool').forEach(t=>t.classList.toggle('selected',t===b))}));$('tabHistory').addEventListener('click',()=>{activeTab='history';$('timeline').classList.add('hidden');$('tabTimeline').classList.remove('active');$('history').classList.remove('hidden');$('nations').classList.add('hidden');$('tabHistory').classList.add('active');$('tabNations').classList.remove('active')});$('tabNations').addEventListener('click',()=>{activeTab='nations';$('timeline').classList.add('hidden');$('tabTimeline').classList.remove('active');$('nations').classList.remove('hidden');$('history').classList.add('hidden');$('tabNations').classList.add('active');$('tabHistory').classList.remove('active')});$('tabTimeline').addEventListener('click',()=>{activeTab='timeline';$('timeline').classList.remove('hidden');$('history').classList.add('hidden');$('nations').classList.add('hidden');$('tabTimeline').classList.add('active');$('tabHistory').classList.remove('active');$('tabNations').classList.remove('active');renderTimeline()});$('timelineNation').addEventListener('change',renderTimeline);$('zoomOut').addEventListener('click',()=>zoomTo(zoom/1.3));$('zoomIn').addEventListener('click',()=>zoomTo(zoom*1.3));$('resetView').addEventListener('click',()=>{pan={x:0,y:0};zoomTo(1)});canvas.addEventListener('wheel',e=>{e.preventDefault();zoomTo(zoom*(e.deltaY>0?.9:1.1))},{passive:false});canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y};drag=false;if(typeof canvas.setPointerCapture==='function'&&e.pointerId!==undefined){try{canvas.setPointerCapture(e.pointerId)}catch{ /* Pointer capture can be unavailable for synthetic or cancelled events. */ }}});canvas.addEventListener('pointermove',e=>{let p=clientCell(e);$('coordinates').textContent=`X ${p.x} / Y ${p.y}`;if(pointer){let dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>6)drag=true;if(drag){pan.x=pointer.panX+dx;pan.y=pointer.panY+dy;draw()}}});canvas.addEventListener('pointerup',e=>{if(pointer&&!drag){let {x,y}=clientCell(e);if(x>=0&&x<W&&y>=0&&y<H)selectCell(x,y)}pointer=null});canvas.addEventListener('pointercancel',()=>{pointer=null;drag=false});canvas.addEventListener('lostpointercapture',()=>{pointer=null;drag=false});$('save').addEventListener('click',()=>{try{localStorage.setItem(SAVE,JSON.stringify(state));$('status').textContent='Partida guardada en este navegador.'}catch{$('status').textContent='No se pudo guardar: almacenamiento lleno o bloqueado.'}});function valid(s){return s&&typeof s==='object'&&!Array.isArray(s)&&(s.schemaVersion===1||s.schemaVersion===2||s.schemaVersion===3||s.schemaVersion===4||s.schemaVersion===5||s.schemaVersion===6||s.schemaVersion===7||s.schemaVersion===8||s.schemaVersion===9||s.schemaVersion===10||s.schemaVersion===11||s.schemaVersion===12||s.schemaVersion===13||s.schemaVersion===14||s.schemaVersion===15||s.schemaVersion===16||s.schemaVersion===17||s.schemaVersion===18||s.schemaVersion===19)&&typeof s.name==='string'&&Number.isSafeInteger(s.year)&&s.year>=0&&Number.isFinite(s.seed)&&Array.isArray(s.tiles)&&s.tiles.length===W*H&&s.tiles.every(t=>Number.isInteger(t)&&t>=0&&t<=4)&&Array.isArray(s.civs)&&s.civs.length>=1&&s.civs.length<=20&&s.civs.every(c=>c&&typeof c==='object'&&Number.isSafeInteger(c.id)&&c.id>=0&&c.id<1000&&Array.isArray(c.cities)&&typeof c.name==='string'&&c.name.length<=60&&typeof c.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(c.color)&&Number.isFinite(c.population)&&c.population>=0&&c.population<1e12&&(c.belief===undefined||BELIEFS.includes(c.belief))&&(c.custom===undefined||CUSTOMS.includes(c.custom))&&(c.cohesion===undefined||(Number.isFinite(c.cohesion)&&c.cohesion>=0&&c.cohesion<=100))&&(c.lifeHistory===undefined||(c.lifeHistory&&typeof c.lifeHistory==='object'&&Number.isSafeInteger(c.lifeHistory.born)&&c.lifeHistory.born>=0&&c.lifeHistory.born<=s.year&&Number.isSafeInteger(c.lifeHistory.peakCities)&&c.lifeHistory.peakCities>=0&&c.lifeHistory.peakCities<=50&&Number.isSafeInteger(c.lifeHistory.peakPopulation)&&c.lifeHistory.peakPopulation>=0&&c.lifeHistory.peakPopulation<1e12&&Number.isSafeInteger(c.lifeHistory.peakYear)&&c.lifeHistory.peakYear>=0&&c.lifeHistory.peakYear<=s.year&&['origen','expansión','apogeo','decadencia','extinción'].includes(c.lifeHistory.phase)&&Number.isSafeInteger(c.lifeHistory.phaseSince)&&c.lifeHistory.phaseSince>=0&&c.lifeHistory.phaseSince<=s.year&&(c.lifeHistory.extinctYear===null||(Number.isSafeInteger(c.lifeHistory.extinctYear)&&c.lifeHistory.extinctYear>=0&&c.lifeHistory.extinctYear<=s.year))&&Array.isArray(c.lifeHistory.chronicle)&&c.lifeHistory.chronicle.length<=24&&c.lifeHistory.chronicle.every(e=>e&&Number.isSafeInteger(e.year)&&e.year>=0&&e.year<=s.year&&['origen','expansión','apogeo','decadencia','extinción'].includes(e.phase))))&&(c.strategyPlan===undefined||c.strategyPlan===null||(c.strategyPlan&&typeof c.strategyPlan==='object'&&STRATEGIC_ACTIONS.includes(c.strategyPlan.action)&&typeof c.strategyPlan.reason==='string'&&c.strategyPlan.reason.length<=120&&Number.isSafeInteger(c.strategyPlan.started)&&c.strategyPlan.started>=0&&c.strategyPlan.started<=s.year&&Number.isSafeInteger(c.strategyPlan.until)&&c.strategyPlan.until>=c.strategyPlan.started&&c.strategyPlan.until<=s.year+25))&&(c.spyNetwork===undefined||(Number.isSafeInteger(c.spyNetwork)&&c.spyNetwork>=0&&c.spyNetwork<=100))&&(c.subversion===undefined||(Number.isFinite(c.subversion)&&c.subversion>=0&&c.subversion<=100))&&(c.lastPlot===undefined||(Number.isSafeInteger(c.lastPlot)&&c.lastPlot>=0&&c.lastPlot<=s.year))&&(c.culture===undefined||(typeof c.culture==='string'&&c.culture.length<=70))&&(c.parentId===undefined||c.parentId===null||(Number.isSafeInteger(c.parentId)&&c.parentId>=0&&c.parentId<1000))&&(c.grievances===undefined||(Array.isArray(c.grievances)&&c.grievances.length<=12&&c.grievances.every(g=>g&&Number.isSafeInteger(g.rivalId)&&g.rivalId>=0&&g.rivalId<1000&&typeof g.city==='string'&&g.city.length<=100&&Number.isSafeInteger(g.year)&&g.year>=0&&g.year<=s.year)))&&(c.goal===undefined||(c.goal&&typeof c.goal==='object'&&['prosperar','consolidar','recuperar','defender'].includes(c.goal.type)))&&Array.isArray(c.cities)&&c.cities.length<=50&&c.cities.every(t=>typeof t.name==='string'&&t.name.length<=100&&Number.isInteger(t.x)&&t.x>=0&&t.x<W&&Number.isInteger(t.y)&&t.y>=0&&t.y<H))&&(s.treaties===undefined||(Array.isArray(s.treaties)&&s.treaties.length<=60&&s.treaties.every(t=>t&&Number.isSafeInteger(t.a)&&Number.isSafeInteger(t.b)&&t.a!==t.b&&['comercio','defensa','alianza','tregua'].includes(t.type)&&Number.isSafeInteger(t.until)&&t.until>s.year&&t.until<=s.year+100)))&&(s.tradeRoutes===undefined||(Array.isArray(s.tradeRoutes)&&s.tradeRoutes.length<=60&&s.tradeRoutes.every(t=>t&&Number.isSafeInteger(t.a)&&Number.isSafeInteger(t.b)&&t.a!==t.b&&Number.isSafeInteger(t.year)&&t.year<=s.year&&['active','blocked'].includes(t.status))))&&(s.wars===undefined||(Array.isArray(s.wars)&&s.wars.length<=24&&s.wars.every(w=>w&&Number.isInteger(w.a)&&Number.isInteger(w.b)&&Number.isFinite(w.started)&&typeof w.active==='boolean'))) &&(s.climateEffects===undefined||(Array.isArray(s.climateEffects)&&s.climateEffects.length<=32&&s.climateEffects.every(e=>e&&Number.isInteger(e.civId)&&['drought','blessing'].includes(e.type)&&Number.isSafeInteger(e.until)&&e.until>=s.year&&e.until<=s.year+40)))&&(s.snapshots===undefined||(Array.isArray(s.snapshots)&&s.snapshots.length<=150&&s.snapshots.every(v=>v&&Number.isSafeInteger(v.year)&&v.year>=0&&v.year<=s.year&&Number.isFinite(v.population)&&v.population>=0&&v.population<1e12&&Number.isSafeInteger(v.cities)&&v.cities>=0&&v.cities<=1000&&Array.isArray(v.civs)&&v.civs.length<=20&&v.civs.every(q=>q&&Number.isSafeInteger(q.id)&&Number.isFinite(q.population)&&q.population>=0&&q.population<1e12&&Number.isSafeInteger(q.cities)&&q.cities>=0&&q.cities<=50))))&&Array.isArray(s.events)&&s.events.length<=300&&s.civs.every(c=>c.cities.every(t=>t.buildings===undefined||(t.buildings&&typeof t.buildings==='object'&&Object.keys(BUILDINGS).every(k=>t.buildings[k]===undefined||(Number.isSafeInteger(t.buildings[k])&&t.buildings[k]>=0&&t.buildings[k]<=100)))))&&s.civs.every(c=>c.cities.every(city=>city.infrastructure===undefined||(city.infrastructure&&typeof city.infrastructure==='object'&&['road','port'].every(key=>city.infrastructure[key]===undefined||(Number.isSafeInteger(city.infrastructure[key])&&city.infrastructure[key]>=0&&city.infrastructure[key]<=(key==='road'?3:1))))))&&s.civs.every(c=>c.cities.every(city=>city.warDamage===undefined||(Number.isSafeInteger(city.warDamage)&&city.warDamage>=0&&city.warDamage<=100)))&&s.events.every(e=>e&&typeof e==='object'&&typeof e.title==='string'&&e.title.length<=100&&typeof e.description==='string'&&e.description.length<=500)}function restore(raw){if(typeof raw!=='string'||raw.length>2000000)throw Error('Archivo de partida demasiado grande');let s=JSON.parse(raw);if(!valid(s))throw Error('Formato de partida inválido');stop();state=s;state.schemaVersion=19;ensureSnapshots();ensureClimate();for(const c of state.civs){ensureMemory(c);ensureStrategicPlan(c);c.wood=Number.isFinite(c.wood)?clamp(c.wood,0,1000000):35;c.stone=Number.isFinite(c.stone)?clamp(c.stone,0,1000000):15;c.production=0;c.territory=0;c.cities.forEach(city=>{normalizeCity(city);ensureInfrastructure(city)});ensureLifeHistory(c);ensureUnrest(c);ensureCulture(c);ensureIdentity(c);ensureGovernment(c);distributePopulation(c)}state.nextId=Math.max(Number.isSafeInteger(state.nextId)?state.nextId:0,...state.civs.map(c=>c.id+1));recalculateTerritory();ensureDiplomacy();ensureWars();ensureTreaties();ensureTradeRoutes();$('worldName').value=s.name;$('seed').value=s.seed;$('civCount').value=String(s.civs.length);pan={x:0,y:0};zoomTo(1);refresh();$('status').textContent='Mundo recuperado correctamente.'}$('load').addEventListener('click',()=>{try{let raw=localStorage.getItem(SAVE);if(!raw)throw Error('Sin partida guardada');restore(raw)}catch(e){$('status').textContent='No se pudo recuperar: '+e.message}});$('export').addEventListener('click',()=>{try{if(!state)throw Error('No hay un mundo activo');let blob=new Blob([JSON.stringify(state)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`world-genesis-${state.seed}-${state.year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('status').textContent='Partida exportada como JSON.'}catch(e){$('status').textContent='No se pudo exportar la partida: '+e.message}});$('import').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',async e=>{let file=e.target.files[0];if(!file)return;try{if(file.size>2e6)throw Error('Archivo demasiado grande');restore(await file.text())}catch(err){$('status').textContent='Importación rechazada: '+err.message}e.target.value=''});$('layerBorders').addEventListener('change',e=>{showBorders=e.target.checked;draw()});$('layerNames').addEventListener('change',e=>{showNames=e.target.checked;draw()});$('layerRoutes').addEventListener('change',e=>{showRoutes=e.target.checked;draw()});$('theme').addEventListener('click',()=>{const light=document.body.classList.toggle('light');try{localStorage.setItem('wg404-theme',light?'light':'dark')}catch{}});try{document.body.classList.toggle('light',localStorage.getItem('wg404-theme')==='light')}catch{}document.addEventListener('keydown',e=>{const target=e.target;if(e.altKey||e.ctrlKey||e.metaKey||target?.matches?.('input,textarea,select,[contenteditable]'))return;if(e.code==='Space'){e.preventDefault();toggle()}else if(e.key==='+'||e.key==='='){e.preventDefault();zoomTo(zoom*1.3)}else if(e.key==='-'){e.preventDefault();zoomTo(zoom/1.3)}else if(e.key==='0'){e.preventDefault();pan={x:0,y:0};zoomTo(1)}});window.addEventListener('resize',resize);generate();resize();window.__WG404_READY__=true;
