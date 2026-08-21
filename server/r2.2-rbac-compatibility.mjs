export const PHASE17_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'REVIEWER', 'AUDITOR'];

export function authorizePhase17({ authenticated, role, resourceOwned, policyAllows }) {
  const checks = {
    authenticated: authenticated === true,
    roleKnown: PHASE17_ROLES.includes(String(role || '')),
    resourceOwned: resourceOwned === true,
    policyAllows: policyAllows === true
  };
  const allowed = Object.values(checks).every(Boolean);
  return {
    phase: '17-R2.2-B',
    status: allowed ? 'AUTHORIZED' : 'AUTHORIZATION_DENIED',
    allowed,
    roles: PHASE17_ROLES,
    denyByDefault: true,
    clientOnlyAuthorizationAccepted: false,
    checks
  };
}
