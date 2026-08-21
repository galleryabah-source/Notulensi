/* Phase 5.3 — Personal Data Ownership Policy */
(function (global) {
  'use strict';

  const POLICY = Object.freeze({
    owner: 'authenticated-user',
    defaultVisibility: 'private',
    userData: ['meetings','transcripts','analysis','documents','revisions','packs','actions','decisions'],
    serverMayProcess: true,
    serverMayPublishByDefault: false,
    userMayExport: true,
    userMayDelete: true
  });

  global.phase53DataOwnershipPolicy = POLICY;
})(window);
