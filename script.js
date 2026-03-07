// UNDERGROUNDLOOPS v2 - Main Script

let currentAudio = null;
let currentTrackId = null;
let allTracks = [];
let filteredTracks = [];
let currentGenre = 'all';
let currentPage = 'latest'; // latest, loops, samples, tracks

// Wait for DOM
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if(typeof db !== 'undefined') {
            loadTracksFromFirestore();
            initNavigation();
            initGenreDropdown();
        } else {
            showError('Firebase connection failed');
        }
    }, 1000);
});

// ============================================
// NAVIGATION
// ============================================

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentPage = link.getAttribute('data-page');
            currentGenre = 'all';
            filterTracks();
        });
    });
}

// ============================================
// GENRE DROPDOWN
// ============================================

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

// ============================================
// LOAD TRACKS
// ============================================

async function loadTracksFromFirestore() {
    try {
        const snapshot = await db.collection('tracks').orderBy('uploadedAt', 'desc').get();
        allTracks = [];
        snapshot.forEach(doc => allTracks.push({ id: doc.id, ...doc.data() }));
        filterTracks();
    } catch(error) {
        showError('Error: ' + error.message);
    }
}

// ============================================
// FILTER TRACKS
// ============================================

function filterTracks() {
    let pageFiltered;

    if(currentPage === 'latest') {
        // Show last 12 uploads from all types
        pageFiltered = allTracks.slice(0, 12);
    } else {
        const pageType = currentPage.replace(/s$/, ''); // loops→loop
        pageFiltered = allTracks.filter(track => {
            if(!track.type) return currentPage === 'loops';
            return track.type === pageType;
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
        container.innerHTML = `
            <div style="text-align:center;color:#00ffff;padding:60px 20px;">
                <p style="font-size:1.8rem;margin-bottom:15px;">🎵 No tracks found</p>
                <p style="font-size:1rem;color:#666;">Upload your first tracks!</p>
            </div>`;
        return;
    }

    // ✅ Latest Uploads = Grid View
    if(currentPage === 'latest') {
        container.innerHTML = `
            <div style="padding: 10px 0 20px 0;">
                <h2 style="
                    font-family: 'Orbitron', sans-serif;
                    color: #ff00ff;
                    font-size: 1.4rem;
                    letter-spacing: 3px;
                    margin-bottom: 25px;
                    text-shadow: 0 0 20px rgba(255,0,255,0.5);
                    border-bottom: 1px solid #ff00ff44;
                    padding-bottom: 15px;
                ">⚡ LATEST MEMBER UPLOADS</h2>
                <div id="latestGrid" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 16px;
                "></div>
            </div>`;

        const grid = document.getElementById('latestGrid');
        filteredTracks.forEach(track => {
            grid.appendChild(createGridCard(track));
        });
        return;
    }

    // ✅ Loops/Samples/Tracks = List View (full player)
    container.innerHTML = '';
    filteredTracks.forEach(track => {
        container.appendChild(createTrackCard(track));
    });
}

// ============================================
// GRID CARD (for Latest Uploads)
// ============================================

function createGridCard(track) {
    const card = document.createElement('div');
    card.style.cssText = `
        background: rgba(0,0,0,0.6);
        border: 1px solid #ff00ff33;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
    `;

    card.onclick = (e) => {
        // Prevent double trigger from buttons inside
        if(e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
        openPlayerModal(track);
    };

    card.onmouseover = () => {
        card.style.border = '1px solid #ff00ff';
        card.style.boxShadow = '0 0 20px rgba(255,0,255,0.3)';
        card.style.transform = 'translateY(-4px)';
    };
    card.onmouseout = () => {
        card.style.border = '1px solid #ff00ff33';
        card.style.boxShadow = 'none';
        card.style.transform = 'translateY(0)';
    };

    const typeColor = track.type === 'loop' ? '#00ffff' : track.type === 'sample' ? '#ff00ff' : '#ffff00';
    const bpmText = track.bpm ? `${track.bpm} BPM` : '';

    card.innerHTML = `
        <div style="position:relative;">
            <img src="${track.coverImage || ''}" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23200020%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23ff00ff%22 font-size=%2240%22%3E🎵%3C/text%3E%3C/svg%3E'"
                 style="width:100%;aspect-ratio:1;object-fit:cover;display:block;">
            
            <!-- Play overlay -->
            <div onclick="event.stopPropagation(); openPlayerModal(allTracks.find(t=>t.id==='${track.id}'))" style="
                position:absolute;inset:0;
                background:rgba(0,0,0,0.4);
                display:flex;align-items:center;justify-content:center;
                opacity:0;transition:opacity 0.3s;
            " class="play-overlay-${track.id}">
                <div style="
                    width:50px;height:50px;
                    background:rgba(255,0,255,0.8);
                    border-radius:50%;
                    display:flex;align-items:center;justify-content:center;
                    font-size:1.4rem;
                ">▶</div>
            </div>

            <!-- Type badge -->
            <div style="
                position:absolute;top:8px;right:8px;
                background:rgba(0,0,0,0.8);
                border:1px solid ${typeColor};
                color:${typeColor};
                padding:2px 8px;border-radius:20px;
                font-size:0.65rem;font-family:'Orbitron',sans-serif;
            ">${(track.type || 'loop').toUpperCase()}</div>
        </div>

        <div style="padding:12px;">
            <div style="
                color:#fff;font-weight:bold;
                font-size:0.85rem;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                margin-bottom:4px;
            " title="${track.title}">${track.title}</div>
            
            <div style="color:#00ffff;font-size:0.75rem;margin-bottom:4px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${track.artist || 'Unknown'}
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                <span style="color:#666;font-size:0.7rem;">${track.genre ? track.genre.toUpperCase() : ''}</span>
                <span style="color:#888;font-size:0.7rem;">${bpmText}</span>
            </div>

            <!-- Mini player -->
            <div id="miniPlayer-${track.id}" style="display:none;margin-top:10px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <button onclick="openPlayerModal(allTracks.find(t=>t.id==='${track.id}'))" 
                            id="gridPlayBtn-${track.id}"
                            style="
                                background:rgba(255,0,255,0.3);border:1px solid #ff00ff;
                                color:#fff;border-radius:50%;width:30px;height:30px;
                                cursor:pointer;font-size:0.8rem;flex-shrink:0;
                            ">▶</button>
                    <div style="color:#aaa;font-size:0.7rem;">
                        <span id="gridTime-${track.id}">0:00</span>
                    </div>
                    <button onclick="toggleLike('${track.id}')" class="like-btn" style="
                        background:none;border:none;cursor:pointer;
                        color:#aaa;font-size:0.8rem;margin-left:auto;
                    ">🤍 <span class="like-count">${track.likes || 0}</span></button>
                </div>
            </div>
        </div>
    `;

    // Show play overlay on hover
    card.addEventListener('mouseover', () => {
        const overlay = card.querySelector(`.play-overlay-${track.id}`);
        if(overlay) overlay.style.opacity = '1';
        const mini = document.getElementById(`miniPlayer-${track.id}`);
        if(mini) mini.style.display = 'block';
    });
    card.addEventListener('mouseout', () => {
        const overlay = card.querySelector(`.play-overlay-${track.id}`);
        if(overlay && currentTrackId !== track.id) overlay.style.opacity = '0';
        const mini = document.getElementById(`miniPlayer-${track.id}`);
        if(mini && currentTrackId !== track.id) mini.style.display = 'none';
    });

    // Check if liked
    if(typeof checkIfLiked === 'function') {
        checkIfLiked(track.id).then(isLiked => {
            if(isLiked) {
                const likeBtn = card.querySelector('.like-btn');
                if(likeBtn) { likeBtn.classList.add('liked'); likeBtn.querySelector('.heart') && (likeBtn.innerHTML = `❤️ <span class="like-count">${track.likes || 0}</span>`); }
            }
        });
    }

    return card;
}

let currentModalTrackId = null;

function playGridTrack(trackId, audioFile) {
    // Find track data
    const track = allTracks.find(t => t.id === trackId);
    if(!track) return;
    openPlayerModal(track);
}

function openPlayerModal(track) {
    if(!track) return;
    const modal = document.getElementById('playerModal');
    modal.style.display = 'flex';

    // Fill modal info
    document.getElementById('modalCover').src = track.coverImage || '';
    document.getElementById('modalTitle').textContent = track.title;
    document.getElementById('modalArtist').textContent = track.artist || '';
    document.getElementById('modalMeta').textContent = 
        (track.genre ? track.genre.toUpperCase() : '') + 
        (track.type ? ' • ' + track.type.toUpperCase() : '') + 
        (track.bpm ? ' • ' + track.bpm + ' BPM' : '');
    document.getElementById('modalDownloadBtn').href = track.audioFile;
    document.getElementById('modalLikeCount').textContent = track.likes || 0;

    // Stop previous audio
    if(currentAudio && currentModalTrackId !== track.id) {
        currentAudio.pause();
    }

    currentModalTrackId = track.id;
    currentTrackId = track.id;

    // Start audio
    currentAudio = new Audio(track.audioFile);
    currentAudio.volume = document.getElementById('modalVolume').value / 100;

    currentAudio.addEventListener('loadedmetadata', () => {
        document.getElementById('modalTotalTime').textContent = formatTime(currentAudio.duration);
        buildModalWaveform();
    });

    currentAudio.addEventListener('timeupdate', () => {
        document.getElementById('modalCurrentTime').textContent = formatTime(currentAudio.currentTime);
        updateModalWaveform();
    });

    currentAudio.addEventListener('ended', () => {
        document.getElementById('modalPlayBtn').textContent = '▶';
    });

    currentAudio.play();
    document.getElementById('modalPlayBtn').textContent = '⏸';

    // Check if liked
    if(typeof checkIfLiked === 'function') {
        checkIfLiked(track.id).then(isLiked => {
            document.getElementById('modalLikeBtn').innerHTML = 
                (isLiked ? '❤️' : '🤍') + ' <span id="modalLikeCount">' + (track.likes || 0) + '</span>';
        });
    }
}

function closePlayerModal(event) {
    if(event && event.target.id !== 'playerModal') return;
    document.getElementById('playerModal').style.display = 'none';
    if(currentAudio) { currentAudio.pause(); currentAudio = null; }
    document.getElementById('modalWaveform').innerHTML = '';
    document.getElementById('modalPlayBtn').textContent = '▶';
}

function modalTogglePlay() {
    if(!currentAudio) return;
    if(currentAudio.paused) {
        currentAudio.play();
        document.getElementById('modalPlayBtn').textContent = '⏸';
    } else {
        currentAudio.pause();
        document.getElementById('modalPlayBtn').textContent = '▶';
    }
}

async function modalToggleLike() {
    if(!currentModalTrackId) return;
    await toggleLike(currentModalTrackId);
    // Update like count in modal
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

    container.addEventListener('click', function(e) {
        if(!currentAudio) return;
        const pct = (e.clientX - container.getBoundingClientRect().left) / container.offsetWidth;
        const t = currentAudio.duration * pct;
        if(!isNaN(t)) { currentAudio.currentTime = t; }
    });

    for(let i = 0; i < 60; i++) {
        const bar = document.createElement('div');
        bar.className = 'modal-bar';
        bar.style.cssText = `
            width:6px;height:${Math.random()*60+20}%;
            background:rgba(150,150,150,0.6);
            border-radius:3px;transition:background 0.1s;flex-shrink:0;
        `;
        container.appendChild(bar);
    }
}

function updateModalWaveform() {
    if(!currentAudio) return;
    const bars = document.querySelectorAll('.modal-bar');
    const p = currentAudio.currentTime / currentAudio.duration;
    bars.forEach((bar, i) => {
        if(i / bars.length <= p) {
            bar.style.background = '#ff00ff';
            bar.style.boxShadow = '0 0 8px rgba(255,0,255,0.8)';
        } else {
            bar.style.background = 'rgba(150,150,150,0.6)';
            bar.style.boxShadow = 'none';
        }
    });
}

// ============================================
// FULL TRACK CARD (Loops/Samples/Tracks pages)
// ============================================

function createTrackCard(track) {
    const card = document.createElement('div');
    card.className = 'player-container';
    card.setAttribute('data-track-id', track.id);

    const bpmText = track.bpm ? ` • ${track.bpm} BPM` : '';
    const genreText = track.genre ? track.genre.toUpperCase() : 'UNKNOWN';
    const typeText = track.type ? track.type.toUpperCase() : 'LOOP';

    card.innerHTML = `
        <div class="track-header">
            <div class="cover-container">
                <img src="${track.coverImage}" alt="${track.title}" class="track-cover"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23ff00ff%22 width=%22120%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2214%22%3ENo Cover%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="track-info">
                <h3 class="track-title">${track.title}</h3>
                <p class="track-genre">
                    <span class="artist-link" onclick="openProfile('${track.userId}')" style="cursor:pointer;color:#00ffff;text-decoration:underline;">${track.artist}</span>
                    • ${genreText} • ${typeText}${bpmText}
                </p>
            </div>
        </div>
        <div class="waveform" id="waveform-${track.id}"></div>
        <div class="player-controls">
            <button class="play-btn" onclick="togglePlay('${track.id}', '${track.audioFile}')">▶</button>
            <div class="time-display">
                <span id="currentTime-${track.id}">0:00</span> / <span id="totalTime-${track.id}">0:00</span>
            </div>
            <div class="volume-control">
                <span class="volume-icon">🔊</span>
                <input type="range" class="volume-slider" min="0" max="100" value="80" onchange="setVolume(this.value)">
            </div>
            <button class="like-btn" onclick="toggleLike('${track.id}')">
                <span class="heart">🤍</span>
                <span class="like-count">${track.likes || 0}</span>
            </button>
            <a href="${track.audioFile}" download class="download-btn">⬇ Download</a>
        </div>
        <div class="comments-section" id="comments-${track.id}">
            <div class="comments-header">
                <h4 class="comments-title">💬 Comments</h4>
                <button class="add-comment-btn" onclick="showCommentForm('${track.id}')">Add Comment</button>
            </div>
            <div id="comment-form-${track.id}" class="comment-form hidden">
                <textarea id="comment-text-${track.id}" placeholder="Write your comment..."></textarea>
                <button onclick="submitComment('${track.id}')">Post Comment</button>
            </div>
            <div id="comments-list-${track.id}" class="comments-list">
                <p style="color:#666;text-align:center;padding:20px;">Loading comments...</p>
            </div>
        </div>`;

    loadComments(track.id);

    if(typeof checkIfLiked === 'function') {
        checkIfLiked(track.id).then(isLiked => {
            if(isLiked) {
                const likeBtn = card.querySelector('.like-btn');
                if(likeBtn) { likeBtn.classList.add('liked'); likeBtn.querySelector('.heart').textContent = '❤️'; }
            }
        });
    }
    return card;
}

// ============================================
// COMMENTS
// ============================================

function showCommentForm(trackId) {
    if(!currentUser) { alert('Please login to comment!'); document.getElementById('loginBtn').click(); return; }
    document.getElementById(`comment-form-${trackId}`).classList.toggle('hidden');
}

async function submitComment(trackId) {
    if(!currentUser) { alert('Please login to comment!'); return; }
    const commentText = document.getElementById(`comment-text-${trackId}`).value.trim();
    if(!commentText) { alert('Comment cannot be empty!'); return; }
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        await db.collection('comments').add({
            trackId, userId: currentUser.uid,
            username: userData.username, avatar: userData.avatar,
            text: commentText, createdAt: new Date().toISOString()
        });
        document.getElementById(`comment-text-${trackId}`).value = '';
        document.getElementById(`comment-form-${trackId}`).classList.add('hidden');
        loadComments(trackId);
    } catch(error) { alert('❌ Failed: ' + error.message); }
}

async function loadComments(trackId) {
    try {
        const snapshot = await db.collection('comments').where('trackId', '==', trackId).get();
        const list = document.getElementById(`comments-list-${trackId}`);
        if(snapshot.empty) { list.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No comments yet. Be the first!</p>'; return; }
        const comments = [];
        snapshot.forEach(doc => comments.push(doc.data()));
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        list.innerHTML = '';
        comments.forEach(c => {
            const div = document.createElement('div');
            div.className = 'comment';
            div.innerHTML = `<div class="comment-header"><span class="comment-author">${c.username}</span><span class="comment-date">${new Date(c.createdAt).toLocaleDateString()}</span></div><p class="comment-text">${c.text}</p>`;
            list.appendChild(div);
        });
    } catch(e) {
        const list = document.getElementById(`comments-list-${trackId}`);
        if(list) list.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No comments yet.</p>';
    }
}

// ============================================
// AUDIO PLAYER (full)
// ============================================

function togglePlay(trackId, audioFile) {
    const playBtn = document.querySelector(`[data-track-id="${trackId}"] .play-btn`);
    if(currentAudio && currentTrackId !== trackId) {
        currentAudio.pause();
        const oldBtn = document.querySelector(`[data-track-id="${currentTrackId}"] .play-btn`);
        if(oldBtn) oldBtn.textContent = '▶';
        stopWaveformAnimation(currentTrackId);
    }
    if(currentTrackId === trackId && currentAudio) {
        if(currentAudio.paused) { currentAudio.play(); playBtn.textContent = '⏸'; startWaveformAnimation(trackId); }
        else { currentAudio.pause(); playBtn.textContent = '▶'; stopWaveformAnimation(trackId); }
    } else {
        currentAudio = new Audio(audioFile);
        currentAudio.volume = 0.8;
        currentTrackId = trackId;
        createWaveformBars(trackId);
        currentAudio.addEventListener('loadedmetadata', () => { document.getElementById(`totalTime-${trackId}`).textContent = formatTime(currentAudio.duration); });
        currentAudio.addEventListener('timeupdate', () => { document.getElementById(`currentTime-${trackId}`).textContent = formatTime(currentAudio.currentTime); updateWaveformProgress(trackId); });
        currentAudio.addEventListener('ended', () => { playBtn.textContent = '▶'; stopWaveformAnimation(trackId); });
        currentAudio.play();
        playBtn.textContent = '⏸';
        startWaveformAnimation(trackId);
    }
}

function createWaveformBars(trackId) {
    const container = document.getElementById(`waveform-${trackId}`);
    container.innerHTML = '';
    container.style.cssText = 'display:flex;align-items:center;justify-content:space-around;gap:3px;padding:10px;height:120px;cursor:pointer;background:rgba(0,0,0,0.3);border-radius:10px;';
    container.addEventListener('click', function(e) {
        if(!currentAudio || currentTrackId !== trackId) return;
        const pct = (e.clientX - container.getBoundingClientRect().left) / container.offsetWidth;
        const t = currentAudio.duration * pct;
        if(!isNaN(t)) { currentAudio.currentTime = t; updateWaveformProgress(trackId); }
    });
    for(let i = 0; i < 80; i++) {
        const bar = document.createElement('div');
        bar.className = 'audio-bar';
        bar.style.cssText = `width:5px;height:${Math.random()*60+40}%;background:rgba(150,150,150,0.9);border-radius:3px;transition:all 0.3s;`;
        container.appendChild(bar);
    }
}

function updateWaveformProgress(trackId) {
    if(!currentAudio || currentTrackId !== trackId) return;
    const bars = document.querySelectorAll(`#waveform-${trackId} .audio-bar`);
    const p = currentAudio.currentTime / currentAudio.duration;
    bars.forEach((bar, i) => {
        if(i / bars.length <= p) { bar.style.backgroundColor = '#ff00ff'; bar.style.boxShadow = '0 0 15px rgba(255,0,255,0.8)'; }
        else { bar.style.backgroundColor = 'rgba(150,150,150,0.9)'; bar.style.boxShadow = 'none'; }
    });
}

let animationId;
function startWaveformAnimation(trackId) {
    const bars = document.querySelectorAll(`#waveform-${trackId} .audio-bar`);
    function animate() {
        bars.forEach((bar, i) => { bar.style.transform = `scaleY(${Math.sin(Date.now()/200+i)*0.3+1})`; });
        if(currentAudio && !currentAudio.paused && currentTrackId === trackId) animationId = requestAnimationFrame(animate);
    }
    animate();
}
function stopWaveformAnimation(trackId) {
    if(animationId) cancelAnimationFrame(animationId);
    document.querySelectorAll(`#waveform-${trackId} .audio-bar`).forEach(b => b.style.transform = 'scaleY(1)');
}
function setVolume(v) { if(currentAudio) currentAudio.volume = v / 100; }
function formatTime(s) {
    if(isNaN(s)) return '0:00';
    return Math.floor(s/60) + ':' + (Math.floor(s%60) < 10 ? '0' : '') + Math.floor(s%60);
}
function showError(msg) {
    document.getElementById('trackListContainer').innerHTML = `<div style="text-align:center;color:#ff0000;padding:40px;"><p style="font-size:1.5rem;">❌ ${msg}</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:rgba(255,0,255,0.3);border:2px solid #ff00ff;color:#fff;border-radius:8px;cursor:pointer;">Reload</button></div>`;
}
