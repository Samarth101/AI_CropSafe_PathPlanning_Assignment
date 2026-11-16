import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function hasUvicornAndFastapi() {
  const check = spawnSync('python3', ['-c', 'import fastapi, uvicorn'], {
    stdio: 'ignore',
  });
  return check.status === 0;
}

const pyPort = process.env.PYTHON_API_PORT || '8787';
const useUvicorn = hasUvicornAndFastapi();
const pyArgs = useUvicorn
  ? ['-m', 'uvicorn', 'api.index:app', '--host', '127.0.0.1', '--port', pyPort]
  : [path.join(rootDir, 'python_engine', 'local_dev_server.py')];

console.log(
  useUvicorn
    ? `[dev] Starting FastAPI backend via uvicorn on http://127.0.0.1:${pyPort}`
    : `[dev] Starting Python backend on http://127.0.0.1:${pyPort}`
);

const pyProc = spawn('python3', pyArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PYTHON_API_PORT: pyPort },
});

const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const viteProc = spawn(
  process.execPath,
  [viteBin, '--port=3000', '--host=0.0.0.0'],
  { cwd: rootDir, stdio: 'inherit', env: { ...process.env, PYTHON_API_PORT: pyPort } }
);

function shutdown(signal) {
  if (!pyProc.killed) pyProc.kill(signal);
  if (!viteProc.killed) viteProc.kill(signal);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

pyProc.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[dev] Python backend exited with code ${code}`);
  }
});

viteProc.on('exit', (code) => {
  if (!pyProc.killed) pyProc.kill('SIGTERM');
  process.exit(code ?? 0);
});
