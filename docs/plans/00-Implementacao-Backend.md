# Plano Técnico de Implementação do Backend Firebird 2.5

## 1. Diagnóstico Inicial

- O repositório atual é frontend Vite/React/TypeScript; não existe pasta `backend/`.
- `package.json` raiz não possui `express`, `node-firebird`, `cors`, `morgan`, `express-rate-limit` ou dependências de teste backend.
- As inspeções ainda persistem em `localStorage` por `src/services/storageService.ts`.
- O Face ID ainda usa IndexedDB local em `src/services/faceIdStorageService.ts` e matching no navegador.
- A migration `docs/firebird-integration/migrations/20260630161100_criar_inspecao_manual_e_faceid.sql` já cobre a criação de `TBINSPECAO_MANUAL` e `TBUSUARIO_FACEID`.
- Conflitos encontrados:
  - Alguns documentos citam Firebird 3.0+ e `LIMIT/OFFSET`; a implementação deve usar Firebird 2.5 e `FIRST`/`ROWS`.
  - Alguns exemplos sugerem `scripts/create-tables.sql`; a regra vigente exige migration versionada em `docs/firebird-integration/migrations/`.
  - Face ID exige `FAILED_ATTEMPTS`, mas autenticação só com descriptor não identifica usuário em falha. Decisão segura: só incrementar `TBUSUARIO.FAILED_ATTEMPTS` quando houver usuário alvo por `usuarioId`/`matricula` ou match válido; falha sem usuário identificado será auditada em `TBACESSO` e controlada por rate limit de IP.

## 2. Arquitetura Proposta

- Criar backend separado em `backend/`, CommonJS, Node.js 18+, Express 4 e Firebird via `node-firebird`.
- Estrutura:
  - `backend/server.js`: inicialização, graceful shutdown.
  - `backend/src/app.js`: Express app testável.
  - `backend/src/config/env.js` e `database.js`: env, pool, query, transaction, ping.
  - `backend/src/routes/`: `health`, `produtos`, `inspecoes`, `fotos`, `faceId`.
  - `backend/src/controllers/`: camada HTTP, status codes e resposta.
  - `backend/src/services/`: regras de negócio e SQL.
  - `backend/src/middlewares/`: CORS, validação, erros, rate limit, contexto de IP/terminal.
  - `backend/src/utils/`: paginação Firebird, datas, path seguro, matemática vetorial, auditoria.
- Dependências planejadas:
  - Produção: `express`, `node-firebird`, `dotenv`, `cors`, `morgan`, `helmet`, `zod`, `express-rate-limit`, `jsonwebtoken`.
  - Desenvolvimento/teste: `nodemon`, `jest` ou `vitest`, `supertest`.
- Não usar PostgreSQL, Supabase, UUID nativo, JSONB, `SERIAL`, `IDENTITY`, `LIMIT/OFFSET` ou qualquer recurso fora do Firebird 2.5.

## 3. APIs e Contratos

- Health:
  - `GET /api/health`: retorna status da API, uptime e ping Firebird; `503` se o banco falhar.
- Produtos:
  - `GET /api/produtos/:op`: consulta `TBOP` e complementa via `TBPRODUTO`.
  - `GET /api/produtos/gtin/:gtin`: consulta por `TBOP.GTIN`.
  - `GET /api/produtos?page&limit`: lista `TBPRODUTO`.
- Inspeções manuais:
  - `POST /api/inspecoes`
  - `GET /api/inspecoes`
  - `GET /api/inspecoes/:id`
  - `DELETE /api/inspecoes/:id`
  - `DELETE /api/inspecoes/batch`, declarado antes de `/:id`.
  - `GET /api/inspecoes/export/json`
  - `GET /api/fotos/:year/:month/:day/:filename`
- Face ID descriptor-only:
  - `POST /api/face-id/register`
  - `POST /api/face-id/authenticate`
  - `GET /api/face-id/users`
  - `GET /api/face-id/users/:id`
  - `PUT /api/face-id/users/:id`
  - `DELETE /api/face-id/users/:id`
  - `GET /api/face-id/users/:id/access-history`
- O backend deve rejeitar foto de rosto em payload Face ID. Apenas `descriptor: number[128]` será aceito.

## 4. Plano por Fases

| Fase | Objetivo e arquivos | Decisões técnicas | Riscos | Aceite e testes |
|---|---|---|---|---|
| 1. Base backend | Criar `backend/`, `package.json`, `.env.example`, `src/app.js`, `server.js`. | Backend separado do frontend; comentários e docs em pt-BR; CORS para `localhost` e `127.0.0.1`. | Porta/conflito de env. | `npm run dev` inicia; `GET /api/health` responde sem banco ou com erro controlado. |
| 2. Firebird/pool | `src/config/database.js`, `scripts/test-connection.js`. | Pool `node-firebird`; queries parametrizadas; transações; ping `SELECT 1 FROM RDB$DATABASE`. | Driver, charset, path `.fdb`, pool vazando conexão. | Script conecta, executa ping e fecha pool. |
| 3. Validação de schema | Script somente leitura em `scripts/check-schema.js`. | Verificar `TBOP`, `TBPRODUTO`, `TBLINHA_PRODUCAO`, `TBUSUARIO`, `TBACESSO`, `TBINSPECAO_MANUAL`, `TBUSUARIO_FACEID`. | Base do cliente divergente. | Relatório mostra OK ou bloqueios; nenhuma migration aplicada automaticamente. |
| 4. Produtos | `produtos.service/controller/routes`. | SQL Firebird 2.5 com `FIRST 1`; não gravar em `TBPRODUTO`. | Campos reais divergirem do metadata. | cURL por OP, GTIN e lista paginada. |
| 5. Inspeções manuais | `inspecoes.service`, `fotos.service`, controllers e validators. | Usar somente `TBINSPECAO_MANUAL`; gerar `INSPECAOMANUAL_ID` via generator antes de salvar foto; inserir foto já no `INSERT` para evitar `DATA_ALT` indevido. | Inconsistência arquivo/DB se falhar no meio. | Criar, listar, buscar, excluir logicamente e servir foto. |
| 6. Fotos de inspeção | `uploads/fotos/YYYY/MM/DD`. | Caminho salvo relativo ao `UPLOAD_PATH`: `YYYY/MM/DD/{INSPECAOMANUAL_ID}_{timestamp}.jpg`; validar base64, MIME e tamanho. | Path traversal, disco cheio, base64 grande. | Foto salva, path seguro, 404 quando ausente. |
| 7. Face ID | `faceId.service/controller/routes`, `vectorMath.js`. | Descriptor 128 floats; BLOB 512 bytes; distância euclidiana; threshold padrão `0.6`; sem persistir foto. | BLOB retornado como stream/buffer, performance O(n). | Cadastro, update, soft delete, listagem e autenticação com match. |
| 8. Auditoria | `audit.service` usando `TBACESSO`. | Registrar `FACE_ID_REGISTER`, `UPDATE`, `DELETE`, `AUTH_SUCCESS`, `AUTH_FAILED`, IP, terminal, distância, confiança; truncar campos para limites Firebird. | `TBACESSO.ATIVIDADE` estourar 2000 chars. | Toda tentativa Face ID gera linha em `TBACESSO`. |
| 9. Segurança | `rateLimiter`, `helmet`, validações Zod, erro centralizado. | Rate limit em memória: auth 5/min/IP, cadastro 3/h/IP; não logar descriptor nem foto. | Ambiente multi-processo perde contador em memória. | 400 para payload inválido, 429 por excesso, logs sem biometria. |
| 10. Testes finais | `tests/` e roteiro cURL/Postman. | Unitários para status/conformidade/vector; integração com DB mock e teste manual Firebird. | Testes dependentes do banco real. | Checklist final aprovado em localhost/offline. |

## 5. Regras de Banco e Migration

- Usar a migration existente como base v1; ela já cria:
  - `TBINSPECAO_MANUAL`
  - `TBUSUARIO_FACEID`
  - generators, triggers, índices, FKs e checks principais.
- Não aplicar migration automaticamente. O backend apenas deve informar se ela ainda precisa ser executada manualmente com backup prévio.
- Não criar nem alterar `TBINSPECAO`.
- Validar se `TBUSUARIO.FAILED_ATTEMPTS` existe. Se não existir, gerar nova migration Firebird 2.5 em `docs/firebird-integration/migrations/` com nome `YYYYMMDDHHMMSS_adicionar_failed_attempts_tbusuario.sql`.
- Não criar tabelas novas fora da documentação.
- Se a base real tiver `TBINSPECAO_MANUAL` ou `TBUSUARIO_FACEID` divergente, gerar migration incremental, nunca recriar tabela existente sem revisão.

## 6. Regras Funcionais Obrigatórias

- Inspeções:
  - Gravar em `TBINSPECAO_MANUAL`.
  - Usar `INSPECAOMANUAL_ID`.
  - Preencher `LINHAPRODUCAO_ID`, `FASE`, `STATUS`.
  - Converter conformidades: `true -> 'Sim'`, `false -> 'Não'`, `null -> NULL`.
  - `STATUS`: `Rejeitado` se algum item for `Não`; `Aprovado` se todos forem `Sim`; `Aberto` se houver `NULL`.
  - Preencher `DATA_INC`, `USUARIO_I`, `USUARIONOME_I` na criação.
  - Exclusão sempre lógica: `DELETADO = 'S'`, `DATA_DEL`, `USUARIO_D`, `USUARIONOME_D`.
- Face ID:
  - Não receber, salvar ou auditar foto de rosto.
  - Gravar somente `DESCRIPTOR_FACIAL` em `TBUSUARIO_FACEID`.
  - Converter descriptor para BLOB de 512 bytes.
  - Matching no backend por distância euclidiana.
  - Auditoria sempre em `TBACESSO`.
  - Usar `TBUSUARIO.FAILED_ATTEMPTS` para bloqueio quando houver usuário identificado.
  - Registrar sucesso/falha com IP, terminal, distância, confiança e threshold.

## 7. Checklist Final de Execução

- [ ] Criar backend separado e instalar dependências.
- [ ] Configurar `.env.example` Firebird, CORS, upload, JWT e limites.
- [ ] Implementar pool Firebird e scripts somente leitura de conexão/schema.
- [ ] Validar migration existente; gerar nova migration apenas se faltar campo estrutural.
- [ ] Implementar health, produtos, inspeções, fotos e Face ID.
- [ ] Garantir que nenhum SQL grave em `TBINSPECAO`.
- [ ] Garantir que Face ID rejeite qualquer foto/base64.
- [ ] Implementar auditoria em `TBACESSO`.
- [ ] Implementar rate limiting e validação de payload.
- [ ] Rodar testes unitários, integração mockada e roteiro manual com Firebird.
- [ ] Validar execução offline por `localhost`/`127.0.0.1`.
