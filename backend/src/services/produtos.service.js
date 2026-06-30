const database = require('../config/database');

const BASE_SELECT_REFERENCIA = `
  SELECT FIRST 1
    o.OP_ID,
    p.PRODUTO_ID,
    o.OP,
    o.ERP_PRODUTO,
    o.LOTE,
    o.VALIDADE,
    COALESCE(NULLIF(TRIM(o.PRODUTO), ''), p.PRODUTO) AS PRODUTO,
    o.ANVISA AS REGISTRO_ANVISA,
    o.GTIN,
    o.LINHAPRODUCAO_ID
  FROM TBOP o
  LEFT JOIN TBPRODUTO p
    ON p.ERP_PRODUTO = o.ERP_PRODUTO
   AND COALESCE(p.DELETADO, 'N') = 'N'
`;

async function getProductByOP(op) {
  const sql = `
    ${BASE_SELECT_REFERENCIA}
    WHERE o.OP = ?
      AND COALESCE(o.DELETADO, 'N') = 'N'
    ORDER BY o.DATA_INC DESC
  `;

  const rows = await database.query(sql, [op]);
  return rows[0] || null;
}

async function getProductByGTIN(gtin) {
  const sql = `
    ${BASE_SELECT_REFERENCIA}
    WHERE o.GTIN = ?
      AND COALESCE(o.DELETADO, 'N') = 'N'
    ORDER BY o.DATA_INC DESC
  `;

  const rows = await database.query(sql, [gtin]);
  return rows[0] || null;
}

async function getAllProducts({ startRow, endRow }) {
  const sql = `
    SELECT
      PRODUTO_ID,
      ERP_PRODUTO,
      PRODUTO,
      MENSAGEM,
      DATA_INC,
      DELETADO
    FROM TBPRODUTO
    WHERE COALESCE(DELETADO, 'N') = 'N'
    ORDER BY PRODUTO
    ROWS ? TO ?
  `;

  return database.query(sql, [startRow, endRow]);
}

module.exports = {
  getAllProducts,
  getProductByGTIN,
  getProductByOP,
};
