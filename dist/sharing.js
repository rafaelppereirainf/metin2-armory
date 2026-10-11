(() => {
  const config = window.ARMORY_SHARE_CONFIG || {};
  const key = 'metin-armory-shares-v1';
  const enabled = () => /^https:\/\//.test(config.apiUrl || '') && !!config.turnstileSiteKey;
  const api = path => config.apiUrl.replace(/\/$/, '') + path;
  const records = () => { try { const r = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(r) ? r.filter(x => /^[\w-]{16}$/.test(x.id) && /^[\w-]{43}$/.test(x.ownerToken)) : []; } catch { return []; } };
  async function request(path, options = {}) {
    const response = await fetch(api(path), {...options, signal: AbortSignal.timeout(20_000), cache: 'no-store', credentials: 'omit'});
    const body = await response.json();
    if (!response.ok) throw Error(body.error || 'Não foi possível contactar o serviço de partilha.');
    return body;
  }
  const dialog = document.createElement('dialog'); dialog.id = 'shareDialog';
  dialog.innerHTML = '<div class="paneltitle"><h2>Partilhar personagem</h2><button type="button" aria-label="Fechar">×</button></div><div class="share-content"></div>';
  document.body.append(dialog);
  const content = dialog.querySelector('.share-content');
  let widget, cancelLoad, turnstilePromise;
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { cancelLoad?.(); cancelLoad = null; if (widget !== undefined && window.turnstile) window.turnstile.remove(widget); widget = undefined; });
  function show() { if (!dialog.open) dialog.showModal(); }
  function message(text) { content.querySelector('[role="status"]').textContent = text; }
  async function copy(url) {
    try { await navigator.clipboard.writeText(url); message('Link copiado. Podes enviá-lo a qualquer pessoa.'); }
    catch { message('Seleciona e copia o link abaixo.'); content.querySelector('textarea')?.select(); }
  }
  function linkView(url) {
    content.innerHTML = '<p>A pessoa que receber este link pode consultar a cópia da personagem sem conta.</p><textarea readonly aria-label="Link da personagem"></textarea><button class="primary">Copiar link</button><p role="status" aria-live="polite"></p>';
    content.querySelector('textarea').value = url;
    content.querySelector('button').onclick = () => copy(url);
  }
  function turnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!turnstilePromise) turnstilePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true;
      const timer = setTimeout(() => { script.remove(); turnstilePromise = null; reject(Error('A verificação não carregou. Tenta novamente.')); }, 20_000);
      script.onload = () => { clearTimeout(timer); resolve(window.turnstile); };
      script.onerror = () => { clearTimeout(timer); script.remove(); turnstilePromise = null; reject(Error('Não foi possível carregar a verificação.')); };
      document.head.append(script);
    });
    return turnstilePromise;
  }
  window.ArmorySharing = {
    enabled,
    async load(id) {
      if (!/^[\w-]{16}$/.test(id)) throw Error('Link de personagem inválido.');
      if (!enabled()) throw Error('A partilha online ainda não está disponível neste site.');
      const result = await request('/builds/' + id);
      return result.snapshot;
    },
    async create(snapshot, legacyUrl) {
      show();
      if (!enabled()) {
        content.innerHTML = '<p>Os links curtos ainda estão em preparação. Por agora podes partilhar um link que inclui os dados da personagem.</p><button class="primary">Copiar link completo</button><p role="status" aria-live="polite"></p><textarea readonly aria-label="Link completo"></textarea>';
        content.querySelector('textarea').value = legacyUrl; content.querySelector('button').onclick = () => copy(legacyUrl); return;
      }
      content.innerHTML = '<p>Será guardada online uma cópia desta personagem, com os seus sets, equipamentos e notas. Qualquer pessoa com o link poderá consultá-la.</p><p>As alterações posteriores ficam no teu navegador. Para as mostrar, cria uma nova partilha.</p><div class="share-verification"></div><button class="primary" disabled>Criar e copiar link curto</button><p role="status" aria-live="polite">A carregar a verificação…</p>';
      let active = true, token = ''; cancelLoad = () => { active = false; };
      const button = content.querySelector('button');
      try {
        const test = key + '-check'; localStorage.setItem(test, '1'); localStorage.removeItem(test);
        const challenge = await turnstile(); if (!active) return;
        widget = challenge.render(content.querySelector('.share-verification'), {sitekey: config.turnstileSiteKey, action: 'share', callback: value => { token = value; button.disabled = false; message('Pronto para partilhar.'); }, 'expired-callback': () => { token = ''; button.disabled = true; message('A verificação expirou. Tenta novamente.'); }, 'error-callback': () => { token = ''; button.disabled = true; message('A verificação falhou. Fecha e volta a tentar.'); }});
        button.onclick = async () => {
          button.disabled = true; message('A guardar a cópia da personagem…');
          try {
            const result = await request('/builds', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({snapshot, turnstileToken: token})});
            if (!/^[\w-]{16}$/.test(result.id) || !/^[\w-]{43}$/.test(result.ownerToken)) throw Error('Resposta de partilha inválida.');
            const url = new URL(location.pathname, location.origin); url.searchParams.set('build', result.id);
            const entry = {...result, url: url.href, name: snapshot.characters[0].name, createdAt: Date.now()};
            try { localStorage.setItem(key, JSON.stringify([...records(), entry])); }
            catch {
              try { await request('/builds/' + result.id, {method: 'DELETE', headers: {Authorization: 'Bearer ' + result.ownerToken}}); throw Error('Não foi possível guardar a gestão da partilha neste navegador. A cópia foi removida.'); }
              catch (error) {
                if (error.message.includes('A cópia foi removida')) throw error;
                const a = document.createElement('a'); const objectUrl = URL.createObjectURL(new Blob([JSON.stringify([entry])], {type: 'application/json'}));
                a.href = objectUrl; a.download = 'armory-gestao-partilha-privada.json'; a.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
                alert('Não foi possível guardar a gestão neste navegador. Guarda o ficheiro privado descarregado: contém a chave necessária para revogar esta partilha.');
              }
            }
            if (widget !== undefined) challenge.remove(widget); widget = undefined;
            if (!active) return; linkView(url.href); await copy(url.href);
          } catch (error) { if (active) { message(error.message); token = ''; button.disabled = true; if (widget !== undefined) challenge.reset(widget); } }
        };
      } catch (error) { if (active) message(error.message); }
    },
    manage() {
      show(); content.innerHTML = '<p>Partilhas criadas neste navegador. Remover uma partilha desativa o link, sem alterar a personagem local.</p><p>Se limpares os dados do navegador, perdes as chaves de gestão. O ficheiro de backup de gestão é privado: não o partilhes.</p><div class="share-records"></div><button class="share-backup">Guardar gestão</button> <button class="share-restore">Restaurar gestão</button><input type="file" accept="application/json" hidden><p role="status" aria-live="polite"></p>';
      const list = content.querySelector('.share-records');
      const refresh = () => {
        list.replaceChildren(); const all = records();
        if (!all.length) list.textContent = 'Ainda não há partilhas guardadas neste navegador.';
        for (const entry of all) {
          const row = document.createElement('div'); row.className = 'share-record';
          const name = document.createElement('strong'); name.textContent = entry.name || 'Personagem';
          const copyButton = document.createElement('button'); copyButton.textContent = 'Copiar link';
          const url = new URL(location.pathname, location.origin); url.searchParams.set('build', entry.id);
          copyButton.onclick = () => copy(url.href);
          const remove = document.createElement('button'); remove.className = 'danger'; remove.textContent = 'Revogar';
          remove.onclick = async () => {
            if (!confirm('Desativar este link? Quem o recebeu deixará de conseguir abrir esta cópia.')) return;
            remove.disabled = true;
            try { await request('/builds/' + entry.id, {method: 'DELETE', headers: {Authorization: 'Bearer ' + entry.ownerToken}}); localStorage.setItem(key, JSON.stringify(records().filter(r => r.id !== entry.id))); refresh(); message('Partilha removida.'); } catch (error) { message(error.message); remove.disabled = false; }
          };
          row.append(name, copyButton, remove); list.append(row);
        }
      }; refresh();
      content.querySelector('.share-backup').onclick = () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(records(), null, 2)], {type: 'application/json'}));
        const a = document.createElement('a'); a.href = url; a.download = 'armory-gestao-partilhas-privada.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      const input = content.querySelector('input'); content.querySelector('.share-restore').onclick = () => input.click();
      input.onchange = async () => {
        try { const file = input.files[0]; if (!file) return; if (file.size > 1_000_000) throw Error('Ficheiro demasiado grande.'); const imported = JSON.parse(await file.text()); if (!Array.isArray(imported) || imported.some(x => !/^[\w-]{16}$/.test(x.id) || !/^[\w-]{43}$/.test(x.ownerToken))) throw Error('Ficheiro de gestão inválido.'); const merged = new Map(records().map(x => [x.id, x])); imported.forEach(x => merged.set(x.id, x)); localStorage.setItem(key, JSON.stringify([...merged.values()])); refresh(); message('Gestão de partilhas restaurada.'); } catch (error) { message(error.message); } input.value = ''; };
    }
  };
})();
