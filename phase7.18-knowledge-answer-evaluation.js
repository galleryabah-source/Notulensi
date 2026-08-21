/* Phase 7.18 — Knowledge Answer Evaluation */
(function (global) {
  'use strict';
  function evaluate(answer){
    answer=answer||{};
    const evidence=Array.isArray(answer.evidence)?answer.evidence:[];
    const citations=Array.isArray(answer.citations)?answer.citations:[];
    const supported=citations.filter(c=>c&&c.knowledgeId&&evidence.some(e=>e&&String(e.knowledgeId)===String(c.knowledgeId))).length;
    const coverage=citations.length?Math.round((supported/citations.length)*100):0;
    const hasAnswer=String(answer.text||'').trim().length>0;
    return {phase:'7.18',passed:hasAnswer&&coverage>=80,answerPresent:hasAnswer,citationCoverage:coverage,supportedCitations:supported,totalCitations:citations.length};
  }
  global.phase718KnowledgeAnswerEvaluation={evaluate};
})(window);
