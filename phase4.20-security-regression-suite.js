/* PHASE 4.20 — cross-phase regression harness */
(function (global) {
  'use strict';
  function exists(name) { return typeof global[name] === 'function'; }
  function runOne(name) { try { return global[name](); } catch (error) { return { phase: name, passed: false, error: error && error.message ? error.message : String(error) }; } }

  function runPhase420SelfTest() {
    const previous = {};
    ['recognition', 'isRecording', 'recordingStartTime', 'timerInterval', 'finalTranscriptBuffer', 'meetingHistory', 'currentAnalysisResult', 'startRecording', 'stopRecording'].forEach((key) => { previous[key] = global[key]; });
    const phases = [];
    if (exists('runPhase416SelfTest')) phases.push(runOne('runPhase416SelfTest'));
    if (exists('runPhase417SelfTest')) phases.push(runOne('runPhase417SelfTest'));
    if (exists('runPhase418SelfTest')) phases.push(runOne('runPhase418SelfTest'));
    if (exists('runPhase419SelfTest')) phases.push(runOne('runPhase419SelfTest'));

    const baselineUntouched = ['recognition', 'isRecording', 'recordingStartTime', 'timerInterval', 'finalTranscriptBuffer', 'meetingHistory', 'currentAnalysisResult', 'startRecording', 'stopRecording']
      .every((key) => global[key] === previous[key]);
    const additiveApi = ['createPersistenceAuthorizationV416', 'createPersistenceV417', 'createAuthorizationServiceV418', 'createRateLimiterV419', 'redactSecurityDataV419', 'validateSecurityOriginV419']
      .every((key) => exists(key));
    const checks = { phaseTestsPass: phases.length === 4 && phases.every((r) => r && r.passed === true), baselineUntouched, additiveApi };
    const failed = Object.keys(checks).filter((k) => !checks[k]);
    return { phase: '4.20', passed: failed.length === 0, checks, failed, phases };
  }

  global.runPhase420SelfTest = runPhase420SelfTest;
})(typeof window !== 'undefined' ? window : globalThis);
