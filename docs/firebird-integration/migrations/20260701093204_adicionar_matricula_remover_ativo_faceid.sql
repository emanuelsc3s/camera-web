/******************************************************************************/
/****              Gerado por Codex em 01/07/2026 09:32:04                ****/
/******************************************************************************/

/******************************************************************************/
/****   O SET SQL DIALECT abaixo e usado apenas pelo comparador de banco    ****/
/******************************************************************************/
SET SQL DIALECT 3;



/******************************************************************************/
/****                         Alteracoes de tabelas                       ****/
/******************************************************************************/


ALTER TABLE TBUSUARIO ADD MATRICULA VARCHAR(30);

COMMIT;



/******************************************************************************/
/****                               Indices                                ****/
/******************************************************************************/


CREATE INDEX IDX_TBUSUARIO_MATRICULA ON TBUSUARIO (MATRICULA);

COMMIT;

DROP INDEX IDX_FACEID_ATIVO;
DROP INDEX IDX_FACEID_USUARIO_ATIVO;

COMMIT;



/******************************************************************************/
/****                         Restricoes de check                          ****/
/******************************************************************************/


ALTER TABLE TBUSUARIO_FACEID DROP CONSTRAINT CK_TBUSUARIO_FACEID_ATIVO;

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
END
^

SET TERM ; ^

COMMIT;



/******************************************************************************/
/****                         Remocao de coluna                            ****/
/******************************************************************************/


ALTER TABLE TBUSUARIO_FACEID DROP ATIVO;

COMMIT;



/******************************************************************************/
/****                             Validacao                                ****/
/******************************************************************************/


/* Consultas opcionais para validacao manual apos aplicar a migration:

SELECT RDB$FIELD_NAME
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBUSUARIO'
  AND RDB$FIELD_NAME = 'MATRICULA';

SELECT RDB$FIELD_NAME
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBUSUARIO_FACEID'
  AND RDB$FIELD_NAME = 'ATIVO';

SELECT RDB$INDEX_NAME
FROM RDB$INDICES
WHERE RDB$RELATION_NAME IN ('TBUSUARIO', 'TBUSUARIO_FACEID')
  AND RDB$INDEX_NAME IN (
    'IDX_TBUSUARIO_MATRICULA',
    'IDX_FACEID_ATIVO',
    'IDX_FACEID_USUARIO_ATIVO'
  );

SELECT RDB$CONSTRAINT_NAME
FROM RDB$RELATION_CONSTRAINTS
WHERE RDB$RELATION_NAME = 'TBUSUARIO_FACEID'
  AND RDB$CONSTRAINT_NAME = 'CK_TBUSUARIO_FACEID_ATIVO';

*/
