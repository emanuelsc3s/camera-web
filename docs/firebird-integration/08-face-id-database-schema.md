# Modelagem de Banco de Dados - Sistema Face ID (Firebird 2.5)

## Introdução

Este documento define a estrutura de banco de dados necessária para suportar o sistema de reconhecimento facial (Face ID) no Firebird 2.5, considerando as limitações da versão e seguindo os padrões de nomenclatura e auditoria já estabelecidos no sistema.

---

## Visão Geral das Tabelas

```
┌─────────────────────────────────────────────────────────────┐
│                    TBUSUARIO (existente)                    │
│  - USUARIO_ID (PK)                                          │
│  - NOME, EMAIL, SENHA                                       │
│  - FAILED_ATTEMPTS (INTEGER) ← Controle de falhas Face ID  │
│  - Campos de auditoria padrão                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ 1
                       │
                       │ N
┌──────────────────────┴──────────────────────────────────────┐
│              TBUSUARIO_FACEID (nova)                        │
│  - FACEID_ID (PK)                                           │
│  - USUARIO_ID (FK) → TBUSUARIO                              │
│  - DESCRIPTOR_FACIAL (BLOB) ← Vetor de 128 floats          │
│  - FOTO_URL (BLOB) ← Imagem JPEG/PNG do rosto              │
│  - MATRICULA (VARCHAR)                                      │
│  - ATIVO (CHAR(1))                                          │
│  - Campos de auditoria padrão                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TBACESSO (existente)                     │
│  - ACESSO_ID (PK)                                           │
│  - USUARIO_ID (FK) → TBUSUARIO                              │
│  - DATA (TIMESTAMP)                                         │
│  - TIPO, LOCAL, ATIVIDADE                                   │
│  - IP, COMPUTADOR                                           │
│  - Usado para auditoria de tentativas de Face ID           │
└─────────────────────────────────────────────────────────────┘
```

**Notas Importantes:**
- A tabela **TBACESSO** é utilizada para **auditoria** (histórico completo de tentativas)
- O campo **TBUSUARIO.FAILED_ATTEMPTS** é a **fonte de verdade** para contagem de falhas
- A cada falha de autenticação facial: `FAILED_ATTEMPTS = FAILED_ATTEMPTS + 1`
- A cada autenticação bem-sucedida: `FAILED_ATTEMPTS = 0`

---

## 1. Tabela TBUSUARIO_FACEID

Armazena os dados biométricos faciais dos usuários e suas fotos de referência.

### 1.1 Estrutura DDL

```sql
CREATE TABLE TBUSUARIO_FACEID (
    FACEID_ID           INTEGER NOT NULL,
    USUARIO_ID          INTEGER,

    -- Descriptor facial: vetor de 128 floats (512 bytes)
    -- Usado para reconhecimento e matching facial
    DESCRIPTOR_FACIAL   BLOB SUB_TYPE BINARY SEGMENT SIZE 512,

    -- Foto do rosto: imagem JPEG/PNG (50-200 KB típico)
    -- Armazenada diretamente no banco de dados
    FOTO_URL            BLOB SUB_TYPE BINARY SEGMENT SIZE 8192,

    MATRICULA           VARCHAR(30),
    ATIVO               CHAR(1) DEFAULT 'S',

    -- Campos de auditoria (padrão do sistema)
    DATA_INC            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    USUARIO_I           INTEGER,
    USUARIONOME_I       VARCHAR(30),
    DATA_ALT            TIMESTAMP,
    USUARIO_A           INTEGER,
    USUARIONOME_A       VARCHAR(30),
    DATA_DEL            TIMESTAMP,
    USUARIO_D           INTEGER,
    USUARIONOME_D       VARCHAR(30),

    CONSTRAINT PK_TBUSUARIO_FACEID PRIMARY KEY (FACEID_ID),
    CONSTRAINT FK_TBUSUARIO_FACEID FOREIGN KEY (USUARIO_ID)
        REFERENCES TBUSUARIO(USUARIO_ID) ON DELETE CASCADE,
    CONSTRAINT CHK_TBUSUARIO_FACEID_ATIVO CHECK (ATIVO IN ('S', 'N'))
);
```

### 1.2 Generators e Triggers

```sql
-- Generator para auto-incremento
CREATE GENERATOR GEN_TBUSUARIO_FACEID_ID;
SET GENERATOR GEN_TBUSUARIO_FACEID_ID TO 0;

-- Trigger para auto-incremento do ID
CREATE TRIGGER TRG_TBUSUARIO_FACEID_BI FOR TBUSUARIO_FACEID
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
    IF (NEW.FACEID_ID IS NULL) THEN
        NEW.FACEID_ID = GEN_ID(GEN_TBUSUARIO_FACEID_ID, 1);
    
    -- Define data de inclusão se não informada
    IF (NEW.DATA_INC IS NULL) THEN
        NEW.DATA_INC = CURRENT_TIMESTAMP;
END;

-- Trigger para atualização (auditoria)
CREATE TRIGGER TRG_TBUSUARIO_FACEID_BU FOR TBUSUARIO_FACEID
ACTIVE BEFORE UPDATE POSITION 0
AS
BEGIN
    NEW.DATA_ALT = CURRENT_TIMESTAMP;
END;
```

### 1.3 Índices

```sql
-- Índice para busca por usuário
CREATE INDEX IDX_FACEID_USUARIO_ID ON TBUSUARIO_FACEID(USUARIO_ID);

-- Índice para busca por matrícula
CREATE INDEX IDX_FACEID_MATRICULA ON TBUSUARIO_FACEID(MATRICULA);

-- Índice para filtrar apenas ativos
CREATE INDEX IDX_FACEID_ATIVO ON TBUSUARIO_FACEID(ATIVO);

-- Índice composto para busca de usuários ativos
CREATE INDEX IDX_FACEID_USUARIO_ATIVO ON TBUSUARIO_FACEID(USUARIO_ID, ATIVO);
```

### 1.4 Descrição dos Campos

| Campo | Tipo | Tamanho | Nulo | Descrição |
|-------|------|---------|------|-----------|
| FACEID_ID | INTEGER | 4 bytes | NÃO | Chave primária (auto-incremento) |
| USUARIO_ID | INTEGER | 4 bytes | SIM | FK para TBUSUARIO (pode ser NULL para cadastros sem vínculo) |
| DESCRIPTOR_FACIAL | BLOB | 512 bytes | NÃO | Vetor de 128 floats (128 × 4 bytes) representando o descritor facial |
| FOTO_URL | BLOB | 50-200 KB | SIM | Imagem JPEG/PNG do rosto armazenada diretamente no banco |
| MATRICULA | VARCHAR(30) | 30 chars | SIM | Matrícula do funcionário (pode ser usada para login) |
| ATIVO | CHAR(1) | 1 char | NÃO | 'S' = ativo, 'N' = inativo (soft delete) |
| DATA_INC | TIMESTAMP | 8 bytes | NÃO | Data/hora de criação do registro |
| USUARIO_I | INTEGER | 4 bytes | SIM | ID do usuário que criou o registro |
| USUARIONOME_I | VARCHAR(30) | 30 chars | SIM | Nome do usuário que criou |
| DATA_ALT | TIMESTAMP | 8 bytes | SIM | Data/hora da última alteração |
| USUARIO_A | INTEGER | 4 bytes | SIM | ID do usuário que alterou |
| USUARIONOME_A | VARCHAR(30) | 30 chars | SIM | Nome do usuário que alterou |
| DATA_DEL | TIMESTAMP | 8 bytes | SIM | Data/hora da exclusão lógica |
| USUARIO_D | INTEGER | 4 bytes | SIM | ID do usuário que excluiu |
| USUARIONOME_D | VARCHAR(30) | 30 chars | SIM | Nome do usuário que excluiu |

### 1.5 Observações Importantes

**DESCRIPTOR_FACIAL (BLOB SUB_TYPE BINARY SEGMENT SIZE 512):**
- Armazena o vetor de características faciais gerado pelo face-api.js
- **NÃO é uma imagem**, é um array de 128 números decimais (floats)
- Tamanho fixo: 128 floats × 4 bytes = **512 bytes**
- Usado para reconhecimento e matching facial (cálculo de distância euclidiana)
- Formato: Buffer binário de Float32Array

**FOTO_URL (BLOB SUB_TYPE BINARY SEGMENT SIZE 8192):**
- Armazena a **imagem completa** do rosto em formato JPEG ou PNG
- Tamanho típico: 50-200 KB (dependendo da qualidade e resolução)
- SEGMENT SIZE 8192 (8 KB): Otimizado para imagens (reduz fragmentação)
- Usado para **referência visual** e auditoria
- Pode ser exibida na interface do usuário
- **Opcional**: Pode ser NULL se não quiser armazenar a foto

**Vantagens de armazenar foto no banco:**
- ✅ Backup centralizado (tudo no banco de dados)
- ✅ Não precisa gerenciar arquivos no sistema de arquivos
- ✅ Transações ACID (foto e descriptor sempre consistentes)
- ✅ Mais simples para deploy e migração

**Desvantagens:**
- ⚠️ Banco de dados cresce mais (100 KB por usuário em média)
- ⚠️ Backup do banco fica maior
- ⚠️ Pode impactar performance em sistemas com muitos usuários

**Por que SEGMENT SIZE 512 para DESCRIPTOR_FACIAL?**
- Tamanho exato do descriptor: 512 bytes
- Com SEGMENT SIZE 512: **1 segmento** (ideal)
- Com SEGMENT SIZE 80 (padrão): **7 segmentos** (fragmentado)
- Menos segmentos = melhor performance de leitura/escrita

**Por que SEGMENT SIZE 8192 para FOTO_URL?**
- Tamanho típico da foto: 50-200 KB
- SEGMENT SIZE 8192 (8 KB): **7-25 segmentos** para foto típica
- Tamanho comum para BLOBs de imagem (balanceamento entre fragmentação e overhead)
- Foto de 100 KB = ~13 segmentos de 8 KB (razoável)
- Se usar 512 bytes: ~200 segmentos (muito fragmentado)
- Se usar 32 KB: ~3-7 segmentos (também bom, mas 8 KB é mais comum)

**Limitações do Firebird 2.5:**
- Tamanho máximo de BLOB: 2GB (mais que suficiente para fotos)
- Não possui tipo ARRAY nativo (por isso usamos BLOB para o descriptor)
- SEGMENT SIZE máximo: 32.767 bytes

---

## 2. Controle de Tentativas Falhas (TBUSUARIO.FAILED_ATTEMPTS)

### 2.1 Visão Geral

O campo **FAILED_ATTEMPTS** da tabela **TBUSUARIO** é utilizado como **fonte de verdade** para controlar a quantidade de tentativas de autenticação por Face ID que falharam.

**Comportamento:**
- ✅ **Incrementar em 1** a cada falha de autenticação facial
- ✅ **Zerar (0)** quando houver autenticação bem-sucedida
- ✅ **Bloquear usuário** quando atingir threshold (ex: 10 tentativas)
- ✅ **Resetar manualmente** quando necessário (suporte técnico)

**Diferença entre FAILED_ATTEMPTS e TBACESSO:**
- **TBUSUARIO.FAILED_ATTEMPTS**: Contador atual de falhas consecutivas (controle)
- **TBACESSO**: Histórico completo de todas as tentativas (auditoria)

### 2.2 Queries SQL para Controle de Tentativas

**Incrementar FAILED_ATTEMPTS após falha:**
```sql
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = FAILED_ATTEMPTS + 1
WHERE USUARIO_ID = :USUARIO_ID;
```

**Zerar FAILED_ATTEMPTS após sucesso:**
```sql
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = 0
WHERE USUARIO_ID = :USUARIO_ID;
```

**Verificar se usuário está bloqueado:**
```sql
SELECT
    USUARIO_ID,
    NOME,
    FAILED_ATTEMPTS
FROM TBUSUARIO
WHERE USUARIO_ID = :USUARIO_ID
  AND FAILED_ATTEMPTS >= 10; -- Threshold de bloqueio
```

**Buscar usuários com muitas tentativas falhas:**
```sql
SELECT
    u.USUARIO_ID,
    u.NOME,
    u.EMAIL,
    u.FAILED_ATTEMPTS,
    f.MATRICULA
FROM TBUSUARIO u
LEFT JOIN TBUSUARIO_FACEID f ON f.USUARIO_ID = u.USUARIO_ID
WHERE u.FAILED_ATTEMPTS >= 5
ORDER BY u.FAILED_ATTEMPTS DESC;
```

**Resetar FAILED_ATTEMPTS manualmente (suporte):**
```sql
-- Resetar para um usuário específico
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = 0
WHERE USUARIO_ID = :USUARIO_ID;

-- Resetar para todos os usuários (manutenção)
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = 0
WHERE FAILED_ATTEMPTS > 0;
```

### 2.3 Fluxo de Atualização do FAILED_ATTEMPTS

**Cenário 1: Autenticação Falhou**
```sql
-- 1. Incrementar contador de falhas
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = FAILED_ATTEMPTS + 1
WHERE USUARIO_ID = :USUARIO_ID;

-- 2. Registrar na TBACESSO (auditoria)
INSERT INTO TBACESSO (DATA, USUARIO_ID, LOCAL, TIPO, ATIVIDADE, IP, CHAVE_ID)
VALUES (CURRENT_TIMESTAMP, :USUARIO_ID, 'WEB_FACE_ID', 'FACE_ID_AUTH_FAILED', :JSON_DETALHES, :IP, NULL);

-- 3. Verificar se atingiu threshold de bloqueio
SELECT FAILED_ATTEMPTS FROM TBUSUARIO WHERE USUARIO_ID = :USUARIO_ID;
-- Se FAILED_ATTEMPTS >= 10, bloquear usuário
```

**Cenário 2: Autenticação Bem-Sucedida**
```sql
-- 1. Zerar contador de falhas
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = 0
WHERE USUARIO_ID = :USUARIO_ID;

-- 2. Registrar na TBACESSO (auditoria)
INSERT INTO TBACESSO (DATA, USUARIO_ID, LOCAL, TIPO, ATIVIDADE, IP, CHAVE_ID)
VALUES (CURRENT_TIMESTAMP, :USUARIO_ID, 'WEB_FACE_ID', 'FACE_ID_AUTH_SUCCESS', :JSON_DETALHES, :IP, :FACEID_ID);
```

### 2.4 Detecção de Tentativas Suspeitas

**Verificar usuários próximos ao bloqueio:**
```sql
SELECT
    u.USUARIO_ID,
    u.NOME,
    u.FAILED_ATTEMPTS,
    (10 - u.FAILED_ATTEMPTS) as TENTATIVAS_RESTANTES
FROM TBUSUARIO u
WHERE u.FAILED_ATTEMPTS >= 7 -- Alerta quando faltam 3 tentativas
ORDER BY u.FAILED_ATTEMPTS DESC;
```

**Verificar tentativas falhas por IP (últimos 15 minutos):**
```sql
SELECT
    a.IP,
    COUNT(*) as TOTAL_FALHAS,
    COUNT(DISTINCT a.USUARIO_ID) as USUARIOS_AFETADOS
FROM TBACESSO a
WHERE a.LOCAL = 'WEB_FACE_ID'
  AND a.TIPO = 'FACE_ID_AUTH_FAILED'
  AND a.DATA >= DATEADD(-15 MINUTE TO CURRENT_TIMESTAMP)
GROUP BY a.IP
HAVING COUNT(*) >= 10
ORDER BY TOTAL_FALHAS DESC;
```

---

## 3. Uso da Tabela TBACESSO para Auditoria de Face ID

A tabela TBACESSO existente será utilizada para registrar todas as tentativas de autenticação por Face ID, mantendo consistência com o sistema de auditoria já estabelecido.

### 2.1 Estrutura da TBACESSO (Existente)

```sql
CREATE TABLE TBACESSO (
    ACESSO_ID   INTEGER NOT NULL,
    DATA        TIMESTAMP,
    USUARIO_ID  INTEGER,
    USUARIO     VARCHAR(30),
    LOCAL       VARCHAR(30),
    TIPO        VARCHAR(30),
    ATIVIDADE   VARCHAR(2000),
    ONLINE      CHAR(1),
    IP          VARCHAR(15),
    COMPUTADOR  VARCHAR(30),
    VERSAO      VARCHAR(20),
    CONEXAO     BIGINT,
    CHAVE_ID    BIGINT,

    CONSTRAINT PK_TBACESSO PRIMARY KEY (ACESSO_ID),
    CONSTRAINT FK_TBACESSO_USER FOREIGN KEY (USUARIO_ID)
        REFERENCES TBUSUARIO (USUARIO_ID)
);
```

### 2.2 Mapeamento de Campos para Face ID

| Campo TBACESSO | Uso para Face ID | Exemplo de Valor |
|----------------|------------------|------------------|
| ACESSO_ID | ID único do registro | Auto-incremento |
| DATA | Data/hora da tentativa | CURRENT_TIMESTAMP |
| USUARIO_ID | ID do usuário (se autenticado) | 123 ou NULL |
| USUARIO | Nome do usuário (se autenticado) | "João Silva" ou NULL |
| LOCAL | Origem do acesso | "WEB_FACE_ID" |
| TIPO | Tipo de evento | "FACE_ID_AUTH_SUCCESS" ou "FACE_ID_AUTH_FAILED" |
| ATIVIDADE | Detalhes da tentativa (JSON) | Ver seção 2.3 |
| ONLINE | Sempre 'S' para Face ID | 'S' |
| IP | Endereço IP de origem | "192.168.1.100" |
| COMPUTADOR | User-Agent (navegador) | "Mozilla/5.0..." |
| VERSAO | Versão do sistema | "1.0.0" |
| CONEXAO | ID da sessão (opcional) | NULL |
| CHAVE_ID | ID do Face ID (FACEID_ID) | 456 ou NULL |

### 2.3 Valores Padronizados

**Campo LOCAL:**
- `"WEB_FACE_ID"` - Autenticação via Face ID na web

**Campo TIPO:**
- `"FACE_ID_AUTH_SUCCESS"` - Autenticação bem-sucedida
- `"FACE_ID_AUTH_FAILED"` - Autenticação falhou (rosto não reconhecido)
- `"FACE_ID_REGISTER"` - Cadastro de novo Face ID
- `"FACE_ID_UPDATE"` - Atualização de Face ID existente
- `"FACE_ID_DELETE"` - Exclusão de Face ID

**Campo ATIVIDADE (formato JSON):**

Para autenticação bem-sucedida:
```json
{
  "evento": "autenticacao_facial",
  "resultado": "sucesso",
  "faceIdId": 456,
  "distanciaMatch": 0.42,
  "confianca": 0.70,
  "matricula": "MAT001"
}
```

Para autenticação falha:
```json
{
  "evento": "autenticacao_facial",
  "resultado": "falha",
  "motivo": "Nenhum rosto correspondente encontrado",
  "melhorDistancia": 0.85,
  "threshold": 0.6
}
```

Para cadastro:
```json
{
  "evento": "cadastro_facial",
  "faceIdId": 456,
  "matricula": "MAT001",
  "fotoUrl": "2025/11/22/456_1732291234567.jpg"
}
```

### 2.4 Exemplo de Inserção

**Autenticação bem-sucedida:**
```sql
INSERT INTO TBACESSO (
    DATA,
    USUARIO_ID,
    USUARIO,
    LOCAL,
    TIPO,
    ATIVIDADE,
    ONLINE,
    IP,
    COMPUTADOR,
    CHAVE_ID
)
VALUES (
    CURRENT_TIMESTAMP,
    123,
    'João Silva',
    'WEB_FACE_ID',
    'FACE_ID_AUTH_SUCCESS',
    '{"evento":"autenticacao_facial","resultado":"sucesso","faceIdId":456,"distanciaMatch":0.42,"confianca":0.70,"matricula":"MAT001"}',
    'S',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    456
);
```

**Autenticação falha:**
```sql
INSERT INTO TBACESSO (
    DATA,
    USUARIO_ID,
    USUARIO,
    LOCAL,
    TIPO,
    ATIVIDADE,
    ONLINE,
    IP,
    COMPUTADOR,
    CHAVE_ID
)
VALUES (
    CURRENT_TIMESTAMP,
    NULL,
    NULL,
    'WEB_FACE_ID',
    'FACE_ID_AUTH_FAILED',
    '{"evento":"autenticacao_facial","resultado":"falha","motivo":"Nenhum rosto correspondente encontrado","melhorDistancia":0.85,"threshold":0.6}',
    'S',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    NULL
);
```

---

## 3. Queries Úteis

### 3.1 Cadastrar Novo Face ID

```sql
-- Inserir novo Face ID com descriptor e foto
INSERT INTO TBUSUARIO_FACEID (
    USUARIO_ID,
    DESCRIPTOR_FACIAL,
    FOTO_URL,
    MATRICULA,
    ATIVO,
    USUARIO_I,
    USUARIONOME_I
)
VALUES (
    :USUARIO_ID,
    :DESCRIPTOR_BLOB,      -- BLOB: Buffer de 512 bytes (128 floats)
    :FOTO_BLOB,            -- BLOB: Imagem JPEG/PNG (50-200 KB)
    :MATRICULA,
    'S',
    :USUARIO_LOGADO_ID,
    :USUARIO_LOGADO_NOME
)
RETURNING FACEID_ID;
```

**Exemplo de uso no backend (Node.js):**
```javascript
// Converter descriptor Float32Array para Buffer
const descriptorBuffer = Buffer.from(descriptor.buffer) // 512 bytes

// Converter foto Base64 para Buffer
const fotoBase64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '')
const fotoBuffer = Buffer.from(fotoBase64, 'base64') // 50-200 KB

// Inserir no banco
await db.query(`
  INSERT INTO TBUSUARIO_FACEID (
    USUARIO_ID, DESCRIPTOR_FACIAL, FOTO_URL, MATRICULA, ATIVO
  ) VALUES (?, ?, ?, ?, 'S')
`, [usuarioId, descriptorBuffer, fotoBuffer, matricula])
```

### 3.2 Buscar Todos os Descritores Ativos

```sql
-- Buscar todos os descritores para matching
-- NOTA: FOTO_URL agora é BLOB, não retornar em listagens (muito pesado)
SELECT
    f.FACEID_ID,
    f.USUARIO_ID,
    f.DESCRIPTOR_FACIAL,
    f.MATRICULA,
    -- f.FOTO_URL,  -- Não incluir BLOB de foto em listagens
    u.NOME,
    u.EMAIL
FROM TBUSUARIO_FACEID f
LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
WHERE f.ATIVO = 'S'
ORDER BY f.DATA_INC DESC;
```

**Buscar foto específica de um usuário:**
```sql
-- Buscar apenas a foto de um usuário específico
SELECT
    FACEID_ID,
    FOTO_URL
FROM TBUSUARIO_FACEID
WHERE FACEID_ID = :FACEID_ID
  AND ATIVO = 'S';
```

### 3.3 Registrar Tentativa de Autenticação

**Autenticação Bem-Sucedida (zerar FAILED_ATTEMPTS):**
```sql
-- 1. Zerar contador de falhas
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = 0
WHERE USUARIO_ID = :USUARIO_ID;

-- 2. Registrar na TBACESSO (auditoria)
INSERT INTO TBACESSO (
    DATA,
    USUARIO_ID,
    USUARIO,
    LOCAL,
    TIPO,
    ATIVIDADE,
    ONLINE,
    IP,
    COMPUTADOR,
    CHAVE_ID
)
VALUES (
    CURRENT_TIMESTAMP,
    :USUARIO_ID,
    :USUARIO_NOME,
    'WEB_FACE_ID',
    'FACE_ID_AUTH_SUCCESS',
    '{"evento":"autenticacao_facial","resultado":"sucesso","faceIdId":' || :FACEID_ID || ',"distanciaMatch":' || :DISTANCIA || ',"confianca":' || :CONFIANCA || ',"matricula":"' || :MATRICULA || '"}',
    'S',
    :IP,
    :USER_AGENT,
    :FACEID_ID
);
```

**Autenticação Falha (incrementar FAILED_ATTEMPTS):**
```sql
-- 1. Incrementar contador de falhas
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = FAILED_ATTEMPTS + 1
WHERE USUARIO_ID = :USUARIO_ID;

-- 2. Registrar na TBACESSO (auditoria)
INSERT INTO TBACESSO (
    DATA,
    USUARIO_ID,
    USUARIO,
    LOCAL,
    TIPO,
    ATIVIDADE,
    ONLINE,
    IP,
    COMPUTADOR,
    CHAVE_ID
)
VALUES (
    CURRENT_TIMESTAMP,
    :USUARIO_ID,
    :USUARIO_NOME,
    'WEB_FACE_ID',
    'FACE_ID_AUTH_FAILED',
    '{"evento":"autenticacao_facial","resultado":"falha","motivo":"Nenhum rosto correspondente encontrado","melhorDistancia":' || :DISTANCIA_MELHOR_MATCH || ',"threshold":0.6}',
    'S',
    :IP,
    :USER_AGENT,
    NULL
);

-- 3. Verificar se atingiu threshold de bloqueio
SELECT FAILED_ATTEMPTS
FROM TBUSUARIO
WHERE USUARIO_ID = :USUARIO_ID;
-- Se FAILED_ATTEMPTS >= 10, retornar erro de bloqueio
```

### 3.4 Buscar Histórico de Tentativas de um Usuário

```sql
-- Últimas 20 tentativas de Face ID de um usuário
SELECT
    a.ACESSO_ID,
    a.DATA,
    a.TIPO,
    a.ATIVIDADE,
    a.IP,
    a.COMPUTADOR
FROM TBACESSO a
WHERE a.CHAVE_ID = :FACEID_ID
  AND a.LOCAL = 'WEB_FACE_ID'
  AND a.TIPO LIKE 'FACE_ID_AUTH%'
ORDER BY a.DATA DESC
ROWS 20;
```

### 3.5 Detectar Tentativas Suspeitas

**Verificar usuários bloqueados ou próximos ao bloqueio (usando FAILED_ATTEMPTS):**
```sql
-- Usuários com muitas tentativas falhas
SELECT
    u.USUARIO_ID,
    u.NOME,
    u.EMAIL,
    u.FAILED_ATTEMPTS,
    (10 - u.FAILED_ATTEMPTS) AS TENTATIVAS_RESTANTES,
    f.MATRICULA,
    f.ATIVO AS FACEID_ATIVO
FROM TBUSUARIO u
LEFT JOIN TBUSUARIO_FACEID f ON f.USUARIO_ID = u.USUARIO_ID
WHERE u.FAILED_ATTEMPTS >= 5
ORDER BY u.FAILED_ATTEMPTS DESC;
```

**Verificar IPs com muitas tentativas falhas (usando TBACESSO):**
```sql
-- Buscar IPs com muitas tentativas falhas na última hora
SELECT
    a.IP,
    COUNT(*) AS TOTAL_TENTATIVAS,
    SUM(CASE WHEN a.TIPO = 'FACE_ID_AUTH_FAILED' THEN 1 ELSE 0 END) AS TENTATIVAS_FALHAS,
    COUNT(DISTINCT a.USUARIO_ID) AS USUARIOS_AFETADOS,
    MAX(a.DATA) AS ULTIMA_TENTATIVA
FROM TBACESSO a
WHERE a.LOCAL = 'WEB_FACE_ID'
  AND a.DATA >= DATEADD(-1 HOUR TO CURRENT_TIMESTAMP)
GROUP BY a.IP
HAVING SUM(CASE WHEN a.TIPO = 'FACE_ID_AUTH_FAILED' THEN 1 ELSE 0 END) >= 10
ORDER BY TENTATIVAS_FALHAS DESC;
```

### 3.6 Soft Delete de Face ID

```sql
-- Desativar Face ID (soft delete)
UPDATE TBUSUARIO_FACEID
SET
    ATIVO = 'N',
    DATA_DEL = CURRENT_TIMESTAMP,
    USUARIO_D = :USUARIO_LOGADO_ID,
    USUARIONOME_D = :USUARIO_LOGADO_NOME
WHERE FACEID_ID = :FACEID_ID;
```

### 3.7 Estatísticas de Uso (usando TBACESSO)

```sql
-- Estatísticas gerais do Face ID nos últimos 30 dias
SELECT
    COUNT(DISTINCT f.FACEID_ID) AS TOTAL_CADASTROS,
    COUNT(DISTINCT CASE WHEN f.ATIVO = 'S' THEN f.FACEID_ID END) AS CADASTROS_ATIVOS,
    COUNT(DISTINCT a.ACESSO_ID) AS TOTAL_TENTATIVAS,
    COUNT(DISTINCT CASE WHEN a.TIPO = 'FACE_ID_AUTH_SUCCESS' THEN a.ACESSO_ID END) AS TENTATIVAS_SUCESSO,
    COUNT(DISTINCT CASE WHEN a.TIPO = 'FACE_ID_AUTH_FAILED' THEN a.ACESSO_ID END) AS TENTATIVAS_FALHA
FROM TBUSUARIO_FACEID f
LEFT JOIN TBACESSO a ON a.CHAVE_ID = f.FACEID_ID
    AND a.LOCAL = 'WEB_FACE_ID'
    AND a.TIPO LIKE 'FACE_ID_AUTH%'
WHERE a.DATA >= DATEADD(-30 DAY TO CURRENT_TIMESTAMP);
```

### 3.8 Registrar Cadastro de Face ID (usando TBACESSO)

```sql
-- Registrar evento de cadastro de Face ID
INSERT INTO TBACESSO (
    DATA,
    USUARIO_ID,
    USUARIO,
    LOCAL,
    TIPO,
    ATIVIDADE,
    ONLINE,
    IP,
    COMPUTADOR,
    CHAVE_ID
)
VALUES (
    CURRENT_TIMESTAMP,
    :USUARIO_ID,
    :USUARIO_NOME,
    'WEB_FACE_ID',
    'FACE_ID_REGISTER',
    '{"evento":"cadastro_facial","faceIdId":' || :FACEID_ID || ',"matricula":"' || :MATRICULA || '","fotoArmazenada":true}',
    'S',
    :IP,
    :USER_AGENT,
    :FACEID_ID
);
```

---

## 4. Armazenamento de Fotos no Banco de Dados

### 4.1 Visão Geral

As fotos dos rostos são armazenadas **diretamente no banco de dados** como BLOB no campo `FOTO_URL` da tabela `TBUSUARIO_FACEID`.

**Vantagens:**
- ✅ Backup centralizado (tudo no banco)
- ✅ Não precisa gerenciar arquivos no sistema de arquivos
- ✅ Transações ACID (foto e descriptor sempre consistentes)
- ✅ Mais simples para deploy e migração
- ✅ Não há risco de perder fotos por exclusão acidental de arquivos

**Desvantagens:**
- ⚠️ Banco de dados cresce mais (~100 KB por usuário)
- ⚠️ Backup do banco fica maior
- ⚠️ Pode impactar performance em sistemas com muitos usuários

### 4.2 Especificações da Foto

| Propriedade | Valor |
|-------------|-------|
| Formato | JPEG ou PNG |
| Tamanho máximo | 500 KB (recomendado) |
| Tamanho típico | 50-200 KB |
| Resolução mínima | 320x240 pixels |
| Resolução recomendada | 640x480 pixels |
| Qualidade JPEG | 80-85% |
| Faces detectáveis | Exatamente 1 |

### 4.3 Conversão e Armazenamento

**No Frontend (React):**
```javascript
// Capturar frame do vídeo
const canvas = document.createElement('canvas')
canvas.width = video.videoWidth
canvas.height = video.videoHeight
canvas.getContext('2d').drawImage(video, 0, 0)

// Converter para Base64
const photoBase64 = canvas.toDataURL('image/jpeg', 0.8)
// "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."

// Enviar ao backend
await api.post('/face-id/register', {
  descriptor: Array.from(descriptor),
  photoBase64: photoBase64,
  matricula: matricula
})
```

**No Backend (Node.js):**
```javascript
// Remover prefixo do Base64
const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')

// Converter para Buffer
const photoBuffer = Buffer.from(base64Data, 'base64')

// Salvar no banco
await db.query(`
  INSERT INTO TBUSUARIO_FACEID (DESCRIPTOR_FACIAL, FOTO_URL, MATRICULA)
  VALUES (?, ?, ?)
`, [descriptorBuffer, photoBuffer, matricula])
```

### 4.4 Recuperação da Foto

**Endpoint para servir foto:**
```javascript
// GET /api/face-id/photo/:faceIdId
router.get('/photo/:faceIdId', async (req, res) => {
  const { faceIdId } = req.params

  const result = await db.query(`
    SELECT FOTO_URL
    FROM TBUSUARIO_FACEID
    WHERE FACEID_ID = ?
      AND ATIVO = 'S'
  `, [faceIdId])

  if (!result || !result[0]) {
    return res.status(404).json({ error: 'Foto não encontrada' })
  }

  const photoBuffer = result[0].FOTO_URL

  // Retornar como imagem
  res.set('Content-Type', 'image/jpeg')
  res.send(photoBuffer)
})
```

**No Frontend:**
```javascript
// Exibir foto
<img
  src={`/api/face-id/photo/${faceIdId}`}
  alt="Foto cadastrada"
/>
```

---

## 5. Considerações de Performance

### 5.1 Otimização de Queries

**Problema:** Matching de vetores faciais requer comparação com todos os descritores ativos.

**Solução:**
1. Limitar busca apenas a registros ativos (`ATIVO = 'S'`)
2. Implementar cache de descritores no backend (Redis/Memcached)
3. Processar matching no backend (não no banco)

### 5.2 Tamanho Estimado das Tabelas

**TBUSUARIO_FACEID:**
- Tamanho por registro (sem foto): ~1 KB (512 bytes descriptor + campos)
- Tamanho por registro (com foto): ~100 KB (512 bytes descriptor + 100 KB foto + campos)
- **1.000 usuários**: ~100 MB (com fotos) ou ~1 MB (sem fotos)
- **10.000 usuários**: ~1 GB (com fotos) ou ~10 MB (sem fotos)

**Recomendação:**
- Para sistemas pequenos (<5.000 usuários): Armazenar foto no banco é viável
- Para sistemas grandes (>10.000 usuários): Considerar armazenar apenas descriptor ou usar sistema de arquivos

**TBACESSO (registros de Face ID):**
- Tamanho por registro: ~500 bytes (incluindo JSON no campo ATIVIDADE)
- 100 tentativas/dia × 90 dias: ~4.5MB
- 1.000 tentativas/dia × 90 dias: ~45MB
- **Nota:** TBACESSO já existe e armazena outros tipos de acesso também

**Total estimado para 10.000 usuários:**
- Com fotos: ~1 GB (TBUSUARIO_FACEID) + ~45 MB (TBACESSO) = **~1.05 GB**
- Sem fotos: ~10 MB (TBUSUARIO_FACEID) + ~45 MB (TBACESSO) = **~55 MB**

### 5.3 Backup e Recuperação

**Dados Críticos:**
- ✅ TBUSUARIO_FACEID (dados biométricos + fotos armazenadas no banco)
- ✅ TBACESSO (logs de auditoria - já existente no sistema)

**Estratégia:**
- Backup diário do banco completo (inclui fotos)
- Retenção: 30 dias
- TBACESSO segue política de retenção já estabelecida no sistema
- **Vantagem:** Backup único (não precisa backup separado de arquivos)

---

## 6. Migração de Dados Existentes

### 6.1 Migração do IndexedDB para Firebird

Se houver dados de Face ID já cadastrados no IndexedDB do navegador:

```javascript
// Script de migração (executar no frontend)
async function migrateFaceIdToBackend() {
  const users = await getAllFaceIdUsers() // Do IndexedDB

  for (const user of users) {
    await fetch('/api/face-id/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        matricula: user.matricula,
        photoBase64: user.photoUrl,
        descriptor: user.descriptors
      })
    })
  }
}
```

---

## 7. Scripts de Instalação Completos

### 7.1 Script DDL Completo

```sql
-- ============================================
-- SCRIPT DE CRIAÇÃO - SISTEMA FACE ID
-- Versão: 1.0
-- Data: 22/11/2025
-- Firebird: 2.5+
-- ============================================

-- 1. TABELA TBUSUARIO_FACEID
CREATE TABLE TBUSUARIO_FACEID (
    FACEID_ID           INTEGER NOT NULL,
    USUARIO_ID          INTEGER,

    -- Descriptor facial: vetor de 128 floats (512 bytes)
    -- Usado para reconhecimento e matching facial
    DESCRIPTOR_FACIAL   BLOB SUB_TYPE BINARY SEGMENT SIZE 512,

    -- Foto do rosto: imagem JPEG/PNG (50-200 KB típico)
    -- Armazenada diretamente no banco de dados
    FOTO_URL            BLOB SUB_TYPE BINARY SEGMENT SIZE 8192,

    MATRICULA           VARCHAR(30),
    ATIVO               CHAR(1) DEFAULT 'S',
    DATA_INC            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    USUARIO_I           INTEGER,
    USUARIONOME_I       VARCHAR(30),
    DATA_ALT            TIMESTAMP,
    USUARIO_A           INTEGER,
    USUARIONOME_A       VARCHAR(30),
    DATA_DEL            TIMESTAMP,
    USUARIO_D           INTEGER,
    USUARIONOME_D       VARCHAR(30),
    CONSTRAINT PK_TBUSUARIO_FACEID PRIMARY KEY (FACEID_ID),
    CONSTRAINT FK_TBUSUARIO_FACEID FOREIGN KEY (USUARIO_ID)
        REFERENCES TBUSUARIO(USUARIO_ID) ON DELETE CASCADE,
    CONSTRAINT CHK_TBUSUARIO_FACEID_ATIVO CHECK (ATIVO IN ('S', 'N'))
);

-- 2. GENERATOR E TRIGGER TBUSUARIO_FACEID
CREATE GENERATOR GEN_TBUSUARIO_FACEID_ID;
SET GENERATOR GEN_TBUSUARIO_FACEID_ID TO 0;

CREATE TRIGGER TRG_TBUSUARIO_FACEID_BI FOR TBUSUARIO_FACEID
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
    IF (NEW.FACEID_ID IS NULL) THEN
        NEW.FACEID_ID = GEN_ID(GEN_TBUSUARIO_FACEID_ID, 1);
    IF (NEW.DATA_INC IS NULL) THEN
        NEW.DATA_INC = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER TRG_TBUSUARIO_FACEID_BU FOR TBUSUARIO_FACEID
ACTIVE BEFORE UPDATE POSITION 0
AS
BEGIN
    NEW.DATA_ALT = CURRENT_TIMESTAMP;
END;

-- 3. ÍNDICES TBUSUARIO_FACEID
CREATE INDEX IDX_FACEID_USUARIO_ID ON TBUSUARIO_FACEID(USUARIO_ID);
CREATE INDEX IDX_FACEID_MATRICULA ON TBUSUARIO_FACEID(MATRICULA);
CREATE INDEX IDX_FACEID_ATIVO ON TBUSUARIO_FACEID(ATIVO);
CREATE INDEX IDX_FACEID_USUARIO_ATIVO ON TBUSUARIO_FACEID(USUARIO_ID, ATIVO);

COMMIT;

-- ============================================
-- OBSERVAÇÕES IMPORTANTES
-- ============================================
--
-- 1. ARMAZENAMENTO DE FOTOS:
--    - As fotos são armazenadas diretamente no banco de dados
--    - Campo FOTO_URL é BLOB SUB_TYPE BINARY (não VARCHAR)
--    - Tamanho típico: 50-200 KB por foto
--    - Não é necessário gerenciar arquivos no sistema de arquivos
--
-- 2. DESCRIPTOR FACIAL:
--    - Campo DESCRIPTOR_FACIAL armazena vetor de 128 floats
--    - Tamanho fixo: 512 bytes (128 × 4 bytes)
--    - NÃO é uma imagem, é um vetor matemático
--    - Usado para reconhecimento e matching facial
--
-- 3. AUDITORIA (TBACESSO):
--    - A tabela TBACESSO (já existente) registra tentativas de autenticação
--    - Não é necessário criar tabela TBFACEID_TENTATIVA
--    - Mapeamento de campos TBACESSO para Face ID:
--      * LOCAL = 'WEB_FACE_ID'
--      * TIPO = 'FACE_ID_AUTH_SUCCESS' ou 'FACE_ID_AUTH_FAILED'
--      * CHAVE_ID = FACEID_ID
--      * ATIVIDADE = JSON com detalhes da tentativa
--
-- 4. CONTROLE DE TENTATIVAS FALHAS:
--    - Campo TBUSUARIO.FAILED_ATTEMPTS controla falhas consecutivas
--    - Incrementa +1 a cada falha
--    - Zera após sucesso
--    - Bloqueia usuário quando >= 10
--
-- ============================================
-- FIM DO SCRIPT
-- ============================================
```

---

**Documento criado em:** 22/11/2025
**Versão:** 2.0 (Atualizado para usar TBACESSO)
**Autor:** Sistema de Documentação Técnica
**Compatibilidade:** Firebird 2.5+


