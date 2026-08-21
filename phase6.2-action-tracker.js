/* Phase 6.2 — Action Tracker
 * In-memory tracker facade. Existing meeting history remains untouched.
 */
(function (global) {
  'use strict';
  function createTracker(seed) {
    let items=Array.isArray(seed)?seed.slice():[];
    return {
      list:function(filter){
        filter=filter||{};
        return items.filter(function(item){
          return (!filter.status||item.status===filter.status) && (!filter.ownerId||String(item.ownerId)===String(filter.ownerId)) && (!filter.meetingId||String(item.meetingId)===String(filter.meetingId));
        }).slice();
      },
      add:function(item){items.push(item);return item;},
      count:function(){return items.length;}
    };
  }
  global.createPhase62ActionTracker=createTracker;
})(window);
