const database = require('../src/config/database');
const { env } = require('../src/config/env');

async function main() {
  console.log('Testando conexao com Firebird 2.5...');
  console.log(`Host: ${env.firebird.host}:${env.firebird.port}`);
  console.log(`Banco: ${env.firebird.database || '(nao configurado)'}`);
  console.log(`Pool maximo: ${env.firebird.poolMax}`);

  const resultado = await database.ping();

  if (!resultado.ok) {
    console.error('Falha no ping Firebird.');
    console.error(resultado.error);
    process.exitCode = 1;
    return;
  }

  console.log(`Ping OK em ${resultado.latencyMs.toFixed(2)}ms.`);
}

main()
  .catch((erro) => {
    console.error('Erro inesperado no teste de conexao:', erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.closePool();
  });
