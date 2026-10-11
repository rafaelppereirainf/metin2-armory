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
  return new Request('https://api.example.com' + path, {method, headers: {Origin: origin, 'Content-Type': 'application/json', ...headers}, ...(method === 'POST' ? {body: JSON.stringify(body)} : {})});
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
    const result = await read.json(); assert.deepEqual(result, {snapshot}); assert.equal(read.headers.get('cache-control'), 'no-store');
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
