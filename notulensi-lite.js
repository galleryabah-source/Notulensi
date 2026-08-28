(() => {
  'use strict';
  const store = window.notulensiLiteStorage;
  if (!store) throw new Error('NOTULENSI_LITE_STORAGE_UNAVAILABLE');

  const state = {stream:null,recorder:null,chunks:[],audioBlob:null,audioUrl:null,recording:false,paused:false,startedAt:0,elapsed:0,timer:null,recognition:null,recognizing:false,finalText:'',interimText:'',backend:false,version:0,history:[],sessionId:null};
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function localRead(){const p=store.read();state.history=Array.isArray(p.sessions)?p.sessions:[];}
  function localWrite(){store.write({sessions:state.history.slice(-50),meetings:[],transcripts:[]});renderHistory();}
  async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data.error||`HTTP_${r.status}`),{status:r.status,data});return data;}

  async function hydrateBackend(){try{const s=await api('/api/admin-session.js');if(!s.authenticated)return;const remote=await api('/api/lite-data.js');state.backend=true;state.version=remote.version;}catch{state.backend=false;}}

  function formatTime(ms){const s=Math.max(0,Math.floor(ms/1000));const h=String(Math.floor(s/3600)).padStart(2,'0');const m=String(Math.floor((s%3600)/60)).padStart(2,'0');const sec=String(s%60).padStart(2,'0');return `${h}:${m}:${sec}`;}
  function setStatus(text,live=false){$('statusText').textContent=text;$('statusDot').classList.toggle('live',live);}
  function updateTimer(){state.elapsed=Date.now()-state.startedAt;$('timer').textContent=formatTime(state.elapsed);}
  function startTimer(){clearInterval(state.timer);state.timer=setInterval(updateTimer,250);updateTimer();}
  function stopTimer(){clearInterval(state.timer);state.timer=null;updateTimer();}

  function chooseMime(){const types=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'];return types.find(t=>window.MediaRecorder?.isTypeSupported?.(t))||'';}
  function buildBars(){const root=$('bars');root.innerHTML='';for(let i=0;i<34;i++){const b=document.createElement('span');b.className='bar';root.appendChild(b);}}
  function animateBars(){if(!state.recording){document.querySelectorAll('.bar').forEach(b=>b.style.height='10px');return;}document.querySelectorAll('.bar').forEach(b=>b.style.height=`${8+Math.random()*30}px`);requestAnimationFrame(()=>setTimeout(animateBars,90));}

  function setupRecognition(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('supportNotice').hidden=false;return null;}const r=new SR();r.lang='id-ID';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;r.onstart=()=>{state.recognizing=true;$('saveStatus').textContent='Transkripsi aktif';};r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const text=e.results[i][0]?.transcript||'';if(e.results[i].isFinal){state.finalText+=(state.finalText?' ':'')+text.trim();}else interim+=text;}state.interimText=interim;renderTranscript();};r.onerror=e=>{state.recognizing=false;if(['not-allowed','service-not-allowed'].includes(e.error)){setStatus('Izin mikrofon/transkripsi ditolak');}else if(e.error!=='aborted'){setStatus('Rekam aktif · transkripsi berhenti sementara',true);}};r.onend=()=>{state.recognizing=false;if(state.recording&&!state.paused){try{r.start();}catch{}}};return r;}
  function startRecognition(){if(!state.recognition)state.recognition=setupRecognition();if(!state.recognition)return;try{state.recognition.start();}catch{} }
  function stopRecognition(){if(state.recognition){try{state.recognition.stop();}catch{}}state.recognizing=false;}

  async function startRecording(){if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){alert('Browser ini tidak mendukung perekaman audio web. Gunakan browser modern dengan izin mikrofon.');return;}try{state.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});const mime=chooseMime();state.chunks=[];state.audioBlob=null;state.audioUrl&&URL.revokeObjectURL(state.audioUrl);state.audioUrl=null;state.recorder=new MediaRecorder(state.stream,mime?{mimeType:mime,audioBitsPerSecond:96000}:undefined);state.recorder.ondataavailable=e=>{if(e.data?.size)state.chunks.push(e.data);};state.recorder.onerror=()=>setStatus('Terjadi kesalahan perekaman');state.recorder.onstop=()=>{state.audioBlob=new Blob(state.chunks,{type:state.recorder?.mimeType||'audio/webm'});state.audioUrl=URL.createObjectURL(state.audioBlob);$('downloadBtn').disabled=false;};state.recorder.start(1000);state.recording=true;state.paused=false;state.startedAt=Date.now();startTimer();startRecognition();animateBars();$('recordBtn').classList.add('active');$('recordBtn').textContent='■\nREKAM';$('pauseBtn').disabled=false;$('stopBtn').disabled=false;$('saveBtn').disabled=false;$('placeholder').hidden=true;setStatus('Sedang merekam',true);$('saveStatus').textContent='Merekam';}catch(err){if(state.stream)state.stream.getTracks().forEach(t=>t.stop());state.stream=null;setStatus(err?.name==='NotAllowedError'?'Izin mikrofon diperlukan':'Mikrofon tidak tersedia');}}
  function pauseRecording(){if(!state.recorder||!state.recording)return;if(state.paused){state.recorder.resume();startRecognition();state.paused=false;state.startedAt=Date.now()-state.elapsed;startTimer();setStatus('Sedang merekam',true);$('pauseBtn').textContent='Ⅱ  Jeda';}else{state.recorder.pause();stopRecognition();state.paused=true;stopTimer();state.elapsed=Date.now()-state.startedAt;setStatus('Dijeda');$('pauseBtn').textContent='▶  Lanjut';}}
  function stopRecording(){if(!state.recording)return;state.recording=false;state.paused=false;stopRecognition();stopTimer();try{state.recorder?.stop();}catch{}state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;$('recordBtn').classList.remove('active');$('recordBtn').textContent='●\nREKAM';$('pauseBtn').disabled=true;$('stopBtn').disabled=true;$('downloadBtn').disabled=true;setStatus('Sesi selesai');$('saveStatus').textContent='Siap disimpan';renderTranscript();}

  function renderTranscript(){const final=$('finalText'),interim=$('interim');final.textContent=state.finalText;interim.textContent=state.interimText?` ${state.interimText}`:'';const box=$('transcript');box.scrollTop=box.scrollHeight;}
  function resetSession(){state.finalText='';state.interimText='';state.elapsed=0;state.sessionId=null;$('sessionTitle').value='';$('placeholder').hidden=false;$('finalText').textContent='';$('interim').textContent='';$('saveBtn').disabled=true;$('downloadBtn').disabled=true;$('timer').textContent='00:00:00';}

  async function saveSession(){const title=$('sessionTitle').value.trim()||`Sesi ${new Date().toLocaleString('id-ID')}`;const session={id:state.sessionId||`s_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,title,text:state.finalText.trim(),durationMs:state.elapsed,createdAt:new Date().toISOString()};state.sessionId=session.id;state.history=state.history.filter(x=>x.id!==session.id);state.history.push(session);localWrite();$('saveStatus').textContent=state.backend?'Tersimpan lokal · backend siap':'Tersimpan lokal';if(!state.backend)return;try{const data={meetings:[],transcripts:[...state.history.map(x=>({id:x.id,title:x.title,body:x.text,updatedAt:x.createdAt,durationMs:x.durationMs}))].slice(-200)};const r=await api('/api/lite-data.js',{method:'PUT',headers:{'X-Notulensi-Lite-Request':'1'},body:JSON.stringify({baseVersion:state.version,data})});if(r.conflict){state.version=r.version;return;}state.version=r.version;$('saveStatus').textContent='Tersimpan di server';}catch{$('saveStatus').textContent='Tersimpan lokal';}}

  function downloadAudio(){if(!state.audioBlob)return;const a=document.createElement('a');a.href=state.audioUrl;a.download=`notulensi-lite-${new Date().toISOString().replace(/[:.]/g,'-')}.${state.audioBlob.type.includes('mp4')?'m4a':state.audioBlob.type.includes('ogg')?'ogg':'webm'}`;document.body.appendChild(a);a.click();a.remove();}
  function renderHistory(){const root=$('historyList');if(!state.history.length){root.innerHTML='<div class="historyItem"><small>Belum ada sesi tersimpan.</small></div>';return;}root.innerHTML=state.history.slice().reverse().map(x=>`<article class="historyItem" data-id="${esc(x.id)}"><strong>${esc(x.title)}</strong><small>${new Date(x.createdAt).toLocaleString('id-ID')} · ${formatTime(x.durationMs||0)} · ${(x.text||'').length} karakter</small></article>`).join('');}
  function openHistory(id){const x=state.history.find(s=>s.id===id);if(!x)return;$('sessionTitle').value=x.title;state.finalText=x.text||'';state.elapsed=x.durationMs||0;$('timer').textContent=formatTime(state.elapsed);$('placeholder').hidden=Boolean(state.finalText);renderTranscript();$('saveBtn').disabled=false;setStatus('Sesi tersimpan');}

  $('recordBtn').onclick=()=>state.recording?stopRecording():startRecording();
  $('pauseBtn').onclick=pauseRecording;
  $('stopBtn').onclick=stopRecording;
  $('saveBtn').onclick=saveSession;
  $('downloadBtn').onclick=downloadAudio;
  $('historyList').onclick=e=>{const el=e.target.closest('[data-id]');if(el)openHistory(el.dataset.id);};
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();state.recording?stopRecording():startRecording();}});
  buildBars();localRead();renderHistory();hydrateBackend();
})();
