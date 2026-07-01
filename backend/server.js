const http = require('http');

const app = require('./src/app');
const { env } = require('./src/config/env');
const database = require('./src/config/database');

let server;
let encerrando = false;

const MAX_PORT_ATTEMPTS = 50;

function listen(port, attemptsLeft) {
  const onError = (erro) => {
    server.off('listening', onListening);

    if (erro.code === 'EADDRINUSE' && attemptsLeft > 1 && port < 65535) {
      const nextPort = port + 1;
      console.warn(`Porta ${port} ocupada. Tentando iniciar o backend na porta ${nextPort}.`);
      listen(nextPort, attemptsLeft - 1);
      return;
    }

    console.error('Falha ao iniciar o servidor HTTP:', erro.message);
    process.exit(1);
  };

  const onListening = () => {
    server.off('error', onError);

    const address = server.address();
    const currentPort = typeof address === 'object' && address ? address.port : port;
    env.port = currentPort;
    process.env.PORT = String(currentPort);

    console.log(`API Camera Web em execucao: http://${env.host}:${currentPort}${env.apiPrefix}/health`);
    console.log(`Ambiente: ${env.nodeEnv}`);

    server.on('error', (erro) => {
      console.error('Erro no servidor HTTP:', erro.message);
      process.exit(1);
    });
  };

  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, env.host);
}

function iniciarServidor() {
  server = http.createServer(app);
  listen(env.port, MAX_PORT_ATTEMPTS);
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
