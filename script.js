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
// RENDER TRACKS
// ============================================

function renderTracks() {
    const container = document.getElementById('trackListContainer');
    if(filteredTracks.length === 0) {
        container.innerHTML = `<div style="text-align:center;color:#00ffff;padding:60px 20px;"><p style="font-size:1.8rem;margin-bottom:15px;">🎵 No tracks found</p><p style="font-size:1rem;color:#666;">Upload your first tracks!</p></div>`;
        return;
    }

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
// GRID CARD
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
// WAVEFORM CACHE - speichert analysierte Daten
// ============================================

const waveformCache = {};

// ============================================
// WEB AUDIO API - ECHTE WAVEFORM ANALYSE
// ============================================

async function analyzeAudioWaveform(audioUrl, numBars) {
    // Cache prüfen
    if(waveformCache[audioUrl]) {
        console.log('✅ Waveform from cache:', audioUrl.split('/').pop());
        return waveformCache[audioUrl];
    }

    console.log('🔍 Fetching for analysis:', audioUrl.split('/').pop());
    try {
        const response = await fetch(audioUrl);
        if(!response.ok) throw new Error('HTTP ' + response.status);
        console.log('✅ Fetch OK! Size:', response.headers.get('content-length'), 'bytes');
        const arrayBuffer = await response.arrayBuffer();
        console.log('✅ Buffer:', arrayBuffer.byteLength, 'bytes');

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        audioCtx.close();
        console.log('✅ Decoded! Duration:', audioBuffer.duration.toFixed(1), 'sec, Samples:', audioBuffer.length);

        const channelData = audioBuffer.getChannelData(0);
        const length = channelData.length;
        const samplesPerBar = Math.floor(length / numBars);

        const peaks = [];
        for(let i = 0; i < numBars; i++) {
            const start = i * samplesPerBar;
            let max = 0;
            for(let j = 0; j < samplesPerBar; j++) {
                const abs = Math.abs(channelData[start + j] || 0);
                if(abs > max) max = abs;
            }
            peaks.push(max);
        }

        const maxPeak = Math.max(...peaks, 0.001);
        const normalized = peaks.map(p => p / maxPeak);

        waveformCache[audioUrl] = normalized;
        console.log('✅ REAL waveform ready!');
        return normalized;

    } catch(e) {
        console.warn('❌ Analysis failed:', e.message, '| URL:', audioUrl.split('/').pop());
        return null;
    }
}

// ============================================
// WAVEFORM ZEICHNEN (Canvas-basiert)
// ============================================

function drawWaveformCanvas(container, peaks, progress, height) {
    container.innerHTML = '';
    const numBars = peaks.length;
    const containerWidth = container.offsetWidth || 860;
    const barWidth = Math.max(2, Math.floor((containerWidth - numBars) / numBars));
    const gap = 1;

    const canvas = document.createElement('canvas');
    canvas.width = containerWidth;
    canvas.height = height;
    canvas.style.cssText = 'width:100%;height:100%;display:block;border-radius:8px;';
    canvas.id = 'waveCanvas';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const centerY = height / 2;

    function draw(prog) {
        ctx.clearRect(0, 0, canvas.width, height);

        for(let i = 0; i < numBars; i++) {
            const x = i * (barWidth + gap);
            const barHeight = Math.max(3, peaks[i] * (height * 0.85));
            const y = centerY - barHeight / 2;
            const played = (i / numBars) <= prog;

            if(played) {
                // Gespielter Teil: Pink/Magenta
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                gradient.addColorStop(0, 'rgba(255, 0, 255, 1)');
                gradient.addColorStop(0.5, 'rgba(255, 80, 255, 1)');
                gradient.addColorStop(1, 'rgba(200, 0, 200, 1)');
                ctx.fillStyle = gradient;
                ctx.shadowColor = 'rgba(255,0,255,0.8)';
                ctx.shadowBlur = 6;
            } else {
                // Ungespielter Teil: Grau/Blau
                ctx.fillStyle = 'rgba(160, 160, 200, 0.45)';
                ctx.shadowBlur = 0;
            }

            // Abgerundete Balken
            const radius = Math.min(barWidth / 2, 2);
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + barWidth - radius, y);
            ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
            ctx.lineTo(x + barWidth, y + barHeight - radius);
            ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight);
            ctx.lineTo(x + radius, y + barHeight);
            ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
        }

        ctx.shadowBlur = 0;

        // Cursor-Linie
        const cursorX = prog * containerWidth;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, height);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    draw(progress || 0);

    // Klick-Event für Seek
    canvas.addEventListener('click', function(e) {
        if(!currentAudio) return;
        const rect = canvas.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        if(wavesurfer) {
            wavesurfer.seekTo(Math.max(0, Math.min(1, pct)));
        } else if(currentAudio && currentAudio.duration) {
            currentAudio.currentTime = pct * currentAudio.duration;
        }
        if(typeof currentUser !== 'undefined' && currentUser) {
            const t = (currentAudio.duration || 0) * pct;
            openWaveformComment(t);
        }
    });

    return draw;
}

// ============================================
// FALLBACK WAVEFORM (wenn Analyse fehlschlägt)
// ============================================

function generateFallbackPeaks(numBars, seed) {
    // Seeded pseudo-random damit jeder Track anders aussieht
    seed = seed || 12345;
    function seededRand(s) {
        s = Math.sin(s * 9301 + 49297) * 233280;
        return s - Math.floor(s);
    }

    const peaks = [];
    // Zufaellige Parameter basierend auf seed - jeder Track hat andere Frequenzen
    const freq1 = 0.04 + seededRand(seed) * 0.06;
    const freq2 = 0.12 + seededRand(seed + 1) * 0.15;
    const freq3 = 0.3 + seededRand(seed + 2) * 0.2;
    const phase1 = seededRand(seed + 3) * Math.PI * 2;
    const phase2 = seededRand(seed + 4) * Math.PI * 2;
    const phase3 = seededRand(seed + 5) * Math.PI * 2;

    for(let i = 0; i < numBars; i++) {
        const base = Math.abs(Math.sin(i * freq1 + phase1)) * 0.5;
        const mid  = Math.abs(Math.sin(i * freq2 + phase2)) * 0.3;
        const high = Math.abs(Math.sin(i * freq3 + phase3)) * 0.15;
        const noise = seededRand(seed + i + 10) * 0.08;
        const envelope = Math.sin((i / numBars) * Math.PI);
        peaks.push(Math.max(0.04, (base + mid + high + noise) * (0.3 + envelope * 0.7)));
    }
    const max = Math.max(...peaks, 0.001);
    return peaks.map(p => p / max);
}

// ============================================
// MINI PLAYER BAR
// ============================================

let currentModalTrack = null;
let currentModalTrackId = null;
let currentPlayingTrack = null;
let wavesurfer = null;
let waveDrawFn = null; // Funktion zum Neu-Zeichnen der Waveform
let trackHistory = []; // History fuer Backward Button
let trackHistoryIndex = -1; // Aktueller Index in der History

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
        <img id="miniCover" src="" style="width:42px;height:42px;border-radius:6px;object-fit:cover;border:1px solid #ff00ff;flex-shrink:0;">
        <div style="flex:1;min-width:0;cursor:pointer;" onclick="maximizePlayer()">
            <div id="miniTitle" style="color:#fff;font-size:0.85rem;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
            <div id="miniArtist" style="color:#00ffff;font-size:0.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
        </div>
        <div style="flex:2;min-width:0;cursor:pointer;" id="miniProgressWrapper" onclick="miniSeek(event, this)">
            <div id="miniProgressBar" style="height:8px;background:rgba(255,255,255,0.15);border-radius:4px;position:relative;">
                <div id="miniProgress" style="height:100%;background:#ff00ff;border-radius:4px;width:0%;transition:width 0.1s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;">
                <span id="miniCurrentTime" style="color:#888;font-size:0.65rem;">0:00</span>
                <span id="miniTotalTime" style="color:#888;font-size:0.65rem;">0:00</span>
            </div>
        </div>
        <!-- PREV -->
        <button onclick="playPrevTrack()" title="Vorheriger Track" style="
            width:30px;height:30px;border-radius:50%;
            background:rgba(255,0,255,0.15);border:1px solid #ff00ff55;
            color:#ff00ff;font-size:0.8rem;cursor:pointer;flex-shrink:0;
        ">⏮</button>

        <button id="miniPlayBtn" onclick="miniTogglePlay()" style="
            width:38px;height:38px;border-radius:50%;
            background:linear-gradient(135deg,#ff00ff,#00ffff);
            border:none;color:#000;font-size:1rem;
            cursor:pointer;flex-shrink:0;
        ">⏸</button>

        <!-- NEXT -->
        <button onclick="playNextTrack()" title="Nächster Track (Genre Shuffle)" style="
            width:30px;height:30px;border-radius:50%;
            background:rgba(255,0,255,0.15);border:1px solid #ff00ff55;
            color:#ff00ff;font-size:0.8rem;cursor:pointer;flex-shrink:0;
        ">⏭</button>

        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
            <span style="color:#aaa;font-size:0.85rem;">🔊</span>
            <input type="range" id="miniVolume" min="0" max="100" value="80" oninput="setVolume(this.value)" style="width:70px;accent-color:#ff00ff;cursor:pointer;touch-action:none;">
        </div>
        <button onclick="maximizePlayer()" style="
            background:rgba(255,0,255,0.2);border:1px solid #ff00ff;
            color:#ff00ff;border-radius:6px;padding:6px 10px;
            cursor:pointer;font-size:0.75rem;flex-shrink:0;
        ">⬆ Öffnen</button>
        <button onclick="closeMiniPlayer()" style="
            background:transparent;border:none;
            color:#555;font-size:1.2rem;cursor:pointer;flex-shrink:0;
        ">✕</button>
    `;
    document.body.appendChild(bar);
}

function showMiniPlayer() {
    createMiniPlayer();
    const track = currentPlayingTrack || currentModalTrack;
    if(!track) return;
    document.getElementById('miniCover').src = track.coverImage || '';
    document.getElementById('miniTitle').textContent = track.title || '';
    document.getElementById('miniArtist').textContent = track.artist || '';
    document.getElementById('miniPlayerBar').style.display = 'flex';
}

function hideMiniPlayer() {
    const bar = document.getElementById('miniPlayerBar');
    if(bar) bar.style.display = 'none';
}

function closeMiniPlayer() {
    hideMiniPlayer();
    if(currentAudio) { currentAudio.pause(); currentAudio = null; }
    currentPlayingTrack = null;
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
    // Den eigentlichen Progressbar nehmen (nicht den ganzen Wrapper)
    const bar = document.getElementById('miniProgressBar') || el;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.offsetWidth));
    const t = (currentAudio.duration || 0) * pct;
    if(!isNaN(t) && t >= 0) {
        if(wavesurfer) wavesurfer.seekTo(pct);
        else currentAudio.currentTime = t;
    }
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
}

function maximizePlayer() {
    const bar = document.getElementById('miniPlayerBar');
    if(bar) bar.style.display = 'none';
    if(currentModalTrack) {
        const modal = document.getElementById('playerModal');
        if(modal) modal.style.display = 'flex';
        document.getElementById('modalPlayBtn').textContent = currentAudio && !currentAudio.paused ? '⏸' : '▶';
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

    const miniBar = document.getElementById('miniPlayerBar');
    const miniRunning = miniBar && miniBar.style.display === 'flex' && currentAudio && !currentAudio.paused;

    const modal = document.getElementById('playerModal');
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.zIndex = '9999';

    // Share Popup immer schliessen beim Oeffnen eines Tracks
    const sp = document.getElementById('sharePopup');
    if(sp) sp.style.display = 'none';

    document.getElementById('modalCover').src = track.coverImage || '';
    document.getElementById('modalTitle').textContent = track.title;

    const artistEl = document.getElementById('modalArtist');
    artistEl.textContent = track.artist || '';
    artistEl.style.cursor = 'pointer';
    artistEl.style.textDecoration = 'underline';
    artistEl.onclick = () => {
        document.getElementById('playerModal').style.display = 'none';
        if(typeof openProfile === 'function') openProfile(track.userId);
    };

    document.getElementById('modalMeta').textContent =
        (track.genre ? track.genre.toUpperCase() : '') +
        (track.type ? ' • ' + track.type.toUpperCase() : '') +
        (track.bpm ? ' • ' + track.bpm + ' BPM' : '');
    document.getElementById('modalDownloadBtn').href = track.audioFile || '#';
    document.getElementById('modalLikeCount').textContent = track.likes || 0;

    // Minimieren Button
    if(!document.getElementById('minimizeBtn')) {
        const closeBtn = document.querySelector('#playerModal button[onclick="closePlayerModal()"]');
        if(closeBtn) {
            const minBtn = document.createElement('button');
            minBtn.id = 'minimizeBtn';
            minBtn.onclick = minimizePlayer;
            minBtn.textContent = '—';
            minBtn.title = 'Minimieren';
            minBtn.style.cssText = 'position:absolute;top:15px;right:55px;background:rgba(255,0,255,0.2);border:1px solid #ff00ff;color:#ff00ff;font-size:1rem;cursor:pointer;border-radius:6px;padding:2px 10px;';
            closeBtn.parentNode.insertBefore(minBtn, closeBtn);
        }
    }

    if(miniRunning && currentModalTrack && track.id !== currentModalTrack.id) {
        currentModalTrack = track;
        document.getElementById('modalPlayBtn').textContent = '▶';
        document.getElementById('modalWaveform').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:110px;color:#666;font-family:Orbitron,sans-serif;font-size:0.75rem;">▶ Press play to load waveform</div>';
        document.getElementById('modalCurrentTime').textContent = '0:00';
        document.getElementById('modalTotalTime').textContent = '0:00';
        if(typeof checkIfLiked === 'function') {
            checkIfLiked(track.id).then(isLiked => {
                document.getElementById('modalLikeBtn').innerHTML = (isLiked ? '❤️' : '🤍') + ' <span id="modalLikeCount">' + (track.likes || 0) + '</span>';
            });
        }
        return;
    }

    currentModalTrack = track;
    currentPlayingTrack = track;
    if(miniBar) miniBar.style.display = 'none';
    if(currentAudio) { currentAudio.pause(); currentAudio = null; }

    currentModalTrackId = track.id;
    currentTrackId = track.id;

    // Track History aufzeichnen
    if(trackHistory.length === 0 || trackHistory[trackHistory.length - 1].id !== track.id) {
        trackHistory.push(track);
        if(trackHistory.length > 50) trackHistory.shift(); // Max 50 Tracks
        trackHistoryIndex = trackHistory.length - 1;
    }

    initWaveSurfer(track);

    if(typeof incrementPlayCount === 'function') incrementPlayCount(track.id);
    if(typeof checkIfLiked === 'function') {
        checkIfLiked(track.id).then(isLiked => {
            document.getElementById('modalLikeBtn').innerHTML = (isLiked ? '❤️' : '🤍') + ' <span id="modalLikeCount">' + (track.likes || 0) + '</span>';
        });
    }
    loadModalComments(track.id);
    if(typeof loadRepostCount === 'function') loadRepostCount(track.id);
}

// ============================================
// INIT WAVESURFER - MIT WEB AUDIO FALLBACK
// ============================================

function initWaveSurfer(track) {
    if(wavesurfer) { try { wavesurfer.destroy(); } catch(e) {} wavesurfer = null; }
    if(currentAudio) { try { currentAudio.pause(); } catch(e) {} currentAudio = null; }
    waveDrawFn = null;

    const container = document.getElementById('modalWaveform');
    container.innerHTML = '';
    container.style.cssText = 'position:relative;width:100%;height:110px;cursor:pointer;overflow:hidden;border-radius:8px;background:rgba(0,0,0,0.4);';

    // Lade-Indikator
    const loader = document.createElement('div');
    loader.id = 'waveLoader';
    loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ff00ff;font-family:Orbitron,sans-serif;font-size:0.75rem;letter-spacing:2px;z-index:10;background:rgba(0,0,0,0.4);border-radius:8px;';
    loader.innerHTML = '<span>⚡ ANALYZING WAVEFORM...</span>';
    container.appendChild(loader);

    // IMMER direkt mit Audio Element + echter Analyse starten
    // WaveSurfer nur fuer Wiedergabe wenn verfuegbar, NICHT fuer Waveform-Zeichnung
    startDirectAudioWithRealWaveform(track);
}

function startDirectAudioWithRealWaveform(track) {
    const container = document.getElementById('modalWaveform');
    const NUM_BARS = 300;
    const trackSeed = (track.id || track.title || 'x').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // SCHRITT 1: Audio sofort starten
    currentAudio = new Audio(track.audioFile);
    currentAudio.volume = (document.getElementById('modalVolume').value || 80) / 100;

    currentAudio.addEventListener('loadedmetadata', () => {
        document.getElementById('modalTotalTime').textContent = formatTime(currentAudio.duration);
    });
    currentAudio.addEventListener('timeupdate', () => {
        const progress = currentAudio.currentTime / (currentAudio.duration || 1);
        document.getElementById('modalCurrentTime').textContent = formatTime(currentAudio.currentTime);
        if(waveDrawFn) waveDrawFn(progress);
        updateMiniPlayer();
    });
    currentAudio.addEventListener('ended', () => {
        document.getElementById('modalPlayBtn').textContent = '▶';
        const miniBtn = document.getElementById('miniPlayBtn');
        if(miniBtn) miniBtn.textContent = '▶';
        if(waveDrawFn) waveDrawFn(0);
    });
    currentAudio.play().then(() => {
        document.getElementById('modalPlayBtn').textContent = '⏸';
    }).catch(() => {
        document.getElementById('modalPlayBtn').textContent = '▶';
    });

    // SCHRITT 2: Sofort Fallback Waveform zeigen (Ton läuft schon!)
    const loaderEl = document.getElementById('waveLoader');
    if(loaderEl) loaderEl.remove();
    const fallbackPeaks = generateFallbackPeaks(NUM_BARS, trackSeed);
    waveDrawFn = drawWaveformCanvas(container, fallbackPeaks, 0, 110);
    setTimeout(() => loadWaveformComments(currentModalTrackId), 300);

    // SCHRITT 3: Echte Analyse im Hintergrund via fetch
    // R2 CORS ist jetzt erlaubt - fetch sollte klappen!
    const audioUrl = track.audioFile;
    analyzeAudioWaveform(audioUrl, NUM_BARS).then(peaks => {
        if(!peaks) {
            console.log('❌ Analyse fehlgeschlagen, Fallback bleibt');
            return;
        }
        console.log('✅ Echte Waveform wird gezeichnet!');
        // Aktuellen Progress vom laufenden Audio holen
        const prog = (currentAudio && currentAudio.duration) 
            ? (currentAudio.currentTime / currentAudio.duration) 
            : 0;
        waveDrawFn = drawWaveformCanvas(container, peaks, prog, 110);
    });
}

// DUMMY - wird nicht mehr aufgerufen, aber fuer Kompatibilitaet behalten
function initWaveSurferOLD(track) {
    if(typeof WaveSurfer !== 'undefined') {
        // WaveSurfer vorhanden → echte Waveform via WaveSurfer
        try {
            wavesurfer = WaveSurfer.create({
                container: '#modalWaveform',
                waveColor: 'rgba(160,160,200,0.45)',
                progressColor: '#ff00ff',
                cursorColor: 'rgba(0,255,255,0.9)',
                cursorWidth: 2,
                barWidth: 3,
                barGap: 1,
                barRadius: 2,
                height: 110,
                normalize: true,
                backend: 'WebAudio',
                hideScrollbar: true,
                interact: true,
                fillParent: true,
                pixelRatio: 1,
                xhr: { cache: 'default', mode: 'cors', credentials: 'omit' },
            });

            wavesurfer.load(track.audioFile);

            wavesurfer.on('ready', () => {
                const loaderEl = document.getElementById('waveLoader');
                if(loaderEl) loaderEl.remove();

                const vol = document.getElementById('modalVolume').value / 100;
                wavesurfer.setVolume(vol);
                document.getElementById('modalTotalTime').textContent = formatTime(wavesurfer.getDuration());
                wavesurfer.play();
                document.getElementById('modalPlayBtn').textContent = '⏸';

                currentAudio = {
                    _ws: wavesurfer,
                    get paused() { return !wavesurfer || !wavesurfer.isPlaying(); },
                    get currentTime() { return wavesurfer ? wavesurfer.getCurrentTime() : 0; },
                    set currentTime(t) { if(wavesurfer) wavesurfer.seekTo(t / wavesurfer.getDuration()); },
                    get duration() { return wavesurfer ? wavesurfer.getDuration() : 0; },
                    get volume() { return vol; },
                    set volume(v) { if(wavesurfer) wavesurfer.setVolume(v); },
                    play() { if(wavesurfer) wavesurfer.play(); },
                    pause() { if(wavesurfer) wavesurfer.pause(); },
                };

                // WaveSurfer peaks direkt auslesen und als Canvas zeichnen
                try {
                    const backend = wavesurfer.backend;
                    const NUM_BARS = 300;
                    if(backend && backend.buffer) {
                        const channelData = backend.buffer.getChannelData(0);
                        const length = channelData.length;
                        const samplesPerBar = Math.floor(length / NUM_BARS);
                        const peaks = [];
                        for(let i = 0; i < NUM_BARS; i++) {
                            const start = i * samplesPerBar;
                            let max = 0;
                            for(let j = 0; j < samplesPerBar; j++) {
                                const abs = Math.abs(channelData[start + j] || 0);
                                if(abs > max) max = abs;
                            }
                            peaks.push(max);
                        }
                        const maxPeak = Math.max(...peaks, 0.001);
                        const normalized = peaks.map(p => p / maxPeak);
                        // WaveSurfer canvas verstecken, eigenes Canvas drüber
                        const wsCanvas = document.querySelector('#modalWaveform canvas');
                        if(wsCanvas) wsCanvas.style.display = 'none';
                        const container = document.getElementById('modalWaveform');
                        waveDrawFn = drawWaveformCanvas(container, normalized, 0, 110);
                        waveformCache[currentModalTrackId + '_ws'] = normalized;
                    }
                } catch(peakErr) {
                    console.warn('Peak extraction failed:', peakErr);
                }

                setTimeout(() => loadWaveformComments(currentModalTrackId), 300);
            });

            wavesurfer.on('audioprocess', () => {
                if(!wavesurfer) return;
                const t = wavesurfer.getCurrentTime();
                document.getElementById('modalCurrentTime').textContent = formatTime(t);
                updateMiniPlayer();
            });

            wavesurfer.on('finish', () => {
                document.getElementById('modalPlayBtn').textContent = '▶';
                const miniBtn = document.getElementById('miniPlayBtn');
                if(miniBtn) miniBtn.textContent = '▶';
            });

            wavesurfer.on('error', (e) => {
                console.warn('WaveSurfer error:', e);
                if(wavesurfer) { try { wavesurfer.destroy(); } catch(ex) {} wavesurfer = null; }
                startDirectAudioWithRealWaveform(track);
            });

        } catch(e) {
            console.warn('WaveSurfer init failed:', e);
            if(wavesurfer) { try { wavesurfer.destroy(); } catch(ex) {} wavesurfer = null; }
            startDirectAudioWithRealWaveform(track);
        }

    } else {
        startDirectAudioWithRealWaveform(track);
    }
}

// ============================================
// WEB AUDIO PLAYER - mit echter Waveform
// ============================================

function startWebAudioPlayer(track) {
    const container = document.getElementById('modalWaveform');
    const NUM_BARS = 300;

    // Audio SOFORT starten - KEIN crossOrigin, KEIN await!
    currentAudio = new Audio(track.audioFile);
    currentAudio.volume = (document.getElementById('modalVolume').value || 80) / 100;

    currentAudio.addEventListener('loadedmetadata', () => {
        document.getElementById('modalTotalTime').textContent = formatTime(currentAudio.duration);
    });

    currentAudio.addEventListener('timeupdate', () => {
        const progress = currentAudio.currentTime / (currentAudio.duration || 1);
        document.getElementById('modalCurrentTime').textContent = formatTime(currentAudio.currentTime);
        if(waveDrawFn) waveDrawFn(progress);
        updateMiniPlayer();
    });

    currentAudio.addEventListener('ended', () => {
        document.getElementById('modalPlayBtn').textContent = '▶';
        const miniBtn = document.getElementById('miniPlayBtn');
        if(miniBtn) miniBtn.textContent = '▶';
        if(waveDrawFn) waveDrawFn(0);
    });

    currentAudio.play().then(() => {
        document.getElementById('modalPlayBtn').textContent = '⏸';
    }).catch(e => {
        console.warn('Autoplay blocked:', e);
        document.getElementById('modalPlayBtn').textContent = '▶';
    });

    // Seed aus Track-ID generieren damit jeder Track anders aussieht
    const trackSeed = (track.id || track.title || 'x').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // Waveform SEPARAT analysieren - stoert Audio nicht!
    const trackUrl = track.audioFile;
    analyzeAudioWaveform(trackUrl, NUM_BARS).then(peaks => {
        if(!peaks) peaks = generateFallbackPeaks(NUM_BARS, trackSeed);
        const loaderEl = document.getElementById('waveLoader');
        if(loaderEl) loaderEl.remove();
        const currentProgress = currentAudio ? (currentAudio.currentTime / (currentAudio.duration || 1)) : 0;
        waveDrawFn = drawWaveformCanvas(container, peaks, currentProgress, 110);
        setTimeout(() => loadWaveformComments(currentModalTrackId), 300);
    }).catch(() => {
        const peaks = generateFallbackPeaks(NUM_BARS, trackSeed);
        const loaderEl = document.getElementById('waveLoader');
        if(loaderEl) loaderEl.remove();
        waveDrawFn = drawWaveformCanvas(container, peaks, 0, 110);
    });
}

function closePlayerModal(event) {
    if(event && event.target.id !== 'playerModal') return;
    document.getElementById('playerModal').style.display = 'none';
    if(wavesurfer) { try { wavesurfer.stop(); wavesurfer.destroy(); } catch(e) {} wavesurfer = null; }
    if(currentAudio) { try { currentAudio.pause(); } catch(e) {} currentAudio = null; }
    waveDrawFn = null;
    hideMiniPlayer();
    document.getElementById('modalWaveform').innerHTML = '';
    document.getElementById('modalPlayBtn').textContent = '▶';
}

function modalTogglePlay() {
    if(currentModalTrack && currentModalTrackId !== currentModalTrack.id) {
        if(wavesurfer) { try { wavesurfer.stop(); wavesurfer.destroy(); } catch(e) {} wavesurfer = null; }
        if(currentAudio) { currentAudio.pause(); currentAudio = null; }
        const miniBar = document.getElementById('miniPlayerBar');
        if(miniBar) miniBar.style.display = 'none';
        currentModalTrackId = currentModalTrack.id;
        currentTrackId = currentModalTrack.id;
        currentPlayingTrack = currentModalTrack;
        startDirectAudioWithRealWaveform(currentModalTrack);
        if(typeof incrementPlayCount === 'function') incrementPlayCount(currentModalTrack.id);
        return;
    }

    if(wavesurfer) {
        if(wavesurfer.isPlaying()) {
            wavesurfer.pause();
            document.getElementById('modalPlayBtn').textContent = '▶';
            const miniBtn = document.getElementById('miniPlayBtn');
            if(miniBtn) miniBtn.textContent = '▶';
        } else {
            wavesurfer.play();
            document.getElementById('modalPlayBtn').textContent = '⏸';
            const miniBtn = document.getElementById('miniPlayBtn');
            if(miniBtn) miniBtn.textContent = '⏸';
        }
        return;
    }

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

// ============================================
// WAVEFORM KOMMENTARE
// ============================================

function openWaveformComment(timestamp) {
    if(typeof currentUser === 'undefined' || !currentUser) return;

    const existing = document.getElementById('waveformCommentInput');
    if(existing) existing.remove();

    const commentSection = document.getElementById('modalCommentsSection');
    if(!commentSection) return;

    const input = document.createElement('div');
    input.id = 'waveformCommentInput';
    input.style.cssText = 'background:rgba(0,0,0,0.6);border:1px solid #ff00ff;border-radius:8px;padding:12px;margin-bottom:12px;';
    input.innerHTML = `
        <div style="color:#ff00ff;font-size:0.72rem;font-family:'Orbitron',sans-serif;margin-bottom:8px;">💬 Comment at ${formatTime(timestamp)}</div>
        <div style="display:flex;gap:8px;">
            <input type="text" id="waveCommentText" placeholder="Write your comment..." maxlength="120"
                style="flex:1;background:#1a1a1a;border:1px solid #ff00ff44;border-radius:6px;color:#fff;font-size:0.82rem;padding:7px 10px;outline:none;">
            <button onclick="submitWaveformComment(${timestamp})" style="background:#ff00ff;color:#000;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:0.8rem;font-weight:bold;white-space:nowrap;">Post</button>
            <button onclick="document.getElementById('waveformCommentInput').remove()" style="background:#222;color:#aaa;border:1px solid #333;border-radius:6px;padding:7px 10px;cursor:pointer;font-size:0.8rem;">✕</button>
        </div>
    `;
    commentSection.insertBefore(input, commentSection.firstChild);
    setTimeout(() => document.getElementById('waveCommentText')?.focus(), 50);
}

async function submitWaveformComment(timestamp) {
    const text = document.getElementById('waveCommentText')?.value.trim();
    if(!text) return;
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        await db.collection('comments').add({
            trackId: currentModalTrackId,
            userId: currentUser.uid,
            username: userData.username || 'Unknown',
            avatar: userData.avatar || '',
            text,
            timestamp,
            createdAt: new Date().toISOString()
        });
        document.getElementById('waveformCommentInput')?.remove();
        loadWaveformComments(currentModalTrackId);
        loadModalComments(currentModalTrackId);
    } catch(e) { alert('Error: ' + e.message); }
}

async function loadWaveformComments(trackId) {
    if(!currentAudio || !currentAudio.duration) return;
    const container = document.getElementById('modalWaveform');
    container.querySelectorAll('.wave-comment-marker').forEach(m => m.remove());

    // Marker auch im MiniPlayer entfernen
    const miniBar = document.getElementById('miniProgressBar');
    if(miniBar) miniBar.querySelectorAll('.mini-comment-marker').forEach(m => m.remove());

    try {
        const snap = await db.collection('comments').where('trackId', '==', trackId).get();
        snap.forEach(doc => {
            const c = doc.data();
            if(c.timestamp == null) return;
            const pct = c.timestamp / currentAudio.duration * 100;

            const marker = document.createElement('div');
            marker.className = 'wave-comment-marker';
            marker.style.cssText = `position:absolute;left:${Math.min(pct, 97)}%;top:0;width:2px;height:100%;background:#ff00ff88;cursor:pointer;z-index:10;`;

            const avatar = document.createElement('div');
            avatar.style.cssText = 'position:absolute;top:2px;left:50%;transform:translateX(-50%);width:20px;height:20px;border-radius:50%;border:2px solid #ff00ff;overflow:hidden;background:#111;box-shadow:0 0 6px rgba(255,0,255,0.6);';
            const img = document.createElement('img');
            img.src = c.avatar || '';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            img.onerror = () => { img.style.display='none'; avatar.style.background='#ff00ff'; };
            avatar.appendChild(img);
            marker.appendChild(avatar);

            const tip = document.createElement('div');
            tip.style.cssText = 'position:absolute;top:25px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #ff00ff;border-radius:6px;padding:7px 10px;font-size:0.72rem;color:#fff;display:none;z-index:9999;min-width:140px;max-width:200px;white-space:normal;box-shadow:0 0 15px rgba(255,0,255,0.3);';
            tip.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><img src="${c.avatar||''}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'"><span style="color:#ff00ff;font-weight:bold;">${c.username}</span><span style="color:#666;font-size:0.65rem;">${formatTime(c.timestamp)}</span></div><div>${c.text}</div>`;
            marker.appendChild(tip);
            marker.onmouseenter = () => tip.style.display = 'block';
            marker.onmouseleave = () => tip.style.display = 'none';
            marker.onclick = (e) => { e.stopPropagation(); currentAudio.currentTime = c.timestamp; };

            container.appendChild(marker);

            // Gleichen Marker auch im MiniPlayer Progressbar anzeigen
            if(miniBar) {
                const miniMarker = document.createElement('div');
                miniMarker.className = 'mini-comment-marker';
                miniMarker.style.cssText = `position:absolute;left:${Math.min(pct, 97)}%;top:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#ff00ff;border:2px solid #fff;cursor:pointer;z-index:10;box-shadow:0 0 6px rgba(255,0,255,0.8);`;
                miniMarker.title = c.username + ': ' + c.text;

                miniMarker.onclick = (e) => {
                    e.stopPropagation();
                    if(wavesurfer) wavesurfer.seekTo(c.timestamp / currentAudio.duration);
                    else currentAudio.currentTime = c.timestamp;
                };

                // Tooltip beim Hover
                miniMarker.onmouseenter = () => {
                    miniMarker.style.transform = 'translate(-50%,-50%) scale(1.4)';
                    miniMarker.style.zIndex = '20';
                };
                miniMarker.onmouseleave = () => {
                    miniMarker.style.transform = 'translate(-50%,-50%) scale(1)';
                    miniMarker.style.zIndex = '10';
                };

                miniBar.appendChild(miniMarker);
            }
        });
    } catch(e) { console.error(e); }
}

async function loadModalComments(trackId) {
    const container = document.getElementById('modalCommentsSection');
    if(!container) return;
    try {
        const snap = await db.collection('comments').where('trackId', '==', trackId).get();
        let comments = [];
        snap.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));
        comments.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        if(comments.length === 0) {
            container.innerHTML = '<p style="color:#666;font-size:0.78rem;text-align:center;padding:10px;">No comments yet — Click on waveform to add one!</p>';
            return;
        }
        container.innerHTML = '';
        comments.forEach(c => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #ffffff11;';
            div.innerHTML = `
                <img src="${c.avatar||''}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid #ff00ff44;flex-shrink:0;" onerror="this.style.display='none'">
                <div style="flex:1;min-width:0;">
                    <span style="color:#ff00ff;font-size:0.75rem;font-weight:bold;">${c.username}</span>
                    ${c.timestamp != null ? `<span style="color:#666;font-size:0.65rem;margin-left:6px;cursor:pointer;" onclick="if(currentAudio) currentAudio.currentTime=${c.timestamp}">${formatTime(c.timestamp)}</span>` : ''}
                    <p style="color:#ccc;font-size:0.8rem;margin:2px 0 0 0;">${c.text}</p>
                </div>
                ${(typeof currentUser !== 'undefined' && currentUser && currentUser.uid === c.userId) ? `<button onclick="deleteWaveformComment('${c.id}')" style="background:none;border:none;color:#ff4444;cursor:pointer;font-size:0.75rem;flex-shrink:0;">🗑️</button>` : ''}
            `;
            container.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

async function deleteWaveformComment(commentId) {
    if(!confirm('Delete comment?')) return;
    try {
        await db.collection('comments').doc(commentId).delete();
        loadWaveformComments(currentModalTrackId);
        loadModalComments(currentModalTrackId);
    } catch(e) { alert('Error: ' + e.message); }
}

function setVolume(v) {
    if(wavesurfer) wavesurfer.setVolume(v / 100);
    if(currentAudio && !currentAudio._ws) currentAudio.volume = v / 100;
}

function formatTime(s) {
    if(isNaN(s) || s === undefined) return '0:00';
    return Math.floor(s/60) + ':' + (Math.floor(s%60) < 10 ? '0' : '') + Math.floor(s%60);
}

function showError(msg) {
    document.getElementById('trackListContainer').innerHTML = `<div style="text-align:center;color:#ff0000;padding:40px;"><p style="font-size:1.5rem;">❌ ${msg}</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:rgba(255,0,255,0.3);border:2px solid #ff00ff;color:#fff;border-radius:8px;cursor:pointer;">Reload</button></div>`;
}



// ============================================
// SKIP FUNKTIONEN - NEXT / PREV
// ============================================

function playNextTrack() {
    if(!currentPlayingTrack) return;
    const genre = currentPlayingTrack.genre || '';

    // Tracks vom gleichen Genre suchen (ohne aktuellen)
    let genreTracks = filteredTracks.filter(t =>
        t.id !== currentPlayingTrack.id &&
        t.genre && t.genre.toLowerCase() === genre.toLowerCase()
    );

    // Falls kein anderer Track im Genre -> alle filteredTracks nehmen
    if(genreTracks.length === 0) {
        genreTracks = filteredTracks.filter(t => t.id !== currentPlayingTrack.id);
    }

    // Falls immer noch nix -> allTracks nehmen
    if(genreTracks.length === 0) {
        genreTracks = allTracks.filter(t => t.id !== currentPlayingTrack.id);
    }

    if(genreTracks.length === 0) return;

    // Zufaelligen Track aus Genre waehlen
    const nextTrack = genreTracks[Math.floor(Math.random() * genreTracks.length)];

    // Modal schliessen falls offen, dann neuen Track oeffnen
    const modal = document.getElementById('playerModal');
    const modalVisible = modal && modal.style.display === 'flex';

    openPlayerModal(nextTrack);
    if(!modalVisible) {
        // Modal wieder verstecken wenn MiniPlayer aktiv war
        setTimeout(() => {
            if(modal) modal.style.display = 'none';
            showMiniPlayer();
        }, 100);
    }
}

function playPrevTrack() {
    if(trackHistory.length < 2) return;

    // Einen Schritt zurueck in der History
    trackHistoryIndex = Math.max(0, trackHistoryIndex - 1);
    // Verhindere dass der aktuelle nochmal gezaehlt wird
    if(trackHistoryIndex === trackHistory.length - 1) {
        trackHistoryIndex = Math.max(0, trackHistoryIndex - 1);
    }

    const prevTrack = trackHistory[trackHistoryIndex];
    if(!prevTrack || prevTrack.id === currentPlayingTrack?.id) return;

    const modal = document.getElementById('playerModal');
    const modalVisible = modal && modal.style.display === 'flex';

    // History-Index merken damit openPlayerModal nicht nochmal pusht
    const savedIndex = trackHistoryIndex;
    openPlayerModal(prevTrack);
    trackHistoryIndex = savedIndex;

    if(!modalVisible) {
        setTimeout(() => {
            if(modal) modal.style.display = 'none';
            showMiniPlayer();
        }, 100);
    }
}

// ============================================
// SHARE TRACK
// ============================================

function shareTrack() {
    const popup = document.getElementById('sharePopup');
    if(!popup) return;
    
    // Toggle Popup
    if(popup.style.display === 'block') {
        popup.style.display = 'none';
        return;
    }
    
    // Share URL generieren
    const trackId = currentModalTrackId;
    const shareUrl = window.location.origin + window.location.pathname + '?track=' + trackId;
    document.getElementById('shareUrl').value = shareUrl;
    popup.style.display = 'block';
}

function copyShareUrl() {
    const input = document.getElementById('shareUrl');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = event.target;
        btn.textContent = '✅ Kopiert!';
        btn.style.color = '#00ff88';
        setTimeout(() => { btn.textContent = '📋 Kopieren'; btn.style.color = '#aaaaff'; }, 2000);
    }).catch(() => {
        document.execCommand('copy');
    });
}

function shareVia(platform) {
    const url = encodeURIComponent(document.getElementById('shareUrl').value);
    const track = currentModalTrack;
    const text = encodeURIComponent('🎵 Check this out: ' + (track ? track.title : '') + ' on UNDERGROUNDLOOPS!');
    
    let shareLink = '';
    if(platform === 'whatsapp') shareLink = 'https://wa.me/?text=' + text + '%20' + url;
    else if(platform === 'telegram') shareLink = 'https://t.me/share/url?url=' + url + '&text=' + text;
    else if(platform === 'twitter') shareLink = 'https://twitter.com/intent/tweet?text=' + text + '&url=' + url;
    else if(platform === 'copy') {
        navigator.clipboard.writeText(decodeURIComponent(url));
        alert('✅ Link kopiert!');
        return;
    }
    
    if(shareLink) window.open(shareLink, '_blank');
}

// ============================================
// DOWNLOAD TRACK - direkt downloaden!
// ============================================

async function downloadTrack() {
    const track = currentModalTrack;
    if(!track || !track.audioFile) return;
    
    const btn = document.getElementById('modalDownloadBtn');
    const origText = btn.textContent;
    btn.textContent = '⏳ Loading...';
    btn.disabled = true;
    
    try {
        // Fetch als Blob und dann direkt downloaden
        const response = await fetch(track.audioFile);
        if(!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        
        // Dateiname aus Track-Titel
        const ext = track.audioFile.includes('.wav') ? '.wav' : '.mp3';
        const filename = (track.artist || 'Unknown') + ' - ' + (track.title || 'Track') + ext;
        
        // Blob URL erstellen und klicken
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename.replace(/[^a-zA-Z0-9\-_. ]/g, '_');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        if(typeof incrementDownloadCount === 'function') incrementDownloadCount(track.id);
        
        btn.textContent = '✅ Downloaded!';
        btn.style.color = '#00ff88';
        setTimeout(() => { 
            btn.textContent = origText; 
            btn.style.color = '#fff';
            btn.disabled = false;
        }, 3000);
        
    } catch(e) {
        console.error('Download error:', e);
        btn.textContent = '❌ Error';
        setTimeout(() => { 
            btn.textContent = origText; 
            btn.disabled = false;
        }, 2000);
    }
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
    document.getElementById('forumContainer')?.classList.add('hidden');
    document.getElementById('blogContainer')?.classList.add('hidden');
    document.getElementById('profileContainer')?.classList.add('hidden');
    document.getElementById('messagesContainer')?.classList.add('hidden');
    document.getElementById('uploadContainer')?.classList.add('hidden');
    document.getElementById('mainContainer')?.classList.remove('hidden');
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
