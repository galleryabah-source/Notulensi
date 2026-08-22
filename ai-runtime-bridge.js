(function(){
  'use strict';
  const OFFLINE_TEXT='Server AI belum dikonfigurasi';
  async function getState(){try{const r=await fetch('./api/ai-runtime',{credentials:'include',cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'AI runtime unavailable');return {online:Boolean(d.healthy),provider:d.provider||null,model:d.model||null,healthy:d.healthy?[d.provider]:[],config:{}}}catch(e){return {online:false,provider:null,model:null,healthy:[],config:{},error:e.message}}}
  async function request(prompt,provider){const r=await fetch('./api/ai-runtime',{method:'POST',headers:{'content-type':'application/json'},credentials:'include',body:JSON.stringify({prompt,provider})});const d=await r.json();if(!r.ok)throw new Error(d.error||'AI request failed');return d}
  function removeKnowledgeBaseUI(){const section=document.getElementById('knowledgeBaseSection');if(section)section.remove()}
  function applyBadge(el,s){if(!el)return;const text=s.online?'AI Online · '+s.provider:'AI Offline · '+OFFLINE_TEXT;el.textContent=text;el.className=s.online?'px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'px-3 py-1 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20';el.setAttribute('data-ai-runtime-status',s.online?'online':'offline')}
  function syncDashboard(s){const badge=document.getElementById('apiStatusBadge');applyBadge(badge,s);document.querySelectorAll('[data-ai-status]').forEach(el=>{el.textContent=s.online?'AI Online · '+s.provider:'AI Offline · '+OFFLINE_TEXT;el.style.color=s.online?'#86efac':'#fbbf24'});window.meetingAIStatus=s}
  async function render(){removeKnowledgeBaseUI();const s=await getState();let el=document.getElementById('aiRuntimeStatus');if(!el){el=document.createElement('div');el.id='aiRuntimeStatus';el.style.cssText='position:fixed;right:14px;bottom:14px;z-index:10002;padding:8px 11px;border:1px solid #334155;border-radius:10px;background:#0f172a;color:#cbd5e1;font:600 12px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)';document.body.appendChild(el)}el.textContent=s.online?'AI Online · '+s.provider+' · '+s.model:'AI Offline · '+OFFLINE_TEXT;el.style.color=s.online?'#86efac':'#fbbf24';syncDashboard(s);try{window.dispatchEvent(new CustomEvent('meeting-ai-status',{detail:s}))}catch(e){}}
  window.meetingAIRequest=request;
  window.addEventListener('ai-settings-updated',render);
  window.addEventListener('message',e=>{if(e.data&&e.data.type==='meeting-ai-settings-updated')render()});
  render();
})();
