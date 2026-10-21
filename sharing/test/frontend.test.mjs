import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {runInContext} from 'node:vm';
import {JSDOM} from 'jsdom';
const dist = new URL('../../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const scripts = ['catalog.js', 'asset-index.js', 'bonus-catalog.js', 'pet-catalog.js', 'alchemy-catalog.js', 'refinement-catalog.js', 'mount-catalog.js', 'equipment.js', 'effects-catalog.js', 'cosmetic-catalog.js', 'effects.js', 'status.js', 'target-catalog.js', 'combat.js', 'sharing.js', 'inventory-sizes.js', 'inventory.js', 'item-ocr.js', 'app.js'];
const tick = () => new Promise(resolve => setImmediate(resolve));
async function page({query = '', stored, fetch, configured = true} = {}) {
  const dom = new JSDOM(html, {url: 'https://rafaelppereirainf.github.io/metin2-armory/' + query, runScripts: 'outside-only'});
  const w = dom.window;
  Object.assign(w, {TextEncoder, TextDecoder, structuredClone, AbortSignal, fetch, confirm: () => true, alert: () => {}});
  Object.defineProperty(w, 'crypto', {value: webcrypto});
  Object.defineProperty(w.navigator, 'clipboard', {value: {writeText: async text => {w.copied = text;}}});
  w.HTMLDialogElement.prototype.showModal = function() {this.open = true;};
  w.HTMLDialogElement.prototype.close = function() {this.open = false; this.dispatchEvent(new w.Event('close'));};
  w.ARMORY_SHARE_CONFIG = configured ? {apiUrl: 'https://api.example.com', turnstileSiteKey: 'test'} : {};
  w.turnstile = {render(_element, options) {queueMicrotask(() => options.callback('valid')); return 0;}, remove() {}, reset() {}};
  if (stored) w.localStorage.setItem('metin-armory-v1', stored);
  for (const file of scripts) runInContext(readFileSync(new URL(file, dist), 'utf8'), dom.getInternalVMContext());
  await tick(); return {dom, w};
}
test('shared snapshot renders read-only; missing link and legacy link preserve local profile', async () => {
  const initial = await page(); const source = initial.w.eval('JSON.stringify(data)'); initial.dom.window.close();
  const snapshot = JSON.parse(source); snapshot.characters[0].name = 'Partilhado Árvore';
  const shared = await page({query: '?build=abcdefghijklmnop', stored: source, fetch: async () => Response.json({snapshot})});
  assert.equal(shared.w.document.querySelector('#name').textContent, 'Partilhado Árvore');
  assert.equal(shared.w.document.body.classList.contains('readonly'), true);
  assert.equal(shared.w.document.querySelector('#share'), null);
  assert.equal(shared.w.localStorage.getItem('metin-armory-v1'), source); shared.dom.window.close();
  const missing = await page({query: '?build=abcdefghijklmnop', stored: source, fetch: async () => Response.json({error: 'Esta partilha não existe ou foi removida.'}, {status: 404})});
  assert.match(missing.w.document.querySelector('main>section').textContent, /não existe ou foi removida/);
  assert.equal(missing.w.localStorage.getItem('metin-armory-v1'), source); missing.dom.window.close();
  const legacy = await page({query: '#view=' + Buffer.from(JSON.stringify(snapshot)).toString('base64'), stored: source});
  assert.equal(legacy.w.document.querySelector('#name').textContent, 'Partilhado Árvore');
  assert.equal(legacy.w.localStorage.getItem('metin-armory-v1'), source); legacy.dom.window.close();
});
test('sharing includes only current character; management key stays out of public link and normal export', async () => {
  let body; const id = 'abcdefghijklmnop', ownerToken = 'a'.repeat(43);
  const {w, dom} = await page({fetch: async (_url, options) => {if(_url.endsWith('/health')) return Response.json({permanentLinks: true});body = JSON.parse(options.body); return Response.json({id, ownerToken}, {status: 201});}});
  w.eval("data.characters.push(makeChar('Outra personagem'));data.items.push({id:'unused',slot:'weapon',name:'Outro item'});");
  await w.eval('share()'); await tick();
  const button = w.document.querySelector('#shareDialog .primary'); assert.equal(button.disabled, false); button.click(); await tick();
  assert.equal(body.snapshot.characters.length, 1); assert.equal(body.snapshot.items.some(i => i.id === 'unused'), false);
  assert.equal(w.copied, 'https://rafaelppereirainf.github.io/metin2-armory/?build=' + id);
  assert.equal(w.copied.includes(ownerToken), false);
  assert.equal(w.eval('JSON.stringify(data)').includes(ownerToken), false);
  assert.equal(JSON.parse(w.localStorage.getItem('metin-armory-shares-v1'))[0].ownerToken, ownerToken);
  dom.window.close();
});
test('viewer can simulate pet, alchemy and skills without persisting changes', async () => {
  const initial = await page();
  initial.w.eval(`const c=char();c.class='Sura';c.doctrine='Armas';c.level=120;c.statusProfile={attributes:{str:16,vit:90,int:90,dex:90},hpGrowth:5144,growthLevel:120};c.pet.hp=10;c.progress.skills={'Lâmina Encantada':'P','Receio':'P','Armadura Negra':'P'};c.sets[0].statusMode='auto';c.sets[0].statusEffects={petActive:false,alchemyActive:false,skillActive:{}};normalizeData(data);`);
  const source = initial.w.eval('JSON.stringify(data)'); initial.dom.window.close();
  const snapshot = JSON.parse(source);
  for (const query of ['?build=abcdefghijklmnop', '#view=' + Buffer.from(source).toString('base64')]) {
    const {w, dom} = await page({query, stored: source, fetch: async () => Response.json({snapshot})});
    const hpBefore = w.eval('calculateStatus().stats.hp');
    const toggle = selector => { const box = w.document.querySelector(selector); assert.ok(box); assert.equal(box.disabled, false); box.checked = !box.checked; box.dispatchEvent(new w.Event('change', {bubbles: true})); };
    toggle('[data-status-effect="petActive"]');
    assert.ok(w.eval('calculateStatus().stats.hp') > hpBefore);
    toggle('[data-status-effect="petActive"]'); assert.equal(w.eval('calculateStatus().stats.hp'), hpBefore);
    toggle('[data-status-effect="alchemyActive"]'); assert.equal(w.eval('set().statusEffects.alchemyActive'), true);
    toggle('[data-status-effect="alchemyActive"]'); assert.equal(w.eval('set().statusEffects.alchemyActive'), false);
    for (const name of ['Lâmina Encantada', 'Receio', 'Armadura Negra']) {
      toggle('[data-skill-active="' + name + '"]');
      assert.ok(w.eval('calculateStatus().records').some(r => r.source.startsWith(name)));
      toggle('[data-skill-active="' + name + '"]');
      assert.equal(w.eval('set().statusEffects.skillActive')[name], false);
    }
    assert.equal(w.localStorage.getItem('metin-armory-v1'), source);
    assert.equal(w.document.body.classList.contains('readonly'), true);
    assert.match(w.document.querySelector('.status-effects small').textContent, /Simulação nesta vista/);
    w.eval('editStatus()'); assert.ok([...w.document.querySelectorAll('#fields input, #fields select')].every(x => x.disabled));
    dom.window.close();
  }
});

test('permanent share reuses its URL and owner key and updates only the matching character', async () => {
  const id = 'abcdefghijklmnop', ownerToken = 'a'.repeat(43); let saved, calls = [];
  const {w, dom} = await page({fetch: async (url, options) => {
    if(url.endsWith('/health')) return Response.json({permanentLinks: true});
    calls.push({url, options});
    if (!options.method) return Response.json({snapshot: saved});
    const body = JSON.parse(options.body);
    saved = {...body.snapshot, shareMode: 'permanent', shareRevision: options.method === 'PUT' ? 2 : 1};
    return Response.json(options.method === 'PUT' ? {id, revision: 2} : {id, ownerToken, revision: 1}, {status: options.method === 'PUT' ? 200 : 201});
  }});
  await w.eval('share()'); await tick(); w.document.querySelector('#shareDialog .primary').click(); await tick();
  const url = w.copied; w.document.querySelector('#shareDialog .paneltitle button').click();
  w.eval("char().sets[0].stats.hp=15000;data.characters.push(makeChar('Outra'));ci=1;");
  w.ArmorySharing.manage();
  const update = [...w.document.querySelectorAll('.share-record button')].find(b => b.textContent === 'Atualizar partilha');
  assert.ok(update); update.click(); await tick();
  assert.equal(w.document.querySelector('#shareDialog .primary').textContent, 'Atualizar partilha');
  w.document.querySelector('#shareDialog .primary').click(); await tick(); await tick();
  const put = calls.find(c => c.options.method === 'PUT'); assert.ok(put);
  assert.equal(put.options.headers.Authorization, 'Bearer ' + ownerToken);
  assert.equal(saved.characters[0].sets[0].stats.hp, 15000);
  assert.equal(w.copied, url); assert.equal(w.eval('ci'), 1);
  const records = JSON.parse(w.localStorage.getItem('metin-armory-shares-v1'));
  assert.equal(records.length, 1); assert.equal(records[0].revision, 2);
  assert.equal(w.eval('JSON.stringify(data)').includes(ownerToken), false);
  dom.window.close();
});

test('old Worker cannot create a falsely advertised permanent link', async () => {
  let calls = 0;
  const {w, dom} = await page({fetch: async url => {calls++; assert.ok(url.endsWith('/health')); return Response.json({ok: true});}});
  await w.eval('share()'); await tick();
  assert.match(w.document.querySelector('#shareDialog [role="status"]').textContent, /falta atualizar o serviço/);
  assert.equal(w.document.querySelector('#shareDialog .primary'), null);
  assert.equal(calls, 1); assert.equal(w.localStorage.getItem('metin-armory-shares-v1'), null);
  dom.window.close();
});
test('touch opens equipment details before editing, including read-only viewers', async () => {
  const initial = await page();
  const source = initial.w.eval('JSON.stringify(data)'); initial.dom.window.close();
  for (const viewer of [false, true]) {
    const {w, dom} = await page({stored: source, query: viewer ? '?build=abcdefghijklmnop' : '', fetch: async () => Response.json({snapshot: JSON.parse(source)})});
    w.matchMedia = () => ({matches: true});
    const slot = w.document.querySelector('.slot.filled'); assert.ok(slot);
    slot.click();
    const tooltip = w.document.querySelector('#itemTooltip');
    assert.equal(tooltip.hidden, false); assert.equal(tooltip.classList.contains('touch-tooltip'), true);
    assert.equal(w.document.querySelector('#modal').open, false);
    const edit = tooltip.querySelector('[data-tooltip-edit]');
    assert.equal(!!edit, !viewer);
    tooltip.querySelector('h3').click(); assert.equal(tooltip.hidden, false);
    tooltip.dispatchEvent(new w.Event('scroll')); assert.equal(tooltip.hidden, false);
    if (edit) {edit.click(); assert.equal(w.document.querySelector('#modal').open, true); w.document.querySelector('#modal').close();}
    else {tooltip.querySelector('[data-tooltip-close]').click(); assert.equal(tooltip.hidden, true);}
    slot.click(); assert.equal(tooltip.hidden, false);
    w.document.querySelector('#subtitle').click(); assert.equal(tooltip.hidden, true);
    slot.click(); w.document.dispatchEvent(new w.KeyboardEvent('keydown', {key: 'Escape'})); assert.equal(tooltip.hidden, true);
    dom.window.close();
  }
});
test('set consumables affect status, respect level/value limits and keep special items compatible', async () => {
  const {w, dom} = await page();
  w.eval("char().level=120;char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},hpGrowth:5144,growthLevel:120};set().statusEffects={petActive:false,alchemyActive:false};set().statusMode='auto';render();");
  const baseline=w.eval('calculateStatus().stats');
  const change=(selector,value)=>{const el=w.document.querySelector(selector);assert.ok(el);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  change('[data-consumable="critical"]',true);assert.equal(w.eval('calculateStatus().stats.crit'),baseline.crit+20);
  change('[data-consumable="critical"]',false);assert.equal(w.eval('calculateStatus().stats.crit'),baseline.crit);
  change('[data-consumable="dewBlue"]',true);assert.equal(w.eval('calculateStatus().stats.attack'),baseline.attack+120);
  change('[data-consumable-value="dewBlue"]',80);assert.equal(w.eval('calculateStatus().stats.attack'),baseline.attack+80);
  change('[data-consumable-value="dewBlue"]',999);assert.equal(w.eval('calculateStatus().stats.attack'),baseline.attack+80);
  change('[data-special-index="0"]','nazar');assert.equal(w.eval('calculateStatus().totals.meleeMagic'),30);
  assert.equal(w.document.querySelector('[data-special-index="1"] option[value="hero"]').disabled,true);
  change('[data-special-index="1"]','hero');assert.equal(w.eval('set().statusEffects.specials[1]'),undefined);
  change('[data-special-index="1"]','elementPower');assert.ok(w.eval('calculateStatus().totals.powerFire')>=10);
  change('[data-special-index="0"]','');assert.equal(w.document.querySelector('[data-special-index="1"]').value,'elementPower');
  change('[data-consumable="ddLife"]',true);const hp=w.eval('calculateStatus().hpParts');assert.equal(hp.percent,Math.min(3500,Math.floor(hp.natural*.2)));
  w.eval("set().statusEffects.consumables.dewBlue={active:true,value:120};char().level=20;");assert.equal(w.eval('calculateStatus().totals.attack'),w.eval("(()=>{set().statusEffects.consumables.dewBlue.active=false;return calculateStatus().totals.attack;})()"));
  dom.window.close();
});
test('viewer effects and combat target are temporary and included in shared source without private keys', async () => {
  const initial=await page();initial.w.eval("char().level=120;char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},hpGrowth:5144,growthLevel:120};");
  const source=initial.w.eval('JSON.stringify(data)');initial.dom.window.close();
  const {w,dom}=await page({query:'?build=abcdefghijklmnop',stored:source,fetch:async()=>Response.json({snapshot:JSON.parse(source)})});
  const box=w.document.querySelector('[data-consumable="piercing"]');assert.equal(box.disabled,false);box.checked=true;box.dispatchEvent(new w.Event('change',{bubbles:true}));
  const input=w.document.querySelector('[data-combat-field="defense"]');input.value='800';input.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(w.eval('set().statusEffects.consumables.piercing.active'),true);assert.equal(w.eval('set().combatTarget.defense'),'800');
  assert.equal(w.localStorage.getItem('metin-armory-v1'),source);dom.window.close();
});
test('physical PvM follows documented critical/piercing examples and never guesses missing target stats', async () => {
 const {w,dom}=await page();
 const input={issues:[],notes:[],zero:[0,0],sashRange:[0,0],upgrade:0,stat:0,attack:0,attackMax:0,level:2250,dex:0,totals:{...w.eval('statusAccumulator()'),meleeMagic:10,average:40}};
 const target={dex:0,defense:880,weaponResist:35,averageResist:0,critResist:0,pierceResist:0,elementResist:0};
 w.modelInput=input;w.modelTarget=target;
 // Base 4500, +10% => 4950, -880, -35% weapon resist, +880 pierce, +40% average => 4935 (wiki FR).
 let result=w.eval('physicalPvmModel(modelInput,modelTarget)');assert.equal(result.outcomes[2].min,4935);
 // Same example with no weapon resistance: critical doubles after defense, before average.
 w.modelTarget.weaponResist=0;w.modelTarget.defense=800;
 result=w.eval('physicalPvmModel(modelInput,modelTarget)');assert.equal(result.outcomes[1].min,11620);
 assert.ok(w.eval("physicalPvmModel(modelInput,{...modelTarget,defense:''}).error"));
 assert.ok(w.eval("physicalPvmModel(modelInput,{...modelTarget,yohara:true}).error"));
 // Overflow piercing adds intermediate*(PH-100)/200 at position 15, before average.
 w.modelInput.totals.pierce=120;w.modelTarget.weaponResist=35;
 result=w.eval('physicalPvmModel(modelInput,modelTarget)');assert.equal(result.outcomes[2].min,5588);
 // Uniform two ranges: triangular sum distribution, not an equally likely combined range.
 w.modelInput={...input,level:0,dex:0,zero:[0,1],sashRange:[0,1],attack:100,attackMax:100,totals:{...input.totals,meleeMagic:0,average:0,pierce:0,crit:0}};w.modelTarget={...target,defense:0,weaponResist:0};
 result=w.eval('physicalPvmModel(modelInput,modelTarget)');const f=result.factor;assert.equal(result.expected,(Math.floor(f*100)+2*Math.floor(f*102)+Math.floor(f*104))/4);
 dom.window.close();
});
test('all four Dragon God powers are selectable; defense and mana do not raise outgoing damage or INT', async () => {
 const {w,dom}=await page();
 w.eval("char().level=120;char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},hpGrowth:5144,growthLevel:120};set().statusEffects={};render();");
 const before=w.eval('calculateStatus()');
 for(const id of ['ddAttack','ddLife','ddDefense','ddIntelligence'])assert.ok(w.document.querySelector('[data-consumable="'+id+'"]'));
 for(const id of ['ddDefense','ddIntelligence']){const box=w.document.querySelector('[data-consumable="'+id+'"]');box.checked=true;box.dispatchEvent(new w.Event('change',{bubbles:true}));}
 const after=w.eval('calculateStatus()');assert.equal(after.totals.defensePct,before.totals.defensePct+20);assert.equal(after.totals.manaPct,20);
 assert.equal(after.attributes.int,before.attributes.int);assert.equal(after.stats.attack,before.stats.attack);assert.equal(after.stats.defense,before.stats.defense);
 dom.window.close();
});
test('target presets apply real weapon/element resistances and final Zodiac stats; mounts stay separate from gear', async () => {
 const {w,dom}=await page();
 w.eval("char().class='Sura';char().doctrine='Armas';char().level=120;char().progress.horse='21';char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},hpGrowth:5144,growthLevel:120};set().statusEffects={};data.items.push({id:'test-mount',slot:'mount',name:'Javali de Guerra',mountId:'special-2',mounted:true});set().items.mount='test-mount';set().combatMount='foot';normalizeData(data);render();");
 const itemsBefore=w.eval('JSON.stringify(data.items)'),mountId=w.eval('set().items.mount'),base=w.eval('combatInputs(char(),set())');
 const change=(selector,value)=>{const el=w.document.querySelector(selector);assert.ok(el);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 change('[data-combat-preset]','6091');assert.equal(w.eval('resolvedCombatTarget(char(),set()).defense'),497);assert.equal(w.eval('resolvedCombatTarget(char(),set()).elementResist'),-30);
 change('[data-combat-field="weaponKind"]','twoHand');assert.equal(w.eval('resolvedCombatTarget(char(),set()).weaponResist'),35);
 change('[data-combat-field="element"]','ice');assert.equal(w.eval('resolvedCombatTarget(char(),set()).elementResist'),0);
 change('[data-combat-field="weaponResist"]',12);assert.equal(w.eval('Number(resolvedCombatTarget(char(),set()).weaponResist)'),12);
 change('[data-combat-field="weaponKind"]','sword');assert.equal(w.eval('resolvedCombatTarget(char(),set()).weaponResist'),40);
 change('[data-combat-mount]','special-33');const manny=w.eval('combatInputs(char(),set())');assert.equal(manny.totals.monster,base.totals.monster+15);assert.equal(manny.mounted,true);
 assert.equal(manny.stat,106);assert.equal(manny.horseAttack,121);assert.ok(manny.horseAttack>0);
 change('[data-combat-mount]','special-2');assert.equal(w.eval('combatInputs(char(),set()).totals.monster'),base.totals.monster+20);
 change('[data-combat-horse]','40');assert.equal(w.eval('combatInputs(char(),set()).horseAttack'),249);
 assert.equal(w.eval('JSON.stringify(data.items)'),itemsBefore);assert.equal(w.eval('set().items.mount'),mountId);assert.equal(w.eval('char().progress.horse'),'21');
 change('[data-combat-preset]','2792');assert.equal(w.eval('resolvedCombatTarget(char(),set()).defense'),5336);assert.equal(w.eval('resolvedCombatTarget(char(),set()).race'),'zodiac');
 change('[data-combat-preset]','6118');assert.equal(w.eval('resolvedCombatTarget(char(),set()).type'),'metin');assert.equal(w.eval('resolvedCombatTarget(char(),set()).defense'),516);
 assert.match(w.eval('physicalPvmModel(combatInputs(char(),set()),resolvedCombatTarget(char(),set())).error'),/Montadas não são permitidas/);
 change('[data-combat-preset]','3960');assert.equal(w.eval('resolvedCombatTarget(char(),set()).weaponResist'),50);assert.equal(w.eval('resolvedCombatTarget(char(),set()).elementResist'),-10);
 change('[data-combat-mount]','foot');assert.equal(w.eval('combatInputs(char(),set()).horseAttack'),0);
 dom.window.close();
});
test('mounted model includes horse attack while viewer presets and mount choices remain temporary', async () => {
 const initial=await page();initial.w.eval("char().level=120;char().progress.horse='21';char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},hpGrowth:5144,growthLevel:120};");const source=initial.w.eval('JSON.stringify(data)');initial.dom.window.close();
 const {w,dom}=await page({query:'?build=abcdefghijklmnop',stored:source,fetch:async()=>Response.json({snapshot:JSON.parse(source)})});
 for(const [selector,value] of [['[data-combat-preset]','2792'],['[data-combat-mount]','special-33'],['[data-combat-horse]','30']]){const e=w.document.querySelector(selector);e.value=value;e.dispatchEvent(new w.Event('change',{bubbles:true}));}
 assert.equal(w.eval('set().combatMount'),'special-33');assert.equal(w.localStorage.getItem('metin-armory-v1'),source);
 w.testMounted={issues:[],notes:[],zero:[0,0],sashRange:[0,0],stat:135,upgrade:0,attack:0,attackMax:0,level:70,dex:70,horseAttack:192,mounted:true,totals:w.eval('statusAccumulator()')};
 w.testTarget={dex:15,defense:0,weaponResist:0,averageResist:0,critResist:0,pierceResist:0,elementResist:0};
 const mounted=w.eval('physicalPvmModel(testMounted,testTarget)'),foot=w.eval('physicalPvmModel({...testMounted,horseAttack:0,mounted:false},testTarget)');
 assert.ok(mounted.expected>foot.expected);assert.equal(mounted.outcomes[0].min,Math.floor(140+mounted.factor*(135+192)));
 w.testMounted.totals.bossDamage=10;const boss=w.eval("physicalPvmModel(testMounted,{...testTarget,type:'boss'})");assert.equal(boss.outcomes[0].min,Math.floor(mounted.outcomes[0].min*1.1));
 w.eval("set().combatTarget={preset:'untrusted',source:'javascript:alert(1)'}");assert.equal(w.eval('resolvedCombatTarget(char(),set()).source'),undefined);
 dom.window.close();
});
test('character and combat tabs partition content and retain the active tab after simulation',async()=>{
 const {w,dom}=await page();const d=w.document;
 assert.ok(d.querySelector('#characterView #stats'));assert.ok(d.querySelector('#characterView #pet'));assert.ok(d.querySelector('#combatView #setEffects'));assert.ok(d.querySelector('#combatView #combat'));assert.equal(d.querySelector('#combatView').hidden,true);
 d.querySelector('#tabCombat').click();assert.equal(d.querySelector('#characterView').hidden,true);assert.equal(d.querySelector('#combatView').hidden,false);
 const pet=d.querySelector('#combatView [data-status-effect="petActive"]');pet.checked=true;pet.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.eval('set().statusEffects.petActive'),true);assert.equal(d.querySelector('#combatView').hidden,false);assert.equal(d.querySelector('#characterView [data-status-effect="petActive"]').checked,true);
 assert.ok(d.querySelector('[data-consumable]').getAttribute('aria-label'));assert.ok(d.querySelector('.consumable-info summary'));
 d.querySelector('[data-special-choice="joy"][data-special-slot="0"]').click();assert.equal(w.eval('set().statusEffects.specials[0]'),'joy');assert.equal(d.querySelector('#combatView').hidden,false);assert.ok(d.querySelector('[data-special-choice="joy"][data-special-slot="1"]').disabled);
 d.querySelector('#tabCombat').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(d.querySelector('#characterView').hidden,false);dom.window.close();
});

test('item screenshot review keeps the image out of saved data and adds only after editor confirmation',async()=>{
 const {w,dom}=await page();
 const d=w.document,before=w.eval('data.items.length');d.querySelector('#addInventoryItem').click();
 assert.equal(d.querySelector('#form').dataset.itemOcr,'true');assert.ok(d.querySelector('#itemOcrDrop'));assert.equal(d.querySelector('#itemOcrRun').disabled,true);
 d.querySelector('[name="inventorySlot"]').value='necklace';
 d.querySelector('[name="ocrText"]').value=['Colar de Prata +9','Nível Mínimo: 15','Rapidez de Feitiço: +20%','Resistência ao Vento: +10%','Regeneração de MN: +20%','Max. VD: +1500','Defesa contra Punhais: 15%','Linha ilegível 39','Pode adicionar um bónus adicional.'].join('\n');
 d.querySelector('[name="inventoryName"]').value='Colar de Prata';d.querySelector('[name="inventoryUpgrade"]').value='+9';
 d.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(d.querySelector('#form').dataset.itemOcr,'false');assert.equal(w.eval('data.items.length'),before);assert.equal(d.querySelector('#form').dataset.itemOcrReview,'true');
 assert.equal(d.querySelector('[name="catalogId"]').value,Object.keys(w.ITEM_CATALOG).find(k=>w.ITEM_CATALOG[k].label==='Colar de Prata'));
 assert.equal(d.querySelector('[name="upgrade"]').value,'+9');assert.match(d.querySelector('[name="normal0_type"]').value,/Regeneração de MN/);
 assert.equal(w.eval('data.items.length'),before);assert.match(d.querySelector('[name="notes"]').value,/Linha ilegível/);
 d.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(w.eval('data.items.length'),before+1);assert.ok(w.eval('ownsInventoryItem(data.items.at(-1).id)'));assert.notEqual(w.eval('set().items.necklace'),w.eval('data.items.at(-1).id'));
 assert.equal(JSON.stringify(w.eval('data')).includes('data:image/'),false);dom.window.close();
});

test('screenshot parser maps catalogue names, upgrades and valid bonuses while preserving uncertain lines',async()=>{
 const {w,dom}=await page();const parsed=w.eval(`parseItemScreenshot(${JSON.stringify(['Colar de Prata +9','Rapidez de Feitiço: +20%','Resistência ao Vento: +10%','Regeneração de MN: +20%','Max. VD: +1500','Linha ilegível 39'].join('\n'))},'necklace')`);
 assert.equal(parsed.slot,'necklace');assert.equal(parsed.name,'Colar de Prata');assert.equal(parsed.upgrade,'+9');assert.equal(parsed.catalogId,Object.keys(w.ITEM_CATALOG).find(k=>w.ITEM_CATALOG[k].label==='Colar de Prata'));
 assert.doesNotMatch(parsed.bonuses,/Rapidez de Feitiço|Resistência ao Vento/);assert.match(parsed.bonuses,/Regeneração de MN/);assert.match(parsed.notes,/Linha ilegível 39/);dom.window.close();
});

test('paste starts local OCR, chooses the detected slot, and discards the screenshot on cancel',async()=>{
 const {w,dom}=await page();const d=w.document;d.querySelector('#addInventoryItem').click();const input=d.querySelector('#itemOcrFile');let fileDialogOpens=0;input.click=()=>{fileDialogOpens++;};d.querySelector('#itemOcrDrop').click();assert.equal(fileDialogOpens,1);
 w.URL.createObjectURL=()=> 'blob:temporary-item';w.URL.revokeObjectURL=()=>{};const file=new w.File(['image'], 'item.png',{type:'image/png'});const paste=new w.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(paste,'clipboardData',{value:{items:[{type:'image/png',getAsFile:()=>file}]}});d.dispatchEvent(paste);
 assert.equal(d.querySelector('#itemOcrPreviewWrap').hidden,false);assert.equal(d.querySelector('#itemOcrRun').disabled,false);assert.equal(w.eval('itemOcrImage.size'),5);
 w.eval(`prepareOcrImage=async()=>({});Tesseract={createWorker:async(langs)=>{window.ocrLanguage=langs;return {recognize:async()=>({data:{text:'Colar de Prata +9\\nRegeneração de MN: +20%'}}),terminate:async()=>{window.ocrTerminated=true;}};}}`);
 d.querySelector('#itemOcrRun').click();await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(w.ocrLanguage,'por+eng');assert.equal(w.ocrTerminated,true);assert.equal(d.querySelector('[name="inventorySlot"]').value,'necklace');assert.match(d.querySelector('[name="ocrText"]').value,/Regeneração de MN/);
 d.querySelector('#close').click();assert.equal(w.eval('itemOcrImage'),null);assert.equal(d.querySelector('#form').querySelector('[type="submit"]').textContent,'Guardar');dom.window.close();
});
test('six elemental contributions add at the same stage instead of compounding',async()=>{
 const {w,dom}=await page();w.input={issues:[],zero:[100,100],sashRange:[0,0],stat:100,upgrade:0,attack:0,attackMax:0,level:120,dex:90,totals:w.eval('statusAccumulator()')};w.target={dex:0,defense:0,weaponResist:0,averageResist:0,critResist:0,pierceResist:0,element:'fire',elementResist:-30,elementResists:{fire:-30},elementPowers:{fire:10}};
 const base=w.eval('physicalPvmModel(input,target)');w.input.totals.powerFire=10;w.input.totals.powerIce=100;const boosted=w.eval('physicalPvmModel(input,target)');assert.equal(boosted.outcomes[0].min,base.outcomes[0].min+Math.floor(base.outcomes[0].min*.2)+Math.floor(base.outcomes[0].min*.05));assert.equal(boosted.elemental.filter(e=>e.factor>0).length,2);dom.window.close();
});
test('second pets stack independently, can be disabled and damage bonus is not flat attack',async()=>{
 const {w,dom}=await page();w.eval("char().level=120;char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},hpGrowth:5144,growthLevel:120};set().statusEffects={petActive:true,alchemyActive:true,specials:['joy'],skillActive:{'Lâmina Encantada':true}};");const base=w.eval('calculateStatus()');const el=w.document.querySelector('[data-companion-pet]');el.value='khan';el.dispatchEvent(new w.Event('change',{bubbles:true}));const khan=w.eval('calculateStatus()');assert.equal(khan.totals.meleeMagic,base.totals.meleeMagic+15);assert.equal(khan.stats.hp,base.stats.hp+1500);assert.equal(khan.totals.attack,base.totals.attack);assert.equal(w.eval('set().statusEffects.specials[0]'),'joy');assert.equal(w.eval('set().statusEffects.petActive'),true);
 const tick=w.document.querySelector('[data-companion-active]');tick.checked=false;tick.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.eval('calculateStatus().totals.meleeMagic'),base.totals.meleeMagic);assert.equal(w.eval("statusLabel('Danos Médio')"),'average');assert.equal(w.eval("statusLabel('Ataque mágico / corpo a corpo')"),'meleeMagic');
 w.eval("char().pet.skills='Caçador de Monstros 20';char().pet.skillValues={'Caçador de Monstros:20':7};char().pet.skillValueContext=petSkillContext(char().pet)");const active=w.eval('calculateStatus().totals.monster');w.eval('set().statusEffects.petActive=false');assert.equal(active,w.eval('calculateStatus().totals.monster')+7);
 dom.window.close();
});
test('shared viewers can simulate a companion without changing their local data',async()=>{
 const initial=await page();const source=initial.w.eval('JSON.stringify(data)');initial.dom.window.close();const {w,dom}=await page({query:'?build=abcdefghijklmnop',stored:source,fetch:async()=>Response.json({snapshot:JSON.parse(source)})});const e=w.document.querySelector('[data-companion-pet]');e.value='porky';e.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.eval('set().statusEffects.companionPet'),'porky');assert.equal(w.localStorage.getItem('metin-armory-v1'),source);assert.match(w.document.querySelector('#pet').textContent,/Porky/);dom.window.close();
});
test('inventory swaps preserve items and other sets, enforce slots and update active totals',async()=>{
 const {w,dom}=await page();w.eval("data.items.push({id:'bamboo',slot:'shoes',name:'Sapatos de Bambu',upgrade:'+9',bonuses:'Resistência contra Fogo: 15%',stones:''});normalizeData(data);set().items.shoes='bamboo';data.items.push({id:'fire-alt',slot:'shoes',name:'Sapatos de Fogo',upgrade:'+9',bonuses:'Resistência contra Fogo: 5%',stones:''});normalizeData(data);char().sets.push({...makeSet('Outro'),items:{shoes:'bamboo'}});render();");const before=w.eval('calculateStatus().totals.fire'),count=w.eval('data.items.length'),from=w.eval("inventoryPositions().indexOf('fire-alt')");assert.equal(w.eval("equipInventoryItem('fire-alt','helmet')"),false);assert.equal(w.eval('set().items.shoes'),'bamboo');assert.equal(w.eval("equipInventoryItem('fire-alt','shoes')"),true);assert.equal(w.eval('set().items.shoes'),'fire-alt');assert.equal(w.eval('char().sets[1].items.shoes'),'bamboo');assert.equal(w.eval('data.items.length'),count);assert.equal(w.eval('inventoryPositions()['+from+']'),'bamboo');assert.equal(w.eval('calculateStatus().totals.fire'),before-10);assert.ok(w.document.querySelector('[data-inventory-item="bamboo"]'));assert.equal(w.document.querySelector('[data-inventory-item="fire-alt"]'),null);
 assert.equal(w.eval("moveInventoryItem('fire-alt',90)"),true);assert.equal(w.eval('set().items.shoes'),undefined);assert.equal(w.eval('inventoryPositions()[90]'),'fire-alt');w.eval("inventoryPage=2;renderInventory()");assert.ok(w.document.querySelector('[data-inventory-item="fire-alt"]'));assert.equal(w.document.querySelectorAll('.inventory-cell').length,45);dom.window.close();
});
test('inventory editor creates unequipped items and current character sharing includes its spare gear only',async()=>{
 const {w,dom}=await page();const equipped=w.eval('JSON.stringify(set().items)');w.eval("editSlot('shoes',{inventory:true,position:44})");w.document.querySelector('[name=name]').value='Sapatos de Bambu';w.document.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(w.document.querySelector('#modal').open,false);assert.equal(w.eval('JSON.stringify(set().items)'),equipped);const id=w.eval('inventoryPositions()[44]');assert.ok(id);assert.equal(w.eval('item(inventoryPositions()[44]).name'),'Sapatos de Bambu');w.eval("const other=makeChar('Outro');data.characters.push(other);data.items.push({id:'private-other',slot:'necklace',name:'Colar privado'});other.inventory=['private-other'];normalizeData(data);ArmorySharing.create=async snapshot=>window.captured=snapshot;");await w.eval('share()');assert.ok(w.captured.items.some(i=>i.id===id));assert.equal(w.captured.items.some(i=>i.id==='private-other'),false);assert.ok(w.captured.characters[0].inventory.includes(id));dom.window.close();
});
test('viewer inventory supports drag and touch swaps without persisting simulated equipment',async()=>{
 const initial=await page();initial.w.eval("data.items.push({id:'spare-shoes',slot:'shoes',name:'Sapatos de Bambu',upgrade:'+9',bonuses:'Resistência contra Fogo: 15%',stones:''});normalizeData(data)");const source=initial.w.eval('JSON.stringify(data)');initial.dom.window.close();const {w,dom}=await page({query:'?build=abcdefghijklmnop',stored:source,fetch:async()=>Response.json({snapshot:JSON.parse(source)})});const inv=w.document.querySelector('[data-inventory-item="spare-shoes"]');inv.click();assert.match(w.document.querySelector('.inventory-inspector').textContent,/Sapatos de Bambu/);w.document.querySelector('[data-inventory-equip]').click();assert.equal(w.eval('set().items.shoes'),'spare-shoes');assert.equal(w.localStorage.getItem('metin-armory-v1'),source);
 w.eval("moveInventoryItem('spare-shoes',30)");const b=w.document.querySelector('[data-inventory-item="spare-shoes"]');b.dispatchEvent(new w.Event('dragstart',{bubbles:true,cancelable:true}));w.document.querySelector('[data-slot=shoes]').dispatchEvent(new w.Event('drop',{bubbles:true,cancelable:true}));assert.equal(w.eval('set().items.shoes'),'spare-shoes');assert.equal(w.localStorage.getItem('metin-armory-v1'),source);dom.window.close();
});


test('inventory uses native item footprints, migrates overlapping anchors and rejects page overflow',async()=>{
 const {w,dom}=await page();
 const found=height=>Object.entries(w.ITEM_CATALOG).find(([,e])=>e.slot==='weapon'&&w.ITEM_INVENTORY_SIZES[e.image]===height);
 for(const height of [1,2,3]){const [catalogId,e]=found(height);w.footprint={id:'size-'+height,slot:'weapon',catalogId,name:e.label};assert.equal(w.eval('inventoryItemHeight(footprint)'),height);}
 const [weaponId,weapon]=found(3),[armorId,armor]=Object.entries(w.ITEM_CATALOG).find(([,e])=>e.slot==='armor'&&w.ITEM_INVENTORY_SIZES[e.image]===2);
 w.fixture=[{id:'multi-armor',slot:'armor',catalogId:armorId,name:armor.label,upgrade:'+9'},{id:'multi-weapon',slot:'weapon',catalogId:weaponId,name:weapon.label,upgrade:'+9'}];
 w.eval("data.items=fixture;data.characters=[char()];ci=si=0;char().sets=[makeSet('Teste')];char().inventory=['multi-armor',null,null,null,null,'multi-weapon'];normalizeData(data);render();");
 assert.equal(w.eval("inventoryPositions().indexOf('multi-armor')"),0);assert.equal(w.eval("inventoryPositions().indexOf('multi-weapon')"),1);
 assert.equal(w.eval('inventoryOccupancy().size'),5);assert.match(w.document.querySelector('[data-inventory-item="multi-weapon"]').style.gridRow,/span 3/);
 const before=w.eval('JSON.stringify(inventoryPositions())');assert.equal(w.eval("moveInventoryItem('multi-armor',40)"),false);assert.equal(w.eval("moveInventoryItem('multi-weapon',35)"),false);assert.equal(w.eval('JSON.stringify(inventoryPositions())'),before);
 assert.equal(w.eval("moveInventoryItem('multi-armor',20)"),true);assert.equal(w.eval("moveInventoryItem('multi-weapon',25)"),true);
 assert.equal(w.eval("inventoryPositions().indexOf('multi-armor')"),1);assert.equal(w.eval("inventoryPositions().indexOf('multi-weapon')"),25);assert.equal(w.eval('inventoryOccupancy().size'),5);
 dom.window.close();
});


test('lightning resistance labels migrate without changing lightning power or bonus values',async()=>{
 const {w,dom}=await page();w.eval("data.items.push({id:'lightning-label',slot:'armor',name:'Armadura',bonuses:'Resistência Raios: +15%',bonus6:'Ganha Resistência Raios: +5%',base:'Poder dos Raios: 20%',absorptionSource:{normal:'Resistência contra Raios: +10%'}});normalizeData(data)");
 assert.equal(w.eval("item('lightning-label').bonuses"),'Resistência a Relâmpagos: +15%');assert.equal(w.eval("item('lightning-label').bonus6"),'Ganha Resistência a Relâmpagos: +5%');assert.equal(w.eval("item('lightning-label').base"),'Poder dos Raios: 20%');assert.equal(w.eval("item('lightning-label').absorptionSource.normal"),'Resistência a Relâmpagos: +10%');
 assert.equal(w.eval("statusLabel('Resistência a Relâmpagos')"),'lightning');assert.equal(w.eval("statusLabel('Resistência Raios')"),'lightning');assert.equal(w.eval("statusLabel('Poder dos Raios')"),'powerLightning');assert.ok(w.BONUS_CATALOG.normal.armor.some(e=>e.label==='Resistência a Relâmpagos'));dom.window.close();
});


test('sets keep independent positions with shared ownership, blank sets and global item deletion',async()=>{
 const {w,dom}=await page();w.eval("data.items=[{id:'shared-weapon',slot:'weapon',name:'Espada',upgrade:'+9'},{id:'spare-armor',slot:'armor',name:'Armadura',upgrade:'+9'}];char().inventory=['shared-weapon','spare-armor'];char().sets=[{...makeSet('Fogo'),items:{weapon:'shared-weapon'}},{...makeSet('Cópia'),items:{weapon:'shared-weapon'}},makeSet('Novo')];si=0;normalizeData(data);render();");
 const otherLayouts=w.eval('JSON.stringify(char().sets.slice(1).map(s=>s.inventory))');assert.equal(w.eval("moveInventoryItem('spare-armor',25)"),true);assert.equal(w.eval('JSON.stringify(char().sets.slice(1).map(s=>s.inventory))'),otherLayouts);
 const firstLayout=w.eval('JSON.stringify(set().inventory)');w.eval('si=1;render()');assert.equal(w.eval("moveInventoryItem('spare-armor',35)"),true);assert.equal(w.eval('JSON.stringify(char().sets[0].inventory)'),firstLayout);
 w.eval('si=2;render()');assert.ok(w.document.querySelector('[data-inventory-item="shared-weapon"]'));assert.equal(w.eval('Object.keys(set().items).length'),0);assert.equal(w.eval('data.items.length'),2);
 w.eval("data.items.push({id:'new-shared',slot:'necklace',name:'Colar'});addInventoryReference('new-shared',15);save()");assert.equal(w.eval("char().sets.every(s=>s.inventory.includes('new-shared'))"),true);
 w.eval("deleteInventoryItem('shared-weapon');save()");assert.equal(w.eval("char().sets.every(s=>!s.inventory.includes('shared-weapon')&&!Object.values(s.items).includes('shared-weapon'))"),true);assert.equal(w.eval('data.items.length'),2);
 const stored=w.eval('JSON.stringify(data)'),layouts=w.eval('JSON.stringify(char().sets.map(s=>s.inventory))');dom.window.close();const restored=await page({stored});assert.equal(restored.w.eval('JSON.stringify(char().sets.map(s=>s.inventory))'),layouts);restored.dom.window.close();
});


test('Yut Nori is opt-in, adds ten monster points and restores the original damage when disabled', async () => {
 const {w,dom}=await page();
 const baseline=w.eval(`(()=>{const c=char(),s=set();s.statusEffects??={};s.statusEffects.consumables??={};delete s.statusEffects.consumables.yutNori;return calculateStatus().totals.monster;})()`);
 w.eval(`set().statusEffects.consumables.yutNori={active:true,value:10}`);
 assert.equal(w.eval('calculateStatus().totals.monster'),baseline+10);
 w.eval(`set().statusEffects.consumables.yutNori.active=false`);
 assert.equal(w.eval('calculateStatus().totals.monster'),baseline);
 w.eval('renderSetEffects()');assert.ok(w.document.querySelector('[data-consumable="yutNori"]'));
 dom.window.close();
});

test('Halloween trio needs all three equipped plus costumes and adds its set bonus only once', async () => {
 const {w,dom}=await page();
 w.eval(`for(const [slot,name] of [['skin','Espada Porta-Maldição+'],['costume','Íncubo de Fogo+'],['hair','Chifres de Fogo+ (M)']]){const id='halloween-test-'+slot;data.items.push({id,slot,name,bonuses:'',stones:'',fixedMode:'Automático'});set().items[slot]=id;}`);
 const full=w.eval('calculateStatus().totals.monster');
 assert.equal(w.eval(`calculateStatus().records.filter(r=>r.source==='Conjunto Halloween 2024 · 3 trajes'&&r.key==='monster').length`),1);
 w.eval('delete set().items.hair');assert.equal(w.eval('calculateStatus().totals.monster'),full-3);
 w.eval(`set().items.hair='halloween-test-hair';item('halloween-test-hair').name='Chifres de Fogo (M)'`);
 assert.equal(w.eval('calculateStatus().totals.monster'),full-3);
 dom.window.close();
});


test('Helena changes costume tier once, stacks with the evolving pet and can be disabled in viewers', async () => {
 const {w,dom}=await page();
 w.eval(`for(const [slot,name]of [['skin','Espada Porta-Maldição+'],['costume','íncubo da Meia-Noite+'],['hair','Chifres Meia-noite+ (M)']]){const id='h-'+slot;data.items.push({id,slot,name,bonuses:'',stones:''});set().items[slot]=id;}set().statusEffects??={};set().statusEffects.companionPet='helena';set().statusEffects.companionPetActive=false;`);
 const before=w.eval('calculateStatus().totals');
 w.eval(`set().statusEffects.companionPetActive=true`);
 const after=w.eval('calculateStatus().totals');
 assert.equal(after.monster-before.monster,2);assert.equal(after.metin-before.metin,2);assert.equal(after.meleeMagic-before.meleeMagic,15);assert.equal(after.hp-before.hp,1500);
 assert.equal(w.eval('costumeSetInfo(set()).count'),4);
 w.eval(`set().statusEffects.specials=['magicCandy'];set().items.mount='hell-horse';data.items.push({id:'hell-horse',slot:'mount',name:'Corcel Inferno Horrível',mountId:'special-82',mounted:true});`);
 assert.equal(w.eval('costumeSetInfo(set()).count'),6);
 assert.equal(w.eval('costumeSetInfo(set()).stats.monster'),7);
 assert.equal(w.eval('costumeSetInfo(set()).stats.hpAbsorb'),5);
 assert.equal(w.eval('costumeSetInfo(set(),{mount:null}).count'),5);
 w.eval(`set().statusEffects.companionPet='lilith'`);
 assert.equal(w.eval('calculateStatus().totals.meleeMagic'),before.meleeMagic+w.eval("window.SPECIAL_EFFECTS.find(e=>e.id==='magicCandy').stats.meleeMagic||0"));
 const source=w.eval('JSON.stringify(data)');dom.window.close();
 const viewer=await page({query:'?build=abcdefghijklmnop',stored:source,fetch:async()=>Response.json({snapshot:JSON.parse(source)})});
 const box=viewer.w.document.querySelector('[data-companion-active]');assert.ok(box);assert.equal(box.disabled,false);box.checked=false;box.dispatchEvent(new viewer.w.Event('change',{bubbles:true}));
 assert.equal(viewer.w.eval('set().statusEffects.companionPetActive'),false);assert.equal(viewer.w.localStorage.getItem('metin-armory-v1'),source);viewer.dom.window.close();
});

test('skin attributes use dropdowns and preserve vitality and valid costume rolls on save', async () => {
 const {w,dom}=await page();
 w.eval(`char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},growthLevel:105,hpGrowth:5000};data.items.push({id:'skin-vit',slot:'skin',name:'Espada Porta-Maldição+',bonuses:'Probabilidade de Golpes Perfurantes: +5%\\nVitalidade +6\\nProbabilidade de Golpes Críticos: +10%',stones:'',fixedMode:'Automático'});set().items.skin='skin-vit';editSlot('skin');`);
 const types=[...w.document.querySelectorAll('[name$="_type"]')];assert.ok(types.some(s=>s.value==='Vitalidade'));
 assert.equal(w.document.querySelector('[name="upgrade"]').type,'hidden');
 assert.equal(w.document.querySelector('[name="weaponElement"]'),null);
 const before=w.eval('calculateStatus().attributes.vit');
 w.document.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.match(w.eval("item('skin-vit').bonuses"),/Vitalidade.*6/);assert.equal(w.eval('calculateStatus().attributes.vit'),before);
 for(const label of ['Inteligência','Força','Destreza','Vitalidade'])assert.ok(w.eval(`window.BONUS_CATALOG.normal.skin.some(e=>e.label===${JSON.stringify(label)})`));
 dom.window.close();
});

test('Sung talisman migrates explicit notes idempotently, keeps Sung stats separate, and saves variable power', async () => {
 const {w,dom}=await page();
 w.eval(`char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},growthLevel:105,hpGrowth:5000};data.items.push({id:'sung-test',slot:'talisman',catalogId:'wiki-4b8df1df59d1',name:'Talismã da Vontade RES',upgrade:'+3',notes:'6 Vontade de Sung Ma (RES)\\nPoder do Fogo +4%',bonuses:'Defesa: +5%',fixedMode:'Automático'});set().items.talisman='sung-test';normalizeData(data);`);
 assert.equal(w.eval("item('sung-test').sungMa.value"),6);assert.equal(w.eval("item('sung-test').elemental.power"),4);
 const before=w.eval('calculateStatus()');w.eval('normalizeData(data)');
 assert.equal(w.eval('calculateStatus().totals.powerFire'),before.totals.powerFire);
 assert.equal(w.eval('calculateStatus().totals.sungRes'),6);
 assert.equal(w.eval('calculateStatus().totals.defensePct'),before.totals.defensePct);
 assert.equal(w.eval("calculateStatus().records.filter(r=>r.key==='sungRes').length"),1);
 w.eval("editSlot('talisman')");
 assert.equal(w.document.querySelector('[name="sungMaValue"]').value,'6');assert.equal(w.document.querySelector('[name="talismanPower"]').value,'4');
 w.document.querySelector('[name="talismanPower"]').value='5';w.document.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(w.eval("item('sung-test').elemental.power"),5);assert.equal(w.eval('calculateStatus().totals.powerFire'),before.totals.powerFire+1);
 assert.equal(w.eval('calculateStatus().attributes.int'),before.attributes.int);
 const damages=w.eval(`(()=>{const p=window.COMBAT_TARGETS.find(t=>t.id==='6091');set().combatTarget={...p,preset:p.id};const target=resolvedCombatTarget(char(),set()),high=physicalPvmModel(combatInputs(char(),set()),target);item('sung-test').elemental.power=4;const low=physicalPvmModel(combatInputs(char(),set()),target);item('sung-test').elemental.power=5;return {high:high.expected,low:low.expected,error:high.error};})()`);
 assert.equal(damages.error,undefined);assert.ok(damages.high>damages.low);

 assert.throws(()=>w.eval(`saveSungTalisman({sungMaAttribute:'res',sungMaValue:'99',talismanElement:'Fogo',talismanPower:'4'},item('sung-test'),item('sung-test'))`),/inválido/);
 dom.window.close();
});

test('glove additional Sung roll migrates once, validates its own range and leaves normal STR unchanged', async()=>{
 const {w,dom}=await page();
 w.eval(`data.items.push({id:'glove-sung',slot:'gloves',catalogId:'wiki-820247ef8f17',name:'Luvas do Poder',upgrade:'+0',notes:'3 Vontade de Sung Ma (FRÇ)',bonuses:'Inteligência: +8',bonus6:'Forte contra Pedras Metin: +8%',stones:'',fixedMode:'Automático'});set().items.gloves='glove-sung';normalizeData(data);`);
 const before=w.eval('calculateStatus()');assert.equal(w.eval("item('glove-sung').sungMa.value"),3);
 w.eval('normalizeData(data)');assert.equal(w.eval('calculateStatus().totals.sungStr'),3);
 assert.equal(w.eval("calculateStatus().records.filter(r=>r.key==='sungStr').length"),1);
 w.eval("editSlot('gloves')");assert.equal(w.document.querySelector('[name="sungMaValue"]').value,'3');assert.match(w.document.querySelector('#gloveFields').textContent,/3–7/);
 w.document.querySelector('[name="sungMaValue"]').value='7';w.document.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(w.eval('calculateStatus().totals.sungStr'),7);assert.equal(w.eval('calculateStatus().totals.str'),before.totals.str);assert.match(w.eval("item('glove-sung').bonus6"),/Metin/);
 assert.throws(()=>w.eval(`saveSungGlove({sungMaValue:8},item('glove-sung'))`),/inválido/);
 w.eval("item('glove-sung').sungMa.value='';normalizeData(data)");assert.equal(w.eval("item('glove-sung').sungMa.value"),'');
 assert.equal(w.eval(`sungGloveKind({slot:'gloves',name:'Luvas da Proteção'})`),'int');
 assert.equal(w.eval(`sungGloveKind({slot:'gloves',name:'Luvas Serpente (RES)'})`),'res');
 dom.window.close();
});

test('mixed costume families share one candy, apply independent tiers once, and preserve the plus distinction',async()=>{
 const {w,dom}=await page();
 w.eval(`set().items={};set().statusEffects={specials:['strongCandy']};for(const [slot,name]of [['costume','Armadura de Éolo+ (M)'],['hair','Elmo Garra Negra+ (M)'],['skin','Espada Dokkaebi+']]){const id='mix-'+slot;data.items.push({id,slot,name,bonuses:'',stones:''});set().items[slot]=id;}`);
 const infos=w.eval('costumeSetInfos(set())');assert.equal(infos.length,3);assert.deepEqual(Array.from(infos,x=>x.count),[2,2,2]);
 const calc=w.eval('calculateStatus()');assert.equal(calc.records.filter(r=>r.source.startsWith('Conjunto Páscoa 2019')&&r.key==='monster').length,1);assert.equal(calc.totals.exp,75);assert.equal(calc.totals.monster,3);assert.equal(calc.totals.meleeMagic,w.eval("window.SPECIAL_EFFECTS.find(e=>e.id==='strongCandy').stats.meleeMagic||0")+3);
 w.eval(`item('mix-hair').name='Elmo de Éolo+ (M)'`);
 assert.equal(w.eval("costumeSetInfos(set()).find(f=>f.id==='pascoa2019').tier"),3);
 assert.equal(w.eval("calculateStatus().records.filter(r=>r.source.startsWith('Conjunto Páscoa 2019')&&r.key==='monster').length"),1);
 w.eval(`item('mix-skin').name='Espada Dokkaebi'`);assert.equal(w.eval("costumeSetIdentities(item('mix-skin')).length"),0);
 w.eval(`set().statusEffects.specials=['nazar']`);assert.equal(w.eval("costumeSetInfos(set()).some(f=>f.pieces.includes('amulet'))"),false);
 dom.window.close();
});

test('cosmetic and companion library offers broad searchable catalogues with item-specific bonuses',async()=>{
 const {w,dom}=await page();assert.ok(w.eval('Object.keys(window.COSMETIC_LIBRARY).length')>=460);assert.ok(w.eval('window.COMPANION_PETS.length')>=150);assert.equal(w.eval(`window.COMPANION_PETS.some(e=>e.name==='Image')`),false);assert.ok(w.eval(`Object.values(window.COSMETIC_LIBRARY).every(e=>e.image.startsWith('https://pt-wiki.metin2.gameforge.com/images/'))`));
 w.eval(`set().statusEffects={companionPet:window.COMPANION_PETS.find(e=>e.name==='Pebble').id,companionPetActive:true};renderPet();`);
 assert.equal(w.eval('calculateStatus().totals.metin'),15+w.eval(`(()=>{const x=calculateStatus();return x.records.filter(r=>r.key==='metin'&&!r.source.startsWith('Cria')).reduce((a,r)=>a+parseFloat(r.value),0);})()`));
 const search=w.document.querySelector('[data-companion-search]');assert.ok(search);search.value='Helena';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.ok([...w.document.querySelector('[data-companion-pet]').options].some(o=>o.textContent.includes('Helena')&&!o.hidden));
 w.eval("editSlot('hair')");assert.ok(w.document.querySelector('#fixedPreview'));assert.ok([...w.document.querySelector('[name="catalogId"]').options].some(o=>o.textContent.includes('Montera Azul')));
 dom.window.close();
});

test('secondary pets participate in their own confirmed costume families and conditional Azrael is opt-in',async()=>{
 const {w,dom}=await page();
 w.eval(`set().items={};data.items.push({id:'vampire',slot:'costume',name:'Lorde Vampiro Noturno+',bonuses:'',stones:''});set().items.costume='vampire';set().statusEffects={companionPet:window.COMPANION_PETS.find(e=>e.name==='Sarcófago Gelado').id,companionPetActive:true};`);
 assert.equal(w.eval("costumeSetInfos(set()).find(f=>f.id==='halloween2022').count"),2);assert.equal(w.eval('calculateStatus().totals.exp'),50);assert.equal(w.eval('calculateStatus().totals.hpAbsorb'),5);
 w.eval(`set().statusEffects.companionPetActive=false`);assert.equal(w.eval('calculateStatus().totals.exp'),0);
 assert.ok(w.eval(`window.COSTUME_SETS.ramadao2022.members.costume.includes('Guer. Lua Deserto V.+(M)')`));
 w.eval(`set().statusEffects={companionPet:window.COMPANION_PETS.find(e=>e.name==='Azrael Bebé').id,companionPetActive:true};`);
 const off=w.eval('calculateStatus().totals.meleeMagic');w.eval(`set().statusEffects.companionConditionMet=true`);assert.equal(w.eval('calculateStatus().totals.meleeMagic'),off+15);
 dom.window.close();
});

test('Enfurecido adds melee/magic percentage once and never changes displayed attack',async()=>{
 const {w,dom}=await page();
 w.eval(`char().statusProfile={attributes:{str:16,vit:90,int:90,dex:90},growthLevel:Number(char().level),hpGrowth:5000,defenseBase:200};char().pet.hp=0;char().pet.defense=0;char().pet.skills='Enfurecido 20';char().pet.skillValues={'Enfurecido:20':12};char().pet.skillValueContext=petSkillContext(char().pet);set().statusEffects={petActive:false,alchemyActive:false,skillActive:{},specials:[]};`);
 const off=w.eval('calculateStatus()'),combatOff=w.eval('combatInputs(char(),set())');
 w.eval('set().statusEffects.petActive=true');
 const on=w.eval('calculateStatus()'),combatOn=w.eval('combatInputs(char(),set())');
 assert.equal(on.stats.attack,off.stats.attack);assert.equal(on.stats.attackMax,off.stats.attackMax);
 assert.equal(on.totals.meleeMagic,off.totals.meleeMagic+12);
 assert.equal(on.records.filter(r=>r.source==='Pet · Enfurecido 20'&&r.key==='meleeMagic').length,1);
 assert.equal(on.unknown.some(x=>x.includes('Enfurecido aplicado ao ataque total')),false);
 assert.equal(combatOn.totals.meleeMagic,combatOff.totals.meleeMagic+12);
 w.eval(`delete char().pet.skillValues;char().pet.level=1`);
 const missing=w.eval('calculateStatus()');assert.equal(missing.stats.attack,off.stats.attack);assert.ok(missing.unknown.some(x=>x.includes('Enfurecido')));
 dom.window.close();
});


test('glove stones select independent Sung attributes, persist, and count once without normal INT/HP',async()=>{
 const {w,dom}=await page();
 w.eval(`data.items.push({id:'glove-stones',slot:'gloves',catalogId:'wiki-820247ef8f17',name:'Luvas do Poder',upgrade:'+4',sungMa:{attribute:'frc',value:19},bonuses:'Inteligência: +8',bonus6:'Forte contra Pedras Metin: +8%',stones:''});set().items.gloves='glove-stones';normalizeData(data);`);
 const before=w.eval('calculateStatus()');w.eval("editSlot('gloves')");
 for(const [i,attribute] of ['FRÇ','VIT','INT'].entries()){
  for(const [name,value] of [['stone'+i,'Pedra Demoníaca Poder'],['stoneLevel'+i,'4'],['stoneAttribute'+i,attribute],['stoneMode'+i,'normal']]){const select=w.document.querySelector(`[name="${name}"]`);select.value=value;select.dispatchEvent(new w.Event('change',{bubbles:true}));}
 }
 assert.match(w.document.querySelector('.glove-stone-preview').textContent,/FRÇ.*15/);
 w.document.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(w.document.querySelector('#modal').open,false);
 const after=w.eval('calculateStatus()');assert.equal(after.totals.sungStr-before.totals.sungStr,15);assert.equal(after.totals.sungVit-before.totals.sungVit,15);assert.equal(after.totals.sungInt-before.totals.sungInt,15);assert.equal(after.totals.int,before.totals.int);assert.equal(after.totals.vit,before.totals.vit);assert.equal(after.totals.hp,before.totals.hp);
 assert.equal(after.records.filter(r=>r.source.includes('Pedra Demoníaca Poder')).length,3);
 const stones=w.eval("item('glove-stones').stones");w.eval("editSlot('gloves')");assert.equal(w.document.querySelector('[name="stoneAttribute1"]').value,'VIT');w.document.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(w.eval("item('glove-stones').stones"),stones);
 w.eval("editSlot('gloves')");w.document.querySelector('[name="stoneAttribute1"]').value='FRÇ';w.document.querySelector('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(w.document.querySelector('#modal').open,true);assert.equal(w.eval("item('glove-stones').stones"),stones);
 assert.equal(w.eval("spiritValue(spiritMatch('Pedra Demoníaca Poder +4 · RES · duplo'))"),'Vontade de Sung Ma (RES): +30');
 assert.equal(w.eval("spiritValue(spiritMatch('Pedra Demoníaca +4'))"),'');
 dom.window.close();
});
