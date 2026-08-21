/* PHASE 4.13 — Server Security Contract
 * Documentation/enforcement boundary for migration from client-side prototype to server authorization.
 * This module does not expose or migrate secrets; it defines the contract the server must implement.
 */
(function(global){'use strict';
const VERSION='4.13.0';
const REQUIRED=['authenticate','authorizeShare','resolveRecipient','validateToken','rateLimit','audit','revokeAccess','rotateToken'];
const FORBIDDEN_CLIENT=['apiKey','providerSecret','rawAccessTokenPersistence'];
function contract(){return{schemaVersion:VERSION,transport:'HTTPS',authorization:'server-side',tokenStorage:'hashed server-side only',rateLimit:'server-side',audit:'append-only server-side',clientResponsibilities:['request portal session','render authorized documents','record UX events'],serverResponsibilities:REQUIRED,clientForbidden:FORBIDDEN_CLIENT}}
function validateImplementation(server){const missing=REQUIRED.filter(k=>!server||typeof server[k]!=='function');return{ok:missing.length===0,missing,contract:contract()}}
function assertNoSecretLeak(obj){const found=[];const text=JSON.stringify(obj||{});FORBIDDEN_CLIENT.forEach(k=>{if(text.includes('"'+k+'"'))found.push(k)});return{ok:found.length===0,found}}
function selfTest(){const c=contract(),v=validateImplementation({authenticate(){},authorizeShare(){},resolveRecipient(){},validateToken(){},rateLimit(){},audit(){},revokeAccess(){},rotateToken(){}});return{phase:'4.13',ok:v.ok&&assertNoSecretLeak({client:'portal'}).ok,checks:['security contract','required server methods','client secret boundary']}}
global.phase413={VERSION,contract,validateImplementation,assertNoSecretLeak,selfTest};global.getServerSecurityContractV413=contract;global.validateServerSecurityImplementationV413=validateImplementation;global.assertClientSecretBoundaryV413=assertNoSecretLeak;global.runPhase413SelfTest=selfTest;
})(window);
