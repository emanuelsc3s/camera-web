const database = require('../config/database');

const MAX_ATIVIDADE_LENGTH = 2000;
const MAX_USUARIO_LENGTH = 30;
const MAX_IP_LENGTH = 15;
const MAX_COMPUTADOR_LENGTH = 30;

function truncate(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function safeJson(data) {
  const text = JSON.stringify(data);

  if (text.length <= MAX_ATIVIDADE_LENGTH) {
    return text;
  }

  return JSON.stringify({
    ...data,
    truncado: true,
    detalhe: 'Conteudo reduzido para caber em TBACESSO.ATIVIDADE.',
  }).slice(0, MAX_ATIVIDADE_LENGTH);
}

function formatAtividade(atividade) {
  if (atividade && typeof atividade === 'object') {
    return safeJson(atividade);
  }

  return truncate(atividade || '', MAX_ATIVIDADE_LENGTH);
}

async function registerAccessEvent(data, executor = database) {
  await executor.query(
    `
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
      VALUES (CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.usuarioId || null,
      truncate(data.usuarioNome, MAX_USUARIO_LENGTH),
      truncate(data.local, 30),
      truncate(data.tipo, 30),
      formatAtividade(data.atividade),
      truncate(data.online || 'S', 1),
      truncate(data.ip, MAX_IP_LENGTH),
      truncate(data.computador, MAX_COMPUTADOR_LENGTH),
      data.chaveId || null,
    ],
  );
}

async function registerFaceIdEvent(data, executor = database) {
  await registerAccessEvent({
    usuarioId: data.usuarioId,
    usuarioNome: data.usuarioNome,
    local: 'WEB_FACE_ID',
    tipo: data.tipo,
    atividade: data.atividade || {},
    online: 'S',
    ip: data.ip,
    computador: data.computador,
    chaveId: data.faceIdId,
  }, executor);
}

module.exports = {
  registerAccessEvent,
  registerFaceIdEvent,
  safeJson,
  truncate,
};
