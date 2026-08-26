(() => {
  'use strict';

  // Lite is deliberately isolated from every AI endpoint.
  // Persistence adapter is intentionally a boundary until the existing database audit
  // permits a durable meeting/transcript schema. No migration is performed here.
  const KEY = 'notulensi-lite-v1-draft';
  const state = { meetings: [], transcripts: [], editing: null };

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
      state.meetings = Array.isArray(parsed.meetings) ? parsed.meetings : [];
      state.transcripts = Array.isArray(parsed.transcripts) ? parsed.transcripts : [];
    } catch (_) { state.meetings = []; state.transcripts = []; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify({ meetings: state.meetings, transcripts: state.transcripts })); render(); }
  function id(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function show(view) {
    document.querySelectorAll('.view').forEach(x => x.classList.add('hidden'));
    const target = document.getElementById(view); if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  }
  function render() {
    document.getElementById('meetingCount').textContent = state.meetings.length;
    document.getElementById('transcriptCount').textContent = state.transcripts.length;
    const ml = document.getElementById('meetingList');
    ml.innerHTML = state.meetings.length ? state.meetings.map(m => `<article class="item" data-meeting="${m.id}"><span class="badge">Rekap</span><strong> ${esc(m.title || 'Tanpa judul')}</strong><div class="muted">${esc(m.date || '')}</div><div>${esc(m.summary || m.agenda || '').slice(0,180)}</div></article>`).join('') : '<div class="empty">Belum ada rekap.</div>';
    const tl = document.getElementById('transcriptList');
    tl.innerHTML = state.transcripts.length ? state.transcripts.map(t => `<article class="item" data-transcript="${t.id}"><span class="badge">Transkrip</span><strong> ${esc(t.title || 'Tanpa judul')}</strong><div>${esc(t.body || '').slice(0,220)}</div></article>`).join('') : '<div class="empty">Belum ada transkrip.</div>';
  }
  function clearMeetingForm(){['mTitle','mDate','mParticipants','mAgenda','mSummary'].forEach(id=>document.getElementById(id).value='');}
  function clearTranscriptForm(){['tTitle','tBody'].forEach(id=>document.getElementById(id).value='');}

  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
  document.getElementById('newMeeting').onclick = () => { state.editing={type:'meeting'}; clearMeetingForm(); document.getElementById('meetingEditor').classList.remove('hidden'); show('meetings'); };
  document.getElementById('cancelMeeting').onclick = () => document.getElementById('meetingEditor').classList.add('hidden');
  document.getElementById('saveMeeting').onclick = () => {
    const m={id:id('m'),title:document.getElementById('mTitle').value.trim(),date:document.getElementById('mDate').value,participants:document.getElementById('mParticipants').value.trim(),agenda:document.getElementById('mAgenda').value.trim(),summary:document.getElementById('mSummary').value.trim(),updatedAt:new Date().toISOString()};
    if(!m.title){alert('Judul rapat wajib diisi.');return;} state.meetings.unshift(m); save(); document.getElementById('meetingEditor').classList.add('hidden');
  };
  document.getElementById('newTranscript').onclick = () => { state.editing={type:'transcript'}; clearTranscriptForm(); document.getElementById('transcriptEditor').classList.remove('hidden'); show('transcripts'); };
  document.getElementById('cancelTranscript').onclick = () => document.getElementById('transcriptEditor').classList.add('hidden');
  document.getElementById('saveTranscript').onclick = () => {
    const t={id:id('t'),title:document.getElementById('tTitle').value.trim(),body:document.getElementById('tBody').value.trim(),updatedAt:new Date().toISOString()};
    if(!t.title || !t.body){alert('Judul dan isi transkrip wajib diisi.');return;} state.transcripts.unshift(t); save(); document.getElementById('transcriptEditor').classList.add('hidden');
  };
  document.getElementById('searchBox').addEventListener('input', e => {
    const q=e.target.value.trim().toLowerCase(); const out=document.getElementById('searchResults');
    if(!q){out.textContent='Masukkan kata kunci untuk mencari.';return;}
    const rows=[...state.meetings.map(x=>({type:'Rekap',title:x.title,text:[x.participants,x.agenda,x.summary].join(' ')})),...state.transcripts.map(x=>({type:'Transkrip',title:x.title,text:x.body}))].filter(x=>(x.title+' '+x.text).toLowerCase().includes(q));
    out.innerHTML=rows.length?rows.map(x=>`<div class="item"><span class="badge">${x.type}</span><strong> ${esc(x.title)}</strong><div>${esc(x.text).slice(0,260)}</div></div>`).join(''):'Tidak ditemukan.';
  });
  document.getElementById('meetingList').addEventListener('click', e => { const el=e.target.closest('[data-meeting]'); if(el){ const m=state.meetings.find(x=>x.id===el.dataset.meeting); if(m) alert(`${m.title}\n\nPeserta: ${m.participants||'-'}\n\nAgenda:\n${m.agenda||'-'}\n\nKesimpulan:\n${m.summary||'-'}`); } });
  document.getElementById('transcriptList').addEventListener('click', e => { const el=e.target.closest('[data-transcript]'); if(el){ const t=state.transcripts.find(x=>x.id===el.dataset.transcript); if(t) alert(`${t.title}\n\n${t.body}`); } });

  load(); render();
})();
