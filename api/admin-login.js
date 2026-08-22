import crypto from 'node:crypto';

const COOKIE = 'notulensi_admin_session';
const TTL = 8 * 60 * 60;
function b64(v){return Buffer.from(v).toString('base64url')}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex')}
function sign(payload){return b64(payload)+'.'+b64(crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET||'').update(payload).digest())}
function verify(token){try{const [p,s]=token.split('.');if(!p||!s||!process.env.ADMIN_SESSION_SECRET)return null;const raw=Buffer.from(p,'base64url').toString();const expected=crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(raw).digest();const got=Buffer.from(s,'base64url');if(got.length!==expected.length||!crypto.timingSafeEqual(got,expected))return null;const x=JSON.parse(raw);if(!x.exp||x.exp<Date.now())return null;return x}catch{return null}}
function safeEqual(a,b){const aa=Buffer.from(a||'');const bb=Buffer.from(b||'');return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function passwordHash(password){const salt=process.env.ADMIN_PASSWORD_SALT||'';return crypto.pbkdf2Sync(password,salt,120000,32,'sha256').toString('hex')}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return}
  const {email,password}=req.body||{};
  if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD_HASH||!process.env.ADMIN_PASSWORD_SALT||!process.env.ADMIN_SESSION_SECRET){res.status(503).json({error:'Admin authentication belum dikonfigurasi di Vercel Environment Variables.'});return}
  const okEmail=typeof email==='string'&&email.trim().toLowerCase()===process.env.ADMIN_EMAIL.trim().toLowerCase();
  const okPassword=typeof password==='string'&&safeEqual(passwordHash(password),process.env.ADMIN_PASSWORD_HASH.trim().toLowerCase());
  if(!okEmail||!okPassword){res.status(401).json({error:'Email atau password admin salah.'});return}
  const payload=JSON.stringify({sub:process.env.ADMIN_EMAIL.trim().toLowerCase(),role:'ADMIN',exp:Date.now()+TTL*1000});
  const token=sign(payload);
  res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`);
  res.status(200).json({authenticated:true,role:'ADMIN'});
}