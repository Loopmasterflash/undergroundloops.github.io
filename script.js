// UNDERGROUNDLOOPS v2 - Main Script

let currentAudio = null;
let currentTrackId = null;
let allTracks = [];
let filteredTracks = [];
let currentGenre = 'all';
let currentPage = 'latest';

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if(typeof db !== 'undefined') {
            loadTracksFromFirestore();
            initNavigation();
            initGenreDropdown();
            loadOnlineMembers();
            setInterval(loadOnlineMembers, 120000);
        } else {
            showError('Firebase connection failed');
        }
    }, 1000);
});

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentPage = link.getAttribute('data-page');
            currentGenre = 'all';
            if(currentPage === 'blog') { showBlogPage(); }
            else if(currentPage === 'forum') { showForumPage(); }
            else { showMainPage(); filterTracks(); }
        });
    });
}

function initGenreDropdown() {
    const genreLinks = document.querySelectorAll('.genre-dropdown-menu a');
    genreLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            currentGenre = link.getAttribute('data-genre');
            filterTracks();
        });
    });
}

async function loadTracksFromFirestore() {
    try {
        const snapshot = await db.collection('tracks').get();
        allTracks = [];
        snapshot.forEach(doc => allTracks.push({ id: doc.id, ...doc.data() }));
        allTracks.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
        filterTracks();
    } catch(error) { showError('Error: ' + error.message); }
}

async function loadOnlineMembers() {
    try {
        const snap = await db.collection('users').get();
        const container = document.getElementById('onlineMembersList');
        if(!container) return;
        if(snap.empty) { container.innerHTML = '<p style="color:#666;font-size:0.75rem;text-align:center;">No members yet</p>'; return; }
        let users = [];
        snap.forEach(doc => { if(doc.data().lastSeen) users.push({id: doc.id, ...doc.data()}); });
        users.sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
        users = users.slice(0, 15);
        container.innerHTML = '';
        users.forEach(user => {
            if(!user.lastSeen) return;
            const lastSeen = new Date(user.lastSeen);
            const diffMs = Date.now() - lastSeen.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMin / 60);
            const diffDays = Math.floor(diffHrs / 24);
            let timeText, dotColor;
            if(diffMin < 5) { timeText = 'Online'; dotColor = '#00ff00'; }
            else if(diffMin < 60) { timeText = diffMin + 'm ago'; dotColor = '#ffff00'; }
            else if(diffHrs < 24) { timeText = diffHrs + 'h ago'; dotColor = '#ff8800'; }
            else { timeText = diffDays + 'd ago'; dotColor = '#666'; }
            const item = document.createElement('div');
            item.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;transition:all 0.2s;';
            item.onmouseover = () => item.style.opacity = '0.7';
            item.onmouseout = () => item.style.opacity = '1';
            item.onclick = () => { if(typeof showProfilePage === 'function') showProfilePage(user.id); };
            item.innerHTML = `
                <div style="position:relative;flex-shrink:0;">
                    <img src="${user.avatar || ''}"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2236%22 height=%2236%22%3E%3Crect fill=%22%23200020%22 width=%2236%22 height=%2236%22 rx=%2218%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23ff00ff%22 font-size=%2216%22%3E👤%3C/text%3E%3C/svg%3E'"
                         style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid ${dotColor};">
                    <div style="position:absolute;bottom:0;right:0;width:10px;height:10px;background:${dotColor};border-radius:50%;border:2px solid #000;"></div>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="color:#fff;font-size:0.75rem;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.username || 'Unknown'}</div>
                    <div style="color:${dotColor};font-size:0.65rem;">${timeText}</div>
                </div>`;
            container.appendChild(item);
        });
    } catch(e) { console.error('Sidebar error:', e); }
}

let currentLoopCategory = 'all';
let currentLoopKey = 'all';
let currentSampleCategory = 'all';
let currentSampleKey = 'all';
let currentAcapellaKey = 'all';
let currentAcapellaBpm = 'all';

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function filterTracks() {
    let pageFiltered;

    const loopsSub = document.getElementById('loopsSubmenu');
    const loopsKeySub = document.getElementById('loopsKeySubmenu');
    const samplesSub = document.getElementById('samplesSubmenu');
    const samplesKeySub = document.getElementById('samplesKeySubmenu');
    const acapSub = document.getElementById('acapellasSubmenu');

    if(loopsSub) loopsSub.style.display = currentPage === 'loops' ? 'flex' : 'none';
    if(loopsKeySub) loopsKeySub.style.display = currentPage === 'loops' ? 'flex' : 'none';
    if(samplesSub) samplesSub.style.display = currentPage === 'samples' ? 'flex' : 'none';
    if(samplesKeySub) samplesKeySub.style.display = currentPage === 'samples' ? 'flex' : 'none';
    if(acapSub) acapSub.style.display = currentPage === 'acapellas' ? 'flex' : 'none';

    if(currentPage === 'latest') {
        pageFiltered = allTracks.slice(0, 12);
    } else {
        const pageType = currentPage.replace(/s$/, '');
        pageFiltered = allTracks.filter(track => {
            if(!track.type) return currentPage === 'loops';
            return track.type === pageType;
        });
    }

    if(currentPage === 'loops' && currentLoopCategory !== 'all') {
        pageFiltered = pageFiltered.filter(track =>
            track.category && track.category.toLowerCase() === currentLoopCategory.toLowerCase()
        );
    }
    if(currentPage === 'loops' && currentLoopKey !== 'all') {
        pageFiltered = pageFiltered.filter(track => track.key && track.key === currentLoopKey);
    }
    if(currentPage === 'samples' && currentSampleCategory !== 'all') {
        pageFiltered = pageFiltered.filter(track =>
            track.category && track.category.toLowerCase() === currentSampleCategory.toLowerCase()
        );
    }
    if(currentPage === 'samples' && currentSampleKey !== 'all') {
        pageFiltered = pageFiltered.filter(track => track.key && track.key === currentSampleKey);
    }
    if(currentPage === 'acapellas' && currentAcapellaKey !== 'all') {
        pageFiltered = pageFiltered.filter(track => track.key && track.key === currentAcapellaKey);
    }
    if(currentPage === 'acapellas' && currentAcapellaBpm !== 'all') {
        pageFiltered = pageFiltered.filter(track => {
            const bpm = track.bpm || 0;
            if(currentAcapellaBpm === 'slow') return bpm < 90;
            if(currentAcapellaBpm === 'mid') return bpm >= 90 && bpm <= 130;
            if(currentAcapellaBpm === 'fast') return bpm > 130;
            return true;
        });
    }
    if(currentGenre !== 'all') {
        pageFiltered = pageFiltered.filter(track =>
            track.genre && track.genre.toLowerCase() === currentGenre.toLowerCase()
        );
    }

    filteredTracks = pageFiltered;
    renderTracks();
}

// ============================================
// RENDER TRACKS - ALLE SEITEN ALS GRID! ✅
// ============================================

function renderTracks() {
    const container = document.getElementById('trackListContainer');
    if(filteredTracks.length === 0) {
        container.innerHTML = `<div style="text-align:center;color:#00ffff;padding:60px 20px;"><p style="font-size:1.8rem;margin-bottom:15px;">🎵 No tracks found</p><p style="font-size:1rem;color:#666;">Upload your first tracks!</p></div>`;
        return;
    }

    // Titel je nach Seite
    const pageTitles = {
        latest:    '⚡ LATEST MEMBER UPLOADS',
        loops:     '🔁 LOOPS',
        samples:   '🎹 SAMPLES',
        tracks:    '🎵 TRACKS',
        acapellas: '🎤 ACAPELLAS'
    };

    const title = pageTitles[currentPage] || '🎵 TRACKS';

    container.innerHTML = `
        <div style="padding:10px 0 20px 0;">
            <h2 style="
                font-family:'Orbitron',sans-serif;
                color:#ff00ff;
                font-size:1.4rem;
                letter-spacing:3px;
                margin-bottom:25px;
                text-shadow:0 0 20px rgba(255,0,255,0.5);
                border-bottom:1px solid #ff00ff44;
                padding-bottom:15px;
            ">${title}</h2>
            <div id="tracksGrid" style="
                display:grid;
                grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
                gap:16px;
            "></div>
        </div>`;

    const grid = document.getElementById('tracksGrid');
    filteredTracks.forEach(track => grid.appendChild(createGridCard(track)));
}

// ============================================
// GRID CARD - für alle Seiten
// ============================================

function createGridCard(track) {
    const card = document.createElement('div');
    const typeColor = track.type === 'loop' ? '#00ffff' :
                      track.type === 'sample' ? '#ff00ff' :
                      track.type === 'acapella' ? '#ffff00' : '#ff8800';
    const bpmText = track.bpm ? `${track.bpm} BPM` : '';
    const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23200020' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23ff00ff' font-size='40'%3E🎵%3C/text%3E%3C/svg%3E";

    card.style.cssText = 'background:rgba(0,0,0,0.6);border:1px solid #ff00ff33;border-radius:12px;overflow:hidden;cursor:pointer;transition:all 0.3s;position:relative;';

    const img = document.createElement('img');
    img.src = track.coverImage || defaultImg;
    img.onerror = () => img.src = defaultImg;
    img.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;display:block;';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s;';
    overlay.innerHTML = '<div style="width:55px;height:55px;background:rgba(255,0,255,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">▶</div>';

    const badge = document.createElement('div');
    badge.style.cssText = `position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.85);border:1px solid ${typeColor};color:${typeColor};padding:2px 8px;border-radius:20px;font-size:0.65rem;font-family:'Orbitron',sans-serif;`;
    badge.textContent = (track.type || 'loop').toUpperCase();

    const coverWrap = document.createElement('div');
    coverWrap.style.cssText = 'position:relative;';
    coverWrap.appendChild(img);
    coverWrap.appendChild(overlay);
    coverWrap.appendChild(badge);

    const info = document.createElement('div');
    info.style.cssText = 'padding:12px;';
    info.innerHTML = `
        <div style="color:#fff;font-weight:bold;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;" title="${track.title}">${track.title}</div>
        <div style="color:#00ffff;font-size:0.75rem;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;" onclick="event.stopPropagation();showProfilePage('${track.userId}')">${track.artist || 'Unknown'}</div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;">
            <span style="color:#666;font-size:0.7rem;">${track.genre ? track.genre.toUpperCase() : ''}</span>
            <span style="color:#888;font-size:0.7rem;">${bpmText}</span>
        </div>`;

    card.appendChild(coverWrap);
    card.appendChild(info);

    card.addEventListener('mouseenter', () => {
        card.style.border = '1px solid #ff00ff';
        card.style.boxShadow = '0 0 25px rgba(255,0,255,0.3)';
        card.style.transform = 'translateY(-4px)';
        overlay.style.opacity = '1';
    });
    card.addEventListener('mouseleave', () => {
        card.style.border = '1px solid #ff00ff33';
        card.style.boxShadow = 'none';
        card.style.transform = 'translateY(0)';
        overlay.style.opacity = '0';
    });
    card.addEventListener('click', () => openPlayerModal(track));

    return card;
}

// ============================================
// FILTER FUNCTIONS - LOOPS
// ============================================

function filterLoopCategory(cat) {
    currentLoopCategory = cat;
    ['all','bass','clap','hihats','kick','percussion','synth'].forEach(c => {
        const btn = document.getElementById('loopCat_' + c);
        if(!btn) return;
        const active = c === cat;
        btn.style.background = active ? 'rgba(255,0,255,0.3)' : 'rgba(0,0,0,0.3)';
        btn.style.border = active ? '1px solid #ff00ff' : '1px solid #444';
        btn.style.color = active ? '#fff' : '#aaa';
    });
    filterTracks();
}

function filterLoopKey(key) {
    currentLoopKey = key;
    KEYS.concat(['all']).forEach(k => {
        const btn = document.getElementById('loopKey_' + k);
        if(!btn) return;
        const active = k === key;
        btn.style.background = active ? 'rgba(255,0,255,0.3)' : 'rgba(0,0,0,0.3)';
        btn.style.border = active ? '1px solid #ff00ff' : '1px solid #444';
        btn.style.color = active ? '#fff' : '#aaa';
    });
    filterTracks();
}

// ============================================
// FILTER FUNCTIONS - SAMPLES
// ============================================

function filterSampleCategory(cat) {
    currentSampleCategory = cat;
    ['all','bass','clap','hihats','kick','percussion','synth'].forEach(c => {
        const btn = document.getElementById('sampleCat_' + c);
        if(!btn) return;
        const active = c === cat;
        btn.style.background = active ? 'rgba(0,255,255,0.3)' : 'rgba(0,0,0,0.3)';
        btn.style.border = active ? '1px solid #00ffff' : '1px solid #444';
        btn.style.color = active ? '#fff' : '#aaa';
    });
    filterTracks();
}

function filterSampleKey(key) {
    currentSampleKey = key;
    KEYS.concat(['all']).forEach(k => {
        const btn = document.getElementById('sampleKey_' + k);
        if(!btn) return;
        const active = k === key;
        btn.style.background = active ? 'rgba(0,255,255,0.3)' : 'rgba(0,0,0,0.3)';
        btn.style.border = active ? '1px solid #00ffff' : '1px solid #444';
        btn.style.color = active ? '#fff' : '#aaa';
    });
    filterTracks();
}

// ============================================
// FILTER FUNCTIONS - ACAPELLAS
// ============================================

function filterAcapellaKey(key) {
    currentAcapellaKey = key;
    KEYS.concat(['all']).forEach(k => {
        const btn = document.getElementById('acapKey_' + k);
        if(!btn) return;
        const active = k === key;
        btn.style.background = active ? 'rgba(255,255,0,0.3)' : 'rgba(0,0,0,0.3)';
        btn.style.border = active ? '1px solid #ffff00' : '1px solid #444';
        btn.style.color = active ? '#fff' : '#aaa';
    });
    filterTracks();
}

function filterAcapellaBpm(range) {
    currentAcapellaBpm = range;
    ['all','slow','mid','fast'].forEach(r => {
        const btn = document.getElementById('acapBpm_' + r);
        if(!btn) return;
        const active = r === range;
        btn.style.background = active ? 'rgba(255,255,0,0.3)' : 'rgba(0,0,0,0.3)';
        btn.style.border = active ? '1px solid #ffff00' : '1px solid #444';
        btn.style.color = active ? '#fff' : '#aaa';
    });
    filterTracks();
}

function playGridTrack(trackId, audioFile) {
    const track = allTracks.find(t => t.id === trackId);
    if(!track) return;
    openPlayerModal(track);
}

// ============================================
// PLAYER MODAL
// ============================================

// ============================================
// MINI PLAYER BAR
// ============================================

let currentModalTrack = null;
let currentModalTrackId = null;

function createMiniPlayer() {
    if(document.getElementById('miniPlayerBar')) return;
    const bar = document.createElement('div');
    bar.id = 'miniPlayerBar';
    bar.style.cssText = `
        position:fixed;
        bottom:0;left:0;right:0;
        height:64px;
        background:rgba(0,0,0,0.95);
        border-top:2px solid #ff00ff;
        backdrop-filter:blur(20px);
        z-index:9998;
        display:none;
        align-items:center;
        padding:0 20px;
        gap:16px;
        box-shadow:0 -4px 30px rgba(255,0,255,0.3);
    `;
    bar.innerHTML = `
        <!-- Cover -->
        <img id="miniCover" src="" style="width:42px;height:42px;border-radius:6px;object-fit:cover;border:1px solid #ff00ff;flex-shrink:0;">

        <!-- Title + Artist -->
        <div style="flex:1;min-width:0;cursor:pointer;" onclick="maximizePlayer()">
            <div id="miniTitle" style="color:#fff;font-size:0.85rem;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
            <div id="miniArtist" style="color:#00ffff;font-size:0.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
        </div>

        <!-- Progress Bar -->
        <div style="flex:2;min-width:0;cursor:pointer;" onclick="miniSeek(event, this)">
            <div style="height:4px;background:rgba(255,255,255,0.15);border-radius:2px;position:relative;">
                <div id="miniProgress" style="height:100%;background:#ff00ff;border-radius:2px;width:0%;transition:width 0.3s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;">
                <span id="miniCurrentTime" style="color:#888;font-size:0.65rem;">0:00</span>
                <span id="miniTotalTime" style="color:#888;font-size:0.65rem;">0:00</span>
            </div>
        </div>

        <!-- Play/Pause -->
        <button id="miniPlayBtn" onclick="miniTogglePlay()" style="
            width:38px;height:38px;border-radius:50%;
            background:linear-gradient(135deg,#ff00ff,#00ffff);
            border:none;color:#000;font-size:1rem;
            cursor:pointer;flex-shrink:0;
        ">⏸</button>

        <!-- Volume -->
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;"><span style="color:#aaa;font-size:0.85rem;">🔊</span><input type="range" id="miniVolume" min="0" max="100" value="80" oninput="setVolume(this.value)" style="width:70px;accent-color:#ff00ff;cursor:pointer;touch-action:none;"></div>

        <!-- Maximieren -->
        <button onclick="maximizePlayer()" style="
            background:rgba(255,0,255,0.2);border:1px solid #ff00ff;
            color:#ff00ff;border-radius:6px;padding:6px 10px;
            cursor:pointer;font-size:0.75rem;flex-shrink:0;
        ">⬆ Öffnen</button>

        <!-- Schließen -->
        <button onclick="closeMiniPlayer()" style="
            background:transparent;border:none;
            color:#555;font-size:1.2rem;cursor:pointer;flex-shrink:0;
        ">✕</button>
    `;
    document.body.appendChild(bar);
}

function showMiniPlayer() {
    createMiniPlayer();
    if(!currentModalTrack) return;
    document.getElementById('miniCover').src = currentModalTrack.coverImage || '';
    document.getElementById('miniTitle').textContent = currentModalTrack.title || '';
    document.getElementById('miniArtist').textContent = currentModalTrack.artist || '';
    document.getElementById('miniPlayerBar').style.display = 'flex';
}

function hideMiniPlayer() {
    const bar = document.getElementById('miniPlayerBar');
    if(bar) bar.style.display = 'none';
}

function closeMiniPlayer() {
    hideMiniPlayer();
    if(currentAudio) { currentAudio.pause(); currentAudio = null; }
}

function miniTogglePlay() {
    if(!currentAudio) return;
    if(currentAudio.paused) {
        currentAudio.play();
        document.getElementById('miniPlayBtn').textContent = '⏸';
        document.getElementById('modalPlayBtn') && (document.getElementById('modalPlayBtn').textContent = '⏸');
    } else {
        currentAudio.pause();
        document.getElementById('miniPlayBtn').textContent = '▶';
        document.getElementById('modalPlayBtn') && (document.getElementById('modalPlayBtn').textContent = '▶');
    }
}

function miniSeek(e, el) {
    if(!currentAudio) return;
    const rect = el.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.offsetWidth;
    const t = currentAudio.duration * pct;
    if(!isNaN(t)) currentAudio.currentTime = t;
}

function updateMiniPlayer() {
    if(!currentAudio) return;
    const p = currentAudio.currentTime / currentAudio.duration * 100;
    const prog = document.getElementById('miniProgress');
    if(prog) prog.style.width = (p || 0) + '%';
    const cur = document.getElementById('miniCurrentTime');
    if(cur) cur.textContent = formatTime(currentAudio.currentTime);
    const tot = document.getElementById('miniTotalTime');
    if(tot) tot.textContent = formatTime(currentAudio.duration);
    // Sync volume
}

function maximizePlayer() {
    hideMiniPlayer();
    if(currentModalTrack) {
        const modal = document.getElementById('playerModal');
        if(modal) modal.style.display = 'flex';
    }
}

function minimizePlayer() {
    document.getElementById('playerModal').style.display = 'none';
    showMiniPlayer();
}

// ============================================
// PLAYER MODAL
// ============================================

function openPlayerModal(track) {
    if(!track) return;
    currentModalTrack = track;
    hideMiniPlayer();
    const modal = document.getElementById('playerModal');
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.zIndex = '9999';
    document.getElementById('modalCover').src = track.coverImage || '';
    document.getElementById('modalTitle').textContent = track.title;
    document.getElementById('modalArtist').textContent = track.artist || '';
    document.getElementById('modalMeta').textContent =
        (track.genre ? track.genre.toUpperCase() : '') +
        (track.type ? ' • ' + track.type.toUpperCase() : '') +
        (track.bpm ? ' • ' + track.bpm + ' BPM' : '');
    document.getElementById('modalDownloadBtn').href = track.audioFile;
    document.getElementById('modalLikeCount').textContent = track.likes || 0;

    // Minimieren Button hinzufügen falls nicht vorhanden
    if(!document.getElementById('minimizeBtn')) {
        const closeBtn = document.querySelector('#playerModal button[onclick="closePlayerModal()"]');
        if(closeBtn) {
            const minBtn = document.createElement('button');
            minBtn.id = 'minimizeBtn';
            minBtn.onclick = minimizePlayer;
            minBtn.textContent = '—';
            minBtn.title = 'Minimieren';
            minBtn.style.cssText = `
                position:absolute;top:15px;right:55px;
                background:rgba(255,0,255,0.2);
                border:1px solid #ff00ff;
                color:#ff00ff;font-size:1rem;
                cursor:pointer;border-radius:6px;
                padding:2px 10px;
            `;
            closeBtn.parentNode.insertBefore(minBtn, closeBtn);
        }
    }

    if(currentAudio && currentModalTrackId !== track.id) currentAudio.pause();
    currentModalTrackId = track.id;
    currentTrackId = track.id;
    currentAudio = new Audio(track.audioFile);
    currentAudio.volume = document.getElementById('modalVolume').value / 100;
    currentAudio.addEventListener('loadedmetadata', () => {
        document.getElementById('modalTotalTime').textContent = formatTime(currentAudio.duration);
        buildModalWaveform();
    });
    currentAudio.addEventListener('timeupdate', () => {
        document.getElementById('modalCurrentTime').textContent = formatTime(currentAudio.currentTime);
        updateModalWaveform();
        updateMiniPlayer();
    });
    currentAudio.addEventListener('ended', () => {
        document.getElementById('modalPlayBtn').textContent = '▶';
        const miniBtn = document.getElementById('miniPlayBtn');
        if(miniBtn) miniBtn.textContent = '▶';
    });
    currentAudio.play();
    document.getElementById('modalPlayBtn').textContent = '⏸';
    if(typeof incrementPlayCount === 'function') incrementPlayCount(track.id);
    if(typeof checkIfLiked === 'function') {
        checkIfLiked(track.id).then(isLiked => {
            document.getElementById('modalLikeBtn').innerHTML = (isLiked ? '❤️' : '🤍') + ' <span id="modalLikeCount">' + (track.likes || 0) + '</span>';
        });
    }
}

function closePlayerModal(event) {
    if(event && event.target.id !== 'playerModal') return;
    document.getElementById('playerModal').style.display = 'none';
    if(currentAudio) { currentAudio.pause(); currentAudio = null; }
    hideMiniPlayer();
    document.getElementById('modalWaveform').innerHTML = '';
    document.getElementById('modalPlayBtn').textContent = '▶';
}

function modalTogglePlay() {
    if(!currentAudio) return;
    if(currentAudio.paused) {
        currentAudio.play();
        document.getElementById('modalPlayBtn').textContent = '⏸';
        const miniBtn = document.getElementById('miniPlayBtn');
        if(miniBtn) miniBtn.textContent = '⏸';
    } else {
        currentAudio.pause();
        document.getElementById('modalPlayBtn').textContent = '▶';
        const miniBtn = document.getElementById('miniPlayBtn');
        if(miniBtn) miniBtn.textContent = '▶';
    }
}

async function modalToggleLike() {
    if(!currentModalTrackId) return;
    await toggleLike(currentModalTrackId);
    const trackDoc = await db.collection('tracks').doc(currentModalTrackId).get();
    if(trackDoc.exists) {
        const likes = trackDoc.data().likes || 0;
        const likeCount = document.getElementById('modalLikeCount');
        if(likeCount) likeCount.textContent = likes;
    }
}

function buildModalWaveform() {
    const container = document.getElementById('modalWaveform');
    container.innerHTML = '';
    container.style.cssText = 'display:flex;align-items:center;gap:1px;width:100%;height:80px;cursor:pointer;overflow:hidden;';
    container.addEventListener('click', function(e) {
        if(!currentAudio) return;
        const pct = (e.clientX - container.getBoundingClientRect().left) / container.offsetWidth;
        const t = currentAudio.duration * pct;
        if(!isNaN(t)) currentAudio.currentTime = t;
    });
    for(let i = 0; i < 180; i++) {
        const bar = document.createElement('div');
        bar.className = 'modal-bar';
        const h = Math.max(4, Math.abs(Math.sin(i*0.08))*45 + Math.abs(Math.sin(i*0.2+1))*25 + Math.abs(Math.sin(i*0.35+2))*15 + Math.random()*12);
        bar.style.cssText = `width:2px;min-width:2px;height:${h}px;background:rgba(180,180,200,0.5);border-radius:1px;transition:background 0.05s;flex-shrink:0;`;
        container.appendChild(bar);
    }
}

function updateModalWaveform() {
    if(!currentAudio) return;
    const bars = document.querySelectorAll('.modal-bar');
    const p = currentAudio.currentTime / currentAudio.duration;
    bars.forEach((bar, i) => {
        if(i / bars.length <= p) { bar.style.background = 'rgba(255,0,255,1)'; bar.style.boxShadow = '0 0 4px rgba(255,0,255,0.9)'; }
        else { bar.style.background = 'rgba(180,180,200,0.5)'; bar.style.boxShadow = 'none'; }
    });
}

function setVolume(v) { if(currentAudio) currentAudio.volume = v / 100; }

function formatTime(s) {
    if(isNaN(s)) return '0:00';
    return Math.floor(s/60) + ':' + (Math.floor(s%60) < 10 ? '0' : '') + Math.floor(s%60);
}

function showError(msg) {
    document.getElementById('trackListContainer').innerHTML = `<div style="text-align:center;color:#ff0000;padding:40px;"><p style="font-size:1.5rem;">❌ ${msg}</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:rgba(255,0,255,0.3);border:2px solid #ff00ff;color:#fff;border-radius:8px;cursor:pointer;">Reload</button></div>`;
}

// ============================================
// BLOG
// ============================================

const ADMIN_UID = 'DEINE_ADMIN_UID_HIER';

function showBlogPage() {
    const flexWrapper = document.getElementById('mainFlexWrapper');
    if(flexWrapper) flexWrapper.style.display = 'none';
    document.getElementById('profileContainer')?.classList.add('hidden');
    document.getElementById('messagesContainer')?.classList.add('hidden');
    document.getElementById('uploadContainer')?.classList.add('hidden');
    document.getElementById('blogContainer')?.classList.remove('hidden');
    const newPostBtn = document.getElementById('newPostBtn');
    if(newPostBtn && typeof currentUser !== 'undefined' && currentUser) newPostBtn.style.display = currentUser.uid === ADMIN_UID ? 'block' : 'none';
    loadBlogPosts();
}

function showMainPage() {
    const flexWrapper = document.getElementById('mainFlexWrapper');
    if(flexWrapper) flexWrapper.style.display = 'flex';
    document.getElementById('blogContainer')?.classList.add('hidden');
    document.getElementById('profileContainer')?.classList.add('hidden');
    document.getElementById('messagesContainer')?.classList.add('hidden');
    document.getElementById('uploadContainer')?.classList.add('hidden');
}

function toggleNewPostForm() {
    const form = document.getElementById('newPostForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function submitBlogPost() {
    const title = document.getElementById('blogTitle').value.trim();
    const text = document.getElementById('blogText').value.trim();
    const image = document.getElementById('blogImage').value.trim();
    const video = document.getElementById('blogVideo').value.trim();
    if(!title || !text) { alert('Please enter title and text!'); return; }
    try {
        await db.collection('blog').add({ title, text, image, video, authorId: currentUser.uid, createdAt: new Date().toISOString() });
        document.getElementById('blogTitle').value = ''; document.getElementById('blogText').value = '';
        document.getElementById('blogImage').value = ''; document.getElementById('blogVideo').value = '';
        document.getElementById('newPostForm').style.display = 'none';
        alert('✅ Post published!'); loadBlogPosts();
    } catch(e) { alert('❌ Error: ' + e.message); }
}

async function loadBlogPosts() {
    const container = document.getElementById('blogPostsList');
    if(!container) return;
    container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;font-family:Orbitron,sans-serif;font-size:0.8rem;">Loading...</p>';
    try {
        const snap = await db.collection('blog').orderBy('createdAt', 'desc').get();
        if(snap.empty) { container.innerHTML = '<p style="color:#555;text-align:center;padding:60px;font-family:Orbitron,sans-serif;font-size:0.8rem;">No posts yet. Stay tuned! 🎧</p>'; return; }
        container.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            const date = new Date(p.createdAt).toLocaleDateString('de-DE', { year:'numeric', month:'long', day:'numeric' });
            let videoEmbed = '';
            if(p.video) { const match = p.video.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/); if(match) videoEmbed = `<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #ff00ff44;"><iframe width="100%" height="360" src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allowfullscreen style="display:block;"></iframe></div>`; }
            const imageHtml = p.image ? `<img src="${p.image}" style="width:100%;max-height:400px;object-fit:cover;border-radius:12px;margin-bottom:20px;border:1px solid #ff00ff44;">` : '';
            const deleteBtn = (typeof currentUser !== 'undefined' && currentUser && currentUser.uid === ADMIN_UID) ? `<button onclick="deleteBlogPost('${doc.id}')" style="background:rgba(255,0,0,0.2);border:1px solid #ff4444;color:#ff4444;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.7rem;font-family:Orbitron,sans-serif;margin-top:10px;">🗑️ DELETE</button>` : '';
            const card = document.createElement('div');
            card.style.cssText = 'background:rgba(0,0,0,0.6);border:1px solid #ff00ff33;border-radius:16px;padding:30px;margin-bottom:25px;box-shadow:0 0 20px rgba(255,0,255,0.1);';
            card.innerHTML = `<div style="color:#666;font-family:Orbitron,sans-serif;font-size:0.65rem;letter-spacing:1px;margin-bottom:10px;">📅 ${date}</div><h2 style="font-family:Orbitron,sans-serif;color:#ff00ff;font-size:1.2rem;letter-spacing:2px;margin-bottom:16px;text-shadow:0 0 15px rgba(255,0,255,0.5);">${p.title}</h2>${imageHtml}<p style="color:#ccc;font-size:0.95rem;line-height:1.8;white-space:pre-wrap;">${p.text}</p>${videoEmbed}${deleteBtn}`;
            container.appendChild(card);
        });
    } catch(e) { container.innerHTML = `<p style="color:#ff4444;text-align:center;padding:40px;">Error: ${e.message}</p>`; }
}

async function deleteBlogPost(id) {
    if(!confirm('Delete this post?')) return;
    await db.collection('blog').doc(id).delete();
    loadBlogPosts();
}

// ============================================
// FORUM
// ============================================

const FORUM_CATEGORIES = [
    { id: 'production', icon: '🎛️', title: 'Production Tips', desc: 'Share your production knowledge and techniques', color: '#ff00ff' },
    { id: 'vst', icon: '🔌', title: 'VST Plugins', desc: 'Reviews, recommendations and questions about plugins', color: '#00ffff' },
    { id: 'daw', icon: '🎹', title: 'DAW Talk', desc: 'Ableton, FL Studio, Logic, Cubase and more', color: '#ffff00' },
    { id: 'contests', icon: '🏆', title: 'Remix Contests', desc: 'Announcements and submissions for remix contests', color: '#ff8800' },
    { id: 'general', icon: '💬', title: 'General Chat', desc: 'Everything else – music, life, gear', color: '#00ff88' },
];

let currentForumCategory = null;
let currentForumThread = null;

function showForumPage() {
    const flexWrapper = document.getElementById('mainFlexWrapper');
    if(flexWrapper) flexWrapper.style.display = 'none';
    document.getElementById('profileContainer')?.classList.add('hidden');
    document.getElementById('messagesContainer')?.classList.add('hidden');
    document.getElementById('blogContainer')?.classList.add('hidden');
    document.getElementById('uploadContainer')?.classList.add('hidden');
    document.getElementById('forumContainer')?.classList.remove('hidden');
    const btn = document.getElementById('newThreadBtn');
    if(btn) btn.style.display = (typeof currentUser !== 'undefined' && currentUser) ? 'block' : 'none';
    showForumCategories();
}

function showForumCategories() {
    currentForumCategory = null; currentForumThread = null;
    document.getElementById('forumCategoriesView').style.display = 'block';
    document.getElementById('forumThreadsView').style.display = 'none';
    document.getElementById('forumPostView').style.display = 'none';
    document.getElementById('newThreadForm').style.display = 'none';
    document.getElementById('newThreadBtn').style.display = (typeof currentUser !== 'undefined' && currentUser) ? 'block' : 'none';
    const container = document.getElementById('forumCategoriesView');
    container.innerHTML = '';
    FORUM_CATEGORIES.forEach(cat => {
        const card = document.createElement('div');
        card.style.cssText = `background:rgba(0,0,0,0.6);border:2px solid ${cat.color}44;border-radius:16px;padding:25px 30px;margin-bottom:15px;cursor:pointer;display:flex;align-items:center;gap:20px;transition:all 0.3s;box-shadow:0 0 15px ${cat.color}11;`;
        card.onmouseover = () => { card.style.borderColor = cat.color; card.style.boxShadow = `0 0 25px ${cat.color}33`; card.style.transform = 'translateX(5px)'; };
        card.onmouseout = () => { card.style.borderColor = cat.color+'44'; card.style.boxShadow = `0 0 15px ${cat.color}11`; card.style.transform = 'translateX(0)'; };
        card.onclick = () => openForumCategory(cat);
        card.innerHTML = `<div style="font-size:2.5rem;flex-shrink:0;">${cat.icon}</div><div style="flex:1;"><div style="font-family:'Orbitron',sans-serif;font-size:1rem;color:${cat.color};letter-spacing:2px;margin-bottom:6px;text-shadow:0 0 10px ${cat.color}66;">${cat.title}</div><div style="color:#888;font-size:0.85rem;">${cat.desc}</div></div><div id="catCount_${cat.id}" style="color:#666;font-family:'Orbitron',sans-serif;font-size:0.7rem;text-align:center;flex-shrink:0;"><div style="color:${cat.color};font-size:1.2rem;font-weight:bold;">–</div><div>threads</div></div><div style="color:${cat.color};font-size:1.5rem;flex-shrink:0;">›</div>`;
        container.appendChild(card);
        db.collection('forumThreads').where('categoryId', '==', cat.id).get().then(snap => { const el = document.getElementById('catCount_'+cat.id); if(el) el.innerHTML = `<div style="color:${cat.color};font-size:1.2rem;font-weight:bold;">${snap.size}</div><div>threads</div>`; }).catch(() => {});
    });
}

async function openForumCategory(cat) {
    currentForumCategory = cat;
    document.getElementById('forumCategoriesView').style.display = 'none';
    document.getElementById('forumThreadsView').style.display = 'block';
    document.getElementById('forumPostView').style.display = 'none';
    const container = document.getElementById('forumThreadsView');
    container.innerHTML = `<div style="display:flex;align-items:center;gap:15px;margin-bottom:25px;flex-wrap:wrap;"><button onclick="showForumCategories()" style="background:rgba(0,0,0,0.4);border:1px solid #444;color:#aaa;padding:8px 16px;border-radius:8px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:0.7rem;transition:all 0.3s;">← BACK</button><h2 style="font-family:'Orbitron',sans-serif;color:${cat.color};font-size:1rem;letter-spacing:2px;text-shadow:0 0 10px ${cat.color}66;">${cat.icon} ${cat.title}</h2></div><div id="threadsList"><p style="color:#666;text-align:center;padding:40px;font-family:Orbitron,sans-serif;font-size:0.8rem;">Loading threads...</p></div>`;
    try {
        const snap = await db.collection('forumThreads').where('categoryId', '==', cat.id).get();
        const threadsList = document.getElementById('threadsList');
        let threads = [];
        snap.forEach(doc => threads.push({ id: doc.id, ...doc.data() }));
        threads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        if(threads.length === 0) { threadsList.innerHTML = `<p style="color:#555;text-align:center;padding:60px;font-family:Orbitron,sans-serif;font-size:0.8rem;">No threads yet. Be the first! 🎧</p>`; return; }
        threadsList.innerHTML = '';
        threads.forEach(thread => {
            const date = new Date(thread.createdAt).toLocaleDateString('de-DE');
            const row = document.createElement('div');
            row.style.cssText = `background:rgba(0,0,0,0.5);border:1px solid ${cat.color}33;border-radius:12px;padding:18px 22px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;gap:15px;transition:all 0.3s;`;
            row.onmouseover = () => { row.style.borderColor = cat.color; row.style.background = 'rgba(0,0,0,0.7)'; };
            row.onmouseout = () => { row.style.borderColor = cat.color+'33'; row.style.background = 'rgba(0,0,0,0.5)'; };
            row.onclick = () => openForumThread(thread, cat);
            row.innerHTML = `<div style="font-size:1.5rem;flex-shrink:0;">💬</div><div style="flex:1;min-width:0;"><div style="font-family:'Orbitron',sans-serif;color:#fff;font-size:0.85rem;letter-spacing:1px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${thread.title}</div><div style="color:#666;font-size:0.75rem;">by <span style="color:${cat.color};">${thread.authorName || 'Unknown'}</span> · ${date} · <span id="replyCount_${thread.id}">– replies</span></div></div><div style="color:${cat.color};font-size:1.2rem;flex-shrink:0;">›</div>`;
            threadsList.appendChild(row);
            db.collection('forumReplies').where('threadId', '==', thread.id).get().then(s => { const el = document.getElementById('replyCount_'+thread.id); if(el) el.textContent = s.size+' replies'; }).catch(() => {});
        });
    } catch(e) { document.getElementById('threadsList').innerHTML = `<p style="color:#ff4444;text-align:center;padding:40px;">Error: ${e.message}</p>`; }
}

async function openForumThread(thread, cat) {
    currentForumThread = thread;
    document.getElementById('forumThreadsView').style.display = 'none';
    document.getElementById('forumPostView').style.display = 'block';
    document.getElementById('newThreadForm').style.display = 'none';
    const container = document.getElementById('forumPostView');
    container.innerHTML = `<div style="display:flex;align-items:center;gap:15px;margin-bottom:25px;flex-wrap:wrap;"><button onclick="openForumCategory(currentForumCategory)" style="background:rgba(0,0,0,0.4);border:1px solid #444;color:#aaa;padding:8px 16px;border-radius:8px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:0.7rem;">← BACK</button><h2 style="font-family:'Orbitron',sans-serif;color:#00ffff;font-size:0.9rem;letter-spacing:1px;">${thread.title}</h2></div><div style="background:rgba(0,0,0,0.6);border:2px solid ${cat.color}44;border-radius:16px;padding:25px;margin-bottom:20px;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:15px;"><img src="${thread.authorAvatar||''}" onerror="this.src=''" style="width:44px;height:44px;border-radius:50%;border:2px solid ${cat.color};object-fit:cover;"><div><div style="font-family:'Orbitron',sans-serif;color:${cat.color};font-size:0.8rem;">${thread.authorName||'Unknown'}</div><div style="color:#666;font-size:0.7rem;">${new Date(thread.createdAt).toLocaleString('de-DE')}</div></div></div><p style="color:#ddd;font-size:0.95rem;line-height:1.8;white-space:pre-wrap;">${thread.text}</p></div><div id="repliesList"></div><div id="replyFormArea" style="margin-top:20px;"></div>`;
    loadReplies(thread.id, cat);
    const replyArea = document.getElementById('replyFormArea');
    if(typeof currentUser !== 'undefined' && currentUser) {
        replyArea.innerHTML = `<div style="background:rgba(0,0,0,0.6);border:1px solid #00ffff33;border-radius:12px;padding:20px;"><h4 style="font-family:'Orbitron',sans-serif;color:#00ffff;font-size:0.75rem;letter-spacing:2px;margin-bottom:15px;">YOUR REPLY</h4><textarea id="replyText" placeholder="Write your reply..." style="width:100%;padding:12px;margin-bottom:15px;background:rgba(0,0,0,0.5);border:1px solid #00ffff33;border-radius:8px;color:#fff;font-family:'Courier New',monospace;min-height:100px;resize:vertical;box-sizing:border-box;font-size:0.9rem;"></textarea><button onclick="submitReply('${thread.id}')" style="background:rgba(0,255,255,0.2);border:2px solid #00ffff;color:#fff;padding:10px 25px;border-radius:8px;cursor:pointer;font-family:'Orbitron',sans-serif;font-size:0.7rem;letter-spacing:1px;transition:all 0.3s;">💬 REPLY</button></div>`;
    } else {
        replyArea.innerHTML = `<p style="color:#666;text-align:center;padding:20px;font-family:'Orbitron',sans-serif;font-size:0.75rem;"><a onclick="document.getElementById('loginBtn').click()" style="color:#00ffff;cursor:pointer;">LOGIN</a> to reply</p>`;
    }
}

async function loadReplies(threadId, cat) {
    const container = document.getElementById('repliesList');
    if(!container) return;
    try {
        const snap = await db.collection('forumReplies').where('threadId', '==', threadId).get();
        let replies = [];
        snap.forEach(doc => replies.push({ id: doc.id, ...doc.data() }));
        replies.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        container.innerHTML = '';
        replies.forEach(reply => {
            const div = document.createElement('div');
            div.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid #ffffff11;border-radius:12px;padding:20px;margin-bottom:12px;';
            div.innerHTML = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;"><img src="${reply.authorAvatar||''}" onerror="this.src=''" style="width:36px;height:36px;border-radius:50%;border:2px solid #ffffff22;object-fit:cover;"><div><div style="font-family:'Orbitron',sans-serif;color:#00ffff;font-size:0.75rem;">${reply.authorName||'Unknown'}</div><div style="color:#666;font-size:0.7rem;">${new Date(reply.createdAt).toLocaleString('de-DE')}</div></div>${(typeof currentUser !== 'undefined' && currentUser && currentUser.uid === reply.authorId) ? `<button onclick="deleteReply('${reply.id}')" style="margin-left:auto;background:rgba(255,0,0,0.2);border:1px solid #ff4444;color:#ff4444;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.7rem;">🗑️</button>` : ''}</div><p style="color:#ccc;font-size:0.9rem;line-height:1.7;white-space:pre-wrap;">${reply.text}</p>`;
            container.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

async function submitReply(threadId) {
    const text = document.getElementById('replyText')?.value.trim();
    if(!text) { alert('Please write something!'); return; }
    if(!currentUser) { alert('Please login!'); return; }
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        await db.collection('forumReplies').add({ threadId, text, authorId: currentUser.uid, authorName: userData.username||'Unknown', authorAvatar: userData.avatar||'', createdAt: new Date().toISOString() });
        document.getElementById('replyText').value = '';
        loadReplies(threadId, currentForumCategory);
    } catch(e) { alert('Error: ' + e.message); }
}

async function deleteReply(replyId) {
    if(!confirm('Delete this reply?')) return;
    await db.collection('forumReplies').doc(replyId).delete();
    loadReplies(currentForumThread.id, currentForumCategory);
}

function showNewThreadForm() {
    if(!currentUser) { alert('Please login to create a thread!'); return; }
    document.getElementById('newThreadForm').style.display = 'block';
    document.getElementById('forumCategoriesView').style.display = 'none';
    document.getElementById('forumThreadsView').style.display = 'none';
    document.getElementById('forumPostView').style.display = 'none';
}

function hideNewThreadForm() {
    document.getElementById('newThreadForm').style.display = 'none';
    if(currentForumCategory) openForumCategory(currentForumCategory);
    else showForumCategories();
}

async function submitNewThread() {
    const title = document.getElementById('threadTitle')?.value.trim();
    const text = document.getElementById('threadText')?.value.trim();
    if(!title || !text) { alert('Please fill in title and message!'); return; }
    if(!currentUser) { alert('Please login!'); return; }
    if(!currentForumCategory) { alert('Please select a category first!'); return; }
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        await db.collection('forumThreads').add({ categoryId: currentForumCategory.id, title, text, authorId: currentUser.uid, authorName: userData.username||'Unknown', authorAvatar: userData.avatar||'', createdAt: new Date().toISOString() });
        document.getElementById('threadTitle').value = ''; document.getElementById('threadText').value = '';
        alert('✅ Thread posted!');
        openForumCategory(currentForumCategory);
    } catch(e) { alert('Error: ' + e.message); }
}
