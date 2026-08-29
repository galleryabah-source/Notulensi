(() => {
  'use strict';
  const DB_NAME = 'notulensi-lite-v2';
  const STORE = 'recordings';
  const state = { stream: null, recorder: null, chunks: [], startedAt: 0, elapsedBefore: 0, timer: null, id: null };

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function put(key, value) { const db = await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}}); }
  async function get(key) { const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(key);r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>{db.close();reject(r.error)}}); }
  async function remove(key) { const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}}); }
  function formatMs(ms){const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  function mime(){return ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(x=>window.MediaRecorder?.isTypeSupported?.(x))||'';}
  function emit(name, detail={}){window.dispatchEvent(new CustomEvent(`notulensi:lite:${name}`,{detail}));}
  function tick(){const elapsed=state.elapsedBefore+(state.startedAt?Date.now()-state.startedAt:0);emit('timer',{elapsed,display:formatMs(elapsed)});}
  async function start(){
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('MICROPHONE_API_UNAVAILABLE');
    if(!window.MediaRecorder) throw new Error('MEDIA_RECORDER_UNAVAILABLE');
    state.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    const type=mime(); state.chunks=[]; state.id=`rec_${Date.now()}_${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;
    state.recorder=new MediaRecorder(state.stream,type?{mimeType:type}:undefined);
    state.recorder.ondataavailable=e=>{if(e.data?.size)state.chunks.push(e.data)};
    state.recorder.onerror=e=>emit('error',{error:e.error||new Error('RECORDER_ERROR')});
    state.recorder.onstart=()=>{state.startedAt=Date.now();state.timer=setInterval(tick,250);emit('state',{status:'recording',id:state.id});tick();};
    state.recorder.onpause=()=>{state.elapsedBefore+=Date.now()-state.startedAt;state.startedAt=0;emit('state',{status:'paused',id:state.id});tick();};
    state.recorder.onresume=()=>{state.startedAt=Date.now();emit('state',{status:'recording',id:state.id});};
    state.recorder.onstop=async()=>{
      if(state.startedAt)state.elapsedBefore+=Date.now()-state.startedAt; state.startedAt=0; if(state.timer)clearInterval(state.timer); state.timer=null;
      const blob=new Blob(state.chunks,{type:state.recorder.mimeType||type||'audio/webm'});
      const meta={id:state.id,mimeType:blob.type,size:blob.size,durationMs:state.elapsedBefore,createdAt:new Date().toISOString(),blob};
      await put(state.id,meta); state.stream?.getTracks().forEach(t=>t.stop()); state.stream=null; state.recorder=null; state.chunks=[]; emit('stopped',meta); tick();
    };
    state.recorder.start(1000);
  }
  function pause(){if(state.recorder?.state==='recording')state.recorder.pause();}
  function resume(){if(state.recorder?.state==='paused')state.recorder.resume();}
  function stop(){if(state.recorder&&state.recorder.state!=='inactive')state.recorder.stop();}
  async function getRecording(id){return get(id);}
  async function removeRecording(id){return remove(id);}
  function download(recording){if(!recording?.blob)throw new Error('RECORDING_NOT_FOUND');const url=URL.createObjectURL(recording.blob);const a=document.createElement('a');a.href=url;a.download=`notulensi-${recording.id}.${recording.mimeType.includes('mp4')?'mp4':'webm'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  window.NotulensiLiteRecorder=Object.freeze({start,pause,resume,stop,getRecording,removeRecording,download,formatMs});
})();
