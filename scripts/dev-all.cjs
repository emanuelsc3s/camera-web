const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
const rootEnvPath = path.join(rootDir, '.env');
const rootEnv = fs.existsSync(rootEnvPath) ? dotenv.parse(fs.readFileSync(rootEnvPath)) : {};
const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : 'npm';
const npmBaseArgs = npmExecPath ? [npmExecPath] : [];
const useShell = !npmExecPath && process.platform === 'win32';
const processes = [];
let shuttingDown = false;

function getEnv(name) {
  return process.env[name] ?? rootEnv[name];
}

function parsePort(name, value, defaultPort) {
  if (value === undefined || value === '') {
    return defaultPort;
  }

  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Porta invalida para ${name}: ${value}`);
  }

  return port;
}

function isPortAvailable(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort(initialPort, host, maxAttempts = 50) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = initialPort + offset;
    if (port > 65535) {
      break;
    }

    if (await isPortAvailable(port, host)) {
      return port;
    }
  }

  throw new Error(
    `Nenhuma porta livre encontrada a partir de ${initialPort} em ${host} (${maxAttempts} tentativas).`,
  );
}

function resolveBrowserHost(host) {
  if (!host || host === '0.0.0.0' || host === '::') {
    return 'localhost';
  }

  return host;
}

function startProcess(name, args, cwd, env) {
  const child = spawn(npmCommand, [...npmBaseArgs, ...args], {
    cwd,
    env,
    stdio: 'inherit',
    shell: useShell,
  });

  processes.push({ name, child });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `sinal ${signal}` : `codigo ${code}`;
    console.error(`[${name}] finalizou com ${reason}. Encerrando os demais processos.`);
    shutdown(code || 1);
  });

  child.on('error', (erro) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[${name}] falha ao iniciar:`, erro);
    shutdown(1);
  });
}

function shutdown(exitCode = 0) {
  shuttingDown = true;

  for (const { child } of processes) {
    if (process.platform === 'win32' && child.pid) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
      });
    } else if (!child.killed) {
      child.kill();
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  const backendHost = getEnv('HOST') || '127.0.0.1';
  const frontendHost = getEnv('FRONTEND_HOST') || '0.0.0.0';
  const backendInitialPort = parsePort(
    'backend',
    getEnv('BACKEND_PORT') || getEnv('PORT'),
    8000,
  );
  const frontendInitialPort = parsePort('frontend', getEnv('FRONTEND_PORT'), 8080);

  const [backendPort, frontendPort] = await Promise.all([
    findAvailablePort(backendInitialPort, backendHost),
    findAvailablePort(frontendInitialPort, frontendHost),
  ]);

  if (backendPort !== backendInitialPort) {
    console.warn(
      `[backend] porta ${backendInitialPort} ocupada. Usando a porta ${backendPort}.`,
    );
  }

  if (frontendPort !== frontendInitialPort) {
    console.warn(
      `[frontend] porta ${frontendInitialPort} ocupada. Usando a porta ${frontendPort}.`,
    );
  }

  const apiPrefix = getEnv('API_PREFIX') || '/api';
  const apiHost = resolveBrowserHost(backendHost);
  const childEnv = {
    ...rootEnv,
    ...process.env,
    PORT: String(backendPort),
    FRONTEND_PORT: String(frontendPort),
    VITE_API_URL:
      process.env.VITE_API_URL || `http://${apiHost}:${backendPort}${apiPrefix}`,
  };

  startProcess('backend', ['--prefix', 'backend', 'run', 'dev'], rootDir, childEnv);
  startProcess('frontend', ['run', 'dev:frontend'], rootDir, childEnv);
}

main().catch((error) => {
  console.error('Falha ao preparar ambiente de desenvolvimento:', error.message);
  process.exit(1);
});
