import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const composeFile = path.join(projectRoot, 'docker-compose.yml');

function runProcess(command, args, label) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', (error) => {
    console.error(`[${label}] failed to start: ${error.message}`);
    process.exitCode = 1;
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      process.exitCode = code ?? 1;
    }
  });

  return child;
}

if (!existsSync(composeFile)) {
  console.error('docker-compose.yml is missing from PaySys.');
  process.exit(1);
}

console.log('Starting PaySys foundation dev environment...');
console.log('Compose file:', composeFile);

const dockerArgs = ['compose', '-f', composeFile, 'up'];
const dockerProcess = runProcess('docker', dockerArgs, 'docker-compose');

process.on('SIGINT', () => {
  dockerProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  dockerProcess.kill('SIGTERM');
});
