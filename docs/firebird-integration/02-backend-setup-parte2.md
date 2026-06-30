# Backend Setup - Parte 2: Controllers, Routes e Server

## 6. Controllers

### 6.1 Arquivo `src/controllers/inspecoes.controller.js`

```javascript
const inspeçõesService = require('../services/inspecoes.service');

/**
 * Cria nova inspeção
 * POST /api/inspecoes
 */
async function create(req, res, next) {
  try {
    const { fotoBase64, referenceData, inspectionStates, observacoes, usuarioId, usuario, fase } = req.body;

    // Validações básicas
    if (!fotoBase64) {
      return res.status(400).json({ error: 'Foto é obrigatória' });
    }

    if (!referenceData || !inspectionStates) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const result = await inspeçõesService.createInspection({
      fotoBase64,
      referenceData,
      inspectionStates,
      observacoes,
      usuarioId,
      usuario,
      fase,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Lista inspeções com paginação e filtros
 * GET /api/inspecoes?page=1&limit=10&campo=op&termo=12345
 */
async function list(req, res, next) {
  try {
    const { page, limit, campo, termo } = req.query;

    const filters = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      campo,
      termo,
    };

    const result = await inspeçõesService.getInspections(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Busca inspeção por ID
 * GET /api/inspecoes/:id
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await inspeçõesService.getInspectionById(parseInt(id));

    if (!result) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Exclui logicamente inspeção
 * DELETE /api/inspecoes/:id
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const { usuarioId, usuario } = req.body || {};
    const result = await inspeçõesService.deleteInspection(parseInt(id), {
      usuarioId,
      usuario,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Deleta múltiplas inspeções
 * DELETE /api/inspecoes/batch
 * Body: { ids: [1, 2, 3] }
 */
async function removeBatch(req, res, next) {
  try {
    const { ids, usuarioId, usuario } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    const result = await inspeçõesService.deleteMultipleInspections(ids.map(Number), {
      usuarioId,
      usuario,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Exporta inspeções como JSON
 * GET /api/inspecoes/export/json
 */
async function exportJSON(req, res, next) {
  try {
    const result = await inspeçõesService.getInspections({ page: 1, limit: 100000 });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=inspecoes_${Date.now()}.json`);
    res.json(result.data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  remove,
  removeBatch,
  exportJSON,
};
```

### 6.2 Arquivo `src/controllers/produtos.controller.js`

```javascript
const produtosService = require('../services/produtos.service');

/**
 * Busca produto por OP
 * GET /api/produtos/:op
 */
async function getByOP(req, res, next) {
  try {
    const { op } = req.params;
    const result = await produtosService.getProductByOP(op);

    if (!result) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Formata para o formato esperado pelo frontend
    const formatted = {
      op: result.OP,
      lote: result.LOTE,
      validade: result.VALIDADE,
      produto: result.PRODUTO,
      registroAnvisa: result.REGISTRO_ANVISA,
      gtin: result.GTIN,
      linhaProducaoId: result.LINHAPRODUCAO_ID,
    };

    res.json(formatted);
  } catch (error) {
    next(error);
  }
}

/**
 * Busca produto por GTIN
 * GET /api/produtos/gtin/:gtin
 */
async function getByGTIN(req, res, next) {
  try {
    const { gtin } = req.params;
    const result = await produtosService.getProductByGTIN(gtin);

    if (!result) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const formatted = {
      op: result.OP,
      lote: result.LOTE,
      validade: result.VALIDADE,
      produto: result.PRODUTO,
      registroAnvisa: result.REGISTRO_ANVISA,
      gtin: result.GTIN,
      linhaProducaoId: result.LINHAPRODUCAO_ID,
    };

    res.json(formatted);
  } catch (error) {
    next(error);
  }
}

/**
 * Lista todos os produtos
 * GET /api/produtos?page=1&limit=50
 */
async function list(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await produtosService.getAllProducts(
      parseInt(page) || 1,
      parseInt(limit) || 50
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getByOP,
  getByGTIN,
  list,
};
```

### 6.3 Arquivo `src/controllers/fotos.controller.js`

```javascript
const fotosService = require('../services/fotos.service');
const path = require('path');

/**
 * Serve foto
 * GET /api/fotos/:year/:month/:day/:filename
 */
async function servePhoto(req, res, next) {
  try {
    const { year, month, day, filename } = req.params;
    const photoPath = `${year}/${month}/${day}/${filename}`;

    const exists = await fotosService.photoExists(photoPath);

    if (!exists) {
      return res.status(404).json({ error: 'Foto não encontrada' });
    }

    const absolutePath = fotosService.getAbsolutePhotoPath(photoPath);
    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  servePhoto,
};
```

---

## 7. Routes

### 7.1 Arquivo `src/routes/inspecoes.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const inspeçõesController = require('../controllers/inspecoes.controller');

// Criar nova inspeção
router.post('/', inspeçõesController.create);

// Listar inspeções (com paginação e filtros)
router.get('/', inspeçõesController.list);

// Buscar inspeção por ID
router.get('/:id', inspeçõesController.getById);

// Deletar inspeção
router.delete('/:id', inspeçõesController.remove);

// Deletar múltiplas inspeções
router.delete('/batch', inspeçõesController.removeBatch);

// Exportar como JSON
router.get('/export/json', inspeçõesController.exportJSON);

module.exports = router;
```

### 7.2 Arquivo `src/routes/produtos.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtos.controller');

// Lista produtos
router.get('/', produtosController.list);

// Busca por GTIN (deve vir antes de /:op para não conflitar)
router.get('/gtin/:gtin', produtosController.getByGTIN);

// Busca por OP
router.get('/:op', produtosController.getByOP);

module.exports = router;
```

### 7.3 Arquivo `src/routes/fotos.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const fotosController = require('../controllers/fotos.controller');

// Serve foto
router.get('/:year/:month/:day/:filename', fotosController.servePhoto);

module.exports = router;
```

### 7.4 Arquivo `src/routes/index.js`

```javascript
const express = require('express');
const router = express.Router();

const inspeçõesRoutes = require('./inspecoes.routes');
const produtosRoutes = require('./produtos.routes');
const fotosRoutes = require('./fotos.routes');

// Monta as rotas
router.use('/inspecoes', inspeçõesRoutes);
router.use('/produtos', produtosRoutes);
router.use('/fotos', fotosRoutes);

// Rota de health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
```

---

## 8. Middlewares

### 8.1 Arquivo `src/middlewares/errorHandler.js`

```javascript
/**
 * Middleware de tratamento de erros
 */
function errorHandler(err, req, res, next) {
  console.error('Erro capturado:', err);

  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erro de validação',
      details: err.message,
    });
  }

  // Erro do Firebird
  if (err.gdscode || err.sqlcode) {
    return res.status(500).json({
      error: 'Erro no banco de dados',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor',
    });
  }

  // Erro genérico
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
```

### 8.2 Arquivo `src/middlewares/validators.js`

```javascript
/**
 * Valida dados de criação de inspeção
 */
function validateInspectionData(req, res, next) {
  const { fotoBase64, referenceData, inspectionStates, usuarioId, usuario, fase } = req.body;

  const errors = [];

  // Valida foto
  if (!fotoBase64 || typeof fotoBase64 !== 'string') {
    errors.push('Foto inválida ou ausente');
  }

  // Valida referenceData
  if (!referenceData || typeof referenceData !== 'object') {
    errors.push('Dados de referência inválidos');
  } else {
    const requiredFields = ['op', 'lote', 'validade', 'produto', 'registroAnvisa', 'gtin'];
    for (const field of requiredFields) {
      if (!referenceData[field]) {
        errors.push(`Campo '${field}' é obrigatório em referenceData`);
      }
    }
  }

  // Valida inspectionStates
  if (!inspectionStates || typeof inspectionStates !== 'object') {
    errors.push('Estados de inspeção inválidos');
  } else {
    const requiredStates = ['gtin', 'datamatrix', 'lote', 'validade'];
    for (const state of requiredStates) {
      if (!(state in inspectionStates)) {
        errors.push(`Estado '${state}' é obrigatório em inspectionStates`);
      } else if (![true, false, null].includes(inspectionStates[state])) {
        errors.push(`Estado '${state}' deve ser true, false ou null`);
      }
    }
  }

  // Valida fase opcional
  if (fase && (typeof fase !== 'string' || fase.length > 10)) {
    errors.push('Campo fase deve ser texto com no máximo 10 caracteres');
  }

  // Valida auditoria opcional
  if (usuarioId !== undefined && usuarioId !== null && !Number.isInteger(Number(usuarioId))) {
    errors.push('Campo usuarioId deve ser um número inteiro');
  }

  if (usuario && (typeof usuario !== 'string' || usuario.length > 30)) {
    errors.push('Campo usuario deve ser texto com no máximo 30 caracteres');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

module.exports = {
  validateInspectionData,
};
```

### 8.3 Arquivo `src/middlewares/cors.js`

```javascript
const cors = require('cors');

/**
 * Configuração de CORS
 */
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
```

---

## 9. Server (Entry Point)

### 9.1 Arquivo `server.js`

```javascript
const express = require('express');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const db = require('./src/config/database');
const routes = require('./src/routes');
const corsMiddleware = require('./src/middlewares/cors');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || 'localhost';

// Middlewares globais
app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' })); // Aumenta limite para suportar fotos em base64
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logger HTTP
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Serve arquivos estáticos (fotos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas da API
app.use('/api', routes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'API de Inspeções - SysView Camera',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      inspecoes: '/api/inspecoes',
      produtos: '/api/produtos',
      fotos: '/api/fotos/:year/:month/:day/:filename',
    },
  });
});

// Tratamento de rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// Inicialização do servidor
async function startServer() {
  try {
    // Inicializa pool de conexões Firebird
    console.log('🔌 Inicializando conexão com Firebird...');
    await db.initializePool();

    // Inicia servidor HTTP
    app.listen(PORT, HOST, () => {
      console.log('');
      console.log('🚀 Servidor iniciado com sucesso!');
      console.log('');
      console.log(`   📍 URL: http://${HOST}:${PORT}`);
      console.log(`   🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🗄️  Banco: ${process.env.FIREBIRD_DATABASE}`);
      console.log('');
      console.log('   Endpoints disponíveis:');
      console.log(`   - GET  http://${HOST}:${PORT}/api/health`);
      console.log(`   - POST http://${HOST}:${PORT}/api/inspecoes`);
      console.log(`   - GET  http://${HOST}:${PORT}/api/inspecoes`);
      console.log(`   - GET  http://${HOST}:${PORT}/api/produtos/:op`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de encerramento gracioso
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recebido. Encerrando servidor...');
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT recebido. Encerrando servidor...');
  await db.closePool();
  process.exit(0);
});

// Inicia o servidor
startServer();
```

---

## 10. Package.json

### 10.1 Arquivo `package.json`

```json
{
  "name": "camera-backend",
  "version": "1.0.0",
  "description": "Backend API para sistema de inspeção de câmeras com Firebird",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "firebird",
    "express",
    "api",
    "inspection",
    "camera"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "node-firebird": "^1.1.8"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

---

## 11. .gitignore

### 11.1 Arquivo `.gitignore`

```
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.*.local

# Uploads (fotos)
uploads/fotos/*
!uploads/fotos/.gitkeep

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
```

---

## 12. Criação da Tabela Manual no Firebird

### 12.1 Script SQL - `scripts/create-tables.sql`

```sql
-- ========================================
-- Script de criação de tabelas
-- Sistema de Inspeção - SysView Camera
-- ========================================

-- Pré-requisitos do banco atual:
-- - TBOP já existe e contém OP, LOTE, VALIDADE, GTIN e ANVISA.
-- - TBPRODUTO já existe e é o cadastro de produtos usado pelo projeto.
-- - TBLINHA_PRODUCAO já existe e contém as linhas de produção.
-- - TBINSPECAO já existe, mas pertence ao projeto SICFAR e não deve ser usada aqui.

-- Tabela nova e exclusiva para inspeções manuais deste projeto.
CREATE TABLE TBINSPECAO_MANUAL (
  INSPECAOMANUAL_ID   INTEGER NOT NULL,
  STATUS              VARCHAR(10),
  OP_ID               INTEGER,
  OP                  VARCHAR(10),
  ERP_PRODUTO         VARCHAR(10),
  PRODUTO             VARCHAR(80),
  LOTE                VARCHAR(10),
  VALIDADE            DATE,
  GTIN                VARCHAR(20),
  REGISTRO_ANVISA     VARCHAR(20),
  LINHAPRODUCAO_ID    INTEGER,
  FASE                VARCHAR(10),
  DATA                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CAMINHO_FOTO        VARCHAR(500),
  GTIN_CONFORME       VARCHAR(3),
  DATAMATRIX_CONFORME VARCHAR(3),
  LOTE_CONFORME       VARCHAR(3),
  VALIDADE_CONFORME   VARCHAR(3),
  OBSERVACOES         VARCHAR(1000),
  USUARIO_ID          INTEGER,
  USUARIO             VARCHAR(30),
  LOCALIZACAO         VARCHAR(200),
  DATA_INC            TIMESTAMP,
  USUARIO_I           INTEGER,
  USUARIONOME_I       VARCHAR(30),
  DATA_ALT            TIMESTAMP,
  USUARIO_A           INTEGER,
  USUARIONOME_A       VARCHAR(30),
  DATA_DEL            TIMESTAMP,
  USUARIO_D           INTEGER,
  USUARIONOME_D       VARCHAR(30),
  DELETADO            CHAR(1) DEFAULT 'N',

  CONSTRAINT PK_TBINSPECAO_MANUAL PRIMARY KEY (INSPECAOMANUAL_ID),
  CONSTRAINT FK_TBINSPMANUAL_OP FOREIGN KEY (OP_ID) REFERENCES TBOP(OP_ID),
  CONSTRAINT FK_TBINSPMANUAL_LINHA FOREIGN KEY (LINHAPRODUCAO_ID) REFERENCES TBLINHA_PRODUCAO(LINHAPRODUCAO_ID),
  CONSTRAINT CK_TBINSPMANUAL_GTIN_CONF CHECK (GTIN_CONFORME IN ('Sim', 'Não') OR GTIN_CONFORME IS NULL),
  CONSTRAINT CK_TBINSPMANUAL_DATAMAT_CONF CHECK (DATAMATRIX_CONFORME IN ('Sim', 'Não') OR DATAMATRIX_CONFORME IS NULL),
  CONSTRAINT CK_TBINSPMANUAL_LOTE_CONF CHECK (LOTE_CONFORME IN ('Sim', 'Não') OR LOTE_CONFORME IS NULL),
  CONSTRAINT CK_TBINSPMANUAL_VALID_CONF CHECK (VALIDADE_CONFORME IN ('Sim', 'Não') OR VALIDADE_CONFORME IS NULL)
);

-- Generator para INSPECAOMANUAL_ID
CREATE GENERATOR GEN_TBINSPECAOMANUAL_ID;
SET GENERATOR GEN_TBINSPECAOMANUAL_ID TO 0;

-- Trigger para auto-incremento de INSPECAOMANUAL_ID
SET TERM ^ ;

CREATE TRIGGER TRG_TBINSPECAO_MANUAL_BI FOR TBINSPECAO_MANUAL
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
  IF (NEW.INSPECAOMANUAL_ID IS NULL) THEN
    NEW.INSPECAOMANUAL_ID = GEN_ID(GEN_TBINSPECAOMANUAL_ID, 1);

  IF (NEW.DATA_INC IS NULL) THEN
    NEW.DATA_INC = CURRENT_TIMESTAMP;

  IF (NEW.DELETADO IS NULL) THEN
    NEW.DELETADO = 'N';
END^

SET TERM ; ^

-- Índices para TBINSPECAO_MANUAL
CREATE INDEX IDX_TBINSPMANUAL_OP ON TBINSPECAO_MANUAL(OP);
CREATE INDEX IDX_TBINSPMANUAL_DATA ON TBINSPECAO_MANUAL(DATA DESC);
CREATE INDEX IDX_TBINSPMANUAL_USUARIO ON TBINSPECAO_MANUAL(USUARIO);
CREATE INDEX IDX_TBINSPMANUAL_LINHA ON TBINSPECAO_MANUAL(LINHAPRODUCAO_ID);
CREATE INDEX IDX_TBINSPMANUAL_FASE ON TBINSPECAO_MANUAL(FASE);
CREATE INDEX IDX_TBINSPMANUAL_STATUS ON TBINSPECAO_MANUAL(STATUS);
CREATE INDEX IDX_TBINSPMANUAL_DATA_INC ON TBINSPECAO_MANUAL(DATA_INC DESC);
CREATE INDEX IDX_TBINSPMANUAL_DATA_DEL ON TBINSPECAO_MANUAL(DATA_DEL);
CREATE INDEX IDX_TBINSPMANUAL_DELETADO ON TBINSPECAO_MANUAL(DELETADO);

COMMIT;
```

### 12.2 Ajuste quando a tabela já existir

Se a `TBINSPECAO_MANUAL` já tiver sido criada a partir de uma versão anterior da documentação, execute somente os comandos referentes aos campos, constraints e índices que ainda não existirem:

```sql
ALTER TABLE TBINSPECAO_MANUAL ADD LINHAPRODUCAO_ID INTEGER;
ALTER TABLE TBINSPECAO_MANUAL ADD FASE VARCHAR(10);
ALTER TABLE TBINSPECAO_MANUAL ADD STATUS VARCHAR(10);
ALTER TABLE TBINSPECAO_MANUAL ADD DATA_INC TIMESTAMP;
ALTER TABLE TBINSPECAO_MANUAL ADD USUARIO_I INTEGER;
ALTER TABLE TBINSPECAO_MANUAL ADD USUARIONOME_I VARCHAR(30);
ALTER TABLE TBINSPECAO_MANUAL ADD DATA_ALT TIMESTAMP;
ALTER TABLE TBINSPECAO_MANUAL ADD USUARIO_A INTEGER;
ALTER TABLE TBINSPECAO_MANUAL ADD USUARIONOME_A VARCHAR(30);
ALTER TABLE TBINSPECAO_MANUAL ADD DATA_DEL TIMESTAMP;
ALTER TABLE TBINSPECAO_MANUAL ADD USUARIO_D INTEGER;
ALTER TABLE TBINSPECAO_MANUAL ADD USUARIONOME_D VARCHAR(30);

ALTER TABLE TBINSPECAO_MANUAL ALTER GTIN_CONFORME TYPE VARCHAR(3);
ALTER TABLE TBINSPECAO_MANUAL ALTER DATAMATRIX_CONFORME TYPE VARCHAR(3);
ALTER TABLE TBINSPECAO_MANUAL ALTER LOTE_CONFORME TYPE VARCHAR(3);
ALTER TABLE TBINSPECAO_MANUAL ALTER VALIDADE_CONFORME TYPE VARCHAR(3);

UPDATE TBINSPECAO_MANUAL
SET GTIN_CONFORME = CASE TRIM(GTIN_CONFORME) WHEN '1' THEN 'Sim' WHEN '0' THEN 'Não' ELSE GTIN_CONFORME END,
    DATAMATRIX_CONFORME = CASE TRIM(DATAMATRIX_CONFORME) WHEN '1' THEN 'Sim' WHEN '0' THEN 'Não' ELSE DATAMATRIX_CONFORME END,
    LOTE_CONFORME = CASE TRIM(LOTE_CONFORME) WHEN '1' THEN 'Sim' WHEN '0' THEN 'Não' ELSE LOTE_CONFORME END,
    VALIDADE_CONFORME = CASE TRIM(VALIDADE_CONFORME) WHEN '1' THEN 'Sim' WHEN '0' THEN 'Não' ELSE VALIDADE_CONFORME END;

UPDATE TBINSPECAO_MANUAL
SET STATUS = CASE
  WHEN 'Não' IN (GTIN_CONFORME, DATAMATRIX_CONFORME, LOTE_CONFORME, VALIDADE_CONFORME) THEN 'Rejeitado'
  WHEN GTIN_CONFORME = 'Sim' AND DATAMATRIX_CONFORME = 'Sim' AND LOTE_CONFORME = 'Sim' AND VALIDADE_CONFORME = 'Sim' THEN 'Aprovado'
  ELSE 'Aberto'
END
WHERE STATUS IS NULL;

ALTER TABLE TBINSPECAO_MANUAL
  ADD CONSTRAINT FK_TBINSPMANUAL_LINHA
  FOREIGN KEY (LINHAPRODUCAO_ID)
  REFERENCES TBLINHA_PRODUCAO(LINHAPRODUCAO_ID);

ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT CK_TBINSPMANUAL_GTIN_CONF CHECK (GTIN_CONFORME IN ('Sim', 'Não') OR GTIN_CONFORME IS NULL);
ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT CK_TBINSPMANUAL_DATAMAT_CONF CHECK (DATAMATRIX_CONFORME IN ('Sim', 'Não') OR DATAMATRIX_CONFORME IS NULL);
ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT CK_TBINSPMANUAL_LOTE_CONF CHECK (LOTE_CONFORME IN ('Sim', 'Não') OR LOTE_CONFORME IS NULL);
ALTER TABLE TBINSPECAO_MANUAL ADD CONSTRAINT CK_TBINSPMANUAL_VALID_CONF CHECK (VALIDADE_CONFORME IN ('Sim', 'Não') OR VALIDADE_CONFORME IS NULL);

CREATE INDEX IDX_TBINSPMANUAL_LINHA ON TBINSPECAO_MANUAL(LINHAPRODUCAO_ID);
CREATE INDEX IDX_TBINSPMANUAL_FASE ON TBINSPECAO_MANUAL(FASE);
CREATE INDEX IDX_TBINSPMANUAL_STATUS ON TBINSPECAO_MANUAL(STATUS);
CREATE INDEX IDX_TBINSPMANUAL_DATA_INC ON TBINSPECAO_MANUAL(DATA_INC DESC);
CREATE INDEX IDX_TBINSPMANUAL_DATA_DEL ON TBINSPECAO_MANUAL(DATA_DEL);

COMMIT;
```

### 12.3 Como executar o script

```bash
# Usando isql (Firebird Interactive SQL)
isql -user SYSDBA -password masterkey /caminho/para/database.fdb -i scripts/create-tables.sql

# Ou usando FlameRobin ou outro cliente Firebird
```

---

## 13. Testes Iniciais

### 13.1 Teste de Conexão

Criar arquivo `scripts/test-connection.js`:

```javascript
const db = require('../src/config/database');

async function testConnection() {
  try {
    console.log('Testando conexão com Firebird...');
    await db.initializePool();

    console.log('✅ Conexão estabelecida!');

    // Testa uma query simples
    const result = await db.query('SELECT 1 AS TEST FROM RDB$DATABASE');
    console.log('✅ Query teste executada:', result);

    await db.closePool();
    console.log('✅ Pool de conexões fechado');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

testConnection();
```

**Executar:**
```bash
cd backend
node scripts/test-connection.js
```

---

## 14. Comandos para Iniciar o Backend

```bash
# Entrar no diretório backend
cd /home/emanuel/camera/backend

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Editar .env com suas configurações

# Testar conexão com Firebird
node scripts/test-connection.js

# Criar tabelas no banco (se ainda não existirem)
# Execute o script SQL usando isql ou cliente Firebird

# Iniciar em modo desenvolvimento
npm run dev

# Ou iniciar em modo produção
npm start
```

---

## 15. Verificação de Funcionamento

### 15.1 Testar Health Check

```bash
curl http://localhost:8000/api/health
```

**Resposta esperada:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-04T...",
  "uptime": 12.345
}
```

### 15.2 Testar Busca de Produto

```bash
curl http://localhost:8000/api/produtos/12345
```

### 15.3 Testar Criação de Inspeção

```bash
curl -X POST http://localhost:8000/api/inspecoes \
  -H "Content-Type: application/json" \
  -d '{
    "fotoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "referenceData": {
      "op": "12345",
      "lote": "L2024001",
      "validade": "12/2025",
      "produto": "Produto Teste",
      "registroAnvisa": "1.0234.5678",
      "gtin": "7891234567890"
    },
    "inspectionStates": {
      "gtin": true,
      "datamatrix": true,
      "lote": false,
      "validade": true
    }
  }'
```

---

**Documento criado em:** 04/11/2025
**Versão:** 1.0 (Parte 2)
**Status:** Completo
