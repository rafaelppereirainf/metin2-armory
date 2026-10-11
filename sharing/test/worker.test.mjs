import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker.mjs';
const origin = 'https://rafaelppereirainf.github.io';
const snapshot = {version: 1, characters: [{id: 'char1', name: 'Sura Árvore', bio: {}, pet: {}, alchemy: {stones: Array.from({length: 7}, () => ({}))}, sets: [{name: 'Fogo', items: {}, stats: {hp: 12344}}]}], items: [], customCatalog: {}};
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_shares.sql', import.meta.url), 'utf8'));
  return {sqlite, env: {ALLOWED_ORIGIN: origin, TURNSTILE_HOSTNAME: 'rafaelppereirainf.github.io', TURNSTILE_SECRET: 'test-secret', DB: {prepare(sql) { return {bind(...params) { return {async first() { return sqlite.prepare(sql).get(...params); }, async run() { const r = sqlite.prepare(sql).run(...params); return {meta: {changes: Number(r.changes)}}; }}; }}; }}}};
}
function req(path = '/builds', method = 'POST', body = {snapshot, turnstileToken: 'valid'}, headers = {}) {
  return new Request('https://api.example.com' + path, {method, headers: {Origin: origin, 'Content-Type': 'application/json', ...headers}, ...(['POST', 'PUT'].includes(method) ? {body: JSON.stringify(body)} : {})});
}
test('create, public read, owner-only revocation, UTF-8 and CORS', async () => {
  const {env, sqlite} = setup(); const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({success: true, hostname: env.TURNSTILE_HOSTNAME, action: 'share'});
  try {
    const created = await worker.fetch(req(), env); assert.equal(created.status, 201);
    assert.equal(created.headers.get('access-control-allow-origin'), origin);
    const {id, ownerToken} = await created.json(); assert.match(id, /^[\w-]{16}$/); assert.match(ownerToken, /^[\w-]{43}$/);
    const row = sqlite.prepare('SELECT * FROM shares').get(); assert.notEqual(row.owner_hash, ownerToken); assert.equal(row.owner_hash.length, 64);
    const read = await worker.fetch(new Request('https://api.example.com/builds/' + id), env);
    const result = await read.json(); assert.deepEqual(result.snapshot.characters, snapshot.characters); assert.equal(result.snapshot.shareMode, 'snapshot'); assert.equal(read.headers.get('cache-control'), 'no-store');
    assert.equal((await worker.fetch(req('/builds/' + id, 'DELETE', null, {Authorization: 'Bearer ' + 'a'.repeat(43)}), env)).status, 403);
    assert.equal((await worker.fetch(req('/builds/' + id, 'DELETE', null, {Authorization: 'Bearer ' + ownerToken}), env)).status, 200);
    assert.equal((await worker.fetch(req('/builds/' + id, 'GET'), env)).status, 404);
  } finally {globalThis.fetch = originalFetch; sqlite.close();}
});
test('reject bad origins, invalid snapshots, oversized payloads and wrong Turnstile hostname', async () => {
  const {env, sqlite} = setup(); const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({success: true, hostname: 'attacker.example', action: 'share'});
  try {
    assert.equal((await worker.fetch(req('/builds', 'POST', undefined, {Origin: 'https://attacker.example'}), env)).status, 403);
    assert.equal((await worker.fetch(req('/builds', 'POST', null), env)).status, 400);
    assert.equal((await worker.fetch(req('/builds', 'POST', {snapshot: {}, turnstileToken: 'valid'}), env)).status, 400);
    assert.equal((await worker.fetch(req('/builds', 'POST', {large: 'x'.repeat(200_001)}), env)).status, 413);
    assert.equal((await worker.fetch(req(), env)).status, 403);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM shares').get().n, 0);
    assert.equal((await worker.fetch(req('/builds', 'GET'), env)).status, 404);
  } finally {globalThis.fetch = originalFetch; sqlite.close();}
});
test('creation limit is enforced in the SQL insertion', async () => {
  const {env, sqlite} = setup(); const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({success: true, hostname: env.TURNSTILE_HOSTNAME, action: 'share'});
  try {
    for(let i = 0; i < 10; i++) assert.equal((await worker.fetch(req(), env)).status, 201);
    assert.equal((await worker.fetch(req(), env)).status, 429);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM shares').get().n, 10);
  } finally {globalThis.fetch = originalFetch; sqlite.close();}
});

test('permanent link updates only for owner, same character and current revision; fixed copies stay fixed', async () => {
  const {env, sqlite} = setup(); const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({success: true, hostname: env.TURNSTILE_HOSTNAME, action: 'share'});
  try {
    const created = await worker.fetch(req('/builds', 'POST', {snapshot, turnstileToken: 'valid', mode: 'permanent'}), env);
    const {id, ownerToken} = await created.json();
    const updated = structuredClone(snapshot); updated.characters[0].sets[0].stats.hp = 15000;
    const body = {snapshot: updated, turnstileToken: 'valid', revision: 1};
    const headers = {Authorization: 'Bearer ' + ownerToken};
    assert.equal((await worker.fetch(req('/builds/' + id, 'OPTIONS'), env)).headers.get('access-control-allow-methods').includes('PUT'), true);
    assert.equal((await worker.fetch(req('/builds/' + id, 'PUT', body), env)).status, 403);
    assert.equal((await worker.fetch(req('/builds/' + id, 'PUT', body, {Authorization: 'Bearer ' + 'a'.repeat(43)}), env)).status, 403);
    const other = structuredClone(body); other.snapshot.characters[0].id = 'another';
    assert.equal((await worker.fetch(req('/builds/' + id, 'PUT', other, headers), env)).status, 400);
    assert.equal((await worker.fetch(req('/builds/' + id, 'PUT', {...body, snapshot: {}}, headers), env)).status, 400);
    assert.equal((await worker.fetch(req('/builds/' + id, 'PUT', {large: 'x'.repeat(200001)}, headers), env)).status, 413);
    globalThis.fetch = async () => Response.json({success: false});
    assert.equal((await worker.fetch(req('/builds/' + id, 'PUT', body, headers), env)).status, 403);
    globalThis.fetch = async () => Response.json({success: true, hostname: env.TURNSTILE_HOSTNAME, action: 'share'});
    const result = await worker.fetch(req('/builds/' + id, 'PUT', body, headers), env);
    assert.deepEqual(await result.json(), {id, revision: 2});
    assert.equal((await worker.fetch(req('/builds/' + id, 'PUT', body, headers), env)).status, 409);
    const read = await (await worker.fetch(req('/builds/' + id, 'GET'), env)).json();
    assert.equal(read.snapshot.characters[0].sets[0].stats.hp, 15000);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM shares').get().n, 1);
    const fixed = await (await worker.fetch(req(), env)).json();
    assert.equal((await worker.fetch(req('/builds/' + fixed.id, 'PUT', body, {Authorization: 'Bearer ' + fixed.ownerToken}), env)).status, 409);
    assert.equal((await worker.fetch(req('/builds/' + id, 'DELETE', null, headers), env)).status, 200);
    assert.equal((await worker.fetch(req('/builds/' + id, 'PUT', {...body, revision: 2}, headers), env)).status, 403);
  } finally {globalThis.fetch = originalFetch; sqlite.close();}
});
