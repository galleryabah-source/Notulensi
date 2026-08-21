/* Phase 8.2 — Intent Classification */
(function (global) {
  'use strict';
  const INTENTS=['question','meeting_summary','decision_lookup','action_lookup','person_lookup','topic_lookup','task_planning','general_help'];
  function classify(message){
    const text=String(message||'').trim().toLowerCase();
    if(!text)return {phase:'8.2',status:'BLOCKED',reason:'MESSAGE_REQUIRED'};
    let intent='question';
    if(/ringkas|rangkum|summary|summarize/.test(text))intent='meeting_summary';
    else if(/keputusan|decision/.test(text))intent='decision_lookup';
    else if(/tugas|action item|tindak lanjut|task/.test(text))intent='action_lookup';
    else if(/siapa|person|orang/.test(text))intent='person_lookup';
    else if(/topik|topic|bahas/.test(text))intent='topic_lookup';
    else if(/rencana|plan|planning/.test(text))intent='task_planning';
    return {phase:'8.2',status:'CLASSIFIED',intent,confidence:intent==='question'?0.5:0.8,allowedIntents:INTENTS};
  }
  global.phase82IntentClassification={INTENTS,classify};
})(window);
