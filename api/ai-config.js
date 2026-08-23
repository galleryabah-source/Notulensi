import crypto from 'node:crypto';
import { Pool } from 'pg';
import { requireAdmin } from './_admin-auth.js';

const PROVIDERS = {
  ollama: { name:'Local AI — Ollama', model:'qwen2.5:7b', testUrl:'http://127.0.0.1:11434' },
  gemini: { name:'Google Gemini', model:'gemini-3.6-flash', testUrl:'https://generativelanguage.googleapis.com/v1beta/models' },
  groq: { name:'Groq', model:'llama-3.3-70b-versatile', testUrl:'https://api.groq.com/openai/v1/models' },
  openrouter: { name:'OpenRouter', model:'openrouter/free', testUrl:'https://openrouter.ai/api/v1/models' },
  huggingface: { name:'Hugging Face', model:'meta-llama/Llama-3.1-8B-Instruct', testUrl:'https://api-inference.huggingface.co/models' },
};

export { PROVIDERS };
const poolHolder={pool:null};
export function db(){const connectionString=process.env.DATABASE_URL||process.env.notulensi_POSTGRES_URL||process.env.notulensi_POSTGRES_PRISMA_URL||process.env.notulensi_DATABASE_URL_UNPOOLED;if(!connectionString)throw new Error('DATABASE_URL is not configured.');if(!poolHolder.pool)poolHolder.pool=new Pool({connectionString,max:2,ssl:process.env.DATABASE_SSL==='disable'?false:{rejectUnauthorized:false}});return poolHolder.pool;}
export async function ensureTable(client){await client.query(`CREATE TABLE IF NOT EXISTS notulensi_ai_config (config_key TEXT PRIMARY KEY, config JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);}
const defaults={defaultProvider:'ollama',providers:{ollama:{model:'qwen2.5:7b',baseUrl:'',key:''},gemini:{model:'gemini-3.6-flash',key:''},groq:{model:'llama-3.3-70b-versatile',key:''},openrouter:{model:'openrouter/free',key:''},huggingface:{model:'meta-llama/Llama-3.1-8B-Instruct',key:''}}};
export async function readConfig(client){const r=await client.query('SELECT config FROM notulensi_ai_config WHERE config_key=$1',['default']);const saved=r.rows[0]?.config||{};return {...defaults,...saved,providers:{...defaults.providers,...(saved.providers||{})}};}
export function safeBaseUrl(url){const u=String(url||'').trim();if(!u)return '';try{const parsed=new URL(u);if(!['http:','https:'].includes(parsed.protocol))return '';return parsed.toString().replace(/\/$/,'')}catch{return ''}}
export function envBaseUrl(id){const map={ollama:process.env.LOCAL_AI_BASE_URL};return safeBaseUrl(map[id]||'')}
export function envSecret(id){const map={gemini:process.env.GEMINI_API_KEY,groq:process.env.GROQ_API_KEY,openrouter:process.env.OPENROUTER_API_KEY,huggingface:process.env.HUGGINGFACE_API_KEY};return map[id]||''}
const ENC=process.env.ADMIN_SESSION_SECRET||'';
export function decrypt(value){if(!ENC||!String(value).startsWith('enc:v1:'))return String(value||'');const raw=Buffer.from(String(value).slice(7),'base64');const iv=raw.subarray(0,12),tag=raw.subarray(12,28),data=raw.subarray(28);const key=crypto.createHash('sha256').update(ENC).digest();const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET'&&req.method!=='PUT')return res.status(405).json({error:'Method not allowed'});const session=requireAdmin(req,res);if(!session)return;if(req.method==='GET'){let c;try{c=db().connect();const client=await c;await ensureTable(client);const config=await readConfig(client);client.release();return res.status(200).json({config,providers:PROVIDERS,role:session.role});}catch(e){return res.status(503).json({error:e.message||'AI config unavailable'});}}let client;try{client=await db().connect();await ensureTable(client);const current=await readConfig(client);const incoming=req.body?.config||req.body||{};const next={...current,...incoming,providers:{...current.providers,...(incoming.providers||{})}};await client.query(`INSERT INTO notulensi_ai_config(config_key,config,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(config_key) DO UPDATE SET config=EXCLUDED.config,updated_at=NOW()`,['default',JSON.stringify(next)]);return res.status(200).json({saved:true,config:next,role:session.role});}catch(e){console.error('ai-config',e);return res.status(503).json({error:e.message||'AI config unavailable'});}finally{client?.release();}}
