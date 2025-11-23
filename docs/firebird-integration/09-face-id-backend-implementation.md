# Implementação Backend - Sistema Face ID

## Introdução

Este documento fornece a implementação completa do backend Node.js + Express para o sistema de reconhecimento facial, incluindo serviços, controllers, rotas e utilitários.

---

## Estrutura de Arquivos

```
backend/
├── src/
│   ├── config/
│   │   └── database.js              # Já existe
│   ├── controllers/
│   │   └── faceId.controller.js     # NOVO
│   ├── services/
│   │   └── faceId.service.js        # NOVO
│   ├── routes/
│   │   └── faceId.routes.js         # NOVO
│   ├── middlewares/
│   │   ├── faceIdValidator.js       # NOVO
│   │   └── rateLimiter.js           # NOVO
│   └── utils/
│       └── vectorMath.js            # NOVO
└── server.js                        # Atualizar
```

**Nota:** Não é necessário criar diretório `uploads/face-id/photos/` pois as fotos serão armazenadas diretamente no banco de dados como BLOB.

---

## 1. Serviço de Matemática Vetorial

### Arquivo: `src/utils/vectorMath.js`

```javascript
/**
 * Utilitários para cálculos com vetores faciais
 */

/**
 * Calcula a distância euclidiana entre dois vetores
 * @param {number[]} a - Primeiro vetor
 * @param {number[]} b - Segundo vetor
 * @returns {number} Distância euclidiana
 */
function euclideanDistance(a, b) {
  if (a.length !== b.length) {
    throw new Error('Vetores devem ter o mesmo tamanho')
  }

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }

  return Math.sqrt(sum)
}

/**
 * Verifica se a distância indica um match
 * @param {number} distance - Distância calculada
 * @param {number} threshold - Limiar de aceitação (padrão: 0.6)
 * @returns {boolean} True se é um match
 */
function isMatch(distance, threshold = 0.6) {
  return distance < threshold
}

/**
 * Calcula a confiança do match (0 a 1)
 * @param {number} distance - Distância calculada
 * @param {number} threshold - Limiar de aceitação
 * @returns {number} Confiança (0 = nenhuma, 1 = total)
 */
function calculateConfidence(distance, threshold = 0.6) {
  if (distance >= threshold) return 0
  return 1 - (distance / threshold)
}

/**
 * Valida se um descriptor é válido
 * @param {any} descriptor - Descriptor a validar
 * @returns {boolean} True se válido
 */
function isValidDescriptor(descriptor) {
  if (!Array.isArray(descriptor)) return false
  if (descriptor.length !== 128) return false
  
  return descriptor.every(val => 
    typeof val === 'number' && 
    !isNaN(val) && 
    isFinite(val)
  )
}

/**
 * Converte array de números para Buffer (BLOB)
 * @param {number[]} descriptor - Array de 128 números
 * @returns {Buffer} Buffer para armazenar no banco
 */
function descriptorToBuffer(descriptor) {
  const float32Array = new Float32Array(descriptor)
  return Buffer.from(float32Array.buffer)
}

/**
 * Converte Buffer (BLOB) para array de números
 * @param {Buffer} buffer - Buffer do banco de dados
 * @returns {number[]} Array de 128 números
 */
function bufferToDescriptor(buffer) {
  const float32Array = new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / Float32Array.BYTES_PER_ELEMENT
  )
  return Array.from(float32Array)
}

/**
 * Encontra o melhor match entre um descriptor e uma lista
 * @param {number[]} targetDescriptor - Descriptor a comparar
 * @param {Array} candidates - Lista de candidatos {id, descriptor}
 * @param {number} threshold - Limiar de aceitação
 * @returns {Object|null} Melhor match ou null
 */
function findBestMatch(targetDescriptor, candidates, threshold = 0.6) {
  let bestMatch = null
  let bestDistance = Infinity

  for (const candidate of candidates) {
    const distance = euclideanDistance(targetDescriptor, candidate.descriptor)
    
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = {
        ...candidate,
        distance,
        confidence: calculateConfidence(distance, threshold),
        isMatch: isMatch(distance, threshold)
      }
    }
  }

  return bestMatch
}

module.exports = {
  euclideanDistance,
  isMatch,
  calculateConfidence,
  isValidDescriptor,
  descriptorToBuffer,
  bufferToDescriptor,
  findBestMatch
}
```

---

## 2. Serviço Principal de Face ID

### Arquivo: `src/services/faceId.service.js`

```javascript
const db = require('../config/database')
const vectorMath = require('../utils/vectorMath')

/**
 * Registra novo usuário com Face ID
 * @param {Object} data - Dados do cadastro
 * @returns {Promise<Object>} Dados do Face ID criado
 */
async function registerFaceId(data) {
  const { usuarioId, name, matricula, email, photoBase64, descriptor } = data

  // Validar descriptor
  if (!vectorMath.isValidDescriptor(descriptor)) {
    throw new Error('Descriptor facial inválido. Deve ter exatamente 128 dimensões.')
  }

  // Verificar se usuário já possui Face ID
  if (usuarioId) {
    const existing = await getFaceIdByUsuarioId(usuarioId)
    if (existing && existing.ATIVO === 'S') {
      throw new Error('Usuário já possui Face ID cadastrado')
    }
  }

  // Converter descriptor para buffer
  const descriptorBuffer = vectorMath.descriptorToBuffer(descriptor)

  // Converter foto Base64 para Buffer
  const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
  const photoBuffer = Buffer.from(base64Data, 'base64')

  try {
    // 1. Criar ou buscar usuário na TBUSUARIO (se necessário)
    let finalUsuarioId = usuarioId

    if (!finalUsuarioId && (email || matricula)) {
      // Buscar usuário existente por email ou matrícula
      const sqlFindUser = `
        SELECT USUARIO_ID
        FROM TBUSUARIO
        WHERE EMAIL = ? OR NOME = ?
        LIMIT 1
      `
      const existingUser = await db.query(sqlFindUser, [email || '', name])

      if (existingUser.length > 0) {
        finalUsuarioId = existingUser[0].USUARIO_ID
      }
    }

    // 2. Inserir Face ID com descriptor e foto
    const sqlInsert = `
      INSERT INTO TBUSUARIO_FACEID (
        USUARIO_ID,
        DESCRIPTOR_FACIAL,
        FOTO_URL,
        MATRICULA,
        ATIVO,
        USUARIO_I,
        USUARIONOME_I
      )
      VALUES (?, ?, ?, ?, 'S', ?, ?)
      RETURNING FACEID_ID
    `

    const result = await db.query(sqlInsert, [
      finalUsuarioId || null,
      descriptorBuffer,
      photoBuffer,  // BLOB da foto
      matricula || null,
      finalUsuarioId || null,
      name
    ])

    const faceIdId = result[0].FACEID_ID

    // 3. Retornar dados criados
    return {
      faceIdId,
      usuarioId: finalUsuarioId,
      name,
      matricula,
      photoStored: true,  // Indica que a foto foi armazenada no banco
      createdAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Erro ao registrar Face ID:', error)
    throw error
  }
}

/**
 * Autentica usuário por Face ID
 * @param {Object} data - Dados da autenticação
 * @returns {Promise<Object>} Resultado da autenticação
 */
async function authenticateFaceId(data) {
  const { descriptor, threshold = 0.6, ipOrigem, userAgent } = data

  // Validar descriptor
  if (!vectorMath.isValidDescriptor(descriptor)) {
    throw new Error('Descriptor facial inválido')
  }

  try {
    // 1. Buscar todos os descritores ativos (sem foto para performance)
    const sqlGetAll = `
      SELECT
        f.FACEID_ID,
        f.USUARIO_ID,
        f.DESCRIPTOR_FACIAL,
        f.MATRICULA,
        u.NOME,
        u.EMAIL
      FROM TBUSUARIO_FACEID f
      LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
      WHERE f.ATIVO = 'S'
    `

    const faceIdUsers = await db.query(sqlGetAll)

    if (faceIdUsers.length === 0) {
      return {
        authenticated: false,
        message: 'Nenhum usuário cadastrado com Face ID'
      }
    }

    // 2. Converter descritores do banco para arrays
    const candidates = faceIdUsers.map(user => ({
      faceIdId: user.FACEID_ID,
      usuarioId: user.USUARIO_ID,
      name: user.NOME,
      matricula: user.MATRICULA,
      email: user.EMAIL,
      descriptor: vectorMath.bufferToDescriptor(user.DESCRIPTOR_FACIAL)
    }))

    // 3. Encontrar melhor match
    const bestMatch = vectorMath.findBestMatch(descriptor, candidates, threshold)

    // 4. Registrar acesso na TBACESSO
    await registerFaceIdAccess({
      faceIdId: bestMatch?.isMatch ? bestMatch.faceIdId : null,
      usuarioId: bestMatch?.isMatch ? bestMatch.usuarioId : null,
      usuarioNome: bestMatch?.isMatch ? bestMatch.name : null,
      matricula: bestMatch?.isMatch ? bestMatch.matricula : null,
      sucesso: bestMatch?.isMatch,
      distanciaMatch: bestMatch?.distance || null,
      confianca: bestMatch?.confidence || 0,
      ipOrigem,
      userAgent
    })

    // 5. Retornar resultado
    if (bestMatch?.isMatch) {
      // Buscar foto do usuário autenticado
      let photoBase64 = null
      if (bestMatch.faceIdId) {
        const photoResult = await db.query(`
          SELECT FOTO_URL
          FROM TBUSUARIO_FACEID
          WHERE FACEID_ID = ?
        `, [bestMatch.faceIdId])

        if (photoResult && photoResult[0] && photoResult[0].FOTO_URL) {
          photoBase64 = `data:image/jpeg;base64,${photoResult[0].FOTO_URL.toString('base64')}`
        }
      }

      return {
        authenticated: true,
        data: {
          usuarioId: bestMatch.usuarioId,
          faceIdId: bestMatch.faceIdId,
          name: bestMatch.name,
          matricula: bestMatch.matricula,
          email: bestMatch.email,
          photoBase64: photoBase64,  // Foto em Base64
          distance: bestMatch.distance,
          confidence: bestMatch.confidence
        }
      }
    } else {
      return {
        authenticated: false,
        message: 'Nenhum rosto correspondente encontrado',
        bestMatch: {
          distance: bestMatch?.distance || null,
          confidence: bestMatch?.confidence || 0
        }
      }
    }
  } catch (error) {
    console.error('Erro ao autenticar Face ID:', error)
    throw error
  }
}

/**
 * Registra acesso por Face ID e atualiza FAILED_ATTEMPTS
 * @param {Object} data - Dados do acesso
 */
async function registerFaceIdAccess(data) {
  const {
    faceIdId,
    usuarioId,
    usuarioNome,
    matricula,
    sucesso,
    distanciaMatch,
    confianca,
    ipOrigem,
    userAgent
  } = data

  // 1. Atualizar FAILED_ATTEMPTS na TBUSUARIO
  if (usuarioId) {
    if (sucesso) {
      // Zerar contador de falhas após sucesso
      const sqlResetFailures = `
        UPDATE TBUSUARIO
        SET FAILED_ATTEMPTS = 0
        WHERE USUARIO_ID = ?
      `
      await db.query(sqlResetFailures, [usuarioId])
    } else {
      // Incrementar contador de falhas
      const sqlIncrementFailures = `
        UPDATE TBUSUARIO
        SET FAILED_ATTEMPTS = FAILED_ATTEMPTS + 1
        WHERE USUARIO_ID = ?
      `
      await db.query(sqlIncrementFailures, [usuarioId])

      // Verificar se atingiu threshold de bloqueio
      const sqlCheckFailures = `
        SELECT FAILED_ATTEMPTS
        FROM TBUSUARIO
        WHERE USUARIO_ID = ?
      `
      const result = await db.query(sqlCheckFailures, [usuarioId])
      const failedAttempts = result[0]?.FAILED_ATTEMPTS || 0

      if (failedAttempts >= 10) {
        throw new Error('Usuário bloqueado por excesso de tentativas falhas. Contate o suporte.')
      }
    }
  }

  // 2. Montar JSON para o campo ATIVIDADE
  const atividade = sucesso
    ? JSON.stringify({
        evento: 'autenticacao_facial',
        resultado: 'sucesso',
        faceIdId,
        distanciaMatch,
        confianca,
        matricula
      })
    : JSON.stringify({
        evento: 'autenticacao_facial',
        resultado: 'falha',
        motivo: 'Nenhum rosto correspondente encontrado',
        melhorDistancia: distanciaMatch,
        threshold: 0.6
      })

  // 3. Registrar na TBACESSO (auditoria)
  const sql = `
    INSERT INTO TBACESSO (
      DATA,
      USUARIO_ID,
      USUARIO,
      LOCAL,
      TIPO,
      ATIVIDADE,
      ONLINE,
      IP,
      COMPUTADOR,
      CHAVE_ID
    )
    VALUES (CURRENT_TIMESTAMP, ?, ?, 'WEB_FACE_ID', ?, ?, 'S', ?, ?, ?)
  `

  await db.query(sql, [
    usuarioId || null,
    usuarioNome || null,
    sucesso ? 'FACE_ID_AUTH_SUCCESS' : 'FACE_ID_AUTH_FAILED',
    atividade,
    ipOrigem || null,
    userAgent || null,
    faceIdId || null
  ])
}

/**
 * Busca Face ID por ID do usuário
 * @param {number} usuarioId - ID do usuário
 * @returns {Promise<Object|null>} Dados do Face ID ou null
 */
async function getFaceIdByUsuarioId(usuarioId) {
  const sql = `
    SELECT
      FACEID_ID,
      USUARIO_ID,
      MATRICULA,
      ATIVO,
      DATA_INC,
      DATA_ALT
    FROM TBUSUARIO_FACEID
    WHERE USUARIO_ID = ?
    ORDER BY DATA_INC DESC
    LIMIT 1
  `

  const result = await db.query(sql, [usuarioId])
  return result.length > 0 ? result[0] : null
}

/**
 * Lista todos os usuários com Face ID
 * @param {Object} filters - Filtros de busca
 * @returns {Promise<Object>} Lista paginada
 */
async function listFaceIdUsers(filters = {}) {
  const { page = 1, limit = 50, search } = filters
  const offset = (page - 1) * limit

  let whereClause = 'WHERE f.ATIVO = \'S\''
  const params = []

  if (search) {
    whereClause += ' AND (u.NOME LIKE ? OR f.MATRICULA LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  // Não incluir FOTO_URL em listagens (muito pesado)
  const sql = `
    SELECT
      f.FACEID_ID,
      f.USUARIO_ID,
      f.MATRICULA,
      f.ATIVO,
      f.DATA_INC,
      f.DATA_ALT,
      u.NOME,
      u.EMAIL
    FROM TBUSUARIO_FACEID f
    LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
    ${whereClause}
    ORDER BY f.DATA_INC DESC
    LIMIT ? OFFSET ?
  `

  const sqlCount = `
    SELECT COUNT(*) as TOTAL
    FROM TBUSUARIO_FACEID f
    LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
    ${whereClause}
  `

  const [data, countResult] = await Promise.all([
    db.query(sql, [...params, limit, offset]),
    db.query(sqlCount, params)
  ])

  const total = countResult[0].TOTAL

  return {
    data: data.map(formatFaceIdUser),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Busca Face ID por ID
 * @param {number} faceIdId - ID do Face ID
 * @param {boolean} includePhoto - Se deve incluir a foto (padrão: false)
 * @returns {Promise<Object|null>} Dados do Face ID
 */
async function getFaceIdById(faceIdId, includePhoto = false) {
  const photoField = includePhoto ? 'f.FOTO_URL,' : ''

  const sql = `
    SELECT
      f.FACEID_ID,
      f.USUARIO_ID,
      ${photoField}
      f.MATRICULA,
      f.ATIVO,
      f.DATA_INC,
      f.DATA_ALT,
      u.NOME,
      u.EMAIL,
      (SELECT COUNT(*) FROM TBACESSO a
       WHERE a.CHAVE_ID = f.FACEID_ID
       AND a.LOCAL = 'WEB_FACE_ID'
       AND a.DATA >= DATEADD(-7 DAY TO CURRENT_TIMESTAMP)) as ACESSOS_RECENTES,
      (SELECT MAX(a.DATA) FROM TBACESSO a
       WHERE a.CHAVE_ID = f.FACEID_ID
       AND a.LOCAL = 'WEB_FACE_ID'
       AND a.TIPO = 'FACE_ID_AUTH_SUCCESS') as ULTIMO_ACESSO
    FROM TBUSUARIO_FACEID f
    LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
    WHERE f.FACEID_ID = ?
  `

  const result = await db.query(sql, [faceIdId])

  if (result.length === 0) return null

  const user = formatFaceIdUser(result[0])

  // Converter foto para Base64 se solicitado
  if (includePhoto && result[0].FOTO_URL) {
    user.photoBase64 = `data:image/jpeg;base64,${result[0].FOTO_URL.toString('base64')}`
  }

  return user
}

/**
 * Atualiza Face ID (re-cadastro)
 * @param {number} faceIdId - ID do Face ID
 * @param {Object} data - Novos dados
 */
async function updateFaceId(faceIdId, data) {
  const { photoBase64, descriptor, usuarioId, usuarioNome } = data

  if (!vectorMath.isValidDescriptor(descriptor)) {
    throw new Error('Descriptor facial inválido')
  }

  const descriptorBuffer = vectorMath.descriptorToBuffer(descriptor)

  // Converter foto Base64 para Buffer
  const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
  const photoBuffer = Buffer.from(base64Data, 'base64')

  // Atualizar registro
  const sql = `
    UPDATE TBUSUARIO_FACEID
    SET
      DESCRIPTOR_FACIAL = ?,
      FOTO_URL = ?,
      USUARIO_A = ?,
      USUARIONOME_A = ?
    WHERE FACEID_ID = ?
  `

  await db.query(sql, [descriptorBuffer, photoBuffer, usuarioId, usuarioNome, faceIdId])

  return { faceIdId, updatedAt: new Date().toISOString() }
}

/**
 * Remove Face ID (soft delete)
 * @param {number} faceIdId - ID do Face ID
 * @param {Object} user - Usuário que está excluindo
 */
async function deleteFaceId(faceIdId, user) {
  const sql = `
    UPDATE TBUSUARIO_FACEID
    SET
      ATIVO = 'N',
      DATA_DEL = CURRENT_TIMESTAMP,
      USUARIO_D = ?,
      USUARIONOME_D = ?
    WHERE FACEID_ID = ?
  `

  await db.query(sql, [user.id, user.name, faceIdId])
}

/**
 * Busca histórico de acessos por Face ID (usando TBACESSO)
 * @param {number} faceIdId - ID do Face ID
 * @param {Object} filters - Filtros
 * @returns {Promise<Object>} Lista paginada
 */
async function getAccessHistory(faceIdId, filters = {}) {
  const { page = 1, limit = 20, startDate, endDate } = filters
  const offset = (page - 1) * limit

  let whereClause = 'WHERE CHAVE_ID = ? AND LOCAL = \'WEB_FACE_ID\' AND TIPO LIKE \'FACE_ID_AUTH%\''
  const params = [faceIdId]

  if (startDate) {
    whereClause += ' AND DATA >= ?'
    params.push(new Date(startDate))
  }

  if (endDate) {
    whereClause += ' AND DATA <= ?'
    params.push(new Date(endDate))
  }

  const sql = `
    SELECT
      ACESSO_ID,
      DATA,
      TIPO,
      ATIVIDADE,
      IP,
      COMPUTADOR
    FROM TBACESSO
    ${whereClause}
    ORDER BY DATA DESC
    LIMIT ? OFFSET ?
  `

  const sqlCount = `
    SELECT COUNT(*) as TOTAL
    FROM TBACESSO
    ${whereClause}
  `

  const [data, countResult] = await Promise.all([
    db.query(sql, [...params, limit, offset]),
    db.query(sqlCount, params)
  ])

  const total = countResult[0].TOTAL

  return {
    data: data.map(formatAccessRecord),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Formata dados do Face ID para resposta
 */
function formatFaceIdUser(record) {
  return {
    faceIdId: record.FACEID_ID,
    usuarioId: record.USUARIO_ID,
    name: record.NOME,
    matricula: record.MATRICULA,
    email: record.EMAIL,
    hasPhoto: !!record.FOTO_URL,  // Indica se tem foto armazenada
    createdAt: record.DATA_INC,
    updatedAt: record.DATA_ALT,
    ativo: record.ATIVO === 'S',
    acessosRecentes: record.ACESSOS_RECENTES || 0,
    ultimoAcesso: record.ULTIMO_ACESSO
  }
}

/**
 * Formata dados do acesso (TBACESSO) para resposta
 */
function formatAccessRecord(record) {
  let detalhes = {}
  try {
    detalhes = JSON.parse(record.ATIVIDADE || '{}')
  } catch (e) {
    detalhes = { raw: record.ATIVIDADE }
  }

  return {
    acessoId: record.ACESSO_ID,
    dataHora: record.DATA,
    tipo: record.TIPO,
    sucesso: record.TIPO === 'FACE_ID_AUTH_SUCCESS',
    detalhes,
    ipOrigem: record.IP,
    userAgent: record.COMPUTADOR
  }
}

/**
 * Busca apenas a foto de um Face ID
 * @param {number} faceIdId - ID do Face ID
 * @returns {Promise<Buffer|null>} Buffer da foto ou null
 */
async function getFaceIdPhoto(faceIdId) {
  const sql = `
    SELECT FOTO_URL
    FROM TBUSUARIO_FACEID
    WHERE FACEID_ID = ?
      AND ATIVO = 'S'
  `

  const result = await db.query(sql, [faceIdId])

  if (result.length === 0 || !result[0].FOTO_URL) {
    return null
  }

  return result[0].FOTO_URL  // Retorna o Buffer diretamente
}

module.exports = {
  registerFaceId,
  authenticateFaceId,
  listFaceIdUsers,
  getFaceIdById,
  getFaceIdPhoto,
  updateFaceId,
  deleteFaceId,
  getAccessHistory
}
```

---

**Continua na próxima parte...**


