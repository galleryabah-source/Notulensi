/* Reliable transcript bridge.
 * Keeps transcription usable when the AI server is healthy but the legacy
 * transcript action is no longer wired to the server runtime.
 */
(function(){
  'use strict';
  const OUTPUT_IDS=['transcript','transcriptText','transcriptContent','transcriptOutput','meetingTranscript','liveTranscript'];
  const INPUT_IDS=['transcriptInput','rawTranscript','transcriptSource','meetingNotes','notes'];
  const BUTTON_RE=/transkrip|transcript/i;
  function first(ids){return ids.map(id=>document.getElementById(id)).find(Boolean)||null;}
  function valueOf(el){return el ? String('value' in el ? el.value : el.textContent || '').trim() : '';}
  function output(text){
    let el=first(OUTPUT_IDS);
    if(!el){
      el=document.createElement('textarea');
      el.id='transcriptOutput'; el.rows=10;
      el.placeholder='Hasil transkripsi akan muncul di sini…';
      el.style.cssText='width:100%;box-sizing:border-box;margin-top:10px;padding:12px;border:1px solid #334155;border-radius:10px;background:#020617;color:#e2e8f0;font:13px/1.6 system-ui,sans-serif;';
      const host=document.querySelector('main')||document.body; host.appendChild(el);
    }
    if('value' in el) el.value=text; else el.textContent=text;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    return el;
  }
  function getSource(){
    const direct=first(INPUT_IDS); if(valueOf(direct)) return valueOf(direct);
    const out=first(OUTPUT_IDS); if(valueOf(out)) return valueOf(out);
    const a=window.currentAnalysisResult||{};
    return String(a.transcript||a.rawTranscript||a.notes||'').trim();
  }
  async function generate(source){
    source=String(source||'').trim();
    if(!source) throw new Error('Belum ada bahan transkripsi. Rekam atau masukkan teks rapat terlebih dahulu.');
    if(!window.meetingAIRequest) throw new Error('AI runtime server belum tersedia.');
    const prompt=`Anda adalah mesin transkripsi rapat untuk aplikasi Notulensi. Rapikan bahan transkripsi berikut menjadi transkrip rapat yang jelas dalam bahasa Indonesia. Pertahankan seluruh fakta, jangan mengarang isi, jangan meringkas, jangan menghapus informasi. Jika pembicara tidak diketahui, gunakan label Pembicara. Pertahankan urutan pembicaraan.\n\nBAHAN TRANSKRIPSI:\n${source}`;
    const result=await window.meetingAIRequest(prompt,window.meetingAIStatus?.provider||'gemini');
    const text=String(result?.text||'').trim();
    if(!text) throw new Error('AI mengembalikan hasil transkripsi kosong.');
    output(text);
    try{window.currentAnalysisResult=window.currentAnalysisResult||{};window.currentAnalysisResult.transcript=text}catch(e){}
    try{window.dispatchEvent(new CustomEvent('meeting-transcript-generated',{detail:{text,provider:result.provider,model:result.model}}))}catch(e){}
    return text;
  }
  window.generateMeetingTranscript=generate;
  window.generateTranscript=generate;
  window.transcribeMeeting=generate;
  function toast(message,type){try{window.showToast(message,type||'info');return}catch(e){}let x=document.getElementById('transcriptionRuntimeStatus');if(!x){x=document.createElement('div');x.id='transcriptionRuntimeStatus';x.style.cssText='position:fixed;left:14px;bottom:14px;z-index:10003;padding:8px 11px;border:1px solid #334155;border-radius:10px;background:#0f172a;color:#cbd5e1;font:600 12px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)';document.body.appendChild(x)}x.textContent=message;setTimeout(()=>x.remove(),4500)}
  function bind(){
    document.querySelectorAll('button').forEach(btn=>{
      if(btn.dataset.transcriptionRuntimeBound==='1')return;
      const label=(btn.textContent||'')+' '+(btn.getAttribute('aria-label')||'');
      if(!BUTTON_RE.test(label))return;
      if(!/generate|buat|mulai|proses|hasilkan|ai/i.test(label))return;
      btn.dataset.transcriptionRuntimeBound='1';
      btn.addEventListener('click',async function(e){
        if(btn.dataset.transcriptionRuntimeHandled==='1')return;
        btn.dataset.transcriptionRuntimeHandled='1';
        const original=btn.textContent;btn.disabled=true;btn.textContent='⏳ Generate transkrip…';
        try{await generate(getSource());toast('✅ Transkrip berhasil digenerate.','success')}
        catch(err){console.error('transcription-runtime',err);toast('❌ '+(err.message||'Gagal generate transkrip.'),'error')}
        finally{btn.disabled=false;btn.textContent=original;delete btn.dataset.transcriptionRuntimeHandled}
      },true);
    });
  }
  function init(){bind();setTimeout(bind,300);setTimeout(bind,1000);setTimeout(bind,2500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  new MutationObserver(()=>{clearTimeout(window.__transcriptionRuntimeTimer);window.__transcriptionRuntimeTimer=setTimeout(bind,100)}).observe(document.documentElement,{childList:true,subtree:true});
})();
