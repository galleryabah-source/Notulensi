/* PHASE 4.15 — Backend Integration Contract
 *
 * Defines the production-facing integration boundary for the Phase 4.14
 * server-share authorization adapter. This module remains transport-agnostic
 * and intentionally does not implement persistence, authentication, or token
 * minting. It provides validation, request/response normalization and a
 * fail-closed integration facade for a real backend implementation.
 *
 * Compatibility principle:
 *   existing meeting/document/revision/share models remain opaque.
 */
(function(global){
  'use strict';

  const VERSION='4.15.0';
  const OPERATIONS=['authorizeShare','validatePortalSession','revokeShare','rotateShareToken'];
  const REQUIRED_SERVER_METHODS=['authenticate','authorizeShare','resolveRecipient','validateToken','rateLimit','audit','revokeAccess','rotateToken'];

  function normalizeString(value){return String(value == null ? '' : value);}

  function normalizeRequest(operation,input){
    const x=input && typeof input==='object'?input:{};
    return {
      schemaVersion:VERSION,
      operation,
      requestId:normalizeString(x.requestId),
      documentId:normalizeString(x.documentId),
      revisionId:normalizeString(x.revisionId),
      recipientId:normalizeString(x.recipientId),
      action:normalizeString(x.action || 'view')
    };
  }

  function validateRequest(request){
    const errors=[];
    if(!request.operation || OPERATIONS.indexOf(request.operation)===-1) errors.push('unsupported_operation');
    if(!request.documentId && request.operation!=='validatePortalSession') errors.push('document_id_required');
    if(request.operation==='authorizeShare' && !request.recipientId) errors.push('recipient_id_required');
    if(request.operation==='validatePortalSession' && !request.recipientId) errors.push('recipient_id_required');
    return {ok:errors.length===0,errors};
  }

  function assertServer(server){
    const missing=REQUIRED_SERVER_METHODS.filter(function(name){return !server || typeof server[name]!=='function';});
    if(missing.length){
      const error=new Error('Backend integration unavailable: '+missing.join(', '));
      error.code='BACKEND_INTEGRATION_INCOMPLETE';
      error.missing=missing;
      throw error;
    }
    return true;
  }

  function safeAuthorization(result,request){
    const r=result&&typeof result==='object'?result:{};
    return {
      authorized:r.authorized===true,
      reason:normalizeString(r.reason || (r.authorized===true?'authorized':'denied')),
      documentId:normalizeString(r.documentId || request.documentId),
      revisionId:normalizeString(r.revisionId || request.revisionId),
      recipientId:normalizeString(r.recipientId || request.recipientId),
      expiresAt:r.expiresAt ? normalizeString(r.expiresAt) : null
    };
  }

  function createBackendIntegration(server){
    assertServer(server);
    const adapter=global.createServerShareAuthorizationAdapterV414
      ? global.createServerShareAuthorizationAdapterV414(server)
      : null;
    if(!adapter){
      const error=new Error('Phase 4.14 adapter is required');
      error.code='PHASE_414_ADAPTER_REQUIRED';
      throw error;
    }

    async function authenticate(context){
      const result=await server.authenticate(context||{});
      return {
        authenticated:result && result.authenticated===true,
        subject:normalizeString(result && result.subject),
        reason:normalizeString(result && result.reason || (result && result.authenticated===true?'authenticated':'unauthenticated'))
      };
    }

    async function authorizeShare(input,context){
      const request=normalizeRequest('authorizeShare',input);
      const validation=validateRequest(request);
      if(!validation.ok) return {authorized:false,reason:'invalid_request',errors:validation.errors,documentId:request.documentId,revisionId:request.revisionId,recipientId:request.recipientId};
      const auth=await authenticate(context);
      if(!auth.authenticated) return {authorized:false,reason:'unauthenticated',documentId:request.documentId,revisionId:request.revisionId,recipientId:request.recipientId};
      return safeAuthorization(await adapter.authorizeShare(request,context||{}),request);
    }

    async function validatePortalSession(input){
      const x=input&&typeof input==='object'?input:{};
      if(!x.sessionToken) return {valid:false,reason:'missing_session_token'};
      return adapter.validatePortalSession({sessionToken:x.sessionToken,documentId:x.documentId,recipientId:x.recipientId});
    }

    async function revokeShare(input,context){
      const request=normalizeRequest('revokeShare',input);
      const auth=await authenticate(context);
      if(!auth.authenticated) return {revoked:false,reason:'unauthenticated'};
      if(!request.documentId || !request.recipientId) return {revoked:false,reason:'invalid_request'};
      return adapter.revokeShare(request);
    }

    async function rotateShareToken(input,context){
      const request=normalizeRequest('rotateShareToken',input);
      const auth=await authenticate(context);
      if(!auth.authenticated) return {rotated:false,reason:'unauthenticated'};
      if(!request.documentId || !request.recipientId) return {rotated:false,reason:'invalid_request'};
      return adapter.rotateShareToken(request);
    }

    return Object.freeze({version:VERSION,operations:OPERATIONS.slice(),authenticate,authorizeShare,validatePortalSession,revokeShare,rotateShareToken});
  }

  async function selfTest(){
    const calls=[];
    const fake={
      async authenticate(){calls.push('authenticate');return {authenticated:true,subject:'test-user'};},
      async authorizeShare(){calls.push('authorizeShare');return {authorized:true,reason:'ok'};},
      async resolveRecipient(){calls.push('resolveRecipient');return {resolved:true};},
      async validateToken(){calls.push('validateToken');return {valid:true,recipientId:'r1',documentId:'d1'};},
      async rateLimit(){calls.push('rateLimit');return {allowed:true};},
      async audit(){calls.push('audit');return {ok:true};},
      async revokeAccess(){calls.push('revokeAccess');return {revoked:true};},
      async rotateToken(){calls.push('rotateToken');return {rotated:true};}
    };
    const results=[];
    const check=function(name,passed){results.push({name,passed:Boolean(passed)});};
    try{
      const integration=createBackendIntegration(fake);
      check('factory',integration.version===VERSION);
      const granted=await integration.authorizeShare({requestId:'p415',documentId:'d1',revisionId:'d1:r1',recipientId:'r1'},{});
      check('authorized',granted.authorized===true);
      const denied=await integration.authorizeShare({requestId:'p415-invalid',documentId:'',recipientId:''},{});
      check('fail closed invalid request',denied.authorized===false && denied.reason==='invalid_request');
      const session=await integration.validatePortalSession({sessionToken:'placeholder',documentId:'d1',recipientId:'r1'});
      check('session validation',session.valid===true);
      const revoked=await integration.revokeShare({documentId:'d1',recipientId:'r1'},{});
      check('revoke',revoked.revoked===true);
      const rotated=await integration.rotateShareToken({documentId:'d1',recipientId:'r1'},{});
      check('rotate',rotated.rotated===true);
      check('no client token persistence',Object.keys(integration).indexOf('storeToken')===-1);
      return {phase:'4.15',version:VERSION,ok:results.every(function(x){return x.passed;}),results,calls};
    }catch(error){return {phase:'4.15',version:VERSION,ok:false,error:error.message,results,calls};}
  }

  global.phase415={VERSION,OPERATIONS,createBackendIntegration,selfTest};
  global.createBackendIntegrationV415=createBackendIntegration;
  global.runPhase415SelfTest=selfTest;
})(window);
