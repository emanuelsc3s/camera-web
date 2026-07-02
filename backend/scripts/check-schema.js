const database = require('../src/config/database');
const { env } = require('../src/config/env');

const REQUIRED_TABLES = [
  'TBOP',
  'TBPRODUTO',
  'TBLINHA_PRODUCAO',
  'TBUSUARIO',
  'TBACESSO',
  'TBINSPECAO_MANUAL',
  'TBUSUARIO_FACEID',
];

const REQUIRED_COLUMNS = {
  TBUSUARIO: [
    'USUARIO_ID',
    'NOME',
    'EMAIL',
    'DELETADO',
    'FAILED_ATTEMPTS',
  ],
  TBOP: [
    'OP_ID',
    'OP',
    'LOTE',
    'PRODUTO',
    'GTIN',
    'ANVISA',
    'LINHAPRODUCAO_ID',
    'START',
  ],
  TBLINHA_PRODUCAO: [
    'LINHAPRODUCAO_ID',
  ],
  TBACESSO: [
    'ACESSO_ID',
    'DATA',
    'USUARIO_ID',
    'USUARIO',
    'LOCAL',
    'TIPO',
    'ATIVIDADE',
    'ONLINE',
    'IP',
    'COMPUTADOR',
    'CHAVE_ID',
  ],
  TBINSPECAO_MANUAL: [
    'INSPECAOMANUAL_ID',
    'STATUS',
    'OP_ID',
    'OP',
    'ERP_PRODUTO',
    'PRODUTO',
    'LOTE',
    'VALIDADE',
    'GTIN',
    'REGISTRO_ANVISA',
    'LINHAPRODUCAO_ID',
    'FASE',
    'CAMINHO_FOTO',
    'GTIN_CONFORME',
    'DATAMATRIX_CONFORME',
    'LOTE_CONFORME',
    'VALIDADE_CONFORME',
    'DATA_INC',
    'USUARIO_I',
    'USUARIONOME_I',
    'DATA_ALT',
    'USUARIO_A',
    'USUARIONOME_A',
    'DATA_DEL',
    'USUARIO_D',
    'USUARIONOME_D',
    'DELETADO',
  ],
  TBUSUARIO_FACEID: [
    'FACEID_ID',
    'USUARIO_ID',
    'DESCRIPTOR_FACIAL',
    'MATRICULA',
    'ATIVO',
    'DATA_INC',
    'USUARIO_I',
    'USUARIONOME_I',
    'DATA_ALT',
    'USUARIO_A',
    'USUARIONOME_A',
    'DATA_DEL',
    'USUARIO_D',
    'USUARIONOME_D',
  ],
};

const REQUIRED_GENERATORS = [
  'GEN_TBINSPECAOMANUAL_ID',
  'GEN_TBUSUARIO_FACEID_ID',
];

const REQUIRED_TRIGGERS = [
  'TRG_TBINSPECAO_MANUAL_BI',
  'TRG_TBINSPECAO_MANUAL_BU',
  'TRG_TBUSUARIO_FACEID_BI',
  'TRG_TBUSUARIO_FACEID_BU',
];

function normalizeName(value) {
  return String(value || '').trim().toUpperCase();
}

function toSet(rows, fieldName) {
  return new Set(rows.map((row) => normalizeName(row[fieldName])));
}

function printStatus(ok, message) {
  console.log(`${ok ? 'OK ' : 'ERRO'} - ${message}`);
}

async function loadTables() {
  const rows = await database.query(`
    SELECT TRIM(RDB$RELATION_NAME) AS NOME
    FROM RDB$RELATIONS
    WHERE COALESCE(RDB$SYSTEM_FLAG, 0) = 0
  `);

  return toSet(rows, 'NOME');
}

async function loadColumns() {
  const rows = await database.query(`
    SELECT
      TRIM(RDB$RELATION_NAME) AS TABELA,
      TRIM(RDB$FIELD_NAME) AS CAMPO
    FROM RDB$RELATION_FIELDS
    WHERE RDB$RELATION_NAME IN (
      'TBOP',
      'TBLINHA_PRODUCAO',
      'TBUSUARIO',
      'TBACESSO',
      'TBINSPECAO_MANUAL',
      'TBUSUARIO_FACEID'
    )
  `);

  return rows.reduce((accumulator, row) => {
    const table = normalizeName(row.TABELA);
    const column = normalizeName(row.CAMPO);

    if (!accumulator[table]) {
      accumulator[table] = new Set();
    }

    accumulator[table].add(column);
    return accumulator;
  }, {});
}

async function loadGenerators() {
  const rows = await database.query(`
    SELECT TRIM(RDB$GENERATOR_NAME) AS NOME
    FROM RDB$GENERATORS
    WHERE COALESCE(RDB$SYSTEM_FLAG, 0) = 0
  `);

  return toSet(rows, 'NOME');
}

async function loadTriggers() {
  const rows = await database.query(`
    SELECT TRIM(RDB$TRIGGER_NAME) AS NOME
    FROM RDB$TRIGGERS
    WHERE COALESCE(RDB$SYSTEM_FLAG, 0) = 0
  `);

  return toSet(rows, 'NOME');
}

function checkRequiredItems(title, requiredItems, existingItems) {
  console.log(`\n${title}`);

  const missing = [];

  requiredItems.forEach((item) => {
    const ok = existingItems.has(item);
    printStatus(ok, item);

    if (!ok) {
      missing.push(item);
    }
  });

  return missing;
}

function checkRequiredColumns(columnsByTable) {
  console.log('\nCampos criticos');

  const missing = [];

  Object.entries(REQUIRED_COLUMNS).forEach(([table, requiredColumns]) => {
    const existingColumns = columnsByTable[table] || new Set();

    requiredColumns.forEach((column) => {
      const ok = existingColumns.has(column);
      printStatus(ok, `${table}.${column}`);

      if (!ok) {
        missing.push(`${table}.${column}`);
      }
    });
  });

  return missing;
}

async function main() {
  console.log('Validando schema Firebird 2.5 do Camera Web...');
  console.log(`Host: ${env.firebird.host}:${env.firebird.port}`);
  console.log(`Banco: ${env.firebird.database || '(nao configurado)'}`);
  console.log('Modo: somente leitura, nenhuma migration sera aplicada.');

  const [
    tables,
    columnsByTable,
    generators,
    triggers,
  ] = await Promise.all([
    loadTables(),
    loadColumns(),
    loadGenerators(),
    loadTriggers(),
  ]);

  const missing = [
    ...checkRequiredItems('Tabelas obrigatorias', REQUIRED_TABLES, tables),
    ...checkRequiredColumns(columnsByTable),
    ...checkRequiredItems('Generators obrigatorios', REQUIRED_GENERATORS, generators),
    ...checkRequiredItems('Triggers obrigatorias', REQUIRED_TRIGGERS, triggers),
  ];

  if (missing.length) {
    console.error(`\nSchema incompleto. Itens ausentes: ${missing.join(', ')}`);
    console.error('Revise as migrations em docs/firebird-integration/migrations antes de executar em producao.');
    process.exitCode = 1;
    return;
  }

  console.log('\nSchema validado com sucesso.');
}

main()
  .catch((erro) => {
    console.error('Erro inesperado ao validar schema:', erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.closePool();
  });
