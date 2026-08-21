/*
 * PHASE 4.6.3 — Governance Runtime Validation Harness
 *
 * Non-destructive browser-side validation. This file does not mutate meeting
 * history, transcript, analysis, revision, pack, or knowledge-graph state.
 * It validates the governance APIs already exposed by Phase 4.6.1/4.6.2.
 */
(function () {
  'use strict';

  const RESULTS = [];

  function record(name, pass, detail) {
    RESULTS.push({ name, pass: !!pass, detail: detail || '' });
    return !!pass;
  }

  function fn(name) {
    return typeof window[name] === 'function' ? window[name] : null;
  }

  function run() {
    RESULTS.length = 0;

    const required = [
      'validateGovernanceMutationV461',
      'preflightGovernanceMutationV462',
      'runPhase462RegressionSelfTest'
    ];

    required.forEach(function (name) {
      record(
        'API available: ' + name,
        !!fn(name),
        fn(name) ? 'available' : 'missing'
      );
    });

    const selfTest = fn('runPhase462RegressionSelfTest');
    if (selfTest) {
      try {
        const value = selfTest();
        record(
          'Phase 4.6.2 self-test executes',
          value === true || (value && value.pass !== false),
          typeof value === 'object' ? JSON.stringify(value) : String(value)
        );
      } catch (error) {
        record('Phase 4.6.2 self-test executes', false, error.message);
      }
    }

    const validator = fn('validateGovernanceMutationV461');
    if (validator) {
      const cases = [
        ['DRAFT', 'REVIEW', true],
        ['REVIEW', 'APPROVED', true],
        ['REVIEW', 'DRAFT', true],
        ['APPROVED', 'ARCHIVED', true],
        ['DRAFT', 'APPROVED', false],
        ['ARCHIVED', 'DRAFT', false],
        ['APPROVED', 'DRAFT', false]
      ];

      cases.forEach(function (testCase) {
        const from = testCase[0];
        const to = testCase[1];
        const expected = testCase[2];
        try {
          const result = validator({ currentStatus: from, targetStatus: to });
          const allowed = result === true || (result && result.allowed === true);
          record(
            'Transition ' + from + ' → ' + to,
            allowed === expected,
            'expected=' + expected + ', actual=' + allowed
          );
        } catch (error) {
          record(
            'Transition ' + from + ' → ' + to,
            false,
            error.message
          );
        }
      });
    }

    const summary = {
      phase: '4.6.3',
      purpose: 'governance-runtime-validation',
      pass: RESULTS.every(function (item) { return item.pass; }),
      executedAt: new Date().toISOString(),
      results: RESULTS.slice()
    };

    window.phase463RuntimeValidationResult = summary;
    console.table(RESULTS);
    console.info('[Phase 4.6.3] Runtime validation result:', summary);
    return summary;
  }

  window.runPhase463RuntimeValidation = run;
})();
