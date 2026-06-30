const http = require('http');

const app = require('./src/app');
const { env } = require('./src/config/env');
const database = require('./src/config/database');

let server;
let encerrando = false;

function iniciarServidor() {
  server = http.createServer(app);

  server.listen(env.port, env.host, () => {
    console.log(`API Camera Web em execucao: http://${env.host}:${env.port}${env.apiPrefix}/health`);
    console.log(`Ambiente: ${env.nodeEnv}`);
  });

  server.on('error', (erro) => {
    console.error('Falha ao iniciar o servidor HTTP:', erro.message);
    process.exit(1);
  });
}

async function encerrar(signal) {
  if (encerrando) {
    return;
  }

  encerrando = true;
  console.log(`${signal} recebido. Encerrando backend...`);

  const timeoutForcado = setTimeout(() => {
    console.error('Encerramento excedeu o tempo limite. Finalizando processo.');
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((erro) => (erro ? reject(erro) : resolve()));
      });
    }

    await database.closePool();
    clearTimeout(timeoutForcado);
    process.exit(0);
  } catch (erro) {
    clearTimeout(timeoutForcado);
    console.error('Erro durante o encerramento do backend:', erro);
    process.exit(1);
  }
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));

process.on('unhandledRejection', (erro) => {
  console.error('Promise rejeitada sem tratamento:', erro);
});

process.on('uncaughtException', (erro) => {
  console.error('Excecao nao tratada:', erro);
  encerrar('uncaughtException');
});

iniciarServidor();
