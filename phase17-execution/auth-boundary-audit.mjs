import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const output = process.env.AUTH_BOUNDARY_EVIDENCE_OUTPUT || `${root}/phase17-execution/auth-boundary-evidence.json`;

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function fileInfo(path) {
  const absolute = `${root}/${path}`;
  if (!existsSync(absolute)) return { exists: false, nonEmpty: false };
  const text = readFileSync(absolute, 'utf8');
  return { exists: true, nonEmpty: text.trim().length > 0 };
}

const contractFiles = [
  'phase12.7-auth-authorization-gap-audit.js',
  'phase13.3-server-authentication-boundary.js',
  'phase13.4-server-authorization-rbac-boundary.js',
  'phase14.4-server-authentication-implementation.js',
  'phase14.5-server-authorization-rbac.js',
  'phase15.4-auth-runtime-wiring.js',
  'phase15.5-rbac-runtime-enforcement.js'
];

const contracts = Object.fromEntries(contractFiles.map((path) => [path, fileInfo(path)]));
const contractArtifactsPresent = Object.values(contracts).every((item) => item.exists && item.nonEmpty);

const runtimeCandidates = [
  'package.json',
  'server.js',
  'server.mjs',
  'src/server.js',
  'src/server.ts',
  'src/app/api',
  'app/api',
  'api'
];
const runtimeCandidateState = Object.fromEntries(runtimeCandidates.map((path) => [path, fileInfo(path).exists]));
const runtimeBoundaryCandidateFound = Object.values(runtimeCandidateState).some(Boolean);

const result = {
  schemaVersion: '1.0.0',
  checkId: '17-E.runtime.auth',
  phase: '17-E.11-A',
  name: 'Authentication/RBAC boundary discovery',
  generatedAt: new Date().toISOString(),
  commit: git(['rev-parse', 'HEAD']),
  status: 'NOT_RUN',
  evidence: contractFiles.filter((path) => contracts[path].exists && contracts[path].nonEmpty),
  details: contractArtifactsPresent
    ? 'Authentication/RBAC contracts are present, but no executable server/runtime boundary was discovered in the repository. Runtime authentication evidence cannot be claimed from contract artifacts alone.'
    : 'Authentication/RBAC contract set is incomplete and no executable runtime boundary was discovered.',
  contractArtifactsPresent,
  runtimeBoundaryCandidateFound,
  runtimeCandidateState,
  failClosed: true,
  clientOnlyAuthAccepted: false,
  clientOnlyAuthorizationAccepted: false
};

writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
// Discovery is informational: the production-readiness gate remains fail-closed through NOT_RUN.
