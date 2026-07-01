const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const processes = [];
let shuttingDown = false;

function startProcess(name, args, cwd) {
  const child = spawn(npmCommand, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
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
    if (!child.killed) {
      child.kill();
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

startProcess('frontend', ['run', 'dev:frontend'], rootDir);
startProcess('backend', ['--prefix', 'backend', 'run', 'dev'], rootDir);
