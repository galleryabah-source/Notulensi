/* Phase 5.31 — Conflict Detection */
(function (global) {
  'use strict';
  function detect(localRecord, cloudRecord) {
    if (!localRecord || !cloudRecord) return {phase:'5.31',status:'INSUFFICIENT_DATA',conflict:false};
    const lv=localRecord.version==null?null:Number(localRecord.version);
    const cv=cloudRecord.version==null?null:Number(cloudRecord.version);
    const contentSame=JSON.stringify(localRecord)===JSON.stringify(cloudRecord);
    const conflict=!contentSame && lv!=null && cv!=null && lv!==cv;
    return {phase:'5.31',status:conflict?'CONFLICT_DETECTED':'NO_CONFLICT',conflict,localVersion:lv,cloudVersion:cv};
  }
  global.phase531ConflictDetection={detect};
})(window);
