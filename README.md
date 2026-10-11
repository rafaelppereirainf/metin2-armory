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

As imagens do jogo e marcas pertencem aos respetivos titulares. Projeto de fã, sem afiliação à Gameforge. A publicação neste repositório não concede direitos sobre os recursos do jogo.
