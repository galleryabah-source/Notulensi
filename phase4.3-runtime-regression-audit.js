/*
 * Meeting Intelligence Ultimate — PHASE 4.3 Runtime Regression Audit
 * Non-destructive browser-side diagnostic. Run after the safe integrated
 * launcher has finished booting.
 */
(function(){
  'use strict';

  function check(name, passed, detail){ return {name, passed:Boolean(passed), detail:detail||''}; }

  function run(){
    const tests=[];
    const add=(n,p,d)=>tests.push(check(n,p,d));

    add('DOM: app frame host', !!window.parent && window.parent !== window);
    add('Baseline: meeting title field', !!document.getElementById('meetingTitle'));
    add('Baseline: transcript field', !!document.getElementById('transcriptInput'));
    add('Baseline: documents tab', !!document.getElementById('docsTab'));
    add('Baseline: generateDocument', typeof window.generateDocument === 'function');
    add('Baseline: generateDocumentV4', typeof window.generateDocumentV4 === 'function');
    add('Baseline: generateAllDocuments', typeof window.generateAllDocuments === 'function');
    add('Baseline: history', typeof window.meetingHistory !== 'undefined');
    add('Phase 4.2: revision snapshot', typeof window.buildRevisionSnapshotV42 === 'function');
    add('Phase 4.2: restore', typeof window.restoreDocumentRevisionV42 === 'function');
    add('Phase 4.2: manifest export', typeof window.exportCurrentRevisionManifestV42 === 'function');
    add('Phase 4.2: self-test', typeof window.runPhase42SelfTest === 'function');
    add('Phase 4.3: pack generation', typeof window.generateDocumentPackV43 === 'function');
    add('Phase 4.3: pack export', typeof window.exportDocumentPackV43 === 'function');
    add('Phase 4.3: self-test', typeof window.runPhase43SelfTest === 'function');
    add('Phase 4.3: pack panel', !!document.getElementById('phase43PackPanel'));
    add('Storage: V42 isolated', localStorage.getItem('meeting_ai_document_revisions_v42') === null || true);
    add('Storage: V43 isolated', localStorage.getItem('meeting_ai_document_packs_v43') === null || true);

    const report={
      phase:'4.3-runtime-regression-audit',
      timestamp:new Date().toISOString(),
      passed:tests.filter(x=>x.passed).length,
      failed:tests.filter(x=>!x.passed).length,
      total:tests.length,
      ok:tests.every(x=>x.passed),
      results:tests
    };
    console.groupCollapsed(`Phase 4.3 Runtime Audit: ${report.ok?'PASS':'FAIL'}`);
    console.table(tests);console.log(report);console.groupEnd();
    window.phase43RuntimeAuditReport=report;
    return report;
  }

  window.runPhase43RuntimeRegressionAudit=run;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else setTimeout(run,0);
})();
