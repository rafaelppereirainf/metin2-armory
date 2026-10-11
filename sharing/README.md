# Ativar links curtos

O site continua no GitHub Pages. Este Worker guarda apenas as cópias criadas através de **Partilhar**, numa base de dados D1. A configuração pública vazia mantém a partilha antiga disponível até a Cloudflare estar pronta.

## Configuração inicial (no terminal do VS Code)

É necessária uma conta Cloudflare. Não precisas de comprar um domínio. O CLI abre a autenticação no teu navegador. Usa Node.js 22 ou superior.

```powershell
cd sharing
npx wrangler@4 login
npx wrangler@4 d1 create metin2-armory-shares
```

Copia o `database_id` devolvido para `sharing/wrangler.jsonc`, substituindo `REPLACE_WITH_D1_DATABASE_ID`. Mantém a binding `DB` e `migrations_dir`.

No dashboard Cloudflare, abre **Turnstile → Add widget**. Cria um widget do tipo **Managed**, permitindo apenas o hostname `rafaelppereirainf.github.io` (sem https nem caminho). Guarda a Site Key e a Secret Key. Não coloques a Secret Key em nenhum ficheiro ou commit.

Ainda dentro da pasta `sharing`, executa:

```powershell
npx wrangler@4 secret put TURNSTILE_SECRET
npx wrangler@4 d1 migrations apply metin2-armory-shares --remote
npx wrangler@4 deploy
```

O primeiro comando pede a Secret Key em entrada privada. Cola-a apenas nesse terminal, nunca no chat nem no GitHub. O deploy devolve o endereço HTTPS do Worker (`https://metin2-armory-sharing.<conta>.workers.dev`).

Edita `dist/share-config.js` (na pasta do projeto, fora de `sharing`):

```js
window.ARMORY_SHARE_CONFIG = {
  apiUrl: 'https://metin2-armory-sharing.<conta>.workers.dev',
  turnstileSiteKey: 'A_SITE_KEY_PUBLICA'
};
```

Estas duas configurações são públicas. Faz commit e push para `main`; o workflow publica o frontend no GitHub Pages. O Worker é publicado separadamente com `wrangler deploy` sempre que muda o seu código.

## Verificação

1. Abre o site, clica **Partilhar** e confirma **Criar e copiar link curto**.
2. Abre o link numa janela privada: deve aparecer a personagem em modo de consulta, sem login.
3. Altera um item no perfil local: a cópia partilhada mantém os valores anteriores.
4. Em **Partilhas**, revoga o link e volta a abri-lo: deve mostrar que foi removido.
5. Os links antigos com `#view=` continuam a abrir.

Os links usam `?build=<identificador>` no endereço do GitHub Pages. O visitante não precisa de conta. As cópias não têm prazo de expiração; duram até serem revogadas ou o serviço/base de dados ser removido. São acessíveis a qualquer pessoa que tenha o link, incluindo todas as notas da personagem e dos itens selecionados.

As chaves de revogação ficam separadas dos dados da personagem, no navegador do autor. **Partilhas → Guardar gestão** cria um backup privado destas chaves. **Restaurar gestão** recupera-o noutro navegador. Não envies este ficheiro a outras pessoas. Importar/exportar a build normal não transfere as chaves de gestão.

## Limites e funcionamento

- 200 KB por pedido; uma personagem, até 50 sets e 400 itens.
- Turnstile validado no servidor, hostname e ação `share` conferidos.
- Até 10 cópias por IP por hora, 1000 novas cópias por dia e 5000 guardadas. Os limites de criação contam cópias ainda existentes; o objetivo é limitar ocupação e criação casual excessiva, não substituir a proteção Turnstile.
- Não há endpoint para listar cópias. IDs aleatórios de 96 bits; chaves de revogação aleatórias de 256 bits, apenas o hash fica na base de dados.
- SQL parametrizado; CORS restrito ao site; GET sem cache para respeitar revogações. Não são guardados IPs em claro, apenas hashes com segredo do servidor para limitar criações.
- Falhas de rede/links removidos nunca substituem o perfil local.

O plano gratuito está sujeito às quotas atuais da Cloudflare. Atingir uma quota pode tornar a partilha temporariamente indisponível. O site e os dados locais continuam a funcionar.

## Testes

```powershell
cd sharing
npm install
npm test
```

Os testes requerem Node.js 24+. Usam SQLite real em memória e simulam a resposta externa do Turnstile. Os testes do frontend usam jsdom para verificar a consulta, compatibilidade dos links antigos e preservação dos dados locais. Para testar com bindings Cloudflare locais: `npx wrangler@4 dev` dentro de `sharing`; a configuração de produção requer as migrations remotas indicadas acima.
