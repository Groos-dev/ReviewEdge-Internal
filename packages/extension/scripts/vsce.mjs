import os from 'node:os';
import { spawnSync } from 'node:child_process';

const vsceArgs = process.argv.slice(2);

if (vsceArgs.length === 0) {
  console.error('Usage: node ./scripts/vsce.mjs <vsce-subcommand> [...args]');
  process.exit(2);
}

const hasArg = (flag) => vsceArgs.includes(flag);

const cpuCount = os.cpus()?.length ?? 0;
const shouldWorkAroundSecretlint = cpuCount < 1;

const extraArgs = [];
if (shouldWorkAroundSecretlint) {
  if (!hasArg('--allow-package-all-secrets')) extraArgs.push('--allow-package-all-secrets');
  if (!hasArg('--allow-package-env-file')) extraArgs.push('--allow-package-env-file');
}

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npxCmd, ['--no-install', 'vsce', ...vsceArgs, ...extraArgs], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
