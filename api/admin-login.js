import crypto from 'node:crypto';

const COOKIE = 'notulensi_admin_session';
const TTL = 8 * 60 * 60;

function b64(v){return Buffer.from(v).toString('base64url')}
function sign(payload){return b64(payload)+'.'+b64(crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET||'').update(payload).digest())}
function safeEqual(a,b){const aa=Buffer.from(a||'');const bb=Buffer.from(b||'');return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function passwordHash(password){const salt=process.env.ADMIN_PASSWORD_SALT||'';return crypto.pbkdf2Sync(password,salt,120000,32,'sha256').toString('hex')}
function readCookie(req){return String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||''}
function verify(token){
  try{
    const [payload,signature]=String(token||'').split('.');
    if(!payload||!signature||!process.env.ADMIN_SESSION_SECRET)return null;
    const raw=Buffer.from(payload,'base64url').toString('utf8');
    const expected=crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(raw).digest();
    const actual=Buffer.from(signature,'base64url');
    if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return null;
    const session=JSON.parse(raw);
    if(!session.exp||session.exp<Date.now())return null;
    if(!['ADMIN','SUPER_ADMIN'].includes(session.role))return null;
    return session;
  }catch{return null}
}
export function getAdminSession(req){return verify(readCookie(req))}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'){
    const session=getAdminSession(req);
    return res.status(session?200:401).json(session?{authenticated:true,role:session.role,email:session.sub}:{authenticated:false});
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const {email,password}=req.body||{};
  const configStatus={adminEmail:!!process.env.ADMIN_EMAIL,passwordHash:!!process.env.ADMIN_PASSWORD_HASH,passwordSalt:!!process.env.ADMIN_PASSWORD_SALT,sessionSecret:!!process.env.ADMIN_SESSION_SECRET};
  if(!configStatus.adminEmail||!configStatus.passwordHash||!configStatus.passwordSalt||!configStatus.sessionSecret){
    console.warn('[admin-auth-diagnostic]',JSON.stringify({stage:'configuration',...configStatus}));
    return res.status(503).json({error:'Admin authentication belum dikonfigurasi di Vercel Environment Variables.'});
  }
  const okEmail=typeof email==='string'&&email.trim().toLowerCase()===process.env.ADMIN_EMAIL.trim().toLowerCase();
  const okPassword=typeof password==='string'&&safeEqual(passwordHash(password),process.env.ADMIN_PASSWORD_HASH.trim().toLowerCase());
  console.info('[admin-auth-diagnostic]',JSON.stringify({stage:'credential-check',emailMatch:okEmail,passwordHashMatch:okPassword}));
  if(!okEmail||!okPassword)return res.status(401).json({error:'Email atau password admin salah.'});
  const payload=JSON.stringify({sub:process.env.ADMIN_EMAIL.trim().toLowerCase(),role:'ADMIN',exp:Date.now()+TTL*1000});
  const token=sign(payload);
  res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`);
  return res.status(200).json({authenticated:true,role:'ADMIN'});
}
