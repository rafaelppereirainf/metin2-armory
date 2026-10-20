// Enrich the checked-in wiki snapshot with real icon URLs and exact table participants.
// Runs at publish time, never against a player's build or during damage calculation.
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('../sharing/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),db=JSON.parse(fs.readFileSync(path.join(__dirname,'cosmetic-library.json'),'utf8'));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+]/g,'');
const base='https://pt-wiki.metin2.gameforge.com';
const ignored=/\b(?:background|nativelook|nao|não|sim|icon estado|espolio|flag|logo|bandeira|wiki\.png)\b/i;
function title(a){let t=a.getAttribute('title');if(!t){try{t=decodeURIComponent(new URL(a.getAttribute('href'),base).pathname.split('/index.php/')[1]||'').replace(/_/g,' ');}catch{}}return t||'';}
function urls(node){
 if(!node)return [];
 const result=[];
 for(const el of [node,...node.querySelectorAll('img,[style]')]){
  for(const val of [el.getAttribute('src'),el.getAttribute('data-src'),...(el.getAttribute('style')||'').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(x=>Array.isArray(x)?x[1]:x)){
   if(!val)continue;let u;try{u=new URL(val,base);}catch{continue;}
   if(u.hostname!=='pt-wiki.metin2.gameforge.com'||!u.pathname.startsWith('/images/')||ignored.test(decodeURIComponent(u.pathname))||!/\.(png|webp|gif|jpe?g)$/i.test(u.pathname))continue;
   result.push(u.href);
  }
 }
 return [...new Set(result)];
}
function linkIcon(a){return urls(a)[0]||urls(a.closest('.item-icon,.item-image,figure,td,li'))[0]||'';}
async function getPage(name){
 const cached=process.argv.find(a=>a.startsWith('--sources='))?.slice(10);if(cached)return new JSDOM(fs.readFileSync(path.join(cached,norm(name)+'.html'),'utf8'),{url:base}).window.document;
 const url=base+'/index.php/'+encodeURIComponent(name.replace(/ /g,'_'));
 const res=await fetch(url,{headers:{'User-Agent':'Metin2Armory/1.0 (non-commercial fan catalogue; https://github.com/rafaelppereirainf/metin2-armory)'},signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error(name+': HTTP '+res.status);
 return new JSDOM(await res.text(),{url}).window.document;
}
function enrichIcons(doc,entries){
 const anchors=[...doc.querySelectorAll('a[href]')];
 for(const e of entries){
  const name=e.label||e.name,k=norm(name),withoutGender=norm(name.replace(/\s*\([MF]\)\s*$/i,''));
  const matches=anchors.filter(a=>norm(title(a))===k||norm(a.textContent)===k);
  let found=matches.map(linkIcon).find(Boolean);
  if(!found){const candidates=anchors.filter(a=>norm(title(a))===withoutGender);found=candidates.map(linkIcon).find(Boolean);}
  if(found)e.image=found;
  const page=matches.find(a=>title(a)&&!title(a).startsWith('Ficheiro:'));
  if(page)e.source=new URL(page.getAttribute('href'),base).href;
 }
}
function enrichSets(doc){
 // Modern wiki layouts use flex cards rather than HTML tables.
 const cards=[...doc.querySelectorAll('.mw-parser-output .fondfenetre')].filter(el=>el.textContent.trim()==='Lista de Itens').map(el=>el.parentElement);
 let count=0;
 for(const card of cards){
  const range=doc.createRange();range.setStart(doc.body,0);range.setEndBefore(card);
  const before=range.toString().replace(/\s+/g,' '),matches=[...before.matchAll(/O próximo conjunto.*?Evento\s+(?:d[aeo]\s+)?([^()]+?)\s*\((\d{4})\)/gi)],m=matches.at(-1);
  const family=m&&db.sets[norm(m[1])+m[2]];if(!family)continue;
  const columns=[...card.children[1].children],members={costume:[],hair:[],skin:[],pet:[],mount:[]};
  for(const col of columns){
   const heading=col.children[0]?.textContent.trim(),slot=({'Disfarces':'costume','Penteados':'hair','Skins de Arma':'skin','Pets':'pet','Montadas':'mount'})[heading];if(!slot)continue;
   const content=col.children[1];if(!content)continue;
   members[slot]=[...new Set([...content.querySelectorAll('a[title]')].map(title).filter(n=>n&&!/^(?:Ficheiro|File|Image|Categoria):/i.test(n)))];
   enrichIcons(content,slot==='pet'?db.pets:Object.values(db.items).filter(e=>e.slot===slot));
  }
  if(!members.costume.length||!members.hair.length)throw Error('Incomplete participant card: '+family.name);
  family.members=members;count++;
 }
 console.log('Verified '+count+' set participant cards.');
}
async function main(){
 if(!process.argv.includes('--offline')){
  for(const [name,slot] of [['Disfarces','costume'],['Penteados','hair'],['Skins de Arma','skin'],['Pets (Crias)','pet']]){
   try{const doc=await getPage(name);enrichIcons(doc,slot==='pet'?db.pets:Object.values(db.items).filter(e=>e.slot===slot));console.log('Read '+name);}catch(e){console.warn('Catalogue source unavailable: '+e.message);}
  }
  for(const name of ['Doce Mágico','Anel da Alegria','Amuleto de Nazar','Medalha do Herói']){
   try{enrichSets(await getPage(name));console.log('Read set tables: '+name);}catch(e){console.warn('Set source unavailable: '+e.message);}
  }
  // A category page can omit an icon; resolve only missing entries from their individual page.
  // Prioritize the currently supported Halloween collection and Helena/Lilith.
  const priority=[...Object.values(db.items).filter(e=>e.collections.includes('Halloween 2024')),...db.pets.filter(e=>['Helena','Lilith'].includes(e.name))];
  for(const e of priority.filter(e=>!e.image)){
   try{const name=e.label||e.name,doc=await getPage(name.replace(/\s*\([MF]\)$/i,''));const content=doc.querySelector('.mw-parser-output');const candidates=urls(content);e.image=candidates.find(u=>norm(decodeURIComponent(u.split('/').pop()).replace(/\.png$/i,''))===norm(name))||candidates[0]||'';}catch(error){console.warn('Icon source unavailable: '+(e.label||e.name));}
  }
 }
 const runtime=fs.readFileSync(path.join(__dirname,'cosmetic-runtime.js'),'utf8');
 fs.writeFileSync(path.join(root,'dist/cosmetic-catalog.js'),'// Official wiki catalogue snapshot; enriched during publication.\nwindow.COSMETIC_LIBRARY='+JSON.stringify(db.items)+';\nwindow.COSTUME_SETS='+JSON.stringify(db.sets)+';\nwindow.COMPANION_LIBRARY='+JSON.stringify(db.pets)+';\n'+runtime);
 const entries=[...Object.values(db.items),...db.pets];
 console.log('Cosmetic library: '+Object.keys(db.items).length+' costumes/skins, '+db.pets.length+' pets, '+Object.keys(db.sets).length+' set rules; '+entries.filter(e=>e.image).length+'/'+entries.length+' wiki icons.');
 // Export the enriched snapshot for repeatable review and future updates.
 fs.mkdirSync(path.join(root,'catalogue-build'),{recursive:true});
 fs.writeFileSync(path.join(root,'catalogue-build/cosmetic-library.json'),JSON.stringify(db,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
