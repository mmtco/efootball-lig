// =====================================================
// eFootball Lig - Ana Uygulama
// =====================================================

(function(){
'use strict';

// State
let currentUser = null;
let allProfiles = [];
let allMatches = [];
let leagueData = null;
let cupData = null;
let cupMatches = [];
let currentMatchId = null;
let fixtureFilter = 'all';

// =====================================================
// HELPERS
// =====================================================
function $(id){ return document.getElementById(id); }
function initials(n){ return (n||'??').slice(0,2).toUpperCase(); }
function findProfile(id){ return allProfiles.find(p => p.id === id); }
function isAdmin(){ return currentUser && currentUser.is_admin; }

function toast(msg, cls){
  cls = cls || 'ok';
  const t = $('toast');
  t.className = 'toast ' + cls;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove('show'), 2800);
}

function setLoading(show){
  $('loadingScreen').style.display = show ? 'flex' : 'none';
}

function hideAll(){
  $('authScreen').style.display = 'none';
  $('mainApp').style.display = 'none';
  $('navbar').style.display = 'none';
  $('pendingScreen').style.display = 'none';
  $('verifyScreen').style.display = 'none';
}

// =====================================================
// AUTH FLOW
// =====================================================
async function bootApp(){
  setLoading(true);
  try {
    const session = await Auth.getSession();
    if(!session){
      hideAll();
      $('authScreen').style.display = 'flex';
      setLoading(false);
      return;
    }
    
    currentUser = await Auth.getCurrentUser();
    if(!currentUser){
      // Profile yok, oluştur
      hideAll();
      $('authScreen').style.display = 'flex';
      setLoading(false);
      toast('Profil bulunamadı, tekrar giriş yap','warn');
      await Auth.signOut();
      return;
    }

    if(!currentUser.is_approved){
      hideAll();
      $('pendingScreen').style.display = 'flex';
      setLoading(false);
      return;
    }

    await loadAllData();
    hideAll();
    $('mainApp').style.display = 'block';
    $('navbar').style.display = 'block';
    renderUser();
    renderAll();
    showPage('standings');
    setLoading(false);
  } catch(err){
    console.error(err);
    toast('Hata: ' + err.message, 'bad');
    setLoading(false);
  }
}

async function loadAllData(){
  const [profiles, matches, league, cup] = await Promise.all([
    Profiles.listApproved(),
    Matches.listAll(),
    League.get(),
    Cup.getActive()
  ]);
  allProfiles = profiles;
  allMatches = matches;
  leagueData = league;
  cupData = cup;
  if(cup){
    cupMatches = await Cup.getMatches(cup.id);
  } else {
    cupMatches = [];
  }
}

// =====================================================
// SIGN UP / LOGIN
// =====================================================
async function handleSignup(){
  const name = $('signupName').value.trim();
  const email = $('signupEmail').value.trim().toLowerCase();
  const pass = $('signupPass').value;
  
  if(!name){ toast('İsim gir','warn'); return; }
  if(!email || !email.includes('@')){ toast('Geçerli email gir','warn'); return; }
  if(pass.length < 6){ toast('Şifre en az 6 karakter','warn'); return; }
  
  setLoading(true);
  try {
    await Auth.signUp(email, pass, name);
    setLoading(false);
    hideAll();
    $('verifyScreen').style.display = 'flex';
  } catch(err){
    setLoading(false);
    toast('Kayıt hatası: ' + err.message, 'bad');
  }
}

async function handleLogin(){
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass = $('loginPass').value;
  if(!email || !pass){ toast('Email ve şifre gir','warn'); return; }
  
  setLoading(true);
  try {
    await Auth.signIn(email, pass);
    await bootApp();
  } catch(err){
    setLoading(false);
    if(err.message.includes('Email not confirmed')){
      toast('Önce email adresini doğrula','warn');
    } else {
      toast('Giriş hatası: ' + err.message, 'bad');
    }
  }
}

async function handleLogout(){
  await Auth.signOut();
  currentUser = null;
  location.reload();
}

// =====================================================
// CALCULATIONS (lokal)
// =====================================================
function calcStandings(){
  const tbl = allProfiles
    .filter(p => !p.is_admin)
    .map(p => ({
      id: p.id, name: p.display_name,
      o:0,g:0,b:0,m:0,ag:0,yg:0,av:0,p:0
    }));
  const map = {}; tbl.forEach(r => map[r.id] = r);
  
  allMatches.filter(f => f.status === 'played').forEach(f => {
    const h = map[f.home_id], a = map[f.away_id];
    if(!h || !a) return;
    h.o++; a.o++;
    h.ag += f.home_score; h.yg += f.away_score;
    a.ag += f.away_score; a.yg += f.home_score;
    if(f.home_score > f.away_score){ h.g++; a.m++; h.p+=3; }
    else if(f.home_score < f.away_score){ a.g++; h.m++; a.p+=3; }
    else { h.b++; a.b++; h.p++; a.p++; }
  });
  
  tbl.forEach(r => r.av = r.ag - r.yg);
  tbl.sort((a,b) => b.p-a.p || b.av-a.av || b.ag-a.ag || a.name.localeCompare(b.name));
  return tbl;
}

function generateFixtureRounds(format){
  const ps = allProfiles.filter(p => !p.is_admin);
  if(ps.length < 2) return [];
  
  const isOdd = ps.length % 2 === 1;
  if(isOdd) ps.push({id:'__BYE__', display_name:'BYE'});
  
  const n = ps.length, rounds = n - 1, half = n / 2;
  const arr = ps.slice(1);
  const fixtures = [];
  
  for(let r = 0; r < rounds; r++){
    for(let i = 0; i < half; i++){
      let home, away;
      if(i === 0){
        home = ps[0];
        away = arr[(arr.length - 1 - r % arr.length + arr.length) % arr.length];
      } else {
        const a = (r + i) % arr.length;
        const b = (r + arr.length - i) % arr.length;
        home = arr[a]; away = arr[b];
      }
      if(r % 2 === 1){ const t = home; home = away; away = t; }
      if(home.id === '__BYE__' || away.id === '__BYE__') continue;
      fixtures.push({
        round: r + 1,
        home_id: home.id, away_id: away.id,
        status: 'open', season: leagueData.season || 1
      });
    }
  }
  
  if(format === 'double'){
    const second = fixtures.map(f => ({
      round: f.round + rounds,
      home_id: f.away_id, away_id: f.home_id,
      status: 'open', season: leagueData.season || 1
    }));
    return fixtures.concat(second);
  }
  return fixtures;
}

// =====================================================
// RENDER
// =====================================================
function renderUser(){
  $('meName').textContent = currentUser.display_name;
  $('meAv').textContent = initials(currentUser.display_name);
  $('meAdmin').style.display = currentUser.is_admin ? 'inline-block' : 'none';
  $('tabAdmin').style.display = currentUser.is_admin ? 'block' : 'none';
  $('navAdmin').style.display = currentUser.is_admin ? 'flex' : 'none';
  $('heroLeague').textContent = (leagueData.name || 'Lig').toUpperCase();
  $('heroSub').textContent = `Sezon ${leagueData.season || 1} · ${allProfiles.filter(p => !p.is_admin).length} oyuncu`;
}

function renderAll(){
  renderStandings();
  renderMyMatches();
  renderFixtures();
  renderCup();
  renderScorers();
  if(isAdmin()) renderAdmin();
}

function renderStandings(){
  const standings = calcStandings();
  let myRank = -1;
  for(let i=0;i<standings.length;i++) if(standings[i].id===currentUser.id){ myRank=i+1; break; }
  const myRow = standings.find(s => s.id === currentUser.id);
  $('hStanding').textContent = myRank > 0 ? '#'+myRank : '—';
  $('hPoints').textContent = myRow ? myRow.p : '0';
  
  const pendingForMe = allMatches.filter(f => {
    if(f.home_id !== currentUser.id && f.away_id !== currentUser.id) return false;
    return f.status === 'pending' && f.proposed_by && f.proposed_by !== currentUser.id;
  }).length;
  $('hPending').textContent = pendingForMe;
  
  if(allMatches.length === 0){
    $('standingsContainer').innerHTML = '<div class="empty-msg">Henüz fikstür yok.<br/><br/>' +
      (isAdmin() ? '<button class="btn primary" id="goAdminBtn" style="padding:8px 16px">Yönetim → Fikstür Oluştur</button>' : '<small>Yönetici fikstürü oluşturduğunda burada görünecek.</small>') +
      '</div>';
    const b = $('goAdminBtn');
    if(b) b.onclick = () => showPage('admin');
    return;
  }
  
  const total = allProfiles.length;
  let html = '<div class="table-wrap"><div class="table-head"><div>#</div><div>Oyuncu</div><div>O</div><div>G</div><div>A</div><div>P</div></div>';
  standings.forEach((s, idx) => {
    const rank = idx + 1;
    let cls = '';
    if(rank === 1) cls = 'top';
    else if(rank <= Math.ceil(total * 0.25)) cls = 'zone-c';
    else if(total >= 8 && rank >= total - Math.floor(total * 0.15) + 1) cls = 'zone-r';
    const meCls = s.id === currentUser.id ? 'me' : '';
    html += `<div class="row ${meCls}">
      <div class="rank ${cls}">${rank}</div>
      <div class="player"><div class="avatar">${initials(s.name)}</div><div class="pname">${s.name}</div></div>
      <div class="num">${s.o}</div><div class="num">${s.g}</div>
      <div class="num">${s.av>0?'+'+s.av:s.av}</div>
      <div class="pts">${s.p}</div></div>`;
  });
  html += '</div>';
  $('standingsContainer').innerHTML = html;
}

function renderMyMatches(){
  const mine = allMatches.filter(f => f.home_id === currentUser.id || f.away_id === currentUser.id);
  $('myMatchCount').textContent = mine.length > 0 ? mine.length + ' maç' : '—';
  const upcoming = mine.filter(f => f.status !== 'played').slice(0, 5);
  const recent = mine.filter(f => f.status === 'played').slice(-3).reverse();
  const list = [...upcoming, ...recent];
  if(list.length === 0){
    $('myMatches').innerHTML = '<div class="empty-msg">Henüz maçın yok.</div>';
    return;
  }
  $('myMatches').innerHTML = list.map(matchCard).join('');
}

function renderFixtures(){
  if(allMatches.length === 0){
    $('fixtureList').innerHTML = '<div class="empty-msg">Henüz fikstür yok.</div>';
    return;
  }
  let list = allMatches.slice();
  if(fixtureFilter === 'pending') list = list.filter(f => f.status !== 'played');
  if(fixtureFilter === 'played') list = list.filter(f => f.status === 'played');
  list.sort((a,b) => (a.round || 0) - (b.round || 0) || new Date(a.created_at || 0) - new Date(b.created_at || 0));
  $('fixtureList').innerHTML = list.map(matchCard).join('');
  $('filterAllBtn').classList.toggle('primary', fixtureFilter==='all');
  $('filterPendingBtn').classList.toggle('primary', fixtureFilter==='pending');
  $('filterPlayedBtn').classList.toggle('primary', fixtureFilter==='played');
}

function matchCard(f){
  const home = findProfile(f.home_id), away = findProfile(f.away_id);
  if(!home || !away) return '';
  let scoreHTML, metaHTML;
  const meIn = (f.home_id === currentUser.id || f.away_id === currentUser.id);
  
  if(f.status === 'played'){
    scoreHTML = `<div class="score">${f.home_score}–${f.away_score}</div>`;
    metaHTML = `<div><span class="pill ok">✓ Tamamlandı</span></div>
      <button class="share-btn" onclick="event.stopPropagation();window.shareMatch('${f.id}')">📤</button>`;
  } else if(f.status === 'pending'){
    scoreHTML = `<div class="score">${f.proposed_home}–${f.proposed_away}</div>`;
    const pName = findProfile(f.proposed_by)?.display_name || '?';
    const youConfirm = meIn && f.proposed_by !== currentUser.id;
    metaHTML = youConfirm
      ? `<div>${pName} skor önerdi</div><span class="pill new">Onayla / İtiraz</span>`
      : `<div>${pName} önerdi</div><span class="pill wait">⏳ Onay bekliyor</span>`;
  } else if(f.status === 'disputed'){
    scoreHTML = `<div class="score" style="border-color:var(--bad);color:var(--bad)">!</div>`;
    metaHTML = `<div>İhtilaflı</div><span class="pill bad">Yöneticide</span>`;
  } else {
    scoreHTML = `<div class="score empty">– : –</div>`;
    metaHTML = `<div></div><span class="pill wait">Oynanmadı</span>`;
  }
  
  const clickable = (meIn && f.status!=='played' && f.status!=='disputed') || isAdmin();
  return `<div class="match ${f.status}" data-id="${f.id}" ${clickable?'data-clickable="1"':''}>
    <div class="side"><div class="avatar">${initials(home.display_name)}</div><div class="pname">${home.display_name}</div></div>
    ${scoreHTML}
    <div class="side away"><div class="avatar">${initials(away.display_name)}</div><div class="pname">${away.display_name}</div></div>
    <div class="match-meta">${metaHTML}</div></div>`;
}

function renderScorers(){
  // Şimdilik sadece atılan goller (gol kralı detayı v2'de)
  const map = {};
  allProfiles.filter(p => !p.is_admin).forEach(p => { map[p.id] = {id:p.id, name:p.display_name, goals:0, matches:0}; });
  allMatches.filter(f => f.status === 'played').forEach(f => {
    if(map[f.home_id]){ map[f.home_id].goals += f.home_score; map[f.home_id].matches++; }
    if(map[f.away_id]){ map[f.away_id].goals += f.away_score; map[f.away_id].matches++; }
  });
  const list = Object.values(map).filter(s => s.goals > 0).sort((a,b) => b.goals-a.goals || a.name.localeCompare(b.name));
  const total = list.reduce((s,r) => s + r.goals, 0);
  $('totalGoals').textContent = total + ' gol';
  
  if(list.length === 0){
    $('scorersList').innerHTML = '<div style="padding:18px;text-align:center;color:var(--ink-dim);font-size:13px">Henüz gol atılmadı</div>';
    return;
  }
  $('scorersList').innerHTML = list.map((s, i) => {
    let cls = ''; if(i===0) cls='top'; else if(i<3) cls='zone-c';
    return `<div class="scorer-row">
      <div class="rank ${cls}">${i+1}</div>
      <div class="player"><div class="avatar">${initials(s.name)}</div><div class="pname">${s.name}</div></div>
      <div class="goals">${s.goals}<small>gol${s.matches?' / '+s.matches+' maç':''}</small></div></div>`;
  }).join('');
}

function renderCup(){
  if(!cupData){
    $('cupTitle').textContent = 'Sezon Kupası';
    $('cupContainer').innerHTML = `<div class="cup-empty"><p>Henüz aktif kupa yok.</p>
      ${isAdmin() ? '<button class="btn primary" id="goAdminCupBtn" style="padding:9px 16px">Yönetim → Kupa Başlat</button>' : '<small>Yönetici başlattığında burada görünecek.</small>'}
      </div>`;
    const b = $('goAdminCupBtn');
    if(b) b.onclick = () => showPage('admin');
    return;
  }
  $('cupTitle').textContent = cupData.name;
  const sizeNames = {16:['1/8 Final','Çeyrek','Yarı','Final'], 8:['Çeyrek','Yarı','Final'], 4:['Yarı','Final']};
  const titles = sizeNames[cupData.size];
  
  // Group cup matches by round
  const byRound = {};
  cupMatches.forEach(m => { if(!byRound[m.round_index]) byRound[m.round_index]=[]; byRound[m.round_index].push(m); });
  Object.keys(byRound).forEach(k => byRound[k].sort((a,b) => a.pair_index - b.pair_index));
  
  const html = Object.keys(byRound).sort((a,b) => parseInt(a)-parseInt(b)).map(ri => {
    const round = byRound[ri];
    return `<div class="round"><div class="round-title">${titles[parseInt(ri)]}</div>
      ${round.map(p => cupPairHTML(p, parseInt(ri))).join('')}</div>`;
  }).join('');
  
  $('cupContainer').innerHTML = `<div class="bracket"><div class="bracket-inner">${html}</div></div>`;
}

function cupPairHTML(p, roundIdx){
  const home = p.home_id ? findProfile(p.home_id) : null;
  const away = p.away_id ? findProfile(p.away_id) : null;
  const homeName = home ? home.display_name : '?';
  const awayName = away ? away.display_name : '?';
  if(!p.is_done){
    const canEdit = isAdmin() && home && away;
    return `<div class="pair" ${canEdit?`onclick="window.openCupModal('${p.id}')"`:''}>
      <div class="p"><span class="pname">${homeName}</span><span class="s">–</span></div>
      <div class="p"><span class="pname">${awayName}</span><span class="s">–</span></div></div>`;
  }
  const homeWin = p.home_score > p.away_score;
  return `<div class="pair">
    <div class="p ${homeWin?'win':''}"><span class="pname">${homeName}</span><span class="s">${p.home_score}</span></div>
    <div class="p ${!homeWin?'win':''}"><span class="pname">${awayName}</span><span class="s">${p.away_score}</span></div></div>`;
}

async function renderAdmin(){
  if(!isAdmin()) return;
  
  $('adminLeagueName').value = leagueData.name || '';
  $('adminFormat').value = leagueData.format || 'double';
  $('adminDeadlineDays').value = leagueData.match_deadline_days || 14;
  
  // Pending users
  try {
    const pending = await Profiles.listPending();
    $('pendingCount').textContent = pending.length;
    if(pending.length === 0){
      $('pendingList').innerHTML = '<div style="padding:12px;text-align:center;color:var(--ink-mute);font-size:12px">Bekleyen üye yok</div>';
    } else {
      $('pendingList').innerHTML = pending.map(p => `
        <div class="player-item">
          <div class="avatar">${initials(p.display_name)}</div>
          <div class="pname">${p.display_name}</div>
          <button class="approve" onclick="window.approveUser('${p.id}')">Onayla</button>
          <button class="reject" onclick="window.rejectUser('${p.id}')">Sil</button>
        </div>`).join('');
    }
  } catch(e){
    $('pendingList').innerHTML = '<div style="color:var(--bad);font-size:12px;padding:8px">Yüklenemedi</div>';
  }
  
  // Approved players
  const leaguePlayers = allProfiles.filter(p => !p.is_admin);
  $('playerCount').textContent = leaguePlayers.length;
  $('playerList').innerHTML = leaguePlayers.map(p => `
    <div class="player-item">
      <div class="avatar">${initials(p.display_name)}</div>
      <div class="pname">${p.display_name}</div>
    </div>`).join('');

  renderAdminMatches();
}


function renderAdminMatches(){
  if(!isAdmin() || !$('adminMatchList')) return;

  if(allMatches.length === 0){
    $('adminMatchList').innerHTML = '<div style="padding:12px;text-align:center;color:var(--ink-mute);font-size:12px">Henüz maç yok</div>';
    return;
  }

  const statusLabel = {
    open: 'Oynanmadı',
    pending: 'Onay Bekliyor',
    played: 'Tamamlandı',
    disputed: 'İtirazlı'
  };

  const list = allMatches
    .slice()
    .sort((a,b) => (a.round || 0) - (b.round || 0) || new Date(a.created_at || 0) - new Date(b.created_at || 0));

  $('adminMatchList').innerHTML = list.map(f => {
    const home = findProfile(f.home_id);
    const away = findProfile(f.away_id);
    if(!home || !away) return '';

    const score = f.status === 'played'
      ? `${f.home_score} - ${f.away_score}`
      : f.status === 'pending'
        ? `${f.proposed_home} - ${f.proposed_away}`
        : '—';

    return `
      <div class="player-item">
        <div class="pname">${home.display_name} - ${away.display_name}</div>
        <div class="pcode">${score}</div>
        <div class="pcode">${statusLabel[f.status] || f.status}</div>
        <button class="approve" onclick="window.adminEditMatch('${f.id}')">Düzenle</button>
        <button class="reject" onclick="window.adminResetMatch('${f.id}')">Sıfırla</button>
      </div>`;
  }).join('');
}

window.adminEditMatch = function(matchId){
  const f = allMatches.find(x => x.id === matchId);
  if(!f) return;

  const home = findProfile(f.home_id);
  const away = findProfile(f.away_id);
  if(!home || !away) return;

  const hs = f.status === 'played' ? f.home_score : (f.proposed_home ?? '');
  const as = f.status === 'played' ? f.away_score : (f.proposed_away ?? '');

  openGenericModal({
    title: 'Maçı Düzenle',
    body: `<div class="who">${home.display_name} vs ${away.display_name}</div>
      <div class="info-note">Admin olarak skoru doğrudan tamamlanmış sonuç yaparsın.</div>
      <div class="score-input">
        <div class="si-side">
          <div class="pname">${home.display_name}</div>
          <input type="number" min="0" max="30" id="adminHomeScore" class="score-num" value="${hs}" />
        </div>
        <div class="si-dash">—</div>
        <div class="si-side">
          <div class="pname">${away.display_name}</div>
          <input type="number" min="0" max="30" id="adminAwayScore" class="score-num" value="${as}" />
        </div>
      </div>`,
    actions: [
      {label:'İptal', cls:'ghost', fn: closeGenericModal},
      {label:'Kaydet', cls:'primary', fn: async () => {
        const h = parseInt($('adminHomeScore').value);
        const a = parseInt($('adminAwayScore').value);

        if(isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 30 || a > 30){
          toast('Geçerli skor gir','warn');
          return;
        }

        setLoading(true);
        try {
          await Matches.update(f.id, {
            status: 'played',
            home_score: h,
            away_score: a,
            proposed_by: null,
            proposed_home: null,
            proposed_away: null,
            played_at: new Date().toISOString()
          });
          await reload();
          closeGenericModal();
          toast('Maç güncellendi ✓','ok');
        } catch(err){
          toast('Hata: ' + err.message, 'bad');
        }
        setLoading(false);
      }}
    ]
  });

  setTimeout(() => $('adminHomeScore')?.focus(), 200);
};

window.adminResetMatch = function(matchId){
  const f = allMatches.find(x => x.id === matchId);
  if(!f) return;

  const home = findProfile(f.home_id);
  const away = findProfile(f.away_id);
  if(!home || !away) return;

  openGenericModal({
    title: 'Maçı Sıfırla',
    body: `<div class="info-note bad">${home.display_name} - ${away.display_name} maçı oynanmamış hale getirilecek.</div>`,
    actions: [
      {label:'İptal', cls:'ghost', fn: closeGenericModal},
      {label:'Sıfırla', cls:'danger', fn: async () => {
        setLoading(true);
        try {
          await Matches.update(f.id, {
            status: 'open',
            home_score: null,
            away_score: null,
            proposed_by: null,
            proposed_home: null,
            proposed_away: null,
            proposed_home_scorers: [],
            proposed_away_scorers: [],
            home_scorers: [],
            away_scorers: [],
            played_at: null
          });
          await reload();
          closeGenericModal();
          toast('Maç sıfırlandı','ok');
        } catch(err){
          toast('Hata: ' + err.message, 'bad');
        }
        setLoading(false);
      }}
    ]
  });
};

// =====================================================
// PAGE NAV
// =====================================================
function showPage(name){
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.page===name));
  document.querySelectorAll('.nav-btn').forEach(t => t.classList.toggle('active', t.dataset.page===name));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id==='page-'+name));
  window.scrollTo(0,0);
}
window.showPage = showPage;

// =====================================================
// MATCH MODAL
// =====================================================
function openMatchModal(id){
  const f = allMatches.find(x => x.id === id);
  if(!f) return;
  currentMatchId = id;
  const home = findProfile(f.home_id), away = findProfile(f.away_id);
  $('mHome').textContent = home.display_name;
  $('mAway').textContent = away.display_name;
  $('modalWho').textContent = `${home.display_name} vs ${away.display_name} · Hafta ${f.round}`;
  
  let title = 'Skor Gir', info = '⚡ Skoru girdiğinde rakibin onayına gönderilecek.';
  let hs = '', as = '', saveLabel = 'Kaydet', extraButton = null;
  
  if(f.status === 'played'){
    title = 'Maç Düzenle (Admin)';
    info = '⚙️ Yönetici olarak düzenliyorsun.';
    hs = f.home_score; as = f.away_score;
  } else if(f.status === 'pending' && f.proposed_by !== currentUser.id){
    title = 'Skoru Onayla';
    info = `✓ ${findProfile(f.proposed_by).display_name} ${f.proposed_home}-${f.proposed_away} önerdi.`;
    hs = f.proposed_home; as = f.proposed_away; saveLabel = 'Onayla';
    extraButton = {label:'İtiraz', cls:'danger', fn: async () => {
      await Matches.update(f.id, {status: 'disputed'});
      await reload();
      closeMatchModal();
      toast('İtiraz iletildi','warn');
    }};
  } else if(f.status === 'pending' && f.proposed_by === currentUser.id){
    title = 'Önerini Düzenle';
    info = '⏳ Karşı taraf onaylamadı.';
    hs = f.proposed_home; as = f.proposed_away;
  } else if(f.status === 'disputed'){
    title = 'İhtilafı Çöz (Admin)';
    info = '⚖️ Sen karar veriyorsun.';
    hs = f.proposed_home || ''; as = f.proposed_away || '';
  }
  
  $('modalTitle').textContent = title;
  $('modalInfo').textContent = info;
  $('hScore').value = hs;
  $('aScore').value = as;
  
  const actionsEl = $('modalActions');
  actionsEl.className = 'actions' + (extraButton ? ' three' : '');
  let btnsHTML = '<button class="btn ghost" id="modalCancel">İptal</button>';
  if(extraButton) btnsHTML += `<button class="btn ${extraButton.cls}" id="modalExtra">${extraButton.label}</button>`;
  btnsHTML += `<button class="btn primary" id="modalSave">${saveLabel}</button>`;
  actionsEl.innerHTML = btnsHTML;
  $('modalCancel').onclick = closeMatchModal;
  $('modalSave').onclick = saveMatchModal;
  if(extraButton) $('modalExtra').onclick = extraButton.fn;
  
  $('modalBg').classList.add('show');
  setTimeout(() => $('hScore').focus(), 200);
}

async function saveMatchModal(){
  const f = allMatches.find(x => x.id === currentMatchId);
  if(!f) return;
  const hs = parseInt($('hScore').value);
  const as = parseInt($('aScore').value);
  if(isNaN(hs)||isNaN(as)||hs<0||as<0||hs>30||as>30){ toast('Geçerli skor gir','warn'); return; }
  
  const meIn = (f.home_id === currentUser.id || f.away_id === currentUser.id);
  setLoading(true);
  
  try {
    if(isAdmin() && (f.status === 'played' || f.status === 'disputed')){
      await Matches.update(f.id, {
        status: 'played', home_score: hs, away_score: as,
        proposed_by: null, proposed_home: null, proposed_away: null
      });
      toast('Güncellendi ✓','ok');
    } else if(f.status === 'pending' && f.proposed_by !== currentUser.id){
      if(f.proposed_home === hs && f.proposed_away === as){
        await Matches.update(f.id, {
          status: 'played', home_score: hs, away_score: as,
          proposed_by: null, proposed_home: null, proposed_away: null
        });
        toast('Onaylandı ✓','ok');
      } else {
        await Matches.update(f.id, {
          proposed_by: currentUser.id, proposed_home: hs, proposed_away: as
        });
        toast('Karşı öneri gönderildi','warn');
      }
    } else if(meIn){
      await Matches.update(f.id, {
        status: 'pending', proposed_by: currentUser.id, proposed_home: hs, proposed_away: as
      });
      toast('Önerildi, onay bekleniyor','ok');
    } else if(isAdmin()){
      await Matches.update(f.id, {
        status: 'played', home_score: hs, away_score: as
      });
      toast('Kaydedildi ✓','ok');
    }
    await reload();
    closeMatchModal();
  } catch(err){
    toast('Hata: ' + err.message, 'bad');
  }
  setLoading(false);
}

function closeMatchModal(){ $('modalBg').classList.remove('show'); }

// =====================================================
// CUP MODAL
// =====================================================
window.openCupModal = function(matchId){
  const m = cupMatches.find(x => x.id === matchId);
  if(!m) return;
  const home = findProfile(m.home_id), away = findProfile(m.away_id);
  openGenericModal({
    title: 'Kupa Maçı',
    body: `<div class="who">${home.display_name} vs ${away.display_name}</div>
      <div class="info-note">Beraberlik olamaz!</div>
      <div class="score-input">
        <div class="si-side"><div class="pname">${home.display_name}</div><input type="number" min="0" id="cupH" class="score-num"/></div>
        <div class="si-dash">—</div>
        <div class="si-side"><div class="pname">${away.display_name}</div><input type="number" min="0" id="cupA" class="score-num"/></div>
      </div>`,
    actions: [
      {label:'İptal', cls:'ghost', fn: closeGenericModal},
      {label:'Kaydet', cls:'primary', fn: async () => {
        const h = parseInt($('cupH').value), a = parseInt($('cupA').value);
        if(isNaN(h)||isNaN(a)){ toast('Skor gir','warn'); return; }
        if(h === a){ toast('Beraberlik olamaz','warn'); return; }
        setLoading(true);
        try {
          await Cup.updateMatch(m.id, {home_score: h, away_score: a, is_done: true});
          // Find next pair
          const nextRound = cupMatches.filter(x => x.round_index === m.round_index + 1);
          if(nextRound.length > 0){
            const nextPair = nextRound[Math.floor(m.pair_index / 2)];
            const winner = h > a ? m.home_id : m.away_id;
            const updates = m.pair_index % 2 === 0 ? {home_id: winner} : {away_id: winner};
            await Cup.updateMatch(nextPair.id, updates);
          }
          await reload();
          closeGenericModal();
          toast('Kaydedildi ✓','ok');
        } catch(err){
          toast('Hata: '+err.message,'bad');
        }
        setLoading(false);
      }}
    ]
  });
  setTimeout(() => $('cupH').focus(), 200);
};

// =====================================================
// GENERIC MODAL
// =====================================================
function openGenericModal(opts){
  let html = `<h3>${opts.title}</h3><div style="margin:8px 0">${opts.body}</div>
    <div class="actions" style="grid-template-columns:repeat(${opts.actions.length},1fr)">`;
  opts.actions.forEach((a, i) => {
    html += `<button class="btn ${a.cls}" data-i="${i}">${a.label}</button>`;
  });
  html += '</div>';
  $('genericModal').innerHTML = html;
  $('genericModalBg').classList.add('show');
  document.querySelectorAll('#genericModal .btn').forEach((b, i) => {
    b.onclick = opts.actions[i].fn;
  });
}
function closeGenericModal(){ $('genericModalBg').classList.remove('show'); }
window.closeGenericModal = closeGenericModal;

// =====================================================
// SHARE
// =====================================================
window.shareMatch = function(id){
  const f = allMatches.find(x => x.id === id);
  if(!f) return;
  const home = findProfile(f.home_id), away = findProfile(f.away_id);
  const text = `⚽ ${leagueData.name}\n${home.display_name} ${f.home_score}-${f.away_score} ${away.display_name}\nHafta ${f.round}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
};

// =====================================================
// ADMIN ACTIONS
// =====================================================
window.approveUser = async function(userId){
  setLoading(true);
  try {
    await Profiles.approve(userId);
    await reload();
    toast('Onaylandı ✓','ok');
  } catch(err){
    toast('Hata: '+err.message,'bad');
  }
  setLoading(false);
};

window.rejectUser = function(userId){
  openGenericModal({
    title: 'Üyeyi Sil',
    body: '<div class="info-note bad">Bu kullanıcı silinecek. Tekrar kayıt olmadan giremez.</div>',
    actions: [
      {label:'İptal', cls:'ghost', fn: closeGenericModal},
      {label:'Sil', cls:'danger', fn: async () => {
        setLoading(true);
        try {
          await Profiles.reject(userId);
          await reload();
          closeGenericModal();
          toast('Silindi','ok');
        } catch(err){
          toast('Hata: '+err.message,'bad');
        }
        setLoading(false);
      }}
    ]
  });
};

async function reload(){
  await loadAllData();
  renderUser();
  renderAll();
}

// =====================================================
// INIT
// =====================================================
function init(){
  if(!initSupabase()) return;

  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      $('authLogin').style.display = t.dataset.auth === 'login' ? 'block' : 'none';
      $('authSignup').style.display = t.dataset.auth === 'signup' ? 'block' : 'none';
    });
  });

  $('loginBtn').addEventListener('click', handleLogin);
  $('signupBtn').addEventListener('click', handleSignup);
  $('forgotLink').addEventListener('click', async () => {
    const email = prompt('Email adresini gir:');
    if(!email) return;
    try {
      await Auth.resetPassword(email);
      toast('Şifre sıfırlama maili gönderildi','ok');
    } catch(err){
      toast('Hata: '+err.message,'bad');
    }
  });
  $('refreshPendingBtn').addEventListener('click', () => location.reload());
  $('logoutPendingBtn').addEventListener('click', handleLogout);
  $('goLoginBtn').addEventListener('click', () => {
    hideAll();
    $('authScreen').style.display = 'flex';
  });

  $('meChip').addEventListener('click', () => {
    openGenericModal({
      title: 'Hesap',
      body: `<div class="who">${currentUser.display_name} · ${currentUser.email}${currentUser.is_admin?' · <span class="badge-admin">Admin</span>':''}</div>`,
      actions: [
        {label:'Çıkış', cls:'danger', fn: async () => { closeGenericModal(); await handleLogout(); }},
        {label:'Kapat', cls:'ghost', fn: closeGenericModal}
      ]
    });
  });

  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', () => showPage(el.dataset.page));
  });

  $('filterAllBtn').addEventListener('click', () => { fixtureFilter='all'; renderFixtures(); });
  $('filterPendingBtn').addEventListener('click', () => { fixtureFilter='pending'; renderFixtures(); });
  $('filterPlayedBtn').addEventListener('click', () => { fixtureFilter='played'; renderFixtures(); });

  $('saveSettingsBtn').addEventListener('click', async () => {
    const name = $('adminLeagueName').value.trim();
    const fmt = $('adminFormat').value;
    const days = parseInt($('adminDeadlineDays').value) || 14;
    if(!name){ toast('Lig adı gir','warn'); return; }
    setLoading(true);
    try {
      await League.update({name, format: fmt, match_deadline_days: days});
      await reload();
      toast('Kaydedildi ✓','ok');
    } catch(err){
      toast('Hata: '+err.message,'bad');
    }
    setLoading(false);
  });

  $('generateFixtureBtn').addEventListener('click', () => {
    if(allProfiles.filter(p => !p.is_admin).length < 2){ toast('En az 2 onaylı oyuncu gerekli','warn'); return; }
    const doIt = async () => {
      setLoading(true);
      try {
        await Matches.deleteAll();
        const fixtures = generateFixtureRounds(leagueData.format || 'double');
        await Matches.createBatch(fixtures);
        await reload();
        closeGenericModal();
        toast(`Fikstür oluşturuldu (${fixtures.length} maç) ✓`,'ok');
        showPage('fixtures');
      } catch(err){
        toast('Hata: '+err.message,'bad');
      }
      setLoading(false);
    };
    if(allMatches.length > 0){
      openGenericModal({
        title: 'Fikstür Yenilensin mi?',
        body: '<div class="info-note bad">Mevcut sonuçlar silinecek!</div>',
        actions: [
          {label:'İptal', cls:'ghost', fn: closeGenericModal},
          {label:'Evet, Yenile', cls:'danger', fn: doIt}
        ]
      });
    } else doIt();
  });

  $('startCupBtn').addEventListener('click', () => {
    const sizes = [4,8,16].filter(s => s <= allProfiles.filter(p => !p.is_admin).length);
    if(sizes.length === 0){ toast('En az 4 oyuncu gerekli','warn'); return; }
    const btnHTML = sizes.map(s => `<button class="btn ghost" onclick="window.createCup(${s})">${s} kişi</button>`).join('');
    openGenericModal({
      title: 'Kupa Başlat',
      body: `<div class="who">Kaç kişilik?</div><div class="info-note">Sıralamaya göre eşleşir.</div>
        <div style="display:grid;grid-template-columns:repeat(${sizes.length},1fr);gap:8px">${btnHTML}</div>`,
      actions: [{label:'İptal', cls:'ghost', fn: closeGenericModal}]
    });
  });

  window.createCup = async function(size){
    setLoading(true);
    try {
      const standings = calcStandings();
      const qualified = standings.slice(0, size);
      if(qualified.length < size){ toast('Yeterli sıralama yok','warn'); setLoading(false); return; }
      
      await Cup.deactivateOthers();
      await Cup.deleteAll(); // önce eskileri sil
      const cup = await Cup.create(`Sezon ${leagueData.season || 1} Kupası`, size, leagueData.season || 1);
      
      const matches = [];
      // First round
      for(let i = 0; i < size/2; i++){
        matches.push({
          cup_id: cup.id, round_index: 0, pair_index: i,
          home_id: qualified[i].id, away_id: qualified[size-1-i].id,
          is_done: false
        });
      }
      // Subsequent empty rounds
      let count = size/2, ri = 1;
      while(count > 1){
        count = count / 2;
        for(let i = 0; i < count; i++){
          matches.push({
            cup_id: cup.id, round_index: ri, pair_index: i,
            home_id: null, away_id: null, is_done: false
          });
        }
        ri++;
      }
      await Cup.createMatches(matches);
      await reload();
      closeGenericModal();
      showPage('cup');
      toast('Kupa başladı! ✓','ok');
    } catch(err){
      toast('Hata: '+err.message,'bad');
    }
    setLoading(false);
  };

  $('resetSeasonBtn').addEventListener('click', () => {
    openGenericModal({
      title: 'Sezonu Sıfırla',
      body: '<div class="info-note bad">Tüm maç sonuçları, fikstür ve kupa silinecek.</div>',
      actions: [
        {label:'İptal', cls:'ghost', fn: closeGenericModal},
        {label:'Sıfırla', cls:'danger', fn: async () => {
          setLoading(true);
          try {
            await Matches.deleteAll();
            await Cup.deleteAll();
            await League.update({season: (leagueData.season || 1) + 1});
            await reload();
            closeGenericModal();
            toast('Yeni sezon ✓','ok');
          } catch(err){
            toast('Hata: '+err.message,'bad');
          }
          setLoading(false);
        }}
      ]
    });
  });

  // Match card clicks
  document.body.addEventListener('click', e => {
    const m = e.target.closest('.match[data-clickable="1"]');
    if(!m) return;
    openMatchModal(m.dataset.id);
  });

  $('modalBg').addEventListener('click', e => { if(e.target.id === 'modalBg') closeMatchModal(); });
  $('genericModalBg').addEventListener('click', e => { if(e.target.id === 'genericModalBg') closeGenericModal(); });

  // Boot
  bootApp();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('error', e => {
  console.error(e);
});

})();
