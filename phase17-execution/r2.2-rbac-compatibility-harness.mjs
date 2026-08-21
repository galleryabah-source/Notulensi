import { writeFileSync } from 'node:fs';
import { authorizePhase17, PHASE17_ROLES } from '../server/r2.2-rbac-compatibility.mjs';

const output = 'phase17-execution/r2.2-rbac-compatibility.json';
const checks = [];
function check(name, passed, details) { checks.push({ name, status: passed ? 'PASS' : 'FAIL', details }); }

check('Current role vocabulary declared', JSON.stringify(PHASE17_ROLES) === JSON.stringify(['OWNER','ADMIN','EDITOR','REVIEWER','AUDITOR']), `roles=${PHASE17_ROLES.join(',')}`);

for (const role of PHASE17_ROLES) {
  const allowed = authorizePhase17({ authenticated: true, role, resourceOwned: true, policyAllows: true });
  check(`Authenticated ${role} allowed when policy permits`, allowed.allowed === true && allowed.status === 'AUTHORIZED', JSON.stringify(allowed));

  const denied = authorizePhase17({ authenticated: true, role, resourceOwned: true, policyAllows: false });
  check(`${role} denied when policy denies`, denied.allowed === false && denied.status === 'AUTHORIZATION_DENIED', JSON.stringify(denied));
}

const unknown = authorizePhase17({ authenticated: true, role: 'user', resourceOwned: true, policyAllows: true });
check('Legacy role string is not silently accepted', unknown.allowed === false && unknown.checks.roleKnown === false, JSON.stringify(unknown));

const unauthenticated = authorizePhase17({ authenticated: false, role: 'ADMIN', resourceOwned: true, policyAllows: true });
check('Unauthenticated request denied', unauthenticated.allowed === false && unauthenticated.checks.authenticated === false, JSON.stringify(unauthenticated));

const result = {
  schemaVersion: '1.0.0',
  status: checks.every(check => check.status === 'PASS') ? 'PASS' : 'FAIL',
  checks,
  compatibility: {
    historicalRoles: ['user', 'admin'],
    phase17Roles: PHASE17_ROLES,
    mappingStrategy: 'explicit-current-contract-role; no implicit legacy-role remapping',
    sourceOfTruth: 'phase14.5-server-authorization-rbac.js'
  },
  generatedAt: new Date().toISOString()
};
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
