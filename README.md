# Metin2 Armory

Perfis de personagens, equipamentos e sets de Metin2, com status calculados, pet, alquimia, habilidades e Biólogo. Interface em português de Portugal.

## Usar

Cada visitante guarda os seus dados no navegador. **Exportar** cria um backup JSON; **Importar** recupera esse backup noutro navegador ou endereço. **Partilhar** cria um link de consulta contendo uma cópia da personagem e dos seus sets; alterações posteriores exigem um novo link.

Não existem contas ou sincronização de perfis. Não publiques os teus ficheiros de personagem neste repositório.

## Código

Site estático sem dependências ou compilação. `dist/index.html` carrega os scripts e a folha de estilos com caminhos relativos, compatíveis com GitHub Pages em subdiretórios.

- `app.js`: interface, personagens, sets, edição e persistência.
- `equipment.js`: equipamento e absorção.
- `status.js`: cálculo de status, refinamentos, habilidades e Biólogo.
- `*-catalog.js` e `catalog.js`: tabelas de equipamentos, bónus e efeitos.
- `asset-index.js` e `assets/`: imagens e respetivas referências.
- `style.css`: apresentação e adaptação a ecrãs pequenos.

Para desenvolvimento local, executa `python3 -m http.server 8000 --directory dist` e abre `http://localhost:8000`.

## Publicação

Em **Settings → Pages → Build and deployment**, escolhe **GitHub Actions**. O workflow publica `dist/` quando há um push para `main`, após verificar a sintaxe JavaScript. Também pode ser lançado manualmente na página Actions.

Trabalha numa branch para alterações maiores e integra em `main` quando estiverem prontas. O endereço final é apresentado pelo workflow.

## Cálculos e fontes

As tabelas e fórmulas usam as wikis Metin2 da Gameforge; a interface apresenta fontes e dados que precisam de confirmação. Os status calculados não representam dano final contra um alvo. Lâmina e Armadura usam a INT atual do set; no jogo, conservam a INT do momento da ativação.

As imagens do jogo e marcas pertencem aos respetivos titulares. Projeto de fã não oficial, sem afiliação ou aprovação da Gameforge ou da Webzen. Metin2, as marcas e as imagens do jogo pertencem aos respetivos titulares. A publicação neste repositório não concede direitos sobre os recursos do jogo.

## Backup da migração

O alojamento original foi mantido sem alterações: https://metin2-armory.aglowokapi4.chatgpt.site

Antes de mudar de endereço, exporta o perfil no original e importa-o no novo site. O armazenamento local é separado por endereço.
# Links curtos de partilha

A implementação Cloudflare Workers + D1 está em `sharing/`. Para ativar os links curtos, segue [o guia de configuração](sharing/README.md). Até preencher `dist/share-config.js`, os links completos antigos continuam disponíveis. Não coloques segredos Cloudflare ou a Secret Key Turnstile no repositório.

## Efeitos por set e laboratório PvM

`dist/effects-catalog.js` reúne itens especiais e consumíveis, com fontes individuais das wikis oficiais. `effects.js` valida compatibilidade, níveis e valores, e aplica os ticks por set. Estes campos seguem na exportação JSON e nas partilhas; em viewer são simulações temporárias. Ataque percentual de combate é distinto do ataque fixo mostrado no painel. Os bónus de HP percentual são aplicados à base natural, com o limite de +3500 documentado na wiki francesa.

`dist/combat.js` contém a estimativa de golpes físicos PvM a pé ou montado. Separa ataque principal/secundário da arma, usa atributos e fontes ativas, calcula quatro resultados (normal, crítico, furado e ambos) e compara ganhos isolados. Os dados do alvo podem ser preenchidos manualmente ou escolhidos nos perfis do simulador da wiki FR. Requer tabelas +0 e bloqueia armas com progressões especiais e Yohara. As fórmulas e limites estão visíveis na própria secção. Não modela habilidades ofensivas, PvP, transformação, DPS, bónus condicionais ou efeitos de sets de trajes; elementos são analisados um de cada vez. Valores devem ser calibrados contra golpes no jogo antes de decisões de investimento. As imagens dos novos efeitos provêm da wiki PT, mantendo os créditos gerais do projeto.

O laboratório também permite escolher montadas do catálogo sem alterar a montada equipada. Recalcula mínimos de atributos e ataque do cavalo pelo nível simulado; usa divisor 60 para Sura Armas e 30 nas restantes classes. A seleção e nível são guardados por set e transportados nas partilhas; em viewer são temporários. Os quatro poderes do Deus Dragão são configuráveis: Ataque, Vida, Defesa e Inteligência. Inteligência regista +20% mana máxima, não INT; o total de mana ainda não tem cálculo próprio. Defesa é redução de dano recebido, não defesa fixa nem aumento do dano causado.

`dist/target-catalog.js` contém 15 perfis derivados dos dados públicos do simulador da wiki francesa de Ankhseram: Metins, Razador, estátuas do Meley, três cabeças da Hidra e bosses finais Chen/Wei. São perfis base, sem fases, debuffs ou invulnerabilidade. A defesa de um alvo inclui defesa bruta + nível + VIT, e nos bosses finais do Zodíaco segue os ajustes explícitos do simulador (5000 + 136 + 200). As resistências à arma e ao elemento acompanham o tipo selecionado e admitem ajustes manuais. As regras de montadas das masmorras são respeitadas: Meley e Hidra requerem combate a pé. Bónus de ataque contra bosses é somado ao dano médio apenas quando o alvo é um boss (as estátuas do Meley são Metins).

Fonte dos perfis: https://fr-wiki.metin2.gameforge.com/index.php?title=Utilisateur:Ankhseram/WeaponsAndMonsters.js&action=raw ; fonte da estrutura e ajustes do simulador: https://fr-wiki.metin2.gameforge.com/index.php?title=MediaWiki:Script/Calculator.js&action=raw . O Armory utiliza um motor independente; não copia o simulador completo e não presume equivalência exata de todos os resultados.
