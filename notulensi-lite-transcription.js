(() => {
  'use strict';
  const Native = window.SpeechRecognition || window.webkitSpeechRecognition;
  const state = { recognition:null, running:false, stopping:false, restartTimer:null, finalText:'', interimText:'', lang:'id-ID', mode:'browser' };
  function emit(name, detail={}) { window.dispatchEvent(new CustomEvent(`notulensi:lite:transcription:${name}`, { detail })); }
  async function localAvailable() { try { if (!Native?.available) return false; const result = await Native.available({ langs:[state.lang], processLocally:true }); return result === 'available' || result === true; } catch { return false; } }
  function reset(initial='') {
    clearTimeout(state.restartTimer);
    state.stopping = true;
    if (state.recognition && state.running) { try { state.recognition.abort(); } catch {} }
    state.recognition = null;
    state.running = false;
    state.restartTimer = null;
    state.finalText = String(initial || '').trim();
    state.interimText = '';
    state.mode = 'browser';
    state.stopping = false;
    emit('reset', { text: state.finalText });
  }
  async function create() {
    if (!Native) throw Error('SPEECH_RECOGNITION_UNAVAILABLE');
    const recognition = new Native();
    recognition.lang=state.lang; recognition.continuous=true; recognition.interimResults=true; recognition.maxAlternatives=1;
    if ('processLocally' in recognition) { const local=await localAvailable(); recognition.processLocally=local; state.mode=local?'on-device':'browser'; }
    recognition.onstart=()=>{state.running=true;state.stopping=false;emit('state',{status:'listening',mode:state.mode});};
    recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const text=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)state.finalText+=`${text.trim()} `;else interim+=text;}state.interimText=interim.trim();emit('result',{finalText:state.finalText.trim(),interimText:state.interimText,combined:`${state.finalText}${state.interimText}`.trim()});};
    recognition.onerror=e=>{const recoverable=['no-speech','aborted'].includes(e.error);emit('error',{code:e.error,recoverable,mode:state.mode});if(!recoverable)state.running=false;};
    recognition.onend=()=>{state.running=false;emit('state',{status:'stopped',mode:state.mode});if(!state.stopping&&!document.hidden){clearTimeout(state.restartTimer);state.restartTimer=setTimeout(()=>start(true).catch(()=>{}),350);}};
    return recognition;
  }
  async function start(restart=false) { if(!Native) throw Error('SPEECH_RECOGNITION_UNAVAILABLE'); if(state.running)return; if(!restart)state.stopping=false; state.recognition=await create(); state.recognition.start(); }
  function stop(){state.stopping=true;clearTimeout(state.restartTimer);if(state.recognition&&state.running){try{state.recognition.stop();}catch{}}else emit('state',{status:'stopped',mode:state.mode});}
  function support(){return Boolean(Native);}
  window.NotulensiLiteTranscription=Object.freeze({start,stop,reset,support,getState:()=>({...state,recognition:undefined,restartTimer:undefined})});
})();
