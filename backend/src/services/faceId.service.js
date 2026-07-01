const database = require('../config/database');
const { env } = require('../config/env');
const auditService = require('./audit.service');
const { conflict, forbidden, notFound } = require('../utils/http-error');
const { signJwt } = require('../utils/jwt');
const vectorMath = require('../utils/vectorMath');

const MAX_FAILED_ATTEMPTS = 10;
const DEFAULT_THRESHOLD = 0.6;

function normalizeText(value) {
  return value === undefined || value === null ? null : String(value).trim() || null;
}

function descriptorFromRow(row) {
  return vectorMath.bufferToDescriptor(row.DESCRIPTOR_FACIAL);
}

function formatFaceIdUser(row) {
  return {
    faceIdId: row.FACEID_ID,
    usuarioId: row.USUARIO_ID ?? null,
    name: normalizeText(row.NOME),
    matricula: normalizeText(row.MATRICULA),
    email: normalizeText(row.EMAIL),
    descriptorOnly: true,
    createdAt: row.DATA_INC || null,
    updatedAt: row.DATA_ALT || null,
    deletedAt: row.DATA_DEL || null,
    ativo: row.ATIVO === 'S',
    acessosRecentes: Number(row.ACESSOS_RECENTES || 0),
    ultimoAcesso: row.ULTIMO_ACESSO || null,
  };
}

function formatAccessRecord(row) {
  let detalhes = {};

  try {
    detalhes = JSON.parse(row.ATIVIDADE || '{}');
  } catch (erro) {
    detalhes = { raw: row.ATIVIDADE };
  }

  return {
    acessoId: row.ACESSO_ID,
    dataHora: row.DATA,
    tipo: row.TIPO,
    sucesso: row.TIPO === 'FACE_ID_AUTH_SUCCESS',
    detalhes,
    ipOrigem: row.IP || null,
    computador: row.COMPUTADOR || null,
  };
}

function buildToken(match) {
  return signJwt(
    {
      sub: match.usuarioId ? String(match.usuarioId) : `faceid:${match.faceIdId}`,
      usuarioId: match.usuarioId || null,
      faceIdId: match.faceIdId,
      matricula: match.matricula || null,
      tipo: 'FACE_ID',
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

async function getExistingActiveFaceId(tx, { usuarioId, matricula }) {
  const clauses = [];
  const params = [];

  if (usuarioId) {
    clauses.push('USUARIO_ID = ?');
    params.push(usuarioId);
  }

  if (matricula) {
    clauses.push('MATRICULA = ?');
    params.push(matricula);
  }

  if (params.length === 0) {
    return null;
  }

  const rows = await tx.query(
    `
      SELECT FIRST 1 FACEID_ID, USUARIO_ID, MATRICULA, ATIVO
      FROM TBUSUARIO_FACEID
      WHERE ATIVO = 'S'
        AND (${clauses.join(' OR ')})
      ORDER BY DATA_INC DESC
    `,
    params,
  );

  return rows[0] || null;
}

async function getUserByTarget(tx, { usuarioId, matricula }) {
  if (usuarioId) {
    const rows = await tx.query(
      `
        SELECT FIRST 1 USUARIO_ID, NOME, EMAIL, FAILED_ATTEMPTS
        FROM TBUSUARIO
        WHERE USUARIO_ID = ?
          AND COALESCE(DELETADO, 'N') = 'N'
      `,
      [usuarioId],
    );

    return rows[0] || null;
  }

  if (matricula) {
    const rows = await tx.query(
      `
        SELECT FIRST 1 u.USUARIO_ID, u.NOME, u.EMAIL, u.FAILED_ATTEMPTS
        FROM TBUSUARIO_FACEID f
        LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
        WHERE f.MATRICULA = ?
          AND f.ATIVO = 'S'
        ORDER BY f.DATA_INC DESC
      `,
      [matricula],
    );

    return rows[0] || null;
  }

  return null;
}

async function registerFaceId(data, context) {
  const descriptorBuffer = vectorMath.descriptorToBuffer(data.descriptor);

  return database.withTransaction(async (tx) => {
    const existing = await getExistingActiveFaceId(tx, {
      usuarioId: data.usuarioId,
      matricula: data.matricula,
    });

    if (existing) {
      throw conflict('Usuário já possui Face ID cadastrado.');
    }

    await tx.setSessionUser(data.auditUsuarioNome || data.name);

    const idRows = await tx.query(
      'SELECT GEN_ID(GEN_TBUSUARIO_FACEID_ID, 1) AS ID FROM RDB$DATABASE',
    );
    const faceIdId = idRows[0].ID;

    await tx.query(
      `
        INSERT INTO TBUSUARIO_FACEID (
          FACEID_ID,
          USUARIO_ID,
          DESCRIPTOR_FACIAL,
          MATRICULA,
          ATIVO,
          DATA_INC,
          USUARIO_I,
          USUARIONOME_I
        ) VALUES (?, ?, ?, ?, 'S', CURRENT_TIMESTAMP, ?, ?)
      `,
      [
        faceIdId,
        data.usuarioId || null,
        descriptorBuffer,
        data.matricula || null,
        data.auditUsuarioId || data.usuarioId || null,
        data.auditUsuarioNome || data.name || null,
      ],
    );

    await auditService.registerFaceIdEvent({
      tipo: 'FACE_ID_REGISTER',
      usuarioId: data.usuarioId,
      usuarioNome: data.name,
      faceIdId,
      ip: context.ip,
      computador: context.computador,
      atividade: {
        evento: 'cadastro_facial',
        resultado: 'sucesso',
        faceIdId,
        usuarioId: data.usuarioId || null,
        matricula: data.matricula || null,
        descriptorOnly: true,
      },
    }, tx);

    return {
      faceIdId,
      usuarioId: data.usuarioId || null,
      name: data.name,
      matricula: data.matricula || null,
      descriptorOnly: true,
      createdAt: new Date().toISOString(),
    };
  });
}

async function findActiveDescriptors() {
  const rows = await database.query(
    `
      SELECT
        f.FACEID_ID,
        f.USUARIO_ID,
        f.DESCRIPTOR_FACIAL,
        f.MATRICULA,
        u.NOME,
        u.EMAIL,
        u.FAILED_ATTEMPTS
      FROM TBUSUARIO_FACEID f
      LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
      WHERE f.ATIVO = 'S'
      ORDER BY f.DATA_INC DESC
    `,
  );

  return rows.map((row) => ({
    faceIdId: row.FACEID_ID,
    usuarioId: row.USUARIO_ID,
    name: row.NOME,
    matricula: row.MATRICULA,
    email: row.EMAIL,
    failedAttempts: Number(row.FAILED_ATTEMPTS || 0),
    descriptor: descriptorFromRow(row),
  }));
}

async function resetFailedAttempts(tx, usuarioId) {
  if (!usuarioId) {
    return;
  }

  await tx.query(
    'UPDATE TBUSUARIO SET FAILED_ATTEMPTS = 0 WHERE USUARIO_ID = ?',
    [usuarioId],
  );
}

async function incrementFailedAttempts(tx, usuarioId) {
  if (!usuarioId) {
    return null;
  }

  await tx.query(
    `
      UPDATE TBUSUARIO
      SET FAILED_ATTEMPTS = COALESCE(FAILED_ATTEMPTS, 0) + 1
      WHERE USUARIO_ID = ?
    `,
    [usuarioId],
  );

  const rows = await tx.query(
    'SELECT FAILED_ATTEMPTS FROM TBUSUARIO WHERE USUARIO_ID = ?',
    [usuarioId],
  );

  return Number(rows[0]?.FAILED_ATTEMPTS || 0);
}

async function authenticateFaceId(data, context) {
  const threshold = data.threshold || DEFAULT_THRESHOLD;
  const candidates = await findActiveDescriptors();
  const bestMatch = vectorMath.findBestMatch(data.descriptor, candidates, threshold);

  return database.withTransaction(async (tx) => {
    let targetUser = null;

    if (!bestMatch?.isMatch) {
      targetUser = await getUserByTarget(tx, {
        usuarioId: data.usuarioId,
        matricula: data.matricula,
      });
    }

    if (bestMatch?.isMatch && bestMatch.usuarioId && bestMatch.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await tx.setSessionUser(bestMatch.name);

      await auditService.registerFaceIdEvent({
        tipo: 'FACE_ID_AUTH_FAILED',
        usuarioId: bestMatch.usuarioId,
        usuarioNome: bestMatch.name,
        faceIdId: bestMatch.faceIdId,
        ip: context.ip,
        computador: context.computador,
        atividade: {
          evento: 'autenticacao_facial',
          resultado: 'bloqueado',
          faceIdId: bestMatch.faceIdId,
          distancia: bestMatch.distance,
          confianca: bestMatch.confidence,
          threshold,
          failedAttempts: bestMatch.failedAttempts,
        },
      }, tx);

      throw forbidden(`Usuário bloqueado por excesso de tentativas falhas (${bestMatch.failedAttempts}/${MAX_FAILED_ATTEMPTS}). Contate o suporte.`, {
        failedAttempts: bestMatch.failedAttempts,
        threshold: MAX_FAILED_ATTEMPTS,
      });
    }

    if (bestMatch?.isMatch) {
      await tx.setSessionUser(bestMatch.name);
      await resetFailedAttempts(tx, bestMatch.usuarioId);
      await auditService.registerFaceIdEvent({
        tipo: 'FACE_ID_AUTH_SUCCESS',
        usuarioId: bestMatch.usuarioId,
        usuarioNome: bestMatch.name,
        faceIdId: bestMatch.faceIdId,
        ip: context.ip,
        computador: context.computador,
        atividade: {
          evento: 'autenticacao_facial',
          resultado: 'sucesso',
          faceIdId: bestMatch.faceIdId,
          matricula: bestMatch.matricula || null,
          distancia: bestMatch.distance,
          confianca: bestMatch.confidence,
          threshold,
        },
      }, tx);

      return {
        authenticated: true,
        data: {
          usuarioId: bestMatch.usuarioId || null,
          faceIdId: bestMatch.faceIdId,
          name: bestMatch.name || null,
          matricula: bestMatch.matricula || null,
          email: bestMatch.email || null,
          distance: bestMatch.distance,
          confidence: bestMatch.confidence,
        },
        token: buildToken(bestMatch),
      };
    }

    await tx.setSessionUser(targetUser?.NOME || data.matricula || 'FACE_ID');
    const failedAttempts = await incrementFailedAttempts(tx, targetUser?.USUARIO_ID);

    await auditService.registerFaceIdEvent({
      tipo: 'FACE_ID_AUTH_FAILED',
      usuarioId: targetUser?.USUARIO_ID,
      usuarioNome: targetUser?.NOME,
      faceIdId: null,
      ip: context.ip,
      computador: context.computador,
      atividade: {
        evento: 'autenticacao_facial',
        resultado: 'falha',
        motivo: 'Nenhum rosto correspondente encontrado',
        melhorDistancia: bestMatch?.distance ?? null,
        confianca: bestMatch?.confidence ?? 0,
        threshold,
        usuarioAlvoId: targetUser?.USUARIO_ID || data.usuarioId || null,
        matricula: data.matricula || null,
        failedAttempts,
      },
    }, tx);

    return {
      authenticated: false,
      message: candidates.length ? 'Nenhum rosto correspondente encontrado' : 'Nenhum usuário cadastrado com Face ID',
      bestMatch: {
        distance: bestMatch?.distance ?? null,
        confidence: bestMatch?.confidence ?? 0,
      },
      failedAttempts,
    };
  });
}

async function listFaceIdUsers({ startRow, endRow, search }) {
  const params = [];
  let filter = "WHERE f.ATIVO = 'S'";

  if (search) {
    filter += ' AND (COALESCE(u.NOME, \'\') CONTAINING ? OR COALESCE(f.MATRICULA, \'\') CONTAINING ?)';
    params.push(search, search);
  }

  const rows = await database.query(
    `
      SELECT
        f.FACEID_ID,
        f.USUARIO_ID,
        f.MATRICULA,
        f.ATIVO,
        f.DATA_INC,
        f.DATA_ALT,
        f.DATA_DEL,
        u.NOME,
        u.EMAIL
      FROM TBUSUARIO_FACEID f
      LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
      ${filter}
      ORDER BY f.DATA_INC DESC
      ROWS ? TO ?
    `,
    [...params, startRow, endRow],
  );

  const countRows = await database.query(
    `
      SELECT COUNT(*) AS TOTAL
      FROM TBUSUARIO_FACEID f
      LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
      ${filter}
    `,
    params,
  );

  return {
    rows: rows.map(formatFaceIdUser),
    total: Number(countRows[0].TOTAL || 0),
  };
}

async function getFaceIdById(faceIdId) {
  const rows = await database.query(
    `
      SELECT
        f.FACEID_ID,
        f.USUARIO_ID,
        f.MATRICULA,
        f.ATIVO,
        f.DATA_INC,
        f.DATA_ALT,
        f.DATA_DEL,
        u.NOME,
        u.EMAIL,
        (SELECT COUNT(*)
         FROM TBACESSO a
         WHERE a.CHAVE_ID = f.FACEID_ID
           AND a.LOCAL = 'WEB_FACE_ID'
           AND a.DATA >= DATEADD(-7 DAY TO CURRENT_TIMESTAMP)) AS ACESSOS_RECENTES,
        (SELECT MAX(a.DATA)
         FROM TBACESSO a
         WHERE a.CHAVE_ID = f.FACEID_ID
           AND a.LOCAL = 'WEB_FACE_ID'
           AND a.TIPO = 'FACE_ID_AUTH_SUCCESS') AS ULTIMO_ACESSO
      FROM TBUSUARIO_FACEID f
      LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
      WHERE f.FACEID_ID = ?
        AND f.ATIVO = 'S'
    `,
    [faceIdId],
  );

  return rows[0] ? formatFaceIdUser(rows[0]) : null;
}

async function updateFaceId(faceIdId, data, context) {
  const descriptorBuffer = vectorMath.descriptorToBuffer(data.descriptor);

  return database.withTransaction(async (tx) => {
    const existingRows = await tx.query(
      `
        SELECT FIRST 1 f.FACEID_ID, f.USUARIO_ID, f.MATRICULA, u.NOME
        FROM TBUSUARIO_FACEID f
        LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
        WHERE f.FACEID_ID = ?
          AND f.ATIVO = 'S'
      `,
      [faceIdId],
    );

    const existing = existingRows[0];

    if (!existing) {
      throw notFound('Usuário Face ID não encontrado');
    }

    await tx.setSessionUser(data.auditUsuarioNome || existing.NOME);

    await tx.query(
      `
        UPDATE TBUSUARIO_FACEID
        SET DESCRIPTOR_FACIAL = ?,
            DATA_ALT = CURRENT_TIMESTAMP,
            USUARIO_A = ?,
            USUARIONOME_A = ?
        WHERE FACEID_ID = ?
          AND ATIVO = 'S'
      `,
      [descriptorBuffer, data.auditUsuarioId || null, data.auditUsuarioNome || null, faceIdId],
    );

    await auditService.registerFaceIdEvent({
      tipo: 'FACE_ID_UPDATE',
      usuarioId: existing.USUARIO_ID,
      usuarioNome: existing.NOME || data.auditUsuarioNome,
      faceIdId,
      ip: context.ip,
      computador: context.computador,
      atividade: {
        evento: 'atualizacao_facial',
        resultado: 'sucesso',
        faceIdId,
        descriptorOnly: true,
      },
    }, tx);

    return {
      faceIdId,
      updatedAt: new Date().toISOString(),
    };
  });
}

async function deleteFaceId(faceIdId, data, context) {
  return database.withTransaction(async (tx) => {
    const existingRows = await tx.query(
      `
        SELECT FIRST 1 f.FACEID_ID, f.USUARIO_ID, f.MATRICULA, u.NOME
        FROM TBUSUARIO_FACEID f
        LEFT JOIN TBUSUARIO u ON u.USUARIO_ID = f.USUARIO_ID
        WHERE f.FACEID_ID = ?
          AND f.ATIVO = 'S'
      `,
      [faceIdId],
    );

    const existing = existingRows[0];

    if (!existing) {
      throw notFound('Usuário Face ID não encontrado');
    }

    await tx.setSessionUser(data.auditUsuarioNome || existing.NOME);

    await tx.query(
      `
        UPDATE TBUSUARIO_FACEID
        SET ATIVO = 'N',
            DATA_DEL = CURRENT_TIMESTAMP,
            USUARIO_D = ?,
            USUARIONOME_D = ?
        WHERE FACEID_ID = ?
          AND ATIVO = 'S'
      `,
      [data.auditUsuarioId || null, data.auditUsuarioNome || null, faceIdId],
    );

    await auditService.registerFaceIdEvent({
      tipo: 'FACE_ID_DELETE',
      usuarioId: existing.USUARIO_ID,
      usuarioNome: existing.NOME || data.auditUsuarioNome,
      faceIdId,
      ip: context.ip,
      computador: context.computador,
      atividade: {
        evento: 'exclusao_facial',
        resultado: 'sucesso',
        faceIdId,
      },
    }, tx);

    return true;
  });
}

async function getAccessHistory(faceIdId, { startRow, endRow, startDate, endDate }) {
  const params = [faceIdId];
  let filter = `
    WHERE CHAVE_ID = ?
      AND LOCAL = 'WEB_FACE_ID'
      AND TIPO LIKE 'FACE_ID_AUTH%'
  `;

  if (startDate) {
    filter += ' AND DATA >= ?';
    params.push(startDate);
  }

  if (endDate) {
    filter += ' AND DATA <= ?';
    params.push(endDate);
  }

  const rows = await database.query(
    `
      SELECT ACESSO_ID, DATA, TIPO, ATIVIDADE, IP, COMPUTADOR
      FROM TBACESSO
      ${filter}
      ORDER BY DATA DESC
      ROWS ? TO ?
    `,
    [...params, startRow, endRow],
  );

  const countRows = await database.query(
    `
      SELECT COUNT(*) AS TOTAL
      FROM TBACESSO
      ${filter}
    `,
    params,
  );

  return {
    rows: rows.map(formatAccessRecord),
    total: Number(countRows[0].TOTAL || 0),
  };
}

module.exports = {
  DEFAULT_THRESHOLD,
  MAX_FAILED_ATTEMPTS,
  authenticateFaceId,
  deleteFaceId,
  getAccessHistory,
  getFaceIdById,
  listFaceIdUsers,
  registerFaceId,
  updateFaceId,
};
