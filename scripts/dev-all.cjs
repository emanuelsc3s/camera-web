const { spawn, spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : 'npm';
const npmBaseArgs = npmExecPath ? [npmExecPath] : [];
const useShell = !npmExecPath && process.platform === 'win32';
const processes = [];
let shuttingDown = false;

function startProcess(name, args, cwd) {
  const child = spawn(npmCommand, [...npmBaseArgs, ...args], {
    cwd,
    env: process.env,
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

startProcess('frontend', ['run', 'dev:frontend'], rootDir);
startProcess('backend', ['--prefix', 'backend', 'run', 'dev'], rootDir);
