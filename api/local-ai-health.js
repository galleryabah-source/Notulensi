import { localHealth } from './_local-ai.js';
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const result=await localHealth();return res.status(result.healthy?200:503).json(result);}
