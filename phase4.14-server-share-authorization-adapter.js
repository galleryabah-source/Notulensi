/* PHASE 4.14 — Server-Side Share Authorization Adapter
 *
 * Production boundary adapter between the existing share/document domain model and
 * a real backend authorization service. This file is intentionally transport-agnostic:
 * it does not persist secrets, mint client tokens, or make network calls by itself.
 *
 * Migration principle:
 *   existing share domain -> adapter -> server security implementation
 *
 * The adapter is deny-by-default. A production server supplies the implementation
 * functions declared by Phase 4.13. Existing meeting/document/revision structures are
 * treated as opaque domain data and are not rewritten.
 */
(function(global){
  'use strict';

  const VERSION = '4.14.0';
  const REQUIRED = [
    'authenticate',
    'authorizeShare',
    'resolveRecipient',
    'validateToken',
    'rateLimit',
    'audit',
    'revokeAccess',
    'rotateToken'
  ];

  function getContract(){
    return global.getServerSecurityContractV413
      ? global.getServerSecurityContractV413()
      : {
          schemaVersion:'4.13.0',
          transport:'HTTPS',
          authorization:'server-side',
          tokenStorage:'hashed server-side only',
          rateLimit:'server-side',
          audit:'append-only server-side'
        };
  }

  function assertServer(server){
    const missing = REQUIRED.filter(function(name){
      return !server || typeof server[name] !== 'function';
    });
    if(missing.length){
      const error = new Error('Server security implementation incomplete: '+missing.join(', '));
      error.code = 'SECURITY_IMPLEMENTATION_INCOMPLETE';
      error.missing = missing;
      throw error;
    }
    return true;
  }

  function normalizeShareRequest(input){
    const x = input && typeof input === 'object' ? input : {};
    return {
      requestId: String(x.requestId || ''),
      documentId: String(x.documentId || ''),
      revisionId: String(x.revisionId || ''),
      recipientId: String(x.recipientId || ''),
      action: String(x.action || 'view'),
      clientContext: {
        userAgent: String(x.clientContext && x.clientContext.userAgent || ''),
        locale: String(x.clientContext && x.clientContext.locale || '')
      }
    };
  }

  function safeResult(result){
    const r = result && typeof result === 'object' ? result : {};
    return {
      authorized: r.authorized === true,
      reason: String(r.reason || (r.authorized === true ? 'authorized' : 'denied')),
      documentId: String(r.documentId || ''),
      revisionId: String(r.revisionId || ''),
      recipientId: String(r.recipientId || ''),
      expiresAt: r.expiresAt ? String(r.expiresAt) : null
    };
  }

  function createAdapter(server){
    assertServer(server);

    async function authorizeShare(input, context){
      const request = normalizeShareRequest(input);
      if(!request.documentId || !request.recipientId){
        return {authorized:false, reason:'invalid_request', documentId:request.documentId, revisionId:request.revisionId, recipientId:request.recipientId};
      }

      const rate = await server.rateLimit({
        operation:'authorizeShare',
        requestId:request.requestId,
        recipientId:request.recipientId,
        context:context || {}
      });
      if(rate && rate.allowed === false){
        await server.audit({event:'share.authorization.rate_limited', request, result:{authorized:false, reason:'rate_limited'}});
        return {authorized:false, reason:'rate_limited', documentId:request.documentId, revisionId:request.revisionId, recipientId:request.recipientId};
      }

      const recipient = await server.resolveRecipient({
        recipientId:request.recipientId,
        documentId:request.documentId,
        context:context || {}
      });
      if(!recipient || recipient.resolved !== true){
        await server.audit({event:'share.authorization.recipient_not_resolved', request});
        return {authorized:false, reason:'recipient_not_resolved', documentId:request.documentId, revisionId:request.revisionId, recipientId:request.recipientId};
      }

      const result = await server.authorizeShare({
        request,
        recipient,
        context:context || {}
      });
      const normalized = safeResult(result);

      await server.audit({
        event: normalized.authorized ? 'share.authorization.granted' : 'share.authorization.denied',
        request,
        result:normalized
      });
      return normalized;
    }

    async function validatePortalSession(input){
      const x = input && typeof input === 'object' ? input : {};
      if(!x.sessionToken) return {valid:false, reason:'missing_session_token'};
      const result = await server.validateToken({
        token:String(x.sessionToken),
        purpose:'portal_session',
        documentId:String(x.documentId || ''),
        recipientId:String(x.recipientId || '')
      });
      return {
        valid: result && result.valid === true,
        reason: String(result && result.reason || (result && result.valid === true ? 'valid' : 'invalid')),
        recipientId: String(result && result.recipientId || ''),
        documentId: String(result && result.documentId || ''),
        expiresAt: result && result.expiresAt ? String(result.expiresAt) : null
      };
    }

    async function revokeShare(input){
      const x = input && typeof input === 'object' ? input : {};
      const result = await server.revokeAccess({
        documentId:String(x.documentId || ''),
        revisionId:String(x.revisionId || ''),
        recipientId:String(x.recipientId || ''),
        reason:String(x.reason || 'manual_revoke')
      });
      await server.audit({event:'share.authorization.revoked', request:x, result:result || {}});
      return result || {revoked:false};
    }

    async function rotateShareToken(input){
      const x = input && typeof input === 'object' ? input : {};
      return server.rotateToken({
        recipientId:String(x.recipientId || ''),
        documentId:String(x.documentId || ''),
        reason:String(x.reason || 'rotation')
      });
    }

    return Object.freeze({
      version:VERSION,
      contract:getContract(),
      authorizeShare,
      validatePortalSession,
      revokeShare,
      rotateShareToken
    });
  }

  function runSelfTest(){
    const calls=[];
    const fake={
      async authenticate(){calls.push('authenticate');return {authenticated:true};},
      async authorizeShare(){calls.push('authorizeShare');return {authorized:true,reason:'ok'};},
      async resolveRecipient(){calls.push('resolveRecipient');return {resolved:true};},
      async validateToken(){calls.push('validateToken');return {valid:true,recipientId:'r1',documentId:'d1'};},
      async rateLimit(){calls.push('rateLimit');return {allowed:true};},
      async audit(){calls.push('audit');return {ok:true};},
      async revokeAccess(){calls.push('revokeAccess');return {revoked:true};},
      async rotateToken(){calls.push('rotateToken');return {rotated:true};}
    };

    const results=[];
    const check=function(name,passed,detail){results.push({name,passed:Boolean(passed),detail:detail||''});};

    try{
      const adapter=createAdapter(fake);
      check('Adapter factory',Boolean(adapter && adapter.version===VERSION));
      check('Phase 4.13 contract available',Boolean(adapter.contract && adapter.contract.authorization==='server-side'));

      return Promise.resolve()
        .then(function(){return adapter.authorizeShare({requestId:'t1',documentId:'d1',revisionId:'d1:r1',recipientId:'r1',action:'view'});})
        .then(function(auth){
          check('Authorization granted',auth.authorized===true);
          check('Authorization audit executed',calls.indexOf('audit')!==-1);
          return adapter.validatePortalSession({sessionToken:'server-session-placeholder',documentId:'d1',recipientId:'r1'});
        })
        .then(function(session){
          check('Portal session validation',session.valid===true);
          return adapter.revokeShare({documentId:'d1',recipientId:'r1'});
        })
        .then(function(revoked){
          check('Revoke adapter',revoked.revoked===true);
          check('No raw token persistence API',!('storeToken' in adapter));
          return {phase:'4.14',version:VERSION,ok:results.every(function(x){return x.passed;}),results:results,calls:calls};
        });
    }catch(error){
      check('Adapter construction',false,error.message);
      return Promise.resolve({phase:'4.14',version:VERSION,ok:false,results:results,error:error.message,calls:calls});
    }
  }

  global.phase414 = {VERSION:VERSION, createAdapter:createAdapter, selfTest:runSelfTest};
  global.createServerShareAuthorizationAdapterV414 = createAdapter;
  global.runPhase414SelfTest = runSelfTest;
})(window);
