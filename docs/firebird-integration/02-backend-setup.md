# Backend Setup - Node.js + Express + Firebird

## 1. Estrutura de Diretórios

```
camera/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js              # Configuração Firebird
│   │   ├── controllers/
│   │   │   ├── inspecoes.controller.js  # Controller de inspeções
│   │   │   └── produtos.controller.js   # Controller de produtos
│   │   ├── services/
│   │   │   ├── inspecoes.service.js     # Lógica de negócio - inspeções
│   │   │   ├── produtos.service.js      # Lógica de negócio - produtos
│   │   │   └── fotos.service.js         # Gerenciamento de fotos
│   │   ├── routes/
│   │   │   ├── inspecoes.routes.js      # Rotas de inspeções
│   │   │   ├── produtos.routes.js       # Rotas de produtos
│   │   │   └── index.js                 # Agregador de rotas
│   │   ├── middlewares/
│   │   │   ├── upload.middleware.js     # Middleware para upload
│   │   │   ├── errorHandler.js          # Tratamento de erros
│   │   │   └── validators.js            # Validações
│   │   └── utils/
│   │       └── helpers.js               # Funções auxiliares
│   ├── uploads/
│   │   └── fotos/                       # Diretório de fotos
│   ├── logs/                            # Logs da aplicação
│   ├── scripts/
│   │   └── migrate-localStorage.js      # Script de migração (opcional)
│   ├── server.js                        # Entry point
│   ├── package.json
│   ├── .env                             # Variáveis de ambiente
│   └── .gitignore
└── (resto do projeto frontend)
```

---

## 2. Inicialização do Projeto Backend

### 2.1 Criar diretório e inicializar npm

```bash
cd /home/emanuel/camera
mkdir -p backend/src/{config,controllers,services,routes,middlewares,utils}
mkdir -p backend/uploads/fotos
mkdir -p backend/logs
mkdir -p backend/scripts

cd backend
npm init -y
```

### 2.2 Instalar dependências

```bash
# Dependências principais
npm install express node-firebird cors dotenv morgan multer

# Dependências de desenvolvimento
npm install --save-dev nodemon
```

**Descrição das bibliotecas:**
- `express` - Framework web
- `node-firebird` - Cliente Firebird para Node.js
- `cors` - Middleware para CORS
- `dotenv` - Gerenciamento de variáveis de ambiente
- `morgan` - Logger HTTP
- `multer` - Upload de arquivos
- `nodemon` - Auto-reload em desenvolvimento

---

## 3. Configuração de Variáveis de Ambiente

### 3.1 Arquivo `.env`

```env
# Servidor
NODE_ENV=development
PORT=8000
HOST=localhost

# Firebird Database
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=/path/to/your/database.fdb
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey

# Pool de Conexões
FIREBIRD_POOL_MIN=2
FIREBIRD_POOL_MAX=10

# Upload de Fotos
UPLOAD_PATH=./uploads/fotos
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png

# CORS
CORS_ORIGIN=http://localhost:8080

# Logs
LOG_LEVEL=debug
```

### 3.2 Arquivo `.env.example`

```env
# Servidor
NODE_ENV=development
PORT=8000
HOST=localhost

# Firebird Database
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=/caminho/para/database.fdb
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=sua_senha_aqui

# Pool de Conexões
FIREBIRD_POOL_MIN=2
FIREBIRD_POOL_MAX=10

# Upload de Fotos
UPLOAD_PATH=./uploads/fotos
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png

# CORS
CORS_ORIGIN=http://localhost:8080

# Logs
LOG_LEVEL=debug
```

---

## 4. Configuração do Firebird

### 4.1 Arquivo `src/config/database.js`

```javascript
const Firebird = require('node-firebird');
require('dotenv').config();

// Opções de conexão
const options = {
  host: process.env.FIREBIRD_HOST || 'localhost',
  port: process.env.FIREBIRD_PORT || 3050,
  database: process.env.FIREBIRD_DATABASE,
  user: process.env.FIREBIRD_USER || 'SYSDBA',
  password: process.env.FIREBIRD_PASSWORD,
  lowercase_keys: false, // Manter nomes de colunas como estão no banco
  role: null,
  pageSize: 4096,
};

// Pool de conexões
let pool;

/**
 * Inicializa o pool de conexões Firebird
 */
function initializePool() {
  return new Promise((resolve, reject) => {
    Firebird.pool(
      parseInt(process.env.FIREBIRD_POOL_MAX) || 10,
      options,
      (err, poolInstance) => {
        if (err) {
          console.error('Erro ao criar pool de conexões Firebird:', err);
          reject(err);
        } else {
          pool = poolInstance;
          console.log('✅ Pool de conexões Firebird inicializado com sucesso');
          resolve(pool);
        }
      }
    );
  });
}

/**
 * Obtém uma conexão do pool
 */
function getConnection() {
  return new Promise((resolve, reject) => {
    if (!pool) {
      reject(new Error('Pool de conexões não inicializado'));
      return;
    }

    pool.get((err, db) => {
      if (err) {
        console.error('Erro ao obter conexão do pool:', err);
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

/**
 * Executa uma query com parâmetros
 */
async function query(sql, params = []) {
  let db;
  try {
    db = await getConnection();

    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) {
          console.error('Erro ao executar query:', err);
          console.error('SQL:', sql);
          console.error('Params:', params);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  } finally {
    if (db) {
      db.detach();
    }
  }
}

/**
 * Executa múltiplas operações em uma transação
 */
async function transaction(operations) {
  let db;
  try {
    db = await getConnection();

    return new Promise((resolve, reject) => {
      db.transaction(
        Firebird.ISOLATION_READ_COMMITTED,
        async (err, transaction) => {
          if (err) {
            reject(err);
            return;
          }

          try {
            const results = [];
            for (const operation of operations) {
              const result = await new Promise((resolve, reject) => {
                transaction.query(operation.sql, operation.params, (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
                });
              });
              results.push(result);
            }

            transaction.commit((err) => {
              if (err) reject(err);
              else resolve(results);
            });
          } catch (error) {
            transaction.rollback(() => {
              reject(error);
            });
          }
        }
      );
    });
  } finally {
    if (db) {
      db.detach();
    }
  }
}

/**
 * Fecha o pool de conexões
 */
function closePool() {
  return new Promise((resolve) => {
    if (pool) {
      pool.destroy(() => {
        console.log('Pool de conexões Firebird fechado');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initializePool,
  getConnection,
  query,
  transaction,
  closePool,
  options,
};
```

---

## 5. Serviços (Business Logic)

### 5.1 Arquivo `src/services/produtos.service.js`

```javascript
const db = require('../config/database');

/**
 * Busca produto por OP
 */
async function getProductByOP(op) {
  const sql = `
    SELECT
      ID_PRODUTO,
      OP,
      LOTE,
      VALIDADE,
      PRODUTO,
      REGISTRO_ANVISA,
      GTIN
    FROM TB_PRODUTOS
    WHERE OP = ?
    ORDER BY DATA_CRIACAO DESC
    LIMIT 1
  `;

  const result = await db.query(sql, [op]);
  return result.length > 0 ? result[0] : null;
}

/**
 * Busca produto por OP e Lote
 */
async function getProductByOPAndLote(op, lote) {
  const sql = `
    SELECT
      ID_PRODUTO,
      OP,
      LOTE,
      VALIDADE,
      PRODUTO,
      REGISTRO_ANVISA,
      GTIN
    FROM TB_PRODUTOS
    WHERE OP = ? AND LOTE = ?
    LIMIT 1
  `;

  const result = await db.query(sql, [op, lote]);
  return result.length > 0 ? result[0] : null;
}

/**
 * Busca produto por GTIN
 */
async function getProductByGTIN(gtin) {
  const sql = `
    SELECT
      ID_PRODUTO,
      OP,
      LOTE,
      VALIDADE,
      PRODUTO,
      REGISTRO_ANVISA,
      GTIN
    FROM TB_PRODUTOS
    WHERE GTIN = ?
    ORDER BY DATA_CRIACAO DESC
    LIMIT 1
  `;

  const result = await db.query(sql, [gtin]);
  return result.length > 0 ? result[0] : null;
}

/**
 * Cria ou atualiza produto
 */
async function createOrUpdateProduct(productData) {
  const { op, lote, validade, produto, registroAnvisa, gtin } = productData;

  // Verifica se produto já existe
  const existing = await getProductByOPAndLote(op, lote);

  if (existing) {
    // Atualiza produto existente (se necessário)
    const sql = `
      UPDATE TB_PRODUTOS
      SET VALIDADE = ?,
          PRODUTO = ?,
          REGISTRO_ANVISA = ?,
          GTIN = ?
      WHERE ID_PRODUTO = ?
    `;

    await db.query(sql, [validade, produto, registroAnvisa, gtin, existing.ID_PRODUTO]);
    return existing.ID_PRODUTO;
  } else {
    // Cria novo produto
    const sql = `
      INSERT INTO TB_PRODUTOS (OP, LOTE, VALIDADE, PRODUTO, REGISTRO_ANVISA, GTIN)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING ID_PRODUTO
    `;

    const result = await db.query(sql, [op, lote, validade, produto, registroAnvisa, gtin]);
    return result[0].ID_PRODUTO;
  }
}

/**
 * Lista todos os produtos (com paginação)
 */
async function getAllProducts(page = 1, limit = 50) {
  const offset = (page - 1) * limit;

  const sql = `
    SELECT
      ID_PRODUTO,
      OP,
      LOTE,
      VALIDADE,
      PRODUTO,
      REGISTRO_ANVISA,
      GTIN,
      DATA_CRIACAO
    FROM TB_PRODUTOS
    ORDER BY DATA_CRIACAO DESC
    LIMIT ? OFFSET ?
  `;

  const result = await db.query(sql, [limit, offset]);
  return result;
}

module.exports = {
  getProductByOP,
  getProductByOPAndLote,
  getProductByGTIN,
  createOrUpdateProduct,
  getAllProducts,
};
```

### 5.2 Arquivo `src/services/fotos.service.js`

```javascript
const fs = require('fs').promises;
const path = require('path');

const UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || './uploads/fotos';

/**
 * Gera caminho para salvar foto baseado na data
 */
function generatePhotoPath(idInspecao) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now();

  const relativePath = `${year}/${month}/${day}`;
  const filename = `${idInspecao}_${timestamp}.jpg`;

  return {
    relativePath,
    filename,
    fullPath: path.join(relativePath, filename),
    absolutePath: path.join(UPLOAD_BASE_PATH, relativePath, filename),
  };
}

/**
 * Salva foto a partir de Base64
 */
async function savePhotoFromBase64(base64Data, idInspecao) {
  // Remove o prefixo "data:image/jpeg;base64," se existir
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Image, 'base64');

  const pathInfo = generatePhotoPath(idInspecao);
  const directoryPath = path.join(UPLOAD_BASE_PATH, pathInfo.relativePath);

  // Cria diretório se não existir
  await fs.mkdir(directoryPath, { recursive: true });

  // Salva o arquivo
  await fs.writeFile(pathInfo.absolutePath, imageBuffer);

  return pathInfo.fullPath; // Retorna caminho relativo para salvar no banco
}

/**
 * Deleta foto do sistema de arquivos
 */
async function deletePhoto(photoPath) {
  try {
    const absolutePath = path.join(UPLOAD_BASE_PATH, photoPath);
    await fs.unlink(absolutePath);
    return true;
  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    return false;
  }
}

/**
 * Verifica se foto existe
 */
async function photoExists(photoPath) {
  try {
    const absolutePath = path.join(UPLOAD_BASE_PATH, photoPath);
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtém caminho absoluto da foto
 */
function getAbsolutePhotoPath(photoPath) {
  return path.join(UPLOAD_BASE_PATH, photoPath);
}

module.exports = {
  generatePhotoPath,
  savePhotoFromBase64,
  deletePhoto,
  photoExists,
  getAbsolutePhotoPath,
  UPLOAD_BASE_PATH,
};
```

### 5.3 Arquivo `src/services/inspecoes.service.js`

```javascript
const db = require('../config/database');
const fotosService = require('./fotos.service');
const produtosService = require('./produtos.service');

/**
 * Cria nova inspeção
 */
async function createInspection(data) {
  const { fotoBase64, referenceData, inspectionStates, observacoes, usuario } = data;

  try {
    // 1. Criar ou obter produto
    const idProduto = await produtosService.createOrUpdateProduct(referenceData);

    // 2. Inserir inspeção (sem foto primeiro)
    const sqlInspection = `
      INSERT INTO TB_INSPECOES (
        ID_PRODUTO,
        CAMINHO_FOTO,
        GTIN_CONFORME,
        DATAMATRIX_CONFORME,
        LOTE_CONFORME,
        VALIDADE_CONFORME,
        OBSERVACOES,
        USUARIO
      )
      VALUES (?, '', ?, ?, ?, ?, ?, ?)
      RETURNING ID_INSPECAO
    `;

    const conformeToInt = (value) => (value === true ? 1 : value === false ? 0 : null);

    const inspectionResult = await db.query(sqlInspection, [
      idProduto,
      conformeToInt(inspectionStates.gtin),
      conformeToInt(inspectionStates.datamatrix),
      conformeToInt(inspectionStates.lote),
      conformeToInt(inspectionStates.validade),
      observacoes || null,
      usuario || null,
    ]);

    const idInspecao = inspectionResult[0].ID_INSPECAO;

    // 3. Salvar foto com ID da inspeção
    const photoPath = await fotosService.savePhotoFromBase64(fotoBase64, idInspecao);

    // 4. Atualizar caminho da foto na inspeção
    const sqlUpdatePhoto = `
      UPDATE TB_INSPECOES
      SET CAMINHO_FOTO = ?
      WHERE ID_INSPECAO = ?
    `;

    await db.query(sqlUpdatePhoto, [photoPath, idInspecao]);

    return {
      id: idInspecao,
      message: 'Inspeção criada com sucesso',
    };
  } catch (error) {
    console.error('Erro ao criar inspeção:', error);
    throw error;
  }
}

/**
 * Lista inspeções com paginação e filtros
 */
async function getInspections(filters = {}) {
  const { page = 1, limit = 10, campo, termo } = filters;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  // Aplica filtros se fornecidos
  if (campo && termo) {
    switch (campo) {
      case 'op':
        whereClause = 'WHERE p.OP LIKE ?';
        params.push(`%${termo}%`);
        break;
      case 'lote':
        whereClause = 'WHERE p.LOTE LIKE ?';
        params.push(`%${termo}%`);
        break;
      case 'produto':
        whereClause = 'WHERE p.PRODUTO LIKE ?';
        params.push(`%${termo}%`);
        break;
      case 'gtin':
        whereClause = 'WHERE p.GTIN LIKE ?';
        params.push(`%${termo}%`);
        break;
      case 'usuario':
        whereClause = 'WHERE i.USUARIO LIKE ?';
        params.push(`%${termo}%`);
        break;
    }
  }

  // Query principal
  const sql = `
    SELECT
      i.ID_INSPECAO,
      i.DATA_HORA,
      i.CAMINHO_FOTO,
      i.GTIN_CONFORME,
      i.DATAMATRIX_CONFORME,
      i.LOTE_CONFORME,
      i.VALIDADE_CONFORME,
      i.OBSERVACOES,
      i.USUARIO,
      p.OP,
      p.LOTE,
      p.VALIDADE,
      p.PRODUTO,
      p.REGISTRO_ANVISA,
      p.GTIN
    FROM TB_INSPECOES i
    INNER JOIN TB_PRODUTOS p ON p.ID_PRODUTO = i.ID_PRODUTO
    ${whereClause}
    ORDER BY i.DATA_HORA DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limit, offset];
  const result = await db.query(sql, queryParams);

  // Query para total de registros
  const sqlCount = `
    SELECT COUNT(*) as TOTAL
    FROM TB_INSPECOES i
    INNER JOIN TB_PRODUTOS p ON p.ID_PRODUTO = i.ID_PRODUTO
    ${whereClause}
  `;

  const countResult = await db.query(sqlCount, params);
  const total = countResult[0].TOTAL;

  return {
    data: result.map(formatInspectionRecord),
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Busca inspeção por ID
 */
async function getInspectionById(id) {
  const sql = `
    SELECT
      i.ID_INSPECAO,
      i.DATA_HORA,
      i.CAMINHO_FOTO,
      i.GTIN_CONFORME,
      i.DATAMATRIX_CONFORME,
      i.LOTE_CONFORME,
      i.VALIDADE_CONFORME,
      i.OBSERVACOES,
      i.USUARIO,
      p.OP,
      p.LOTE,
      p.VALIDADE,
      p.PRODUTO,
      p.REGISTRO_ANVISA,
      p.GTIN
    FROM TB_INSPECOES i
    INNER JOIN TB_PRODUTOS p ON p.ID_PRODUTO = i.ID_PRODUTO
    WHERE i.ID_INSPECAO = ?
  `;

  const result = await db.query(sql, [id]);
  return result.length > 0 ? formatInspectionRecord(result[0]) : null;
}

/**
 * Deleta inspeção
 */
async function deleteInspection(id) {
  // Busca caminho da foto antes de deletar
  const inspection = await getInspectionById(id);

  if (!inspection) {
    throw new Error('Inspeção não encontrada');
  }

  // Deleta registro do banco
  const sql = 'DELETE FROM TB_INSPECOES WHERE ID_INSPECAO = ?';
  await db.query(sql, [id]);

  // Deleta foto do sistema de arquivos
  if (inspection.foto) {
    const photoPath = inspection.foto.replace('/api/fotos/', '');
    await fotosService.deletePhoto(photoPath);
  }

  return { message: 'Inspeção deletada com sucesso' };
}

/**
 * Deleta múltiplas inspeções
 */
async function deleteMultipleInspections(ids) {
  const deletedCount = 0;

  for (const id of ids) {
    try {
      await deleteInspection(id);
      deletedCount++;
    } catch (error) {
      console.error(`Erro ao deletar inspeção ${id}:`, error);
    }
  }

  return {
    message: `${deletedCount} inspeção(ões) deletada(s) com sucesso`,
    deletedCount,
  };
}

/**
 * Formata registro de inspeção para o formato esperado pelo frontend
 */
function formatInspectionRecord(record) {
  const intToConforme = (value) => (value === 1 ? true : value === 0 ? false : null);

  return {
    id: String(record.ID_INSPECAO),
    timestamp: new Date(record.DATA_HORA).getTime(),
    dataHora: formatDateTime(new Date(record.DATA_HORA)),
    foto: `/api/fotos/${record.CAMINHO_FOTO}`,
    referenceData: {
      op: record.OP,
      lote: record.LOTE,
      validade: record.VALIDADE,
      produto: record.PRODUTO,
      registroAnvisa: record.REGISTRO_ANVISA,
      gtin: record.GTIN,
    },
    inspectionStates: {
      gtin: intToConforme(record.GTIN_CONFORME),
      datamatrix: intToConforme(record.DATAMATRIX_CONFORME),
      lote: intToConforme(record.LOTE_CONFORME),
      validade: intToConforme(record.VALIDADE_CONFORME),
    },
    observacoes: record.OBSERVACOES,
    usuario: record.USUARIO,
  };
}

/**
 * Formata data/hora para exibição
 */
function formatDateTime(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  createInspection,
  getInspections,
  getInspectionById,
  deleteInspection,
  deleteMultipleInspections,
};
```

---

## 6. Controllers

*(Continua no próximo arquivo devido ao tamanho...)*

**NOTA:** O documento completo de backend setup continua com:
- Controllers (inspecoes.controller.js, produtos.controller.js)
- Routes (inspecoes.routes.js, produtos.routes.js, index.js)
- Middlewares (upload.middleware.js, errorHandler.js, validators.js)
- Server.js (entry point)
- package.json completo
- Scripts npm

Vou criar o restante em um arquivo complementar.

---

**Documento criado em:** 04/11/2025
**Versão:** 1.0 (Parte 1)
**Status:** Em andamento
