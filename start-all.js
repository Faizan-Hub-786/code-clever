import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\x1b[35m====================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m   🚀 CODE CLEVER - FULL STACK DEV RUNNER\x1b[0m');
console.log('\x1b[35m====================================================\x1b[0m');
console.log('\x1b[33m• Backend API:\x1b[0m   http://localhost:4000');
console.log('\x1b[32m• Frontend App:\x1b[0m  http://localhost:5173');
console.log('\x1b[36m• Admin Portal:\x1b[0m  http://localhost:5173/admin');
console.log('\x1b[35m----------------------------------------------------\x1b[0m\n');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

// 1. Spawn Backend API Server (Node server.js)
const backend = spawn('node', ['--max-old-space-size=384', 'server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, FORCE_COLOR: '1' }
});

// 2. Spawn Vite Frontend Client (npx vite)
const frontend = spawn(npxCmd, ['vite'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, FORCE_COLOR: '1' }
});

backend.on('error', (err) => {
  console.error('\x1b[31m[Backend Error]:\x1b[0m', err.message);
});

frontend.on('error', (err) => {
  console.error('\x1b[31m[Frontend Error]:\x1b[0m', err.message);
});

function handleExit() {
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log('\n\x1b[33mShutting down all Code Clever services...\x1b[0m');
  handleExit();
});

process.on('SIGTERM', handleExit);
