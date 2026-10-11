const LIMIT = 200_000;
const ID = /^[A-Za-z0-9_-]{16}$/;
const encoder = new TextEncoder();
const random = n => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
export function validSnapshot(d) {
  if (!d || d.version !== 1 || !Array.isArray(d.characters) || d.characters.length !== 1 || !Array.isArray(d.items) || d.items.length > 400) return false;
  const c = d.characters[0];
  if (!c || typeof c.id !== 'string' || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 100 || !c.bio || !c.pet || !c.alchemy || ![6, 7].includes(c.alchemy.stones?.length) || !Array.isArray(c.sets) || c.sets.length > 50 || c.sets.some(s => !s || !s.items || !s.stats)) return false;
  if (d.items.some(i => !i || typeof i.id !== 'string' || typeof i.slot !== 'string' || typeof i.name !== 'string')) return false;
  function safe(v, depth = 0) {
    if (depth > 30) return false;
    if (!v || typeof v !== 'object') return true;
    return Object.entries(v).every(([k, val]) => !['__proto__', 'constructor', 'prototype'].includes(k) && safe(val, depth + 1));
  }
  return safe(d);
}
async function readLimited(request) {
  if (Number(request.headers.get('content-length')) > LIMIT) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('json');
  const chunks = []; let size = 0;
  while (true) {
    const {done, value} = await reader.read(); if (done) break;
    size += value.length;
    if (size > LIMIT) { await reader.cancel(); throw new Error('size'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin'};
    if (origin === env.ALLOWED_ORIGIN) Object.assign(headers, {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization'});
    const reply = (value, status = 200) => new Response(JSON.stringify(value), {status, headers});
    if (origin && origin !== env.ALLOWED_ORIGIN) return reply({error: 'Origem não permitida.'}, 403);
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') return reply({ok: true, permanentLinks: true});
    const match = path.match(/^\/builds\/([A-Za-z0-9_-]+)$/);
    try {
      if (match && ID.test(match[1]) && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT payload FROM shares WHERE id = ?').bind(match[1]).first();
        return row ? reply({snapshot: JSON.parse(row.payload)}) : reply({error: 'Esta partilha não existe ou foi removida.'}, 404);
      }
      if (match && ID.test(match[1]) && request.method === 'DELETE') {
        if (origin !== env.ALLOWED_ORIGIN) return reply({error: 'Origem não permitida.'}, 403);
        const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return reply({error: 'Autorização inválida.'}, 403);
        const result = await env.DB.prepare('DELETE FROM shares WHERE id = ? AND owner_hash = ?').bind(match[1], await digest(token)).run();
        return result.meta.changes ? reply({removed: true}) : reply({error: 'Partilha inexistente ou autorização inválida.'}, 403);
      }
      const updating = match && ID.test(match[1]) && request.method === 'PUT';
      if (!updating && (path !== '/builds' || request.method !== 'POST')) return reply({error: 'Endpoint não encontrado.'}, 404);
      if (origin !== env.ALLOWED_ORIGIN) return reply({error: 'Origem não permitida.'}, 403);
      if (!env.TURNSTILE_SECRET || !env.TURNSTILE_HOSTNAME) return reply({error: 'Partilha ainda não configurada.'}, 503);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({error: 'Formato inválido.'}, 415);
      let body;
      try { body = await readLimited(request); } catch (error) { return reply({error: error.message === 'size' ? 'A personagem excede o limite de 200 KB.' : 'Dados inválidos.'}, error.message === 'size' ? 413 : 400); }
      if (!body || !validSnapshot(body.snapshot) || typeof body.turnstileToken !== 'string' || !body.turnstileToken || body.turnstileToken.length > 2048) return reply({error: 'Dados de personagem inválidos.'}, 400);
      let previous, ownerHash;
      if (updating) {
        const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return reply({error: 'Autorização inválida.'}, 403);
        ownerHash = await digest(token);
        previous = await env.DB.prepare('SELECT payload FROM shares WHERE id = ? AND owner_hash = ?').bind(match[1], ownerHash).first();
        if (!previous) return reply({error: 'Partilha inexistente ou autorização inválida.'}, 403);
        const saved = JSON.parse(previous.payload);
        if (saved.shareMode !== 'permanent') return reply({error: 'Esta partilha é uma cópia fixa. Cria um link permanente.'}, 409);
        if (saved.characters[0].id !== body.snapshot.characters[0].id) return reply({error: 'Este link pertence a outra personagem.'}, 400);
        if (body.revision !== saved.shareRevision) return reply({error: 'A partilha foi atualizada noutro navegador. Copia o link e consulta a versão atual antes de voltar a publicar.'}, 409);
      }
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method: 'POST', body: new URLSearchParams({secret: env.TURNSTILE_SECRET, response: body.turnstileToken}), signal: AbortSignal.timeout(10_000)});
      if (!verification.ok) return reply({error: 'Não foi possível verificar a partilha. Tenta novamente.'}, 503);
      const check = await verification.json();
      if (!check.success || check.hostname !== env.TURNSTILE_HOSTNAME || check.action !== 'share') return reply({error: 'Verificação expirada ou inválida. Tenta novamente.'}, 403);
      const snapshot = {...body.snapshot, shareMode: updating ? 'permanent' : body.mode === 'permanent' ? 'permanent' : 'snapshot', shareRevision: updating ? body.revision + 1 : 1, shareUpdatedAt: Date.now()};
      if (updating) {
        const result = await env.DB.prepare('UPDATE shares SET payload = ? WHERE id = ? AND owner_hash = ? AND payload = ?').bind(JSON.stringify(snapshot), match[1], ownerHash, previous.payload).run();
        return result.meta.changes ? reply({id: match[1], revision: snapshot.shareRevision}) : reply({error: 'A partilha mudou entretanto. Volta a tentar.'}, 409);
      }
      const id = random(12), ownerToken = random(32), now = Math.floor(Date.now() / 1000);
      const client = await digest(env.TURNSTILE_SECRET + ':' + (request.headers.get('CF-Connecting-IP') || 'unknown'));
      const payload = JSON.stringify(snapshot);
      const result = await env.DB.prepare(`INSERT INTO shares (id, payload, owner_hash, client_hash, created_at)
        SELECT ?, ?, ?, ?, ? WHERE
        (SELECT COUNT(*) FROM shares WHERE client_hash = ? AND created_at > ?) < 10
        AND (SELECT COUNT(*) FROM shares WHERE created_at > ?) < 1000
        AND (SELECT COUNT(*) FROM shares) < 5000`).bind(id, payload, await digest(ownerToken), client, now, client, now - 3600, now - 86400).run();
      if (!result.meta.changes) return reply({error: 'Limite de partilhas atingido. Tenta mais tarde.'}, 429);
      return reply({id, ownerToken, revision: 1}, 201);
    } catch { return reply({error: 'Serviço de partilha temporariamente indisponível.'}, 503); }
  }
};
