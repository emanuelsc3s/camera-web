/******************************************************************************/
/****              Gerado por Codex em 01/07/2026 08:57:47                ****/
/******************************************************************************/

/******************************************************************************/
/****  MIGRATION LEGADA: usar apenas em bancos com MATRICULA antiga em      ****/
/****  TBUSUARIO_FACEID. No schema atual, TBUSUARIO.MATRICULA ja existe e   ****/
/****  TBUSUARIO_FACEID.MATRICULA nao existe.                               ****/
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
/****                           Migracao de dados                         ****/
/******************************************************************************/


UPDATE TBUSUARIO u
SET MATRICULA = (
    SELECT FIRST 1 f.MATRICULA
    FROM TBUSUARIO_FACEID f
    WHERE f.USUARIO_ID = u.USUARIO_ID
      AND f.MATRICULA IS NOT NULL
      AND TRIM(f.MATRICULA) <> ''
    ORDER BY
      CASE WHEN f.ATIVO = 'S' THEN 0 ELSE 1 END,
      f.DATA_INC DESC
)
WHERE (u.MATRICULA IS NULL OR TRIM(u.MATRICULA) = '')
  AND EXISTS (
    SELECT 1
    FROM TBUSUARIO_FACEID f
    WHERE f.USUARIO_ID = u.USUARIO_ID
      AND f.MATRICULA IS NOT NULL
      AND TRIM(f.MATRICULA) <> ''
  );

COMMIT;



/******************************************************************************/
/****                               Indices                                ****/
/******************************************************************************/


CREATE INDEX IDX_TBUSUARIO_MATRICULA ON TBUSUARIO (MATRICULA);

COMMIT;

DROP INDEX IDX_FACEID_MATRICULA;

COMMIT;



/******************************************************************************/
/****                         Remocao de coluna                            ****/
/******************************************************************************/


ALTER TABLE TBUSUARIO_FACEID DROP MATRICULA;

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
  AND RDB$FIELD_NAME = 'MATRICULA';

SELECT RDB$INDEX_NAME
FROM RDB$INDICES
WHERE RDB$RELATION_NAME = 'TBUSUARIO'
  AND RDB$INDEX_NAME = 'IDX_TBUSUARIO_MATRICULA';

SELECT f.FACEID_ID, f.USUARIO_ID
FROM TBUSUARIO_FACEID f
WHERE f.USUARIO_ID IS NULL;

*/
