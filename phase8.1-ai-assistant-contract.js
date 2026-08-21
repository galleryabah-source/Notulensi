/* Phase 8.1 — AI Assistant Contract */
(function (global) {
  'use strict';
  const MODES=['ask','summarize','explain','find','plan'];
  function prepare(input){
    input=input||{};
    if(!input.ownerId||!String(input.message||'').trim())return {phase:'8.1',status:'BLOCKED',reason:'OWNER_AND_MESSAGE_REQUIRED'};
    const mode=MODES.includes(input.mode)?input.mode:'ask';
    return {phase:'8.1',status:'ASSISTANT_REQUEST_READY',ownerId:String(input.ownerId),message:String(input.message).trim(),mode,networkCalled:false};
  }
  global.phase81AIAssistant={MODES,prepare};
})(window);
