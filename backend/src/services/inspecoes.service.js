const database = require('../config/database');
const fotosService = require('./fotos.service');

const SELECT_BASE = `
  SELECT
    INSPECAOMANUAL_ID,
    STATUS,
    OP_ID,
    OP,
    ERP_PRODUTO,
    PRODUTO,
    LOTE,
    VALIDADE,
    GTIN,
    REGISTRO_ANVISA,
    LINHAPRODUCAO_ID,
    FASE,
    DATA,
    CAMINHO_FOTO,
    GTIN_CONFORME,
    DATAMATRIX_CONFORME,
    LOTE_CONFORME,
    VALIDADE_CONFORME,
    OBSERVACOES,
    USUARIO_ID,
    USUARIO,
    LOCALIZACAO,
    DATA_INC,
    USUARIO_I,
    USUARIONOME_I,
    DATA_ALT,
    USUARIO_A,
    USUARIONOME_A,
    DATA_DEL,
    USUARIO_D,
    USUARIONOME_D,
    DELETADO
  FROM TBINSPECAO_MANUAL
`;

function calculateStatus(conformidades) {
  const values = Object.values(conformidades);

  if (values.some((value) => value === 'Não')) {
    return 'Rejeitado';
  }

  if (values.every((value) => value === 'Sim')) {
    return 'Aprovado';
  }

  return 'Aberto';
}

function getNextManualInspectionId(tx) {
  return tx.query(
    'SELECT GEN_ID(GEN_TBINSPECAOMANUAL_ID, 1) AS ID FROM RDB$DATABASE',
  ).then((rows) => rows[0].ID);
}

function buildFilter(campo, termo) {
  const normalizedField = String(campo || '').trim();
  const normalizedTerm = String(termo || '').trim();

  if (!normalizedTerm) {
    return {
      clause: '',
      params: [],
    };
  }

  const textFields = {
    dataHora: 'DATA',
    op: 'OP',
    lote: 'LOTE',
    validade: 'VALIDADE',
    produto: 'PRODUTO',
    gtin: 'GTIN',
    registroAnvisa: 'REGISTRO_ANVISA',
    usuario: 'USUARIO',
    fase: 'FASE',
    status: 'STATUS',
  };

  const buildTextSearch = (expression) => (
    `UPPER(COALESCE(CAST(${expression} AS VARCHAR(500)), '')) CONTAINING UPPER(?)`
  );

  if (normalizedField === 'linhaProducaoId') {
    const parsed = Number.parseInt(normalizedTerm, 10);

    if (!Number.isInteger(parsed)) {
      return { clause: ' AND 1 = 0', params: [] };
    }

    return {
      clause: ' AND LINHAPRODUCAO_ID = ?',
      params: [parsed],
    };
  }

  if (!normalizedField || normalizedField === 'todos') {
    const expressions = Object.values(textFields);

    return {
      clause: ` AND (${expressions.map(buildTextSearch).join(' OR ')})`,
      params: expressions.map(() => normalizedTerm),
    };
  }

  const column = textFields[normalizedField];

  if (!column) {
    return {
      clause: '',
      params: [],
    };
  }

  return {
    clause: ` AND ${buildTextSearch(column)}`,
    params: [normalizedTerm],
  };
}

async function createInspection(payload) {
  let savedPhotoPath;

  try {
    return await database.withTransaction(async (tx) => {
      await tx.setSessionUser(payload.usuario);

      const id = await getNextManualInspectionId(tx);
      const photo = await fotosService.saveInspectionPhoto({
        id,
        fotoBase64: payload.fotoBase64,
      });

      savedPhotoPath = photo.fullPath;

      const conformidades = payload.conformidades;
      const status = calculateStatus(conformidades);

      await tx.query(
        `
          INSERT INTO TBINSPECAO_MANUAL (
            INSPECAOMANUAL_ID,
            STATUS,
            OP_ID,
            OP,
            ERP_PRODUTO,
            PRODUTO,
            LOTE,
            VALIDADE,
            GTIN,
            REGISTRO_ANVISA,
            LINHAPRODUCAO_ID,
            FASE,
            DATA,
            CAMINHO_FOTO,
            GTIN_CONFORME,
            DATAMATRIX_CONFORME,
            LOTE_CONFORME,
            VALIDADE_CONFORME,
            OBSERVACOES,
            USUARIO_ID,
            USUARIO,
            LOCALIZACAO,
            DATA_INC,
            USUARIO_I,
            USUARIONOME_I,
            DELETADO
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 'N'
          )
        `,
        [
          id,
          status,
          payload.opId,
          payload.referenceData.op,
          payload.referenceData.erpProduto,
          payload.referenceData.produto,
          payload.referenceData.lote,
          payload.validadeDate,
          payload.referenceData.gtin,
          payload.referenceData.registroAnvisa,
          payload.linhaProducaoId,
          payload.fase,
          photo.relativePath,
          conformidades.gtin,
          conformidades.datamatrix,
          conformidades.lote,
          conformidades.validade,
          payload.observacoes,
          payload.usuarioId,
          payload.usuario,
          payload.localizacao,
          payload.usuarioId,
          payload.usuario,
        ],
      );

      return {
        id,
        status,
      };
    });
  } catch (erro) {
    await fotosService.removeFileIfExists(savedPhotoPath);
    throw erro;
  }
}

async function countInspections(filter) {
  const rows = await database.query(
    `
      SELECT COUNT(*) AS TOTAL
      FROM TBINSPECAO_MANUAL
      WHERE COALESCE(DELETADO, 'N') = 'N'
      ${filter.clause}
    `,
    filter.params,
  );

  return Number(rows[0].TOTAL || 0);
}

async function listInspections({ startRow, endRow, campo, termo }) {
  const filter = buildFilter(campo, termo);

  const rows = await database.query(
    `
      ${SELECT_BASE}
      WHERE COALESCE(DELETADO, 'N') = 'N'
      ${filter.clause}
      ORDER BY DATA DESC, INSPECAOMANUAL_ID DESC
      ROWS ? TO ?
    `,
    [...filter.params, startRow, endRow],
  );

  const total = await countInspections(filter);

  return {
    rows,
    total,
  };
}

async function getInspectionSummary(linhaProducaoId) {
  const rows = await database.query(
    `
      SELECT
        COUNT(*) AS TOTAL,
        SUM(CASE WHEN STATUS = 'Aprovado' THEN 1 ELSE 0 END) AS APROVADOS,
        SUM(CASE WHEN STATUS = 'Rejeitado' THEN 1 ELSE 0 END) AS REPROVADOS
      FROM TBINSPECAO_MANUAL
      WHERE COALESCE(DELETADO, 'N') = 'N'
        AND LINHAPRODUCAO_ID = ?
    `,
    [linhaProducaoId],
  );

  const row = rows[0] || {};

  return {
    total: Number(row.TOTAL || 0),
    aprovados: Number(row.APROVADOS || 0),
    reprovados: Number(row.REPROVADOS || 0),
  };
}

async function getInspectionById(id) {
  const rows = await database.query(
    `
      ${SELECT_BASE}
      WHERE INSPECAOMANUAL_ID = ?
        AND COALESCE(DELETADO, 'N') = 'N'
    `,
    [id],
  );

  return rows[0] || null;
}

async function exportInspections() {
  return database.query(
    `
      ${SELECT_BASE}
      WHERE COALESCE(DELETADO, 'N') = 'N'
      ORDER BY DATA DESC, INSPECAOMANUAL_ID DESC
    `,
  );
}

async function deleteInspection(id, audit) {
  return database.withTransaction(async (tx) => {
    await tx.setSessionUser(audit.usuario);

    const rows = await tx.query(
      `
        SELECT FIRST 1 INSPECAOMANUAL_ID
        FROM TBINSPECAO_MANUAL
        WHERE INSPECAOMANUAL_ID = ?
          AND COALESCE(DELETADO, 'N') = 'N'
      `,
      [id],
    );

    if (!rows[0]) {
      return false;
    }

    await tx.query(
      `
        UPDATE TBINSPECAO_MANUAL
        SET DELETADO = 'S',
            DATA_DEL = CURRENT_TIMESTAMP,
            USUARIO_D = ?,
            USUARIONOME_D = ?
        WHERE INSPECAOMANUAL_ID = ?
      `,
      [audit.usuarioId, audit.usuario, id],
    );

    return true;
  });
}

async function deleteManyInspections(ids, audit) {
  if (!ids.length) {
    return 0;
  }

  return database.withTransaction(async (tx) => {
    await tx.setSessionUser(audit.usuario);

    const placeholders = ids.map(() => '?').join(', ');
    const existingRows = await tx.query(
      `
        SELECT INSPECAOMANUAL_ID
        FROM TBINSPECAO_MANUAL
        WHERE INSPECAOMANUAL_ID IN (${placeholders})
          AND COALESCE(DELETADO, 'N') = 'N'
      `,
      ids,
    );

    const existingIds = existingRows.map((row) => row.INSPECAOMANUAL_ID);

    if (!existingIds.length) {
      return 0;
    }

    const updatePlaceholders = existingIds.map(() => '?').join(', ');
    await tx.query(
      `
        UPDATE TBINSPECAO_MANUAL
        SET DELETADO = 'S',
            DATA_DEL = CURRENT_TIMESTAMP,
            USUARIO_D = ?,
            USUARIONOME_D = ?
        WHERE INSPECAOMANUAL_ID IN (${updatePlaceholders})
      `,
      [audit.usuarioId, audit.usuario, ...existingIds],
    );

    return existingIds.length;
  });
}

module.exports = {
  calculateStatus,
  createInspection,
  deleteInspection,
  deleteManyInspections,
  exportInspections,
  getInspectionSummary,
  getInspectionById,
  listInspections,
};
