# Mapeamento do Sistema Atual - LocalStorage para Firebird

## Visão Geral

Este documento mapeia a estrutura atual do sistema de inspeções que utiliza **localStorage** para uma implementação com **Firebird** via backend Node.js + Express.

---

## 1. Estrutura de Dados Atual (LocalStorage)

### 1.1 Interface `InspectionRecord`

Atualmente armazenada como JSON no localStorage com a chave `inspection_records`.

```typescript
interface InspectionRecord {
  id: string                      // Formato: "timestamp-random" (ex: "1730745123456-abc123")
  timestamp: number               // Timestamp em milissegundos
  dataHora: string               // Data/hora formatada (ex: "05/11/2025 14:30:45")
  foto: string                   // Base64 data URL da imagem
  referenceData: ReferenceData   // Dados de referência do produto
  inspectionStates: InspectionStates  // Estados de conformidade
  linhaProducaoId?: number    // Referência opcional à TBLINHA_PRODUCAO
  fase?: string                // Fase da inspeção manual
  observacoes?: string           // Campo opcional (não implementado)
  usuario?: string               // Campo opcional (não implementado)
  localizacao?: string           // Campo opcional (não implementado)
}
```

### 1.2 Interface `ReferenceData`

```typescript
interface ReferenceData {
  op: string                // Ordem de Produção
  lote: string              // Lote do produto
  validade: string          // Data de validade (formato: "MM/YYYY")
  produto: string           // Nome completo do produto
  registroAnvisa: string    // Registro na ANVISA
  gtin: string              // Código GTIN do produto
  linhaProducaoId?: number  // ID da linha em TBLINHA_PRODUCAO
}
```

### 1.3 Interface `InspectionStates`

```typescript
interface InspectionStates {
  gtin: ConformityState         // true = aprovado, false = reprovado, null = não marcado
  datamatrix: ConformityState
  lote: ConformityState
  validade: ConformityState
}

type ConformityState = boolean | null
```

---

## 2. Funções do Serviço LocalStorage

Arquivo atual: `src/services/storageService.ts`

| Função | Descrição | Operação |
|--------|-----------|----------|
| `saveInspectionRecord(record)` | Salva novo registro | CREATE |
| `getAllRecords()` | Busca todos os registros | READ ALL |
| `getRecordById(id)` | Busca registro específico | READ ONE |
| `deleteRecord(id)` | Exclui um registro | DELETE ONE |
| `deleteMultipleRecords(ids[])` | Exclui múltiplos registros | DELETE MANY |
| `clearAllRecords()` | Limpa todos os registros | DELETE ALL |
| `filterRecords(campo, termo)` | Filtra registros | READ FILTERED |
| `getPaginatedRecords(options, filtered?)` | Pagina resultados | READ PAGINATED |
| `generateRecordId()` | Gera ID único | UTILITY |
| `formatDateTime(timestamp)` | Formata data/hora | UTILITY |
| `exportRecordsAsJSON()` | Exporta como JSON | EXPORT |
| `importRecordsFromJSON(json)` | Importa de JSON | IMPORT |
| `getStorageInfo()` | Info de uso do storage | UTILITY |

---

## 3. Mapeamento para Firebird

### 3.0 Metadados atuais usados como referência

O DDL anexado foi gerado pelo IBExpert em **30/06/2026 08:47:13** para o banco `SYSVIEW.FDB`. Para esta integração:

- A tabela antiga documentada como `TB_INSPECOES` passa a ser `TBINSPECAO_MANUAL`.
- Este projeto persiste apenas inspeções manuais em `TBINSPECAO_MANUAL`.
- A tabela `TBINSPECAO` já existe no banco atual, mas não será usada por este projeto; ela fica reservada para o registro de inspeções do projeto SICFAR.
- A tabela `TBINSPECAO_CAM0` também pertence ao fluxo existente do banco e fica fora do escopo da inspeção manual.
- A tabela de produtos em uso no projeto é `TBPRODUTOS`. O DDL anexado mostra a estrutura equivalente como `TBPRODUTO`; mantenha o nome operacional `TBPRODUTOS`.
- Os dados de OP, lote, validade, GTIN e ANVISA aparecem no metadado atual em `TBOP`.
- O campo `LINHAPRODUCAO_ID` da inspeção manual referencia `TBLINHA_PRODUCAO(LINHAPRODUCAO_ID)`.

### 3.1 Estrutura de Tabelas

#### Tabela: `TBPRODUTOS` (Cadastro de Produtos)
**Já deve existir no banco Firebird**

```sql
-- Estrutura de referência baseada no cadastro de produto do metadado atual.
-- Não executar se a tabela TBPRODUTOS já existir no banco.
CREATE TABLE TBPRODUTOS (
  PRODUTO_ID        INTEGER NOT NULL PRIMARY KEY,
  ERP_PRODUTO       VARCHAR(10),
  PRODUTO           VARCHAR(80),
  ARQUIVO_MENSAGEM  BLOB SUB_TYPE 0 SEGMENT SIZE 80,
  MENSAGEM          VARCHAR(255),
  DATA_INC          TIMESTAMP,
  USUARIO_I         INTEGER,
  USUARIONOME_I     VARCHAR(30),
  DATA_ALT          TIMESTAMP,
  USUARIO_A         INTEGER,
  USUARIONOME_A     VARCHAR(30),
  DATA_DEL          TIMESTAMP,
  USUARIO_D         INTEGER,
  USUARIONOME_D     VARCHAR(30),
  DELETADO          CHAR(1)
);

CREATE INDEX IDX_TBPRODUTOS_ERP_PRODUTO ON TBPRODUTOS(ERP_PRODUTO);
CREATE INDEX IDX_TBPRODUTOS_DELETADO ON TBPRODUTOS(DELETADO);
```

#### Tabela: `TBOP` (Ordem de Produção)
**Existente no metadado atual e usada para buscar referência por OP**

```sql
-- Campos relevantes do metadado atual.
CREATE TABLE TBOP (
  OP_ID             INTEGER NOT NULL PRIMARY KEY,
  OP                VARCHAR(10),
  STATUS            VARCHAR(10) DEFAULT 'Aberto',
  ERP_PRODUTO       VARCHAR(10),
  PRODUTO           VARCHAR(80),
  LOTE              VARCHAR(10),
  VALIDADE          DATE,
  GTIN              VARCHAR(20),
  ANVISA            VARCHAR(20),
  DOSSIE            VARCHAR(20),
  DATA_INC          TIMESTAMP,
  DELETADO          CHAR(10) DEFAULT 'N',
  LINHAPRODUCAO_ID  INTEGER,
  LINHAPRODUCAO     VARCHAR(50)
);

CREATE INDEX TBOP_LOTE ON TBOP(LOTE);
```

#### Tabela: `TBINSPECAO_MANUAL` (Registros de Inspeção)
**Nova tabela a ser criada**

```sql
CREATE TABLE TBINSPECAO_MANUAL (
  INSPECAO_MANUAL_ID  INTEGER NOT NULL,
  OP_ID               INTEGER,
  OP                  VARCHAR(10),
  ERP_PRODUTO         VARCHAR(10),
  PRODUTO             VARCHAR(80),
  LOTE                VARCHAR(10),
  VALIDADE            DATE,
  GTIN                VARCHAR(20),
  REGISTRO_ANVISA     VARCHAR(20),
  LINHAPRODUCAO_ID    INTEGER,
  FASE                VARCHAR(10),
  DATA                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CAMINHO_FOTO        VARCHAR(500),
  GTIN_CONFORME       SMALLINT,        -- 1 = conforme, 0 = não conforme, NULL = não marcado
  DATAMATRIX_CONFORME SMALLINT,
  LOTE_CONFORME       SMALLINT,
  VALIDADE_CONFORME   SMALLINT,
  OBSERVACOES         VARCHAR(1000),
  USUARIO_ID          INTEGER,
  USUARIO             VARCHAR(30),
  LOCALIZACAO         VARCHAR(200),
  DELETADO            CHAR(1) DEFAULT 'N',

  CONSTRAINT PK_TBINSPECAO_MANUAL PRIMARY KEY (INSPECAO_MANUAL_ID),
  CONSTRAINT FK_TBINSPMANUAL_OP FOREIGN KEY (OP_ID) REFERENCES TBOP(OP_ID),
  CONSTRAINT FK_TBINSPMANUAL_LINHA FOREIGN KEY (LINHAPRODUCAO_ID) REFERENCES TBLINHA_PRODUCAO(LINHAPRODUCAO_ID)
);

-- Generator para auto-incremento
CREATE GENERATOR GEN_TBINSPECAO_MANUAL_ID;
SET GENERATOR GEN_TBINSPECAO_MANUAL_ID TO 0;

-- Trigger para auto-incremento
CREATE TRIGGER TRG_TBINSPECAO_MANUAL_BI FOR TBINSPECAO_MANUAL
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
  IF (NEW.INSPECAO_MANUAL_ID IS NULL) THEN
    NEW.INSPECAO_MANUAL_ID = GEN_ID(GEN_TBINSPECAO_MANUAL_ID, 1);
END;

-- Índices para otimizar buscas
CREATE INDEX IDX_TBINSPMANUAL_OP ON TBINSPECAO_MANUAL(OP);
CREATE INDEX IDX_TBINSPMANUAL_DATA ON TBINSPECAO_MANUAL(DATA DESC);
CREATE INDEX IDX_TBINSPMANUAL_USUARIO ON TBINSPECAO_MANUAL(USUARIO);
CREATE INDEX IDX_TBINSPMANUAL_LINHA ON TBINSPECAO_MANUAL(LINHAPRODUCAO_ID);
CREATE INDEX IDX_TBINSPMANUAL_FASE ON TBINSPECAO_MANUAL(FASE);
CREATE INDEX IDX_TBINSPMANUAL_DELETADO ON TBINSPECAO_MANUAL(DELETADO);
```

### 3.2 Armazenamento de Fotos

As fotos atualmente são armazenadas como **Base64** no localStorage. No Firebird:

**Opção escolhida: Sistema de Arquivos**
- Fotos salvas em: `/backend/uploads/fotos/YYYY/MM/DD/`
- Formato do nome: `{INSPECAO_MANUAL_ID}_{timestamp}.jpg`
- Caminho salvo no banco: `fotos/YYYY/MM/DD/{INSPECAO_MANUAL_ID}_{timestamp}.jpg`

**Estrutura de diretórios:**
```
backend/
└── uploads/
    └── fotos/
        └── 2025/
            └── 11/
                └── 05/
                    ├── 1_1730745123456.jpg
                    ├── 2_1730745234567.jpg
                    └── ...
```

---

## 4. Mapeamento de Funções: LocalStorage → API Backend

### 4.1 Operações CRUD

| Função LocalStorage | Endpoint API | Método | Descrição |
|---------------------|-------------|--------|-----------|
| `saveInspectionRecord(record)` | `/api/inspecoes` | POST | Cria nova inspeção |
| `getAllRecords()` | `/api/inspecoes` | GET | Lista todas as inspeções |
| `getRecordById(id)` | `/api/inspecoes/:id` | GET | Busca inspeção específica |
| `deleteRecord(id)` | `/api/inspecoes/:id` | DELETE | Exclui uma inspeção |
| `deleteMultipleRecords(ids)` | `/api/inspecoes/batch` | DELETE | Exclui múltiplas inspeções |
| `clearAllRecords()` | *(não implementar)* | - | Operação perigosa - não expor |

### 4.2 Operações de Busca e Filtro

| Função LocalStorage | Endpoint API | Método | Descrição |
|---------------------|-------------|--------|-----------|
| `filterRecords(campo, termo)` | `/api/inspecoes?campo=X&termo=Y` | GET | Busca filtrada |
| `getPaginatedRecords(options)` | `/api/inspecoes?page=1&limit=10` | GET | Busca paginada |

### 4.3 Operações com Dados de Referência

| Operação | Endpoint API | Método | Descrição |
|----------|-------------|--------|-----------|
| Buscar produto por OP | `/api/produtos/:op` | GET | Retorna dados de referência |
| Listar produtos | `/api/produtos` | GET | Lista produtos disponíveis |
| Buscar por GTIN | `/api/produtos/gtin/:gtin` | GET | Busca por código GTIN |

### 4.4 Operações de Exportação

| Função LocalStorage | Endpoint API | Método | Descrição |
|---------------------|-------------|--------|-----------|
| `exportRecordsAsJSON()` | `/api/inspecoes/export/json` | GET | Exporta JSON |
| - | `/api/inspecoes/export/csv` | GET | Exporta CSV (novo) |
| - | `/api/inspecoes/export/excel` | GET | Exporta Excel (novo) |

---

## 5. Transformação de Dados

### 5.1 LocalStorage → Firebird (Salvar Inspeção)

**Dados enviados pelo frontend:**
```json
{
  "fotoBase64": "data:image/jpeg;base64,...",
  "referenceData": {
    "op": "12345",
    "lote": "L2024001",
    "validade": "12/2025",
    "produto": "Medicamento XYZ 500mg",
    "registroAnvisa": "1.0234.5678",
    "gtin": "7891234567890"
  },
  "fase": "Fase 1",
  "inspectionStates": {
    "gtin": true,
    "datamatrix": true,
    "lote": false,
    "validade": true
  }
}
```

**Processamento no backend:**
1. Decodificar Base64 da foto
2. Salvar foto no sistema de arquivos
3. Buscar a OP em `TBOP` e complementar com `TBPRODUTOS` quando necessário
4. Inserir o registro manual em `TBINSPECAO_MANUAL`
5. Retornar ID da inspeção criada

**SQL executado:**
```sql
-- 1. Buscar referência da OP no banco atual
SELECT FIRST 1
  o.OP_ID,
  p.PRODUTO_ID,
  o.OP,
  o.ERP_PRODUTO,
  o.LOTE,
  o.VALIDADE,
  COALESCE(o.PRODUTO, p.PRODUTO) AS PRODUTO,
  o.ANVISA AS REGISTRO_ANVISA,
  o.GTIN,
  o.LINHAPRODUCAO_ID
FROM TBOP o
LEFT JOIN TBPRODUTOS p ON p.ERP_PRODUTO = o.ERP_PRODUTO
WHERE o.OP = ?
  AND COALESCE(o.DELETADO, 'N') = 'N'
ORDER BY o.DATA_INC DESC;

-- 2. Inserir inspeção manual
INSERT INTO TBINSPECAO_MANUAL (
  OP_ID, OP, ERP_PRODUTO, PRODUTO, LOTE, VALIDADE, REGISTRO_ANVISA, GTIN,
  LINHAPRODUCAO_ID, FASE, DATA, CAMINHO_FOTO,
  GTIN_CONFORME, DATAMATRIX_CONFORME, LOTE_CONFORME, VALIDADE_CONFORME
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
RETURNING INSPECAO_MANUAL_ID;
```

### 5.2 Firebird → Frontend (Buscar Inspeções)

**SQL executado:**
```sql
SELECT
  i.INSPECAO_MANUAL_ID,
  i.DATA,
  i.CAMINHO_FOTO,
  i.GTIN_CONFORME,
  i.DATAMATRIX_CONFORME,
  i.LOTE_CONFORME,
  i.VALIDADE_CONFORME,
  i.OBSERVACOES,
  i.USUARIO,
  i.OP,
  i.LOTE,
  i.VALIDADE,
  i.PRODUTO,
  i.REGISTRO_ANVISA,
  i.GTIN,
  i.LINHAPRODUCAO_ID,
  i.FASE
FROM TBINSPECAO_MANUAL i
WHERE COALESCE(i.DELETADO, 'N') = 'N'
ORDER BY i.DATA DESC
ROWS ? TO ?;
```

**Dados retornados para o frontend:**
```json
{
  "data": [
    {
      "id": "1",
      "timestamp": 1730745123456,
      "dataHora": "05/11/2025 14:32:03",
      "foto": "/api/fotos/2025/11/05/1_1730745123456.jpg",
      "referenceData": {
        "op": "12345",
        "lote": "L2024001",
        "validade": "12/2025",
        "produto": "Medicamento XYZ 500mg",
        "registroAnvisa": "1.0234.5678",
        "gtin": "7891234567890"
      },
      "linhaProducaoId": 1,
      "fase": "Fase 1",
      "inspectionStates": {
        "gtin": true,
        "datamatrix": true,
        "lote": false,
        "validade": true
      }
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 10,
  "totalPages": 15
}
```

---

## 6. Adaptações Necessárias no Frontend

### 6.1 Substituir `storageService.ts` por `apiService.ts`

Criar novo arquivo: `src/services/apiService.ts`

**Antes (localStorage):**
```typescript
import { saveInspectionRecord } from '@/services/storageService'

const record: InspectionRecord = { /* ... */ }
saveInspectionRecord(record)
```

**Depois (API):**
```typescript
import { createInspection } from '@/services/apiService'

const data = { /* ... */ }
await createInspection(data)
```

### 6.2 Mudanças nas Páginas

#### HomePage.tsx
- Linha 25: Substituir `import { saveInspectionRecord } from '@/services/storageService'`
- Linha 92-129: Modificar `handleConfirmSave()` para chamar API
- Linha 40-47: Remover dados hardcoded, buscar de API

#### ConsultaPage.tsx
- Linha 32-39: Substituir imports de `storageService`
- Linha 45: Substituir `getAllRecords()` por chamada à API
- Linha 95-105: Modificar `handleDeleteRecord()` para chamar API
- Linha 108-123: Modificar `handleDeleteSelected()` para chamar API

---

## 7. Campos Adicionais Futuros

Campos já previstos na interface TypeScript mas não implementados:

| Campo | Tipo | Implementação Sugerida |
|-------|------|------------------------|
| `observacoes` | string? | Campo de texto na tela de inspeção |
| `usuario` | string? | Obtido do sistema de autenticação |
| `localizacao` | string? | Obtido via geolocalização do navegador |

---

## 8. Considerações de Migração

### 8.1 Migração de Dados Existentes

Se houver dados no localStorage que precisam ser migrados:

1. Exportar dados do localStorage via `exportRecordsAsJSON()`
2. Criar script de migração no backend: `scripts/migrate-localStorage.js`
3. Processar JSON e inserir no Firebird
4. Validar integridade dos dados migrados

### 8.2 Estratégia de Transição

**Opção A: Big Bang (Recomendado para este projeto)**
- Substituir completamente localStorage por API
- Mais simples de implementar
- Menos código para manter

**Opção B: Gradual (Se necessário manter compatibilidade)**
- Manter ambos os métodos temporariamente
- Usar feature flag para alternar entre localStorage e API
- Migrar gradualmente

---

## 9. Resumo do Impacto

### Arquivos a Criar (Backend)
- `backend/src/config/database.js` - Configuração Firebird
- `backend/src/controllers/inspecoes.controller.js`
- `backend/src/controllers/produtos.controller.js`
- `backend/src/services/inspecoes.service.js`
- `backend/src/services/produtos.service.js`
- `backend/src/services/fotos.service.js`
- `backend/src/routes/inspecoes.routes.js`
- `backend/src/routes/produtos.routes.js`
- `backend/src/middlewares/upload.middleware.js`
- `backend/src/middlewares/errorHandler.js`
- `backend/server.js`

### Arquivos a Criar/Modificar (Frontend)
- **CRIAR:** `src/services/apiService.ts`
- **CRIAR:** `src/lib/api-client.ts`
- **CRIAR:** `src/hooks/useInspections.ts`
- **CRIAR:** `src/hooks/useProducts.ts`
- **MODIFICAR:** `src/pages/HomePage.tsx`
- **MODIFICAR:** `src/pages/ConsultaPage.tsx`
- **MODIFICAR:** `.env` (adicionar URL da API)

### Arquivos a Deprecar (Frontend)
- `src/services/storageService.ts` (manter apenas funções utilitárias ou remover)

---

## 10. Próximos Passos

1. ✅ **Revisar este documento** - Validar mapeamento com sua estrutura Firebird existente
2. 📝 **Ajustar schema de banco** - Adequar nomes de tabelas/campos conforme padrão do projeto
3. 🔨 **Implementar backend** - Criar API Node.js + Express
4. 🔌 **Implementar frontend** - Criar serviços e adaptar componentes
5. 🧪 **Testar integração** - Validar fluxo completo
6. 📊 **Migrar dados** - Se houver dados existentes no localStorage

---

**Documento criado em:** 04/11/2025
**Versão:** 1.0
**Status:** Rascunho para revisão
