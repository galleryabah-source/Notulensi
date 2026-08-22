/* Phase 7.19 — Hallucination / Evidence Guard */
(function (global) {
  'use strict';
  function guard(answer){
    answer=answer||{};
    const text=String(answer.text||'').trim();
    const evidence=Array.isArray(answer.evidence)?answer.evidence:[];
    const citations=Array.isArray(answer.citations)?answer.citations:[];
    if(!text)return {phase:'7.19',status:'BLOCKED',reason:'ANSWER_REQUIRED'};
    if(!evidence.length)return {phase:'7.19',status:'BLOCKED',reason:'NO_EVIDENCE'};
    const valid=citations.filter(c=>c&&evidence.some(e=>e&&String(e.knowledgeId)===String(c.knowledgeId)));
    const unsupported=Math.max(0,citations.length-valid.length);
    return {phase:'7.19',status:unsupported===0?'PASS':'REVIEW_REQUIRED',unsupportedCitations:unsupported,evidenceCount:evidence.length};
  }
  global.phase719EvidenceGuard={guard};
})(window);
