/******************************************************************************/
/****              Gerado por Codex em 01/07/2026 08:46:35                ****/
/******************************************************************************/

/******************************************************************************/
/****   O SET SQL DIALECT abaixo e usado apenas pelo comparador de banco    ****/
/******************************************************************************/
SET SQL DIALECT 3;



/******************************************************************************/
/****                                Tabelas                               ****/
/******************************************************************************/


CREATE GENERATOR GEN_TBUSUARIO_FACEID_ID;
SET GENERATOR GEN_TBUSUARIO_FACEID_ID TO 0;

COMMIT;

CREATE TABLE TBUSUARIO_FACEID (
    FACEID_ID          INTEGER NOT NULL,
    USUARIO_ID         INTEGER,
    DESCRIPTOR_FACIAL  BLOB SUB_TYPE 0 SEGMENT SIZE 512 NOT NULL,
    MATRICULA          VARCHAR(30),
    ATIVO              CHAR(1) DEFAULT 'S',
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

COMMIT;



/******************************************************************************/
/****                           Chaves primarias                           ****/
/******************************************************************************/


ALTER TABLE TBUSUARIO_FACEID ADD CONSTRAINT PK_TBUSUARIO_FACEID PRIMARY KEY (FACEID_ID) USING INDEX IDX_PK_TBUSUARIO_FACEID;

COMMIT;



/******************************************************************************/
/****                          Chaves estrangeiras                         ****/
/******************************************************************************/


ALTER TABLE TBUSUARIO_FACEID ADD CONSTRAINT FK_TBUSUARIO_FACEID FOREIGN KEY (USUARIO_ID) REFERENCES TBUSUARIO (USUARIO_ID) USING INDEX IDX_FACEID_USUARIO_ID;

COMMIT;



/******************************************************************************/
/****                         Restricoes de check                          ****/
/******************************************************************************/


ALTER TABLE TBUSUARIO_FACEID ADD CONSTRAINT CK_TBUSUARIO_FACEID_ATIVO CHECK (ATIVO IN ('S', 'N') OR ATIVO IS NULL);

COMMIT;



/******************************************************************************/
/****                               Indices                                ****/
/******************************************************************************/


CREATE INDEX IDX_FACEID_MATRICULA ON TBUSUARIO_FACEID (MATRICULA);
CREATE INDEX IDX_FACEID_ATIVO ON TBUSUARIO_FACEID (ATIVO);
CREATE INDEX IDX_FACEID_USUARIO_ATIVO ON TBUSUARIO_FACEID (USUARIO_ID, ATIVO);
CREATE DESCENDING INDEX IDX_FACEID_DATA_INC ON TBUSUARIO_FACEID (DATA_INC);

COMMIT;



/******************************************************************************/
/****                               Triggers                               ****/
/******************************************************************************/


SET TERM ^ ;



/******************************************************************************/
/****                         Triggers das tabelas                         ****/
/******************************************************************************/



/* Trigger: TRG_TBUSUARIO_FACEID_BI */
CREATE OR ALTER TRIGGER TRG_TBUSUARIO_FACEID_BI FOR TBUSUARIO_FACEID
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
  IF (NEW.FACEID_ID IS NULL) THEN
    NEW.FACEID_ID = GEN_ID(GEN_TBUSUARIO_FACEID_ID, 1);

  IF (NEW.DATA_INC IS NULL) THEN
    NEW.DATA_INC = CURRENT_TIMESTAMP;

  IF (NEW.ATIVO IS NULL) THEN
    NEW.ATIVO = 'S';
END
^


/* Trigger: TRG_TBUSUARIO_FACEID_BU */
CREATE OR ALTER TRIGGER TRG_TBUSUARIO_FACEID_BU FOR TBUSUARIO_FACEID
ACTIVE BEFORE UPDATE POSITION 0
AS
BEGIN
  NEW.DATA_ALT = CURRENT_TIMESTAMP;
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
WHERE RDB$RELATION_NAME = 'TBUSUARIO_FACEID';

SELECT RDB$GENERATOR_NAME
FROM RDB$GENERATORS
WHERE RDB$GENERATOR_NAME = 'GEN_TBUSUARIO_FACEID_ID';

SELECT RDB$TRIGGER_NAME
FROM RDB$TRIGGERS
WHERE RDB$TRIGGER_NAME IN (
  'TRG_TBUSUARIO_FACEID_BI',
  'TRG_TBUSUARIO_FACEID_BU'
);

SELECT RDB$INDEX_NAME
FROM RDB$INDICES
WHERE RDB$RELATION_NAME = 'TBUSUARIO_FACEID';

*/



/******************************************************************************/
/****                              Privilegios                             ****/
/******************************************************************************/
