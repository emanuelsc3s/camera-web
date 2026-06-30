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

async function registerFaceIdEvent(data, executor = database) {
  const atividade = safeJson(data.atividade || {});

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
      VALUES (CURRENT_TIMESTAMP, ?, ?, 'WEB_FACE_ID', ?, ?, 'S', ?, ?, ?)
    `,
    [
      data.usuarioId || null,
      truncate(data.usuarioNome, MAX_USUARIO_LENGTH),
      data.tipo,
      atividade,
      truncate(data.ip, MAX_IP_LENGTH),
      truncate(data.computador, MAX_COMPUTADOR_LENGTH),
      data.faceIdId || null,
    ],
  );
}

module.exports = {
  registerFaceIdEvent,
  safeJson,
  truncate,
};
