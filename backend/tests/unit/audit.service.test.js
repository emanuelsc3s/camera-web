const assert = require('node:assert/strict');
const test = require('node:test');

const auditService = require('../../src/services/audit.service');

test('safeJson limita ATIVIDADE a 2000 caracteres', () => {
  const result = auditService.safeJson({
    evento: 'autenticacao_facial',
    detalhe: 'x'.repeat(5000),
  });

  assert.equal(result.length <= 2000, true);
  assert.doesNotThrow(() => JSON.parse(result));
});

test('registerFaceIdEvent grava auditoria em TBACESSO com campos truncados', async () => {
  const calls = [];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [];
    },
  };

  await auditService.registerFaceIdEvent({
    tipo: 'FACE_ID_AUTH_SUCCESS',
    usuarioId: 10,
    usuarioNome: 'Usuario com nome maior que trinta caracteres',
    faceIdId: 22,
    ip: '192.168.100.250-extra',
    computador: 'TERMINAL-COM-NOME-MUITO-LONGO-001',
    atividade: {
      evento: 'autenticacao_facial',
      resultado: 'sucesso',
      distancia: 0,
      confianca: 1,
    },
  }, executor);

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO TBACESSO/);
  assert.equal(calls[0].params[0], 10);
  assert.equal(calls[0].params[1].length, 30);
  assert.equal(calls[0].params[2], 'WEB_FACE_ID');
  assert.equal(calls[0].params[3], 'FACE_ID_AUTH_SUCCESS');
  assert.equal(calls[0].params[6].length, 15);
  assert.equal(calls[0].params[7].length, 30);
  assert.equal(calls[0].params[8], 22);
});
