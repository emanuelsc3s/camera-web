# Visão Geral da Integração Firebird

## Introdução

Este documento apresenta uma visão geral da arquitetura de integração entre a aplicação React de inspeção de câmeras e o banco de dados Firebird.

## Índice da Documentação

### Documentação Geral
- **[00-mapeamento-sistema-atual.md](./00-mapeamento-sistema-atual.md)** - Mapeamento do sistema atual (LocalStorage → Firebird)
- **[01-visao-geral.md](./01-visao-geral.md)** - Este documento (visão geral da arquitetura)
- **[02-backend-setup.md](./02-backend-setup.md)** - Configuração do backend Node.js + Express
- **[03-database-schema.md](./03-database-schema.md)** - Esquema do banco de dados Firebird
- **[04-api-endpoints.md](./04-api-endpoints.md)** - Documentação dos endpoints REST
- **[05-frontend-integration.md](./05-frontend-integration.md)** - Integração do frontend com a API
- **[06-deployment.md](./06-deployment.md)** - Guia de deploy e configuração

### Documentação Face ID (Sistema de Reconhecimento Facial)
- **[07-face-id-backend-api.md](./07-face-id-backend-api.md)** - API REST para reconhecimento facial (8 endpoints)
- **[08-face-id-database-schema.md](./08-face-id-database-schema.md)** - Modelagem completa do banco de dados (TBUSUARIO_FACEID, TBACESSO para auditoria)
- **[09-face-id-backend-implementation.md](./09-face-id-backend-implementation.md)** - Implementação completa do backend (services, controllers, utils)
- **[10-face-id-security-flows.md](./10-face-id-security-flows.md)** - Fluxos de segurança, LGPD e boas práticas

---

## Arquitetura Atual vs. Futura

### Arquitetura Atual (LocalStorage)

```
┌─────────────────────────────────────────┐
│         React Frontend                  │
│  (Vite + TypeScript + TailwindCSS)     │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ HomePage.tsx                       │ │
│  │ - Captura fotos                   │ │
│  │ - Marca conformidades             │ │
│  │ - Salva no localStorage           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ConsultaPage.tsx                  │ │
│  │ - Lista inspeções                 │ │
│  │ - Filtra e pagina                 │ │
│  │ - Exclui registros                │ │
│  │ - Lê do localStorage              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ storageService.ts                 │ │
│  │ - CRUD localStorage               │ │
│  │ - Fotos em Base64                 │ │
│  │ - Limite: ~5-10MB                 │ │
│  └───────────────────────────────────┘ │
│               ↓↑                        │
│  ┌───────────────────────────────────┐ │
│  │     Browser LocalStorage          │ │
│  │  (Armazenamento limitado)         │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Limitações:**
- ❌ Dados armazenados apenas no navegador
- ❌ Não compartilhável entre dispositivos
- ❌ Limite de ~5-10MB (problemas com muitas fotos)
- ❌ Não há backup automático
- ❌ Vulnerável a limpeza do cache do navegador
- ❌ Sem controle de acesso ou auditoria

---

### Arquitetura Futura (Firebird + Backend)

```
┌──────────────────────────────────────────────────────────────────┐
│                      React Frontend                              │
│              (Vite + TypeScript + React Query)                   │
│                                                                  │
│  ┌────────────────────┐        ┌──────────────────────────┐    │
│  │   HomePage.tsx     │        │   ConsultaPage.tsx       │    │
│  │  - Captura fotos   │        │  - Lista inspeções       │    │
│  │  - Envia para API  │        │  - Busca da API          │    │
│  └────────────────────┘        └──────────────────────────┘    │
│             ↓                              ↓                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              apiService.ts                              │    │
│  │  - createInspection()  - getInspections()              │    │
│  │  - getProductByOP()    - deleteInspection()            │    │
│  └────────────────────────────────────────────────────────┘    │
│             ↓                              ↓                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │               api-client.ts (axios)                     │    │
│  │  - HTTP client configurado                             │    │
│  │  - Interceptors para erros                             │    │
│  │  - Retry automático                                    │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP/REST
                            │ (JSON)
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Backend Node.js + Express                      │
│                        (Porta 8000)                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Rotas (routes/)                      │   │
│  │  - POST   /api/inspecoes          (criar inspeção)      │   │
│  │  - GET    /api/inspecoes          (listar inspeções)    │   │
│  │  - GET    /api/inspecoes/:id      (buscar por ID)       │   │
│  │  - DELETE /api/inspecoes/:id      (excluir inspeção)    │   │
│  │  - GET    /api/produtos/:op       (buscar produto)      │   │
│  │  - GET    /api/fotos/:caminho     (servir foto)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Controllers (controllers/)                │   │
│  │  - Validação de entrada                                 │   │
│  │  - Tratamento de erros HTTP                             │   │
│  │  - Chamada aos serviços                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Serviços (services/)                     │   │
│  │  - Lógica de negócio                                    │   │
│  │  - Queries SQL para Firebird                            │   │
│  │  - Processamento de fotos                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Pool de Conexões Firebird                     │   │
│  │  - node-firebird library                                │   │
│  │  - Gerenciamento de conexões                            │   │
│  │  - Transaction management                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬──────────────────────────────────────┘
                            │ SQL
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│                    Firebird Database                             │
│                   (Porta 3050 - padrão)                          │
│                                                                  │
│  ┌────────────────────┐        ┌──────────────────────────┐    │
│  │       TBOP         │        │    TBINSPECAO_MANUAL     │    │
│  │  - OP_ID (PK)      │◄───┐   │  - INSPECAOMANUAL_ID     │    │
│  │  - OP              │    │   │  - OP_ID (FK opcional) ──┤    │
│  │  - LOTE            │    └───┤  - DATA                  │    │
│  │  - VALIDADE        │        │  - CAMINHO_FOTO          │    │
│  │  - GTIN            │        │  - *_CONFORME: Sim/Não   │    │
│  │  - ANVISA          │        │  - OBSERVACOES           │    │
│  └────────────────────┘        │  - LINHAPRODUCAO_ID      │    │
│          │                     │  - FASE                  │    │
│          │                     │  - STATUS                │    │
│          │                     │  - DATA_INC / DATA_ALT   │    │
│          │                     │  - DATA_DEL / USUARIO_*  │    │
│          │                     │  - USUARIO               │    │
│          │                     └──────────────────────────┘    │
│          │ consulta auxiliar                                   │
│          ↓                                                      │
│  ┌────────────────────┐                                        │
│  │    TBPRODUTO       │                                        │
│  │  - PRODUTO_ID      │                                        │
│  │  - ERP_PRODUTO     │                                        │
│  │  - PRODUTO         │                                        │
│  └────────────────────┘                                        │
│                                                                  │
│  Observação: TBINSPECAO existe no banco, mas pertence ao SICFAR. │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    Sistema de Arquivos                           │
│                  backend/uploads/fotos/                          │
│                                                                  │
│  2025/                                                           │
│  └── 11/                                                         │
│      └── 05/                                                     │
│          ├── 1_1730745123456.jpg                                │
│          ├── 2_1730745234567.jpg                                │
│          └── 3_1730745345678.jpg                                │
└──────────────────────────────────────────────────────────────────┘
```

**Benefícios:**
- ✅ Dados centralizados e persistentes
- ✅ Compartilhável entre múltiplos dispositivos
- ✅ Sem limite de armazenamento (depende do servidor)
- ✅ Backup e recuperação do banco de dados
- ✅ Controle de acesso e auditoria
- ✅ Possibilidade de relatórios avançados
- ✅ Integração com outros sistemas

---

## Fluxo de Dados Principal

### 1. Fluxo de Criação de Inspeção

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Usuário  │────►│ Frontend │────►│ Backend  │────►│ Firebird │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                 │                 │                 │
     │  1. Captura    │                 │                 │
     │     foto       │                 │                 │
     │                │                 │                 │
     │  2. Marca      │                 │                 │
     │  conformidades │                 │                 │
     │                │                 │                 │
     │  3. Clica      │                 │                 │
     │     SALVAR     │                 │                 │
     │                │                 │                 │
     │                │ POST /api/      │                 │
     │                │ inspecoes       │                 │
     │                │ {foto,dados}    │                 │
     │                ├────────────────►│                 │
     │                │                 │                 │
     │                │                 │ 4. Salva foto   │
     │                │                 │    no disco     │
     │                │                 │                 │
     │                │                 │ 5. SELECT TBOP  │
     │                │                 │    + TBPRODUTO  │
     │                │                 ├────────────────►│
     │                │                 │                 │
     │                │                 │ 6. Dados da OP  │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │                │                 │ 7. INSERT INTO  │
     │                │                 │    TBINSPECAO_MANUAL │
     │                │                 ├────────────────►│
     │                │                 │                 │
     │                │                 │ 8. INSPECAOMANUAL_ID  │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │                │ 200 OK          │                 │
     │                │ {id,message}    │                 │
     │                │◄────────────────┤                 │
     │                │                 │                 │
     │  9. Toast:     │                 │                 │
     │  "Sucesso!"    │                 │                 │
     │◄───────────────┤                 │                 │
     │                │                 │                 │
```

### 2. Fluxo de Consulta de Inspeções

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Usuário  │────►│ Frontend │────►│ Backend  │────►│ Firebird │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                 │                 │                 │
     │  1. Acessa     │                 │                 │
     │  ConsultaPage  │                 │                 │
     │                │                 │                 │
     │                │ GET /api/       │                 │
     │                │ inspecoes?      │                 │
     │                │ page=1&limit=10 │                 │
     │                ├────────────────►│                 │
     │                │                 │                 │
     │                │                 │ 2. SELECT       │
     │                │                 │    com JOIN     │
     │                │                 ├────────────────►│
     │                │                 │                 │
     │                │                 │ 3. Resultados   │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │                │ 200 OK          │                 │
     │                │ {data,total,..} │                 │
     │                │◄────────────────┤                 │
     │                │                 │                 │
     │  4. Exibe      │                 │                 │
     │     tabela     │                 │                 │
     │◄───────────────┤                 │                 │
     │                │                 │                 │
     │  5. Clica      │                 │                 │
     │     em foto    │                 │                 │
     │                │                 │                 │
     │                │ GET /api/fotos/ │                 │
     │                │ 2025/11/05/...  │                 │
     │                ├────────────────►│                 │
     │                │                 │                 │
     │                │                 │ 6. Lê arquivo   │
     │                │                 │    do disco     │
     │                │                 │                 │
     │                │ 200 OK          │                 │
     │                │ (imagem JPEG)   │                 │
     │                │◄────────────────┤                 │
     │                │                 │                 │
     │  7. Exibe      │                 │                 │
     │     foto modal │                 │                 │
     │◄───────────────┤                 │                 │
     │                │                 │                 │
```

### 3. Fluxo de Busca de Produto (OP)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Usuário  │────►│ Frontend │────►│ Backend  │────►│ Firebird │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                 │                 │                 │
     │  1. Digite OP  │                 │                 │
     │     "12345"    │                 │                 │
     │                │                 │                 │
     │  2. Clica      │                 │                 │
     │     BUSCAR     │                 │                 │
     │                │                 │                 │
     │                │ GET /api/       │                 │
     │                │ produtos/12345  │                 │
     │                ├────────────────►│                 │
     │                │                 │                 │
     │                │                 │ 3. SELECT       │
     │                │                 │    WHERE OP=?   │
     │                │                 ├────────────────►│
     │                │                 │                 │
     │                │                 │ 4. Dados        │
     │                │                 │    produto      │
     │                │                 │◄────────────────┤
     │                │                 │                 │
     │                │ 200 OK          │                 │
     │                │ {referenceData} │                 │
     │                │◄────────────────┤                 │
     │                │                 │                 │
     │  5. Preenche   │                 │                 │
     │  ReferenceCard │                 │                 │
     │◄───────────────┤                 │                 │
     │                │                 │                 │
```

---

## Stack Tecnológica Completa

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS + shadcn/ui
- **State Management:**
  - React Query (TanStack Query) - Para estado do servidor
  - useState/useReducer - Para estado local
- **HTTP Client:** Axios
- **Formulários:** React Hook Form + Zod
- **Roteamento:** React Router DOM v6

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Linguagem:** JavaScript (ES6+)
- **Firebird Client:** node-firebird
- **Upload de Arquivos:** multer
- **CORS:** cors
- **Variáveis de Ambiente:** dotenv
- **Logger:** morgan
- **Validação:** express-validator

### Banco de Dados
- **SGBD:** Firebird 3.0+
- **Tabelas:** TBOP e TBPRODUTO para referência; TBINSPECAO_MANUAL para gravação deste projeto
- **Fora do escopo:** TBINSPECAO existente, reservada para o projeto SICFAR
- **Armazenamento de Fotos:** Sistema de arquivos

### Ferramentas de Desenvolvimento
- **Versionamento:** Git
- **Gerenciador de Pacotes:** npm
- **Execução Simultânea:** concurrently (para rodar frontend + backend)

---

## Estimativa de Esforço

### Backend (16-24 horas)
- ⏱️ Configuração inicial do projeto: 2h
- ⏱️ Configuração Firebird + Pool de conexões: 3h
- ⏱️ Rotas e Controllers: 4h
- ⏱️ Serviços de negócio: 5h
- ⏱️ Upload e gerenciamento de fotos: 3h
- ⏱️ Testes e ajustes: 3-5h

### Frontend (12-16 horas)
- ⏱️ Cliente API (axios setup): 2h
- ⏱️ Serviços e hooks React Query: 4h
- ⏱️ Adaptação HomePage: 2h
- ⏱️ Adaptação ConsultaPage: 3h
- ⏱️ Testes de integração: 3-5h

### Database (2-4 horas)
- ⏱️ Criação de tabelas: 1h
- ⏱️ Índices e otimizações: 1h
- ⏱️ Scripts de migração (se necessário): 1-2h

**Total estimado: 30-44 horas de desenvolvimento**

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Estrutura do banco diferente do planejado | Média | Alto | Validar schema antes de iniciar |
| Problemas com encoding de imagens | Baixa | Médio | Testar upload/download logo no início |
| Performance com muitas fotos | Média | Alto | Implementar paginação e lazy loading |
| CORS issues no desenvolvimento | Alta | Baixo | Configurar CORS corretamente desde o início |
| Limite de tamanho de upload | Média | Médio | Configurar limites adequados no multer |
| Falha na conexão Firebird | Baixa | Alto | Implementar retry e pool de conexões |

---

## Próximos Documentos

- **02-backend-setup.md** - Configuração completa do backend
- **03-frontend-integration.md** - Integração no frontend
- **04-api-endpoints.md** - Documentação detalhada dos endpoints
- **05-deployment-options.md** - Opções para rodar frontend + backend
- **06-next-steps.md** - Roadmap e próximos passos

---

**Documento criado em:** 04/11/2025
**Versão:** 1.0
**Autor:** Claude Code
