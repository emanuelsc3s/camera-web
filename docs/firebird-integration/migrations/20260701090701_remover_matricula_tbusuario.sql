/******************************************************************************/
/****              Gerado por Codex em 01/07/2026 09:07:01                ****/
/******************************************************************************/

/******************************************************************************/
/****  MIGRATION LEGADA: nao executar contra o schema atual enviado pelo    ****/
/****  cliente, pois TBUSUARIO.MATRICULA existe e deve permanecer.          ****/
/******************************************************************************/

/******************************************************************************/
/****   O SET SQL DIALECT abaixo e usado apenas pelo comparador de banco    ****/
/******************************************************************************/
SET SQL DIALECT 3;



/******************************************************************************/
/****                               Indices                                ****/
/******************************************************************************/


DROP INDEX IDX_TBUSUARIO_MATRICULA;

COMMIT;



/******************************************************************************/
/****                         Remocao de coluna                            ****/
/******************************************************************************/


ALTER TABLE TBUSUARIO DROP MATRICULA;

COMMIT;



/******************************************************************************/
/****                             Validacao                                ****/
/******************************************************************************/


/* Consultas opcionais para validacao manual apos aplicar a migration:

SELECT RDB$FIELD_NAME
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBUSUARIO'
  AND RDB$FIELD_NAME = 'MATRICULA';

SELECT RDB$INDEX_NAME
FROM RDB$INDICES
WHERE RDB$RELATION_NAME = 'TBUSUARIO'
  AND RDB$INDEX_NAME = 'IDX_TBUSUARIO_MATRICULA';

*/
