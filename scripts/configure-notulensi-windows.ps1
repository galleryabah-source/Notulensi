#Requires -RunAsAdministrator
[CmdletBinding()]
param(
  [string]$DatabaseUrl
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is not installed or not available in PATH.'
}

$email = Read-Host 'Admin email'
if ([string]::IsNullOrWhiteSpace($email)) { throw 'Admin email wajib diisi.' }

$securePassword = Read-Host 'Admin password' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
if ([string]::IsNullOrEmpty($password)) { throw 'Admin password wajib diisi.' }

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $DatabaseUrl = Read-Host 'DATABASE_URL'
}
if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) { throw 'DATABASE_URL wajib diisi.' }

$salt = node -e "console.log(require('node:crypto').randomBytes(16).toString('hex'))"
$sessionSecret = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
$hash = node -e "const c=require('node:crypto');const [password,salt]=process.argv.slice(1);console.log(c.pbkdf2Sync(password,salt,120000,32,'sha256').toString('hex'))" -- "$password" "$salt"

[Environment]::SetEnvironmentVariable('DATABASE_URL', $DatabaseUrl.Trim(), 'Machine')
[Environment]::SetEnvironmentVariable('ADMIN_EMAIL', $email.Trim().ToLowerInvariant(), 'Machine')
[Environment]::SetEnvironmentVariable('ADMIN_PASSWORD_SALT', $salt.Trim(), 'Machine')
[Environment]::SetEnvironmentVariable('ADMIN_PASSWORD_HASH', $hash.Trim().ToLowerInvariant(), 'Machine')
[Environment]::SetEnvironmentVariable('ADMIN_SESSION_SECRET', $sessionSecret.Trim(), 'Machine')
[Environment]::SetEnvironmentVariable('NOTULENSI_HOST', '127.0.0.1', 'Machine')
[Environment]::SetEnvironmentVariable('NOTULENSI_PORT', '3000', 'Machine')
[Environment]::SetEnvironmentVariable('NOTULENSI_TRUST_PROXY', '1', 'Machine')
[Environment]::SetEnvironmentVariable('NOTULENSI_API_RATE_LIMIT', '180', 'Machine')

Write-Host 'Production environment configured as Windows Machine variables.' -ForegroundColor Green
Write-Host 'Secrets were not written to the repository.' -ForegroundColor Green
Write-Host 'Restart the Notulensi scheduled task after changing credentials.' -ForegroundColor Yellow
