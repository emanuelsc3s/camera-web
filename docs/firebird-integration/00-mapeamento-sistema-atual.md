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

### 3.1 Estrutura de Tabelas

#### Tabela: `TB_PRODUTOS` (Dados de Referência)
**Já deve existir no banco Firebird**

```sql
CREATE TABLE TB_PRODUTOS (
  ID_PRODUTO       INTEGER NOT NULL PRIMARY KEY,
  OP               VARCHAR(50) NOT NULL,
  LOTE             VARCHAR(50) NOT NULL,
  VALIDADE         VARCHAR(10),
  PRODUTO          VARCHAR(500) NOT NULL,
  REGISTRO_ANVISA  VARCHAR(50),
  GTIN             VARCHAR(14) NOT NULL,
  DATA_CRIACAO     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimizar buscas
CREATE INDEX IDX_PRODUTOS_OP ON TB_PRODUTOS(OP);
CREATE INDEX IDX_PRODUTOS_GTIN ON TB_PRODUTOS(GTIN);
CREATE UNIQUE INDEX IDX_PRODUTOS_OP_LOTE ON TB_PRODUTOS(OP, LOTE);
```

#### Tabela: `TB_INSPECOES` (Registros de Inspeção)
**Nova tabela a ser criada**

```sql
CREATE TABLE TB_INSPECOES (
  ID_INSPECAO         INTEGER NOT NULL PRIMARY KEY,
  ID_PRODUTO          INTEGER NOT NULL,
  DATA_HORA           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CAMINHO_FOTO        VARCHAR(500) NOT NULL,
  GTIN_CONFORME       SMALLINT,        -- 1 = conforme, 0 = não conforme, NULL = não marcado
  DATAMATRIX_CONFORME SMALLINT,
  LOTE_CONFORME       SMALLINT,
  VALIDADE_CONFORME   SMALLINT,
  OBSERVACOES         VARCHAR(1000),
  USUARIO             VARCHAR(100),
  LOCALIZACAO         VARCHAR(200),

  CONSTRAINT FK_INSP_PRODUTO FOREIGN KEY (ID_PRODUTO) REFERENCES TB_PRODUTOS(ID_PRODUTO)
);

-- Generator para auto-incremento
CREATE GENERATOR GEN_TB_INSPECOES_ID;
SET GENERATOR GEN_TB_INSPECOES_ID TO 0;

-- Trigger para auto-incremento
CREATE TRIGGER TRG_TB_INSPECOES_BI FOR TB_INSPECOES
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
  IF (NEW.ID_INSPECAO IS NULL) THEN
    NEW.ID_INSPECAO = GEN_ID(GEN_TB_INSPECOES_ID, 1);
END;

-- Índices para otimizar buscas
CREATE INDEX IDX_INSP_PRODUTO ON TB_INSPECOES(ID_PRODUTO);
CREATE INDEX IDX_INSP_DATA_HORA ON TB_INSPECOES(DATA_HORA DESC);
CREATE INDEX IDX_INSP_USUARIO ON TB_INSPECOES(USUARIO);
```

### 3.2 Armazenamento de Fotos

As fotos atualmente são armazenadas como **Base64** no localStorage. No Firebird:

**Opção escolhida: Sistema de Arquivos**
- Fotos salvas em: `/backend/uploads/fotos/YYYY/MM/DD/`
- Formato do nome: `{ID_INSPECAO}_{timestamp}.jpg`
- Caminho salvo no banco: `fotos/YYYY/MM/DD/{ID_INSPECAO}_{timestamp}.jpg`

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
3. Buscar ou criar produto em `TB_PRODUTOS`
4. Inserir registro em `TB_INSPECOES`
5. Retornar ID da inspeção criada

**SQL executado:**
```sql
-- 1. Buscar produto existente
SELECT ID_PRODUTO FROM TB_PRODUTOS
WHERE OP = ? AND LOTE = ?;

-- 2. Se não existir, criar produto
INSERT INTO TB_PRODUTOS (OP, LOTE, VALIDADE, PRODUTO, REGISTRO_ANVISA, GTIN)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING ID_PRODUTO;

-- 3. Inserir inspeção
INSERT INTO TB_INSPECOES (
  ID_PRODUTO, DATA_HORA, CAMINHO_FOTO,
  GTIN_CONFORME, DATAMATRIX_CONFORME, LOTE_CONFORME, VALIDADE_CONFORME
)
VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
RETURNING ID_INSPECAO;
```

### 5.2 Firebird → Frontend (Buscar Inspeções)

**SQL executado:**
```sql
SELECT
  i.ID_INSPECAO,
  i.DATA_HORA,
  i.CAMINHO_FOTO,
  i.GTIN_CONFORME,
  i.DATAMATRIX_CONFORME,
  i.LOTE_CONFORME,
  i.VALIDADE_CONFORME,
  i.OBSERVACOES,
  i.USUARIO,
  p.OP,
  p.LOTE,
  p.VALIDADE,
  p.PRODUTO,
  p.REGISTRO_ANVISA,
  p.GTIN
FROM TB_INSPECOES i
INNER JOIN TB_PRODUTOS p ON p.ID_PRODUTO = i.ID_PRODUTO
ORDER BY i.DATA_HORA DESC
LIMIT ? OFFSET ?;
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
