// Shared admin-auth compatibility shim. Keep the implementation in server/ so auth logic has one source of truth.
export { getAdminSession, requireAdmin } from '../server/admin-auth.js';
