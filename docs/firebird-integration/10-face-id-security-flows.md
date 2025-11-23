# Fluxos de Integração e Segurança - Sistema Face ID

## Introdução

Este documento detalha os fluxos completos de cadastro e autenticação do sistema Face ID, incluindo considerações de segurança, privacidade (LGPD) e boas práticas.

---

## 1. Fluxo de Cadastro de Face ID

### 1.1 Diagrama de Sequência

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│ Usuário │    │ Frontend │    │ Backend │    │ Firebird │    │  Disco   │
└────┬────┘    └────┬─────┘    └────┬────┘    └────┬─────┘    └────┬─────┘
     │              │               │              │               │
     │ 1. Clica    │               │              │               │
     │ "Cadastrar  │               │              │               │
     │  Face ID"   │               │              │               │
     ├─────────────►│               │              │               │
     │              │               │              │               │
     │              │ 2. Solicita  │              │               │
     │              │    permissão │              │               │
     │              │    da câmera │              │               │
     │◄─────────────┤               │              │               │
     │              │               │              │               │
     │ 3. Autoriza │               │              │               │
     │    câmera   │               │              │               │
     ├─────────────►│               │              │               │
     │              │               │              │               │
     │              │ 4. Inicia    │              │               │
     │              │    stream de │              │               │
     │              │    vídeo     │              │               │
     │              │               │              │               │
     │ 5. Posiciona│               │              │               │
     │    rosto    │               │              │               │
     ├─────────────►│               │              │               │
     │              │               │              │               │
     │              │ 6. Detecta   │              │               │
     │              │    rosto com │              │               │
     │              │    face-api.js│             │               │
     │              │               │              │               │
     │ 7. Clica    │               │              │               │
     │ "Capturar"  │               │              │               │
     ├─────────────►│               │              │               │
     │              │               │              │               │
     │              │ 8. Extrai    │              │               │
     │              │    descriptor│              │               │
     │              │    (128 dims)│              │               │
     │              │               │              │               │
     │              │ 9. POST      │              │               │
     │              │ /face-id/    │              │               │
     │              │  register    │              │               │
     │              ├──────────────►│              │               │
     │              │ {name,       │              │               │
     │              │  matricula,  │              │               │
     │              │  photoBase64,│              │               │
     │              │  descriptor} │              │               │
     │              │               │              │               │
     │              │               │ 10. Valida  │               │
     │              │               │     dados   │               │
     │              │               │             │               │
     │              │               │ 11. INSERT  │               │
     │              │               │  TBFACEID_  │               │
     │              │               │  USUARIO    │               │
     │              │               ├─────────────►│               │
     │              │               │              │               │
     │              │               │ 12. FACEID_ID│              │
     │              │               │◄─────────────┤               │
     │              │               │              │               │
     │              │               │ 13. Salva   │               │
     │              │               │     foto    │               │
     │              │               ├──────────────┼──────────────►│
     │              │               │              │               │
     │              │               │ 14. UPDATE  │               │
     │              │               │  FOTO_URL   │               │
     │              │               ├─────────────►│               │
     │              │               │              │               │
     │              │ 15. 201      │              │               │
     │              │  Created     │              │               │
     │              │◄──────────────┤              │               │
     │              │ {faceIdId,   │              │               │
     │              │  photoUrl}   │              │               │
     │              │               │              │               │
     │ 16. Toast:  │               │              │               │
     │ "Cadastrado │               │              │               │
     │  com sucesso"│              │               │               │
     │◄─────────────┤               │              │               │
     │              │               │              │               │
```

### 1.2 Validações no Frontend

**Antes de enviar para o backend:**

1. **Validação da Foto:**
   - Verificar se exatamente 1 rosto foi detectado
   - Score de detecção >= 0.8 (80% de confiança)
   - Qualidade da imagem adequada

2. **Validação do Descriptor:**
   - Array com exatamente 128 dimensões
   - Todos os valores são números válidos (não NaN, não Infinity)

3. **Validação dos Dados:**
   - Nome obrigatório (mínimo 3 caracteres)
   - Matrícula opcional (se fornecida, formato válido)
   - Email opcional (se fornecido, formato válido)

```javascript
// Exemplo de validação no frontend
async function validateFaceCapture(detection) {
  if (!detection) {
    throw new Error('Nenhum rosto detectado')
  }

  if (detection.score < 0.8) {
    throw new Error('Qualidade da detecção muito baixa. Tente melhorar a iluminação.')
  }

  if (detection.descriptor.length !== 128) {
    throw new Error('Descriptor facial inválido')
  }

  const hasInvalidValues = detection.descriptor.some(
    val => isNaN(val) || !isFinite(val)
  )

  if (hasInvalidValues) {
    throw new Error('Descriptor contém valores inválidos')
  }

  return true
}
```

### 1.3 Validações no Backend

**Middleware de validação:**

```javascript
// src/middlewares/faceIdValidator.js
const { body, validationResult } = require('express-validator')

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 3, max: 80 }).withMessage('Nome deve ter entre 3 e 80 caracteres'),
  
  body('matricula')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Matrícula deve ter no máximo 30 caracteres'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email inválido')
    .isLength({ max: 100 }).withMessage('Email muito longo'),
  
  body('photoBase64')
    .notEmpty().withMessage('Foto é obrigatória')
    .matches(/^data:image\/(jpeg|jpg|png);base64,/)
    .withMessage('Formato de imagem inválido'),
  
  body('descriptor')
    .isArray({ min: 128, max: 128 })
    .withMessage('Descriptor deve ter exatamente 128 dimensões'),
  
  body('descriptor.*')
    .isFloat()
    .withMessage('Todos os valores do descriptor devem ser números'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: errors.array().map(err => err.msg)
      })
    }
    next()
  }
]

module.exports = { registerValidation }
```

---

## 2. Fluxo de Autenticação por Face ID

### 2.1 Diagrama de Sequência

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐
│ Usuário │    │ Frontend │    │ Backend │    │ Firebird │
└────┬────┘    └────┬─────┘    └────┬────┘    └────┬─────┘
     │              │               │              │
     │ 1. Clica    │               │              │
     │ "Face ID"   │               │              │
     ├─────────────►│               │              │
     │              │               │              │
     │              │ 2. Abre modal│              │
     │              │    Face ID   │              │
     │              │               │              │
     │ 3. Autoriza │               │              │
     │    câmera   │               │              │
     ├─────────────►│               │              │
     │              │               │              │
     │              │ 4. Inicia    │              │
     │              │    detecção  │              │
     │              │    contínua  │              │
     │              │    (loop)    │              │
     │              │               │              │
     │ 5. Posiciona│               │              │
     │    rosto    │               │              │
     ├─────────────►│               │              │
     │              │               │              │
     │              │ 6. Detecta   │              │
     │              │    rosto     │              │
     │              │               │              │
     │              │ 7. Extrai    │              │
     │              │    descriptor│              │
     │              │               │              │
     │              │ 8. POST      │              │
     │              │ /face-id/    │              │
     │              │  authenticate│              │
     │              ├──────────────►│              │
     │              │ {descriptor, │              │
     │              │  threshold}  │              │
     │              │               │              │
     │              │               │ 9. SELECT   │
     │              │               │  todos os   │
     │              │               │  descritores│
     │              │               │  ativos     │
     │              │               ├─────────────►│
     │              │               │              │
     │              │               │ 10. Lista de│
     │              │               │  descritores│
     │              │               │◄─────────────┤
     │              │               │              │
     │              │               │ 11. Calcula │
     │              │               │  distância  │
     │              │               │  euclidiana │
     │              │               │  para cada  │
     │              │               │              │
     │              │               │ 12. Encontra│
     │              │               │  melhor     │
     │              │               │  match      │
     │              │               │              │
     │              │               │ 13. UPDATE  │
     │              │               │  TBUSUARIO  │
     │              │               │  FAILED_    │
     │              │               │  ATTEMPTS=0 │
     │              │               ├─────────────►│
     │              │               │              │
     │              │               │ 14. INSERT  │
     │              │               │  TBACESSO   │
     │              │               │  (auditoria)│
     │              │               ├─────────────►│
     │              │               │              │
     │              │ 15. 200 OK   │              │
     │              │◄──────────────┤              │
     │              │ {authenticated│             │
     │              │  :true,      │              │
     │              │  data:{...}, │              │
     │              │  token}      │              │
     │              │               │              │
     │ 16. Login   │               │              │
     │  automático │               │              │
     │◄─────────────┤               │              │
     │              │               │              │
     │ 17. Redireciona│             │              │
     │  para Home  │               │              │
     │◄─────────────┤               │              │
     │              │               │              │
```

**Observação:** Se a autenticação falhar, o fluxo seria:
- **Passo 13**: UPDATE TBUSUARIO SET FAILED_ATTEMPTS = FAILED_ATTEMPTS + 1
- **Passo 14**: Verificar se FAILED_ATTEMPTS >= 10 (bloqueio)
- **Passo 15**: INSERT TBACESSO com TIPO='FACE_ID_AUTH_FAILED'
- **Passo 16**: Retornar erro 401 ou 403 (se bloqueado)

```

### 2.2 Algoritmo de Matching

**Cálculo da Distância Euclidiana:**

```javascript
function euclideanDistance(a, b) {
  // a e b são arrays de 128 números
  let sum = 0
  for (let i = 0; i < 128; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

// Exemplo:
// descriptor1 = [0.123, -0.456, 0.789, ...]
// descriptor2 = [0.125, -0.450, 0.790, ...]
// distance = euclideanDistance(descriptor1, descriptor2)
// distance = 0.42 (quanto menor, mais similar)
```

**Threshold (Limiar de Aceitação):**

| Threshold | Descrição | Uso Recomendado |
|-----------|-----------|-----------------|
| 0.4 | Muito restritivo | Alta segurança, pode gerar falsos negativos |
| 0.6 | Balanceado (padrão) | Uso geral, bom equilíbrio |
| 0.8 | Permissivo | Facilita acesso, pode gerar falsos positivos |

**Decisão de Match:**

```javascript
const threshold = 0.6

if (distance < threshold) {
  // MATCH! Usuário reconhecido
  const confidence = 1 - (distance / threshold)
  // confidence = 0.30 (30% de confiança)
} else {
  // NÃO MATCH! Usuário não reconhecido
}
```

### 2.3 Performance do Matching

**Cenário:** 1.000 usuários cadastrados

```
Tempo de processamento:
- Buscar descritores do banco: ~50ms
- Converter BLOBs para arrays: ~20ms
- Calcular 1.000 distâncias: ~30ms
- Total: ~100ms (aceitável)
```

**Otimizações:**

1. **Cache de Descritores:**
   ```javascript
   // Usar Redis para cachear descritores
   const cachedDescriptors = await redis.get('face-id:descriptors')
   if (!cachedDescriptors) {
     const descriptors = await db.query(...)
     await redis.set('face-id:descriptors', JSON.stringify(descriptors), 'EX', 300)
   }
   ```

2. **Indexação Vetorial (Futuro):**
   - Usar bibliotecas como FAISS ou Annoy
   - Busca aproximada de vizinhos mais próximos (ANN)
   - Reduz complexidade de O(n) para O(log n)

---

## 3. Segurança e Privacidade (LGPD)

### 3.1 Conformidade com LGPD

**Dados Biométricos são Dados Sensíveis:**

Segundo a LGPD (Lei Geral de Proteção de Dados), dados biométricos são classificados como **dados pessoais sensíveis** (Art. 5º, II).

**Requisitos Obrigatórios:**

1. ✅ **Consentimento Explícito**
   - Usuário deve concordar explicitamente com o cadastro
   - Termo de consentimento claro e específico
   - Possibilidade de revogar consentimento a qualquer momento

2. ✅ **Finalidade Específica**
   - Uso exclusivo para autenticação
   - Não compartilhamento com terceiros
   - Não uso para outras finalidades sem novo consentimento

3. ✅ **Minimização de Dados**
   - Armazenar apenas o descriptor (vetor numérico)
   - Não armazenar imagem completa do rosto
   - Foto apenas para referência visual (opcional)

4. ✅ **Segurança**
   - Criptografia em repouso (banco de dados)
   - Criptografia em trânsito (HTTPS)
   - Controle de acesso rigoroso

5. ✅ **Direito ao Esquecimento**
   - Possibilidade de excluir dados a qualquer momento
   - Soft delete com auditoria
   - Exclusão permanente após período de retenção

6. ✅ **Transparência**
   - Informar como os dados são coletados
   - Informar como são armazenados
   - Informar por quanto tempo são mantidos

7. ✅ **Auditoria**
   - Registrar todas as tentativas de autenticação
   - Registrar acessos aos dados biométricos
   - Manter logs por período determinado

### 3.2 Termo de Consentimento (Exemplo)

```javascript
// Frontend - Modal de consentimento antes do cadastro
const ConsentModal = () => {
  return (
    <Dialog>
      <DialogTitle>Consentimento para Uso de Dados Biométricos</DialogTitle>
      <DialogContent>
        <p>
          Ao cadastrar seu Face ID, você autoriza o armazenamento e processamento
          de seus dados biométricos faciais (descritor facial) exclusivamente para
          fins de autenticação neste sistema.
        </p>
        <ul>
          <li>Seus dados serão armazenados de forma criptografada</li>
          <li>Não compartilharemos seus dados com terceiros</li>
          <li>Você pode revogar este consentimento a qualquer momento</li>
          <li>Seus dados serão excluídos mediante solicitação</li>
        </ul>
        <Checkbox>
          Li e concordo com os termos acima
        </Checkbox>
      </DialogContent>
    </Dialog>
  )
}
```

### 3.3 Criptografia de Dados

**Em Trânsito (HTTPS):**

```javascript
// Configuração do servidor Express
const https = require('https')
const fs = require('fs')

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
}

https.createServer(options, app).listen(443)
```

**Em Repouso (Banco de Dados):**

```sql
-- Firebird 2.5 não possui criptografia nativa de BLOBs
-- Opções:

-- 1. Criptografar no backend antes de salvar
-- 2. Usar criptografia de disco (LUKS, BitLocker)
-- 3. Migrar para Firebird 3.0+ com suporte a criptografia
```

**Exemplo de Criptografia no Backend:**

```javascript
const crypto = require('crypto')

// Chave de criptografia (armazenar em variável de ambiente)
const ENCRYPTION_KEY = process.env.FACE_ID_ENCRYPTION_KEY // 32 bytes
const IV_LENGTH = 16

function encryptDescriptor(descriptor) {
  const buffer = vectorMath.descriptorToBuffer(descriptor)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)

  let encrypted = cipher.update(buffer)
  encrypted = Buffer.concat([encrypted, cipher.final()])

  // Retorna IV + dados criptografados
  return Buffer.concat([iv, encrypted])
}

function decryptDescriptor(encryptedBuffer) {
  const iv = encryptedBuffer.slice(0, IV_LENGTH)
  const encrypted = encryptedBuffer.slice(IV_LENGTH)

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return vectorMath.bufferToDescriptor(decrypted)
}
```

---

## 4. Controle de Tentativas Falhas (FAILED_ATTEMPTS)

### 4.1 Visão Geral

O campo **TBUSUARIO.FAILED_ATTEMPTS** é a **fonte de verdade** para controlar tentativas de autenticação facial que falharam.

**Comportamento:**
- ✅ Incrementa em 1 a cada falha de autenticação
- ✅ Zera quando autenticação é bem-sucedida
- ✅ Bloqueia usuário quando atinge threshold (10 tentativas)
- ✅ Pode ser resetado manualmente pelo suporte

### 4.2 Implementação no Backend

**Atualizar FAILED_ATTEMPTS após autenticação:**

```javascript
async function updateFailedAttempts(usuarioId, sucesso) {
  if (sucesso) {
    // Zerar contador após sucesso
    const sql = `
      UPDATE TBUSUARIO
      SET FAILED_ATTEMPTS = 0
      WHERE USUARIO_ID = ?
    `
    await db.query(sql, [usuarioId])
  } else {
    // Incrementar contador após falha
    const sqlIncrement = `
      UPDATE TBUSUARIO
      SET FAILED_ATTEMPTS = FAILED_ATTEMPTS + 1
      WHERE USUARIO_ID = ?
    `
    await db.query(sqlIncrement, [usuarioId])

    // Verificar se atingiu threshold
    const sqlCheck = `
      SELECT FAILED_ATTEMPTS
      FROM TBUSUARIO
      WHERE USUARIO_ID = ?
    `
    const result = await db.query(sqlCheck, [usuarioId])
    const failedAttempts = result[0]?.FAILED_ATTEMPTS || 0

    if (failedAttempts >= 10) {
      throw new Error('Usuário bloqueado por excesso de tentativas falhas. Contate o suporte.')
    }
  }
}
```

### 4.3 Verificação Antes da Autenticação

**Verificar se usuário está bloqueado:**

```javascript
async function checkUserBlocked(usuarioId) {
  const sql = `
    SELECT
      USUARIO_ID,
      NOME,
      FAILED_ATTEMPTS
    FROM TBUSUARIO
    WHERE USUARIO_ID = ?
  `

  const result = await db.query(sql, [usuarioId])
  const usuario = result[0]

  if (!usuario) {
    throw new Error('Usuário não encontrado')
  }

  // Bloquear se atingiu threshold
  if (usuario.FAILED_ATTEMPTS >= 10) {
    throw new Error(`Usuário bloqueado por excesso de tentativas falhas (${usuario.FAILED_ATTEMPTS}/10). Contate o suporte.`)
  }

  return usuario
}
```

### 4.4 Reset Manual (Suporte Técnico)

**Resetar FAILED_ATTEMPTS de um usuário:**

```javascript
// Endpoint para suporte técnico resetar tentativas
router.post('/admin/reset-failed-attempts/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params

    // Verificar permissão de admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const sql = `
      UPDATE TBUSUARIO
      SET FAILED_ATTEMPTS = 0
      WHERE USUARIO_ID = ?
    `

    await db.query(sql, [usuarioId])

    // Registrar ação na TBACESSO
    await db.query(`
      INSERT INTO TBACESSO (DATA, USUARIO_ID, LOCAL, TIPO, ATIVIDADE, IP)
      VALUES (CURRENT_TIMESTAMP, ?, 'WEB_FACE_ID', 'FACE_ID_RESET_ATTEMPTS',
              '{"evento":"reset_tentativas","admin":"${req.user.nome}"}', ?)
    `, [usuarioId, req.ip])

    res.json({ success: true, message: 'Tentativas resetadas com sucesso' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

### 4.5 Monitoramento de Usuários Bloqueados

**Dashboard de usuários bloqueados:**

```javascript
// Endpoint para listar usuários bloqueados
router.get('/admin/blocked-users', async (req, res) => {
  try {
    const sql = `
      SELECT
        u.USUARIO_ID,
        u.NOME,
        u.EMAIL,
        u.FAILED_ATTEMPTS,
        f.MATRICULA,
        f.ATIVO AS FACEID_ATIVO,
        (SELECT MAX(a.DATA)
         FROM TBACESSO a
         WHERE a.USUARIO_ID = u.USUARIO_ID
           AND a.LOCAL = 'WEB_FACE_ID'
           AND a.TIPO = 'FACE_ID_AUTH_FAILED') AS ULTIMA_FALHA
      FROM TBUSUARIO u
      LEFT JOIN TBUSUARIO_FACEID f ON f.USUARIO_ID = u.USUARIO_ID
      WHERE u.FAILED_ATTEMPTS >= 10
      ORDER BY u.FAILED_ATTEMPTS DESC
    `

    const users = await db.query(sql)

    res.json({
      success: true,
      data: users,
      total: users.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

---

## 5. Rate Limiting e Proteção contra Ataques

**Middleware de Rate Limiting:**

```javascript
// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit')
const RedisStore = require('rate-limit-redis')
const redis = require('redis')

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
})

// Rate limit para autenticação
const authRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 tentativas por minuto
  message: {
    success: false,
    error: 'Muitas tentativas de autenticação. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Rate limit para cadastro
const registerRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:register:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 cadastros por hora por IP
  message: {
    success: false,
    error: 'Limite de cadastros excedido. Tente novamente mais tarde.'
  }
})

module.exports = {
  authRateLimiter,
  registerRateLimiter
}
```

**Detecção de Tentativas Suspeitas:**

**1. Verificar FAILED_ATTEMPTS do usuário (fonte de verdade):**
```javascript
// Verificar se usuário está bloqueado por tentativas falhas
async function checkUserBlocked(usuarioId) {
  const sql = `
    SELECT
      USUARIO_ID,
      NOME,
      FAILED_ATTEMPTS
    FROM TBUSUARIO
    WHERE USUARIO_ID = ?
  `

  const result = await db.query(sql, [usuarioId])
  const usuario = result[0]

  if (!usuario) {
    throw new Error('Usuário não encontrado')
  }

  // Threshold de bloqueio: 10 tentativas falhas
  if (usuario.FAILED_ATTEMPTS >= 10) {
    throw new Error(`Usuário bloqueado por excesso de tentativas falhas (${usuario.FAILED_ATTEMPTS}/10). Contate o suporte.`)
  }

  // Alerta quando próximo ao bloqueio
  if (usuario.FAILED_ATTEMPTS >= 7) {
    console.warn(`Usuário ${usuario.NOME} próximo ao bloqueio: ${usuario.FAILED_ATTEMPTS}/10 tentativas`)
  }

  return usuario
}
```

**2. Verificar tentativas falhas por IP (detecção de ataques):**
```javascript
// Verificar tentativas falhas por IP (últimos 15 minutos)
async function checkSuspiciousActivityByIP(ipOrigem) {
  const sql = `
    SELECT COUNT(*) as TENTATIVAS_FALHAS
    FROM TBACESSO
    WHERE IP = ?
      AND LOCAL = 'WEB_FACE_ID'
      AND TIPO = 'FACE_ID_AUTH_FAILED'
      AND DATA >= DATEADD(-15 MINUTE TO CURRENT_TIMESTAMP)
  `

  const result = await db.query(sql, [ipOrigem])
  const tentativasFalhas = result[0].TENTATIVAS_FALHAS

  // Bloquear IP se houver muitas tentativas de diferentes usuários
  if (tentativasFalhas >= 10) {
    // Bloquear IP temporariamente
    await redis.set(`blocked:${ipOrigem}`, '1', 'EX', 3600) // 1 hora
    throw new Error('IP bloqueado por atividade suspeita')
  }
}
```

### 3.5 Logs de Auditoria

**Eventos a Registrar:**

1. Cadastro de Face ID
2. Tentativas de autenticação (sucesso e falha)
3. Atualização de Face ID
4. Exclusão de Face ID
5. Acesso aos dados biométricos

**Formato do Log:**

```javascript
// src/utils/auditLogger.js
const winston = require('winston')

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/face-id-audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 30 // 30 dias
    })
  ]
})

function logFaceIdEvent(event, data) {
  auditLogger.info({
    event,
    timestamp: new Date().toISOString(),
    ...data
  })
}

// Uso:
logFaceIdEvent('FACE_ID_REGISTERED', {
  faceIdId: 123,
  usuarioId: 456,
  ipOrigem: '192.168.1.100'
})

logFaceIdEvent('FACE_ID_AUTH_SUCCESS', {
  faceIdId: 123,
  distance: 0.42,
  ipOrigem: '192.168.1.100'
})

logFaceIdEvent('FACE_ID_AUTH_FAILED', {
  ipOrigem: '192.168.1.100',
  reason: 'No match found'
})
```

---

## 4. Testes e Validação

### 4.1 Testes Unitários

```javascript
// tests/vectorMath.test.js
const { euclideanDistance, isMatch, isValidDescriptor } = require('../src/utils/vectorMath')

describe('Vector Math', () => {
  test('euclideanDistance calcula corretamente', () => {
    const a = [1, 2, 3]
    const b = [4, 5, 6]
    const distance = euclideanDistance(a, b)
    expect(distance).toBeCloseTo(5.196, 2)
  })

  test('isMatch retorna true para distância baixa', () => {
    expect(isMatch(0.4, 0.6)).toBe(true)
    expect(isMatch(0.7, 0.6)).toBe(false)
  })

  test('isValidDescriptor valida corretamente', () => {
    const valid = new Array(128).fill(0.5)
    const invalid1 = new Array(127).fill(0.5)
    const invalid2 = new Array(128).fill(NaN)

    expect(isValidDescriptor(valid)).toBe(true)
    expect(isValidDescriptor(invalid1)).toBe(false)
    expect(isValidDescriptor(invalid2)).toBe(false)
  })
})
```

### 4.2 Testes de Integração

```javascript
// tests/faceId.integration.test.js
const request = require('supertest')
const app = require('../src/server')

describe('Face ID API', () => {
  let faceIdId

  test('POST /api/face-id/register - cadastra novo Face ID', async () => {
    const response = await request(app)
      .post('/api/face-id/register')
      .send({
        name: 'Teste Usuario',
        matricula: 'TEST001',
        photoBase64: 'data:image/jpeg;base64,/9j/4AAQ...',
        descriptor: new Array(128).fill(0.5)
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.faceIdId).toBeDefined()

    faceIdId = response.body.data.faceIdId
  })

  test('POST /api/face-id/authenticate - autentica com sucesso', async () => {
    const response = await request(app)
      .post('/api/face-id/authenticate')
      .send({
        descriptor: new Array(128).fill(0.5),
        threshold: 0.6
      })

    expect(response.status).toBe(200)
    expect(response.body.authenticated).toBe(true)
    expect(response.body.data.faceIdId).toBe(faceIdId)
  })
})
```

### 4.3 Testes de Segurança

**Teste de Rate Limiting:**

```javascript
test('Rate limiting bloqueia após 5 tentativas', async () => {
  for (let i = 0; i < 5; i++) {
    await request(app)
      .post('/api/face-id/authenticate')
      .send({ descriptor: new Array(128).fill(0.5) })
  }

  const response = await request(app)
    .post('/api/face-id/authenticate')
    .send({ descriptor: new Array(128).fill(0.5) })

  expect(response.status).toBe(429)
  expect(response.body.error).toContain('Muitas tentativas')
})
```

**Teste de Validação:**

```javascript
test('Rejeita descriptor inválido', async () => {
  const response = await request(app)
    .post('/api/face-id/register')
    .send({
      name: 'Teste',
      descriptor: new Array(100).fill(0.5) // Apenas 100 dimensões
    })

  expect(response.status).toBe(400)
  expect(response.body.error).toContain('128 dimensões')
})
```

---

## 5. Monitoramento e Métricas

### 5.1 Métricas Importantes

**Métricas de Uso:**
- Total de cadastros ativos
- Tentativas de autenticação por dia
- Taxa de sucesso de autenticação
- Tempo médio de resposta

**Métricas de Segurança:**
- Tentativas falhas por IP
- IPs bloqueados
- Distância média dos matches bem-sucedidos
- Distribuição de confiança dos matches

### 5.2 Dashboard de Monitoramento (usando TBACESSO)

```sql
-- Query para dashboard
SELECT
  COUNT(DISTINCT f.FACEID_ID) as TOTAL_CADASTROS,
  COUNT(DISTINCT CASE WHEN f.ATIVO = 'S' THEN f.FACEID_ID END) as CADASTROS_ATIVOS,
  COUNT(a.ACESSO_ID) as TOTAL_TENTATIVAS_HOJE,
  COUNT(CASE WHEN a.TIPO = 'FACE_ID_AUTH_SUCCESS' THEN 1 END) as TENTATIVAS_SUCESSO_HOJE,
  CAST(COUNT(CASE WHEN a.TIPO = 'FACE_ID_AUTH_SUCCESS' THEN 1 END) AS FLOAT) /
    NULLIF(COUNT(a.ACESSO_ID), 0) * 100 as TAXA_SUCESSO_PCT
FROM TBUSUARIO_FACEID f
LEFT JOIN TBACESSO a ON a.CHAVE_ID = f.FACEID_ID
  AND a.LOCAL = 'WEB_FACE_ID'
  AND a.TIPO LIKE 'FACE_ID_AUTH%'
WHERE a.DATA >= CURRENT_DATE
```

---

## 6. Troubleshooting

### 6.1 Problemas Comuns

**Problema:** Muitos falsos negativos (usuário não reconhecido)

**Soluções:**
- Aumentar threshold (ex: 0.6 → 0.7)
- Verificar qualidade da iluminação
- Re-cadastrar Face ID com melhor foto
- Verificar se descriptor está sendo salvo corretamente

**Problema:** Muitos falsos positivos (usuário errado reconhecido)

**Soluções:**
- Diminuir threshold (ex: 0.6 → 0.5)
- Melhorar qualidade das fotos de cadastro
- Verificar se há rostos muito similares cadastrados

**Problema:** Performance lenta no matching

**Soluções:**
- Implementar cache de descritores (Redis)
- Otimizar query de busca no banco
- Considerar indexação vetorial (FAISS)
- Limitar número de descritores ativos

---

**Documento criado em:** 22/11/2025
**Versão:** 1.0
**Autor:** Sistema de Documentação Técnica


