import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const appPath = process.env.RUNTIME_APP_PATH || 'meeting-intelligence-app-phase4.3-integrated-safe.html';
const output = process.env.APPLICATION_AUTH_INTEGRATION_OUTPUT || `${root}/phase17-execution/application-auth-integration.json`;

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

const absolute = `${root}/${appPath}`;
const exists = existsSync(absolute);
const source = exists ? readFileSync(absolute, 'utf8') : '';
const authApiPatterns = [
  /\/api\/auth\/(login|me|logout)/i,
  /fetch\s*\(\s*[`'\"]\/api\//i,
  /XMLHttpRequest/i
];
const authIntegrationReferenceFound = authApiPatterns.some(pattern => pattern.test(source));

const result = {
  schemaVersion: '1.0.0',
  checkId: '17-E.runtime.auth.integration',
  phase: '17-E.11-C',
  name: 'Real application Authentication/RBAC integration gate',
  generatedAt: new Date().toISOString(),
  commit: git(['rev-parse', 'HEAD']),
  status: exists && authIntegrationReferenceFound ? 'NOT_RUN' : 'NOT_RUN',
  evidence: exists ? [appPath] : [],
  details: !exists
    ? `Application entrypoint ${appPath} was not found.`
    : authIntegrationReferenceFound
      ? 'Application contains an authentication API reference, but executable end-to-end integration evidence is still required; this gate intentionally remains NOT_RUN until the application runtime is exercised against its real server boundary.'
      : 'No real application authentication API integration reference was found in the application entrypoint. Fixture evidence cannot be promoted to application authentication PASS.',
  applicationEntrypointFound: exists,
  authIntegrationReferenceFound,
  fixturePromotionAllowed: false,
  failClosed: true
};

writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
