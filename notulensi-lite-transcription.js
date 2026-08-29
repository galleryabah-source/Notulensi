(() => {
  'use strict';
  const Native=window.SpeechRecognition||window.webkitSpeechRecognition;
  const state={recognition:null,running:false,stopping:false,restartTimer:null,finalText:'',interimText:'',lang:'id-ID',mode:'browser'};
  function emit(name,detail={}){window.dispatchEvent(new CustomEvent(`notulensi:lite:transcription:${name}`,{detail}));}
  async function localAvailable(){
    try{
      if(!Native?.available)return false;
      const result=await Native.available({langs:[state.lang],processLocally:true});
      return result==='available'||result===true;
    }catch{return false}
  }
  async function create(){
    if(!Native)throw new Error('SPEECH_RECOGNITION_UNAVAILABLE');
    const r=new Native();r.lang=state.lang;r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
    if('processLocally' in r){const local=await localAvailable();r.processLocally=local;state.mode=local?'on-device':'browser';}
    r.onstart=()=>{state.running=true;state.stopping=false;emit('state',{status:'listening',mode:state.mode});emit('mode',{mode:state.mode});};
    r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const text=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)state.finalText+=`${text.trim()} `;else interim+=text;}state.interimText=interim.trim();emit('result',{finalText:state.finalText.trim(),interimText:state.interimText,combined:`${state.finalText}${state.interimText}`.trim()});};
    r.onerror=e=>{const recoverable=['no-speech','aborted'].includes(e.error);emit('error',{code:e.error,recoverable,mode:state.mode});if(!recoverable)state.running=false;};
    r.onend=()=>{state.running=false;emit('state',{status:'stopped',mode:state.mode});if(!state.stopping&&!document.hidden){clearTimeout(state.restartTimer);state.restartTimer=setTimeout(()=>{start(true).catch(()=>{})},300);}};
    return r;
  }
  async function start(restart=false){if(!Native)throw new Error('SPEECH_RECOGNITION_UNAVAILABLE');if(state.running)return;if(!restart)state.stopping=false;state.recognition=await create();state.recognition.start();}
  function stop(){state.stopping=true;clearTimeout(state.restartTimer);if(state.recognition&&state.running)state.recognition.stop();else emit('state',{status:'stopped',mode:state.mode});}
  function reset(){stop();state.finalText='';state.interimText='';emit('result',{finalText:'',interimText:'',combined:''});}
  function setLanguage(lang){state.lang=lang||'id-ID';if(state.recognition)state.recognition.lang=state.lang;}
  function support(){return Boolean(Native);}
  window.NotulensiLiteTranscription=Object.freeze({start,stop,reset,setLanguage,support,getState:()=>({running:state.running,finalText:state.finalText,interimText:state.interimText,lang:state.lang,mode:state.mode})});
})();
