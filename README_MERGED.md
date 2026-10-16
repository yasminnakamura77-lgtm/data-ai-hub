# Data & AI Hub — merged

Uma aplicação React: a tela Home mantém todo o conteúdo original do Hub e inclui o catálogo de governança e o registro detalhado da fonte selecionada. O Hub Assistant permanece flutuante nessa mesma tela e nas demais telas existentes. Não há iframe, aplicação de governança separada ou aba obrigatória para alternar entre governança e chatbot.

O catálogo e o registro aparecem juntos. A primeira fonte de governança é selecionada automaticamente; clicar em outra linha atualiza o registro abaixo do catálogo. Os cinco registros, todos os campos, cards, modais e ações do catálogo original foram mantidos. Links `?source=...` continuam funcionando na Home. Dashboard e Explore data também foram preservados no menu, além de todas as telas anteriores do Hub.

## Estrutura

- `src/`: Hub original com sua navegação, dados de exemplo e chatbot.
- `src/governance/`: componentes, telas e utilitários da governança; somente os imports internos foram namespaceados para evitar conflitos.
- `src/GovernanceSection.tsx`: composição do catálogo e do registro na Home.
- `governance-api/`: backend original de governança, sem alteração.
- `dev-api/`: API original do Hub, sem alteração.
- `originals/`: os dois ZIPs enviados, preservados integralmente, byte a byte, incluindo documentação, configurações e dependências que constavam nos arquivos originais.
- `MERGE_MANIFEST.json`: origem e hashes de todos os arquivos, além do resultado das verificações de preservação.

## Executar

Requisitos originais: Node.js, pnpm, Python 3.11+, uv, checkout compartilhado `pilgrims-core-components` e banco `portfolio.db`.

O checkout `pilgrims-core-components` deve continuar ao lado de `merged`, como já era exigido por `idea1-3.0`. Seu arquivo `packages/config/dist/vite-preset.js` precisa estar compilado. Essa biblioteca, seu tema CSS e o banco `portfolio.db` **não foram incluídos nos ZIPs recebidos**; não foram substituídos por componentes ou dados diferentes.

Configure `PORTFOLIO_DB` para o banco existente. Na ausência dessa variável, a API mantém o caminho Windows original. As configurações Snowflake e AI continuam em `governance-api/.env` conforme `.env.example`.

Linux/macOS: `./start-merged.sh`.

Windows: execute `Abrir-Merged.bat`.

Acesse `http://localhost:5175`.

Os scripts iniciam um frontend e as duas APIs originais. O frontend encaminha `/api/catalogue/*` e `/api/query` para a governança em 8000; os endpoints originais de fontes reais, métricas, solicitações e linhagem permanecem na API do Hub em 8099. A alteração em `package.json` reúne as dependências necessárias; execute `pnpm install` para atualizar o lockfile, sem usar `--frozen-lockfile` na primeira instalação.

## Comportamentos originais preservados

O chatbot flutuante de `idea1-3.0` é um protótipo: as respostas de conversa usam o texto fixo original. A ação Ask AI da governança mantém sua implementação original e integração opcional. Os dados de governança são os cinco registros de demonstração originais. Não foi inventado um vínculo entre esses registros e as fontes reais de `portfolio.db`.

## Validação

Os ZIPs originais e arquivos copiados foram conferidos por SHA-256; o backend de governança e a API do Hub permanecem idênticos aos enviados. Os componentes de governança foram conferidos com a única transformação prevista de imports. Foram verificados os imports locais, a sintaxe TypeScript/TSX e Python, os cinco registros completos de governança e os textos/dados originais do chatbot.

A execução visual completa e o build conectado ao ambiente de origem dependem da biblioteca compartilhada e do banco externos ausentes nos anexos. Esses testes não foram apresentados como executados.
