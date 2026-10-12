import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {runInContext} from 'node:vm';
import {JSDOM} from 'jsdom';
const dist = new URL('../../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const scripts = ['catalog.js', 'asset-index.js', 'bonus-catalog.js', 'pet-catalog.js', 'alchemy-catalog.js', 'refinement-catalog.js', 'mount-catalog.js', 'equipment.js', 'status.js', 'sharing.js', 'app.js'];
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
