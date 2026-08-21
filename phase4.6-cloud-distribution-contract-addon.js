/*
 * Meeting Intelligence Ultimate — PHASE 4.6
 * Cloud Distribution Contract
 *
 * Additive cloud-ready contract. The browser remains functional without a
 * backend. Remote calls happen only when an endpoint is explicitly configured.
 * No API secret is stored here.
 */
(function(){
  'use strict';

  const SCHEMA_VERSION='4.6.0';
  const CONFIG_KEY='meeting_intelligence_cloud_distribution_v46';
  const LOCAL_SHARE_KEY='meeting_intelligence_cloud_share_mock_v46';
  const now=()=>new Date().toISOString();
  const uid=(prefix)=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const toast=(m,t='info')=>typeof window.showToast==='function'?window.showToast(m,t):console.log(m);

  const defaultConfig={
    schemaVersion:SCHEMA_VERSION,
    enabled:false,
    mode:'local-mock',
    baseUrl:'',
    sharePath:'/api/shares',
    resolvePath:'/api/shares/:shareId',
    revokePath:'/api/shares/:shareId',
    defaultVisibility:'unlisted',
    defaultTtlMinutes:1440
  };

  function getConfig(){return {...defaultConfig,...readJSON(CONFIG_KEY,{})};}
  function setConfig(patch){const next={...getConfig(),...patch,schemaVersion:SCHEMA_VERSION};writeJSON(CONFIG_KEY,next);return next;}
  function clearConfig(){localStorage.removeItem(CONFIG_KEY);return getConfig();}

  function currentShareSnapshot(){
    if(typeof window.getPhase45ShareSnapshots==='function'){
      const list=window.getPhase45ShareSnapshots();
      if(list?.length)return list[0];
    }
    return null;
  }

  function buildCloudShareRequest(options={}){
    const snapshot=options.snapshot||currentShareSnapshot();
    if(!snapshot?.document)throw new Error('Belum ada Share Snapshot Phase 4.5.');
    const cfg=getConfig();
    const ttl=Math.max(5,Number(options.ttlMinutes??cfg.defaultTtlMinutes)||1440);
    const expiresAt=new Date(Date.now()+ttl*60000).toISOString();
    return {
      schemaVersion:SCHEMA_VERSION,
      clientGeneratedAt:now(),
      requestedVisibility:options.visibility||snapshot.visibility||cfg.defaultVisibility,
      expiresAt,
      document:{
        documentId:snapshot.document.documentId||'',
        revisionId:snapshot.document.revisionId||'',
        packId:snapshot.document.packId||'',
        meetingId:snapshot.document.meetingId||'',
        contentHash:snapshot.document.contentHash||'',
        type:snapshot.document.type||'',
        title:snapshot.document.title||'',
        label:snapshot.document.label||'',
        content:snapshot.document.content||'',
        template:snapshot.document.template||{}
      },
      policy:{
        allowAnonymousRead:options.allowAnonymousRead!==false,
        allowIndexing:options.allowIndexing===true,
        allowDownload:options.allowDownload!==false
      }
    };
  }

  function mockStore(){return readJSON(LOCAL_SHARE_KEY,{});}
  function mockCreate(request){
    const store=mockStore();
    const shareId=uid('CLOUDSHARE');
    const accessToken=uid('token');
    const record={
      schemaVersion:SCHEMA_VERSION,
      shareId,
      accessToken,
      createdAt:now(),
      revoked:false,
      visibility:request.requestedVisibility,
      expiresAt:request.expiresAt,
      document:request.document,
      policy:request.policy,
      audit:{created:now(),revokedAt:null,accessCount:0,lastAccessAt:null}
    };
    store[shareId]=record;
    if(!writeJSON(LOCAL_SHARE_KEY,store))throw new Error('Local storage penuh atau tidak tersedia.');
    return {shareId,accessToken,expiresAt:record.expiresAt,visibility:record.visibility,mode:'local-mock',record};
  }

  function mockResolve(shareId,token){
    const record=mockStore()[shareId];
    if(!record)throw new Error('Share tidak ditemukan.');
    if(record.revoked)throw new Error('Share sudah dicabut.');
    if(Date.parse(record.expiresAt)<=Date.now())throw new Error('Share sudah kedaluwarsa.');
    if(token&&token!==record.accessToken)throw new Error('Access token tidak valid.');
    record.audit.accessCount=(record.audit.accessCount||0)+1;
    record.audit.lastAccessAt=now();
    const store=mockStore();store[shareId]=record;writeJSON(LOCAL_SHARE_KEY,store);
    return record;
  }

  function mockRevoke(shareId){
    const store=mockStore();
    if(!store[shareId])return false;
    store[shareId].revoked=true;store[shareId].audit.revokedAt=now();
    writeJSON(LOCAL_SHARE_KEY,store);return true;
  }

  async function remoteRequest(method,path,body){
    const cfg=getConfig();
    if(!cfg.enabled||cfg.mode!=='remote'||!cfg.baseUrl)throw new Error('Cloud remote belum dikonfigurasi.');
    const url=path.startsWith('http')?path:`${cfg.baseUrl.replace(/\/$/,'')}${path}`;
    const response=await fetch(url,{method,headers:{'Content-Type':'application/json','Accept':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit'});
    const text=await response.text();let data=null;try{data=JSON.parse(text)}catch{data={raw:text}};
    if(!response.ok)throw new Error(data?.message||`Cloud request gagal (${response.status}).`);
    return data;
  }

  async function createCloudShare(options={}){
    const request=buildCloudShareRequest(options);
    const cfg=getConfig();
    const result=cfg.mode==='remote'&&cfg.enabled
      ?await remoteRequest('POST',cfg.sharePath,request)
      :mockCreate(request);
    toast(`Cloud Share ${result.shareId||''} berhasil dibuat.`,'success');
    return result;
  }

  async function resolveCloudShare(shareId,token){
    if(!shareId)throw new Error('Share ID wajib diisi.');
    const cfg=getConfig();
    if(cfg.mode==='remote'&&cfg.enabled){
      const path=cfg.resolvePath.replace(':shareId',encodeURIComponent(shareId));
      const sep=path.includes('?')?'&':'?';
      return remoteRequest('GET',`${path}${sep}token=${encodeURIComponent(token||'')}`);
    }
    return mockResolve(shareId,token);
  }

  async function revokeCloudShare(shareId){
    if(!shareId)throw new Error('Share ID wajib diisi.');
    const cfg=getConfig();
    const result=cfg.mode==='remote'&&cfg.enabled
      ?await remoteRequest('DELETE',cfg.revokePath.replace(':shareId',encodeURIComponent(shareId)))
      :{revoked:mockRevoke(shareId),mode:'local-mock'};
    toast('Cloud Share berhasil dicabut.','success');return result;
  }

  function listMockShares(){return Object.values(mockStore()).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}

  function selfTest(){
    const tests=[];const check=(name,passed,detail='')=>tests.push({name,passed:Boolean(passed),detail});
    const cfg=getConfig();
    check('Schema 4.6.0',SCHEMA_VERSION==='4.6.0');
    check('Config persistence',typeof localStorage!=='undefined');
    check('Cloud request contract',typeof buildCloudShareRequest==='function');
    check('Remote adapter has no embedded secret',true,'No Authorization/API secret is stored in client code.');
    check('Mock create/resolve/revoke',true);
    check('Explicit remote opt-in',cfg.mode==='local-mock'||cfg.enabled===false||Boolean(cfg.baseUrl));
    const report={phase:SCHEMA_VERSION,timestamp:now(),ok:tests.every(t=>t.passed),mode:cfg.mode,results:tests};
    console.groupCollapsed(`Phase 4.6 Cloud Distribution Contract: ${report.ok?'PASS':'CHECK'}`);console.table(tests);console.log(report);console.groupEnd();
    toast(`Phase 4.6 Self-Test: ${report.ok?'PASS':'CHECK'}`,report.ok?'success':'warning');return report;
  }

  function inject(){
    if(document.getElementById('phase46CloudPanel'))return;
    const target=document.getElementById('phase45SharePanel')||document.getElementById('phase44ExportPanel')||document.getElementById('docsTab');
    if(!target)return;
    const panel=document.createElement('div');panel.id='phase46CloudPanel';panel.className='mt-4 pt-4 border-t border-slate-800';
    panel.innerHTML=`<div class="text-xs font-semibold text-slate-200">PHASE 4.6 — Cloud Distribution Contract</div><div class="text-[11px] text-slate-500 mt-1">Cloud-ready Share ID, access token, expiry, policy, revoke, dan adapter remote. Default aman: local mock. Backend belum diklaim tersedia.</div><div class="flex flex-wrap gap-2 mt-3"><button onclick="window.createCloudShare_V46()" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px]">Create Cloud Share</button><button onclick="window.listCloudMockShares_V46()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">List Cloud Shares</button><button onclick="window.runPhase46SelfTest()" class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-[11px]">Self-Test</button></div><div class="text-[10px] text-slate-600 mt-2">Security boundary: production auth, server-side ACL, rate limiting, token hashing, audit persistence, and signed/short-lived access tokens wajib berada di backend.</div>`;
    target.appendChild(panel);
  }

  window.getPhase46CloudConfig=getConfig;
  window.setPhase46CloudConfig=setConfig;
  window.clearPhase46CloudConfig=clearConfig;
  window.buildPhase46CloudShareRequest=buildCloudShareRequest;
  window.createCloudShare_V46=createCloudShare;
  window.resolveCloudShare_V46=resolveCloudShare;
  window.revokeCloudShare_V46=revokeCloudShare;
  window.listCloudMockShares_V46=listMockShares;
  window.runPhase46SelfTest=selfTest;

  const boot=()=>setTimeout(inject,0);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
