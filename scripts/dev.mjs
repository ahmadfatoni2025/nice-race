import { spawn } from 'child_process';

console.log('[Project Horizon] Starting dev environment...');

const server = spawn('pnpm', ['--filter', '@horizon/server', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

const web = spawn('pnpm', ['--filter', '@horizon/web', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  server.kill();
  web.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
