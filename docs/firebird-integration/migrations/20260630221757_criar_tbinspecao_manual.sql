/******************************************************************************/
/****              Gerado por Codex em 30/06/2026 22:17:57                ****/
/******************************************************************************/

/******************************************************************************/
/****     Following SET SQL DIALECT is just for the Database Comparer      ****/
/******************************************************************************/
SET SQL DIALECT 3;



/******************************************************************************/
/****                                Tables                                ****/
/******************************************************************************/


CREATE GENERATOR GEN_TBINSPECAOMANUAL_ID;
SET GENERATOR GEN_TBINSPECAOMANUAL_ID TO 0;

COMMIT;

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

COMMIT;



/******************************************************************************/
/****                             Primary keys                             ****/
/******************************************************************************/


ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT PK_TBINSPMANUAL PRIMARY KEY (INSPECAOMANUAL_ID) USING INDEX IDX_PK_TBINSPMANUAL;

COMMIT;



/******************************************************************************/
/****                             Foreign keys                             ****/
/******************************************************************************/


ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT FK_TBINSPMANUAL_OP FOREIGN KEY (OP_ID) REFERENCES TBOP (OP_ID) USING INDEX IDX_FK_TBINSPMANUAL_OP;
ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT FK_TBINSPMANUAL_LINHA FOREIGN KEY (LINHAPRODUCAO_ID) REFERENCES TBLINHA_PRODUCAO (LINHAPRODUCAO_ID) USING INDEX IDX_FK_TBINSPMANUAL_LINHA;

COMMIT;



/******************************************************************************/
/****                          Check constraints                           ****/
/******************************************************************************/


ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT CK_TBINSPMANUAL_GTIN_CONF CHECK (GTIN_CONFORME IN ('Sim', 'Não') OR GTIN_CONFORME IS NULL);
ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT CK_TBINSPMANUAL_DATAMAT_CONF CHECK (DATAMATRIX_CONFORME IN ('Sim', 'Não') OR DATAMATRIX_CONFORME IS NULL);
ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT CK_TBINSPMANUAL_LOTE_CONF CHECK (LOTE_CONFORME IN ('Sim', 'Não') OR LOTE_CONFORME IS NULL);
ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT CK_TBINSPMANUAL_VALID_CONF CHECK (VALIDADE_CONFORME IN ('Sim', 'Não') OR VALIDADE_CONFORME IS NULL);

COMMIT;



/******************************************************************************/
/****                               Indices                                ****/
/******************************************************************************/


CREATE INDEX IDX_TBINSPMANUAL_OP ON TBINSPECAO_MANUAL (OP);
CREATE DESCENDING INDEX IDX_TBINSPMANUAL_DATA ON TBINSPECAO_MANUAL (DATA);
CREATE INDEX IDX_TBINSPMANUAL_USUARIO ON TBINSPECAO_MANUAL (USUARIO);
CREATE INDEX IDX_TBINSPMANUAL_FASE ON TBINSPECAO_MANUAL (FASE);
CREATE INDEX IDX_TBINSPMANUAL_STATUS ON TBINSPECAO_MANUAL (STATUS);
CREATE DESCENDING INDEX IDX_TBINSPMANUAL_DATA_INC ON TBINSPECAO_MANUAL (DATA_INC);
CREATE INDEX IDX_TBINSPMANUAL_DATA_DEL ON TBINSPECAO_MANUAL (DATA_DEL);
CREATE INDEX IDX_TBINSPMANUAL_DELETADO ON TBINSPECAO_MANUAL (DELETADO);

COMMIT;



/******************************************************************************/
/****                               Triggers                               ****/
/******************************************************************************/


SET TERM ^ ;



/******************************************************************************/
/****                         Triggers for tables                          ****/
/******************************************************************************/



/* Trigger: TRG_TBINSPECAO_MANUAL_BI */
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

COMMIT;



/******************************************************************************/
/****                             Validacao                                ****/
/******************************************************************************/


/* Consultas opcionais para validacao manual apos aplicar a migration:

SELECT RDB$RELATION_NAME
FROM RDB$RELATIONS
WHERE RDB$RELATION_NAME = 'TBINSPECAO_MANUAL';

SELECT RDB$GENERATOR_NAME
FROM RDB$GENERATORS
WHERE RDB$GENERATOR_NAME = 'GEN_TBINSPECAOMANUAL_ID';

*/



/******************************************************************************/
/****                              Privileges                              ****/
/******************************************************************************/
