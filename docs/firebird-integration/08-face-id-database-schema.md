# Modelagem de Banco de Dados - Face ID e Inspeção Manual (Firebird 2.5)

## Estado Atual do Banco

Este documento reflete a DDL enviada pelo cliente, gerada pelo IBExpert em:

- `01/07/2026 09:47:46` para `TBUSUARIO`
- `01/07/2026 09:48:53` para `TBUSUARIO_FACEID`
- `01/07/2026 09:52:41` para `TBINSPECAO_MANUAL`

As tabelas abaixo já existem no banco informado. Não recrie essas estruturas automaticamente no ambiente do cliente. Qualquer mudança estrutural deve virar uma migration SQL revisável em `docs/firebird-integration/migrations/`, com backup prévio e execução manual.

---

## 1. Resumo das Tabelas

```
┌─────────────────────────────────────────────────────────────┐
│ TBUSUARIO                                                   │
│ - USUARIO_ID (PK)                                           │
│ - NOME, EMAIL, SENHA                                        │
│ - MATRICULA                                                 │
│ - FAILED_ATTEMPTS                                           │
│ - BLOQUEADO, DELETADO                                       │
│ - Auditoria padrão                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ 1
                       │
                       │ N
┌──────────────────────┴──────────────────────────────────────┐
│ TBUSUARIO_FACEID                                            │
│ - FACEID_ID (PK)                                            │
│ - USUARIO_ID (FK -> TBUSUARIO.USUARIO_ID)                   │
│ - DESCRIPTOR_FACIAL (BLOB SUB_TYPE 0 SEGMENT SIZE 512)      │
│ - Auditoria padrão                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TBINSPECAO_MANUAL                                           │
│ - INSPECAOMANUAL_ID (PK)                                    │
│ - OP_ID (FK -> TBOP.OP_ID)                                  │
│ - LINHAPRODUCAO_ID (FK -> TBLINHA_PRODUCAO)                 │
│ - STATUS, FASE, DATA, CAMINHO_FOTO                          │
│ - Campos de conformidade VARCHAR(3)                         │
│ - DELETADO e auditoria padrão                               │
└─────────────────────────────────────────────────────────────┘
```

Pontos importantes da DDL atual:

- `TBUSUARIO.MATRICULA` existe e deve ser a origem da matrícula do operador.
- `TBUSUARIO_FACEID` não possui `MATRICULA`, `ATIVO` nem `DELETADO`.
- `TBUSUARIO_FACEID` armazena apenas o descriptor biométrico e o vínculo opcional com `TBUSUARIO`.
- O status operacional do usuário vem de `TBUSUARIO.BLOQUEADO`, `TBUSUARIO.DELETADO` e `TBUSUARIO.FAILED_ATTEMPTS`.
- A DDL enviada não inclui `TBACESSO`; qualquer auditoria por tabela de acessos deve ser tratada como integração opcional ou nova migration, conforme o metadata real do cliente.

---

## 2. `TBUSUARIO`

### 2.1 Campos relevantes para Face ID

| Campo | Tipo | Uso |
|-------|------|-----|
| `USUARIO_ID` | `INTEGER NOT NULL` | Chave primária e vínculo com `TBUSUARIO_FACEID` |
| `NOME` | `VARCHAR(30)` | Nome exibido após autenticação |
| `EMAIL` | `VARCHAR(100)` | Identificação auxiliar |
| `MATRICULA` | `VARCHAR(30)` | Matrícula do usuário; não fica em `TBUSUARIO_FACEID` |
| `FAILED_ATTEMPTS` | `INTEGER DEFAULT 0` | Contador de falhas consecutivas de autenticação |
| `BLOQUEADO` | `VARCHAR(1) DEFAULT 'N'` | Bloqueio operacional do usuário |
| `DELETADO` | `CHAR(1) DEFAULT 'N'` | Exclusão lógica do usuário |

### 2.2 Regras de autenticação

- A cada falha de autenticação facial, incrementar `TBUSUARIO.FAILED_ATTEMPTS`.
- A cada sucesso, zerar `TBUSUARIO.FAILED_ATTEMPTS`.
- Se `FAILED_ATTEMPTS` atingir o limite definido pela aplicação, bloquear pelo fluxo operacional do sistema, preferencialmente usando `BLOQUEADO = 'S'`.
- Consultas de usuário ativo devem filtrar `COALESCE(DELETADO, 'N') = 'N'` e `COALESCE(BLOQUEADO, 'N') = 'N'`.

Exemplo:

```sql
UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = COALESCE(FAILED_ATTEMPTS, 0) + 1
WHERE USUARIO_ID = :USUARIO_ID;

UPDATE TBUSUARIO
SET FAILED_ATTEMPTS = 0
WHERE USUARIO_ID = :USUARIO_ID;
```

---

## 3. `TBUSUARIO_FACEID`

### 3.1 DDL atual

```sql
CREATE GENERATOR GEN_TBUSUARIO_FACEID_ID;

CREATE TABLE TBUSUARIO_FACEID (
    FACEID_ID          INTEGER NOT NULL,
    USUARIO_ID         INTEGER,
    DESCRIPTOR_FACIAL  BLOB SUB_TYPE 0 SEGMENT SIZE 512 NOT NULL,
    DATA_INC           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    USUARIO_I          INTEGER,
    USUARIONOME_I      VARCHAR(30),
    DATA_ALT           TIMESTAMP,
    USUARIO_A          INTEGER,
    USUARIONOME_A      VARCHAR(30),
    DATA_DEL           TIMESTAMP,
    USUARIO_D          INTEGER,
    USUARIONOME_D      VARCHAR(30)
);

ALTER TABLE TBUSUARIO_FACEID ADD CONSTRAINT PK_TBUSUARIO_FACEID PRIMARY KEY (FACEID_ID)
USING INDEX IDX_PK_TBUSUARIO_FACEID;

ALTER TABLE TBUSUARIO_FACEID ADD CONSTRAINT FK_TBUSUARIO_FACEID
FOREIGN KEY (USUARIO_ID) REFERENCES TBUSUARIO (USUARIO_ID)
USING INDEX IDX_FACEID_USUARIO_ID;

CREATE DESCENDING INDEX IDX_FACEID_DATA_INC ON TBUSUARIO_FACEID (DATA_INC);

SET TERM ^ ;

CREATE OR ALTER TRIGGER TRG_TBUSUARIO_FACEID_BI FOR TBUSUARIO_FACEID
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
  IF (NEW.FACEID_ID IS NULL) THEN
    NEW.FACEID_ID = GEN_ID(GEN_TBUSUARIO_FACEID_ID, 1);

  IF (NEW.DATA_INC IS NULL) THEN
    NEW.DATA_INC = CURRENT_TIMESTAMP;
END
^

CREATE OR ALTER TRIGGER TRG_TBUSUARIO_FACEID_BU FOR TBUSUARIO_FACEID
ACTIVE BEFORE UPDATE POSITION 0
AS
BEGIN
  NEW.DATA_ALT = CURRENT_TIMESTAMP;
END
^

SET TERM ; ^
```

### 3.2 Campos

| Campo | Tipo | Nulo | Descrição |
|-------|------|------|-----------|
| `FACEID_ID` | `INTEGER` | Não | Chave primária gerada por `GEN_TBUSUARIO_FACEID_ID` |
| `USUARIO_ID` | `INTEGER` | Sim | FK para `TBUSUARIO.USUARIO_ID` |
| `DESCRIPTOR_FACIAL` | `BLOB SUB_TYPE 0 SEGMENT SIZE 512` | Não | Vetor binário de 128 floats gerado pelo modelo facial |
| `DATA_INC` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | Sim | Data de cadastro |
| `USUARIO_I` | `INTEGER` | Sim | Usuário que cadastrou |
| `USUARIONOME_I` | `VARCHAR(30)` | Sim | Nome do usuário que cadastrou |
| `DATA_ALT` | `TIMESTAMP` | Sim | Atualizada por trigger em alterações |
| `USUARIO_A` | `INTEGER` | Sim | Usuário que alterou |
| `USUARIONOME_A` | `VARCHAR(30)` | Sim | Nome do usuário que alterou |
| `DATA_DEL` | `TIMESTAMP` | Sim | Campo de auditoria disponível, sem flag de exclusão na DDL atual |
| `USUARIO_D` | `INTEGER` | Sim | Usuário que solicitou remoção |
| `USUARIONOME_D` | `VARCHAR(30)` | Sim | Nome do usuário que solicitou remoção |

### 3.3 Regras de uso

- A foto capturada pela câmera não deve ser persistida; ela serve apenas para gerar o descriptor.
- O backend deve gravar somente `DESCRIPTOR_FACIAL`, `USUARIO_ID` e auditoria.
- Matrícula deve ser lida de `TBUSUARIO.MATRICULA`.
- Como a tabela não tem `ATIVO` nem `DELETADO`, não documente exclusão lógica em `TBUSUARIO_FACEID`.
- Se for necessário inativar Face ID mantendo histórico, crie uma nova migration para adicionar uma flag de exclusão lógica. Até lá, a remoção LGPD do dado biométrico deve remover o descriptor da tabela ou seguir o procedimento jurídico definido pelo cliente.
- A DDL atual não define constraint `UNIQUE` por `USUARIO_ID`; se a regra de negócio exigir um único Face ID por usuário, a API deve validar antes de inserir ou uma nova migration deve criar a restrição.

### 3.4 Consultas compatíveis

Buscar descriptors para autenticação:

```sql
SELECT
    f.FACEID_ID,
    f.USUARIO_ID,
    f.DESCRIPTOR_FACIAL,
    u.NOME,
    u.EMAIL,
    u.MATRICULA,
    u.FAILED_ATTEMPTS
FROM TBUSUARIO_FACEID f
JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
WHERE COALESCE(u.DELETADO, 'N') = 'N'
  AND COALESCE(u.BLOQUEADO, 'N') = 'N';
```

Inserir um novo descriptor:

```sql
INSERT INTO TBUSUARIO_FACEID (
    USUARIO_ID,
    DESCRIPTOR_FACIAL,
    USUARIO_I,
    USUARIONOME_I
)
VALUES (
    :USUARIO_ID,
    :DESCRIPTOR_BLOB,
    :USUARIO_LOGADO_ID,
    :USUARIO_LOGADO_NOME
)
RETURNING FACEID_ID;
```

Atualizar descriptor:

```sql
UPDATE TBUSUARIO_FACEID
SET DESCRIPTOR_FACIAL = :DESCRIPTOR_BLOB,
    USUARIO_A = :USUARIO_LOGADO_ID,
    USUARIONOME_A = :USUARIO_LOGADO_NOME
WHERE FACEID_ID = :FACEID_ID;
```

---

## 4. `TBINSPECAO_MANUAL`

### 4.1 DDL atual

```sql
CREATE GENERATOR GEN_TBINSPECAOMANUAL_ID;

CREATE TABLE TBINSPECAO_MANUAL (
    INSPECAOMANUAL_ID    INTEGER NOT NULL,
    STATUS               VARCHAR(10),
    OP_ID                INTEGER,
    OP                   VARCHAR(10),
    ERP_PRODUTO          VARCHAR(10),
    PRODUTO              VARCHAR(80),
    LOTE                 VARCHAR(10),
    VALIDADE             DATE,
    GTIN                 VARCHAR(20),
    REGISTRO_ANVISA      VARCHAR(20),
    LINHAPRODUCAO_ID     INTEGER,
    FASE                 VARCHAR(10),
    DATA                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CAMINHO_FOTO         VARCHAR(500),
    GTIN_CONFORME        VARCHAR(3),
    DATAMATRIX_CONFORME  VARCHAR(3),
    LOTE_CONFORME        VARCHAR(3),
    VALIDADE_CONFORME    VARCHAR(3),
    OBSERVACOES          VARCHAR(1000),
    USUARIO_ID           INTEGER,
    USUARIO              VARCHAR(30),
    LOCALIZACAO          VARCHAR(200),
    DATA_INC             TIMESTAMP,
    USUARIO_I            INTEGER,
    USUARIONOME_I        VARCHAR(30),
    DATA_ALT             TIMESTAMP,
    USUARIO_A            INTEGER,
    USUARIONOME_A        VARCHAR(30),
    DATA_DEL             TIMESTAMP,
    USUARIO_D            INTEGER,
    USUARIONOME_D        VARCHAR(30),
    DELETADO             CHAR(1) DEFAULT 'N'
);

ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT PK_TBINSPMANUAL PRIMARY KEY (INSPECAOMANUAL_ID)
USING INDEX IDX_PK_TBINSPMANUAL;

ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT FK_TBINSPMANUAL_LINHA
FOREIGN KEY (LINHAPRODUCAO_ID) REFERENCES TBLINHA_PRODUCAO (LINHAPRODUCAO_ID)
USING INDEX IDX_FK_TBINSPMANUAL_LINHA;

ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT FK_TBINSPMANUAL_OP
FOREIGN KEY (OP_ID) REFERENCES TBOP (OP_ID)
USING INDEX IDX_FK_TBINSPMANUAL_OP;

CREATE DESCENDING INDEX IDX_TBINSPMANUAL_DATA ON TBINSPECAO_MANUAL (DATA);
CREATE INDEX IDX_TBINSPMANUAL_DATA_DEL ON TBINSPECAO_MANUAL (DATA_DEL);
CREATE DESCENDING INDEX IDX_TBINSPMANUAL_DATA_INC ON TBINSPECAO_MANUAL (DATA_INC);
CREATE INDEX IDX_TBINSPMANUAL_DELETADO ON TBINSPECAO_MANUAL (DELETADO);
CREATE INDEX IDX_TBINSPMANUAL_FASE ON TBINSPECAO_MANUAL (FASE);
CREATE INDEX IDX_TBINSPMANUAL_OP ON TBINSPECAO_MANUAL (OP);
CREATE INDEX IDX_TBINSPMANUAL_STATUS ON TBINSPECAO_MANUAL (STATUS);
CREATE INDEX IDX_TBINSPMANUAL_USUARIO ON TBINSPECAO_MANUAL (USUARIO);

SET TERM ^ ;

CREATE OR ALTER TRIGGER TRG_TBINSPECAO_MANUAL_BI FOR TBINSPECAO_MANUAL
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
  IF (NEW.INSPECAOMANUAL_ID IS NULL) THEN
    NEW.INSPECAOMANUAL_ID = GEN_ID(GEN_TBINSPECAOMANUAL_ID, 1);

  IF (NEW.DATA IS NULL) THEN
    NEW.DATA = CURRENT_TIMESTAMP;

  IF (NEW.DATA_INC IS NULL) THEN
    NEW.DATA_INC = CURRENT_TIMESTAMP;

  IF (NEW.DELETADO IS NULL) THEN
    NEW.DELETADO = 'N';
END
^

SET TERM ; ^
```

### 4.2 Regras da inspeção manual

- `TBINSPECAO_MANUAL` é a tabela deste projeto para inspeções manuais.
- `TBINSPECAO` permanece reservada ao SICFAR.
- `GTIN_CONFORME`, `DATAMATRIX_CONFORME`, `LOTE_CONFORME` e `VALIDADE_CONFORME` usam `VARCHAR(3)` com `Sim`, `Não` ou `NULL`.
- A DDL atual não possui constraints `CHECK` para esses campos; valide na API.
- Exclusão de inspeção manual deve ser lógica via `DELETADO = 'S'`, `DATA_DEL`, `USUARIO_D` e `USUARIONOME_D`.

---

## 5. Validação Manual do Metadata

Use estas consultas antes de gerar ou aplicar qualquer migration:

```sql
SELECT RDB$RELATION_NAME
FROM RDB$RELATIONS
WHERE RDB$RELATION_NAME IN ('TBUSUARIO', 'TBUSUARIO_FACEID', 'TBINSPECAO_MANUAL');

SELECT RDB$RELATION_NAME, RDB$FIELD_NAME, RDB$FIELD_POSITION
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME IN ('TBUSUARIO', 'TBUSUARIO_FACEID', 'TBINSPECAO_MANUAL')
ORDER BY RDB$RELATION_NAME, RDB$FIELD_POSITION;

SELECT RDB$RELATION_NAME, RDB$CONSTRAINT_NAME, RDB$CONSTRAINT_TYPE
FROM RDB$RELATION_CONSTRAINTS
WHERE RDB$RELATION_NAME IN ('TBUSUARIO', 'TBUSUARIO_FACEID', 'TBINSPECAO_MANUAL')
ORDER BY RDB$RELATION_NAME, RDB$CONSTRAINT_NAME;

SELECT RDB$RELATION_NAME, RDB$INDEX_NAME, RDB$INDEX_TYPE
FROM RDB$INDICES
WHERE RDB$RELATION_NAME IN ('TBUSUARIO', 'TBUSUARIO_FACEID', 'TBINSPECAO_MANUAL')
ORDER BY RDB$RELATION_NAME, RDB$INDEX_NAME;
```

---

## 6. Impacto nas Migrations

- Não execute migrations de criação quando o banco já tiver as três tabelas no formato descrito aqui.
- `TBUSUARIO.MATRICULA` já existe no schema atual; não use migrations que removam esse campo em ambientes alinhados com a DDL enviada.
- `TBUSUARIO_FACEID.ATIVO` e `TBUSUARIO_FACEID.MATRICULA` não existem no schema atual; código e documentação não devem depender desses campos.
- Se precisar adicionar auditoria de tentativas, inativação lógica do Face ID ou unicidade por usuário, crie uma nova migration Firebird 2.5 específica e autocontida.

---

**Versão:** 3.0  
**Atualizado em:** 01/07/2026  
**Compatibilidade:** Firebird 2.5
