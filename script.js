// UNDERGROUNDLOOPS v2 - Main Script with Navigation, Comments & Multi-Page

let currentAudio = null;
let currentTrackId = null;
let allTracks = [];
let filteredTracks = [];
let currentGenre = 'all';
let currentPage = 'loops'; // loops, samples, tracks

// Wait for DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    setTimeout(function() {
        if(typeof db !== 'undefined') {
            console.log('Firebase ready');
            loadTracksFromFirestore();
            initNavigation();
            initGenreDropdown();
        } else {
            console.error('Firebase not loaded!');
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
            
            // Remove active from all
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active to clicked
            link.classList.add('active');
            
            // Get page
            currentPage = link.getAttribute('data-page');
            
            // Filter tracks
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
// LOAD TRACKS FROM FIRESTORE
// ============================================

async function loadTracksFromFirestore() {
    try {
        console.log('Loading tracks...');
        const snapshot = await db.collection('tracks').orderBy('uploadedAt', 'desc').get();
        
        allTracks = [];
        snapshot.forEach(doc => {
            allTracks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded tracks:', allTracks.length);
        filterTracks();
        
    } catch(error) {
        console.error('Error loading tracks:', error);
        showError('Error: ' + error.message);
    }
}

// ============================================
// FILTER TRACKS
// ============================================

function filterTracks() {
    // Filter by page type
    let pageFiltered = allTracks.filter(track => {
        if(!track.type) return currentPage === 'loops'; // Default to loops if no type
        return track.type === currentPage;
    });
    
    // Filter by genre
    if(currentGenre === 'all') {
        filteredTracks = pageFiltered;
    } else {
        filteredTracks = pageFiltered.filter(track => 
            track.genre && track.genre.toLowerCase() === currentGenre.toLowerCase()
        );
    }
    
    renderTracks();
}

// ============================================
// RENDER TRACKS
// ============================================

function renderTracks() {
    const container = document.getElementById('trackListContainer');
    
    if(filteredTracks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #00ffff; padding: 60px 20px;">
                <p style="font-size: 1.8rem; margin-bottom: 15px;">🎵 No ${currentPage} found</p>
                <p style="font-size: 1rem; color: #666;">
                    ${currentGenre === 'all' ? 
                        'Upload your first ' + currentPage + ' in the admin panel!' : 
                        'No ' + currentPage + ' in this genre yet.'}
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filteredTracks.forEach(track => {
        const trackCard = createTrackCard(track);
        container.appendChild(trackCard);
    });
}

// ============================================
// CREATE TRACK CARD
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
                    <span class="artist-link" onclick="openProfile('${track.userId}')" style="cursor: pointer; color: #00ffff; text-decoration: underline;">${track.artist}</span>
                    • ${genreText} • ${typeText}${bpmText}
                </p>
            </div>
        </div>
        
        <div class="waveform" id="waveform-${track.id}"></div>
        
        <div class="player-controls">
            <button class="play-btn" onclick="togglePlay('${track.id}', '${track.audioFile}')">▶</button>
            <div class="time-display">
                <span id="currentTime-${track.id}">0:00</span>
                <span>/</span>
                <span id="totalTime-${track.id}">0:00</span>
            </div>
            <div class="volume-control">
                <span class="volume-icon">🔊</span>
                <input type="range" class="volume-slider" min="0" max="100" value="80" 
                       onchange="setVolume(this.value)">
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
                <p style="color: #666; text-align: center; padding: 20px;">Loading comments...</p>
            </div>
        </div>
    `;
    
    // Load comments for this track
    loadComments(track.id);
    
    // Check if track is liked (async)
    if(typeof checkIfLiked === 'function') {
        checkIfLiked(track.id).then(isLiked => {
            if(isLiked) {
                const likeBtn = card.querySelector('.like-btn');
                if(likeBtn) {
                    likeBtn.classList.add('liked');
                    likeBtn.querySelector('.heart').textContent = '❤️';
                }
            }
        });
    }
    
    return card;
}

// ============================================
// COMMENTS SYSTEM
// ============================================

function showCommentForm(trackId) {
    // Check if user is logged in
    if(!currentUser) {
        alert('Please login to comment!');
        document.getElementById('loginBtn').click();
        return;
    }
    
    const form = document.getElementById(`comment-form-${trackId}`);
    form.classList.toggle('hidden');
}

async function submitComment(trackId) {
    if(!currentUser) {
        alert('Please login to comment!');
        return;
    }
    
    const commentText = document.getElementById(`comment-text-${trackId}`).value.trim();
    
    if(!commentText) {
        alert('Comment cannot be empty!');
        return;
    }
    
    try {
        // Get user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Add comment to Firestore
        await db.collection('comments').add({
            trackId: trackId,
            userId: currentUser.uid,
            username: userData.username,
            avatar: userData.avatar,
            text: commentText,
            createdAt: new Date().toISOString()
        });
        
        // Clear form
        document.getElementById(`comment-text-${trackId}`).value = '';
        document.getElementById(`comment-form-${trackId}`).classList.add('hidden');
        
        // Reload comments
        loadComments(trackId);
        
        alert('✅ Comment posted!');
        
    } catch(error) {
        alert('❌ Failed to post comment: ' + error.message);
    }
}

async function loadComments(trackId) {
    try {
        // Load comments WITHOUT orderBy to avoid index requirement
        const snapshot = await db.collection('comments')
            .where('trackId', '==', trackId)
            .get();
        
        const commentsList = document.getElementById(`comments-list-${trackId}`);
        
        if(snapshot.empty) {
            commentsList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No comments yet. Be the first!</p>';
            return;
        }
        
        // Sort comments manually by date
        const comments = [];
        snapshot.forEach(doc => {
            comments.push(doc.data());
        });
        
        // Sort by createdAt descending (newest first)
        comments.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        commentsList.innerHTML = '';
        
        comments.forEach(comment => {
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
        
    } catch(error) {
        console.error('Error loading comments:', error);
        const commentsList = document.getElementById(`comments-list-${trackId}`);
        if(commentsList) {
            commentsList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No comments yet.</p>';
        }
    }
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment';
    
    const date = new Date(comment.createdAt);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${comment.username}</span>
            <span class="comment-date">${dateStr}</span>
        </div>
        <p class="comment-text">${comment.text}</p>
    `;
    
    return div;
}

// ============================================
// AUDIO PLAYER
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
        if(currentAudio.paused) {
            currentAudio.play();
            playBtn.textContent = '⏸';
            startWaveformAnimation(trackId);
        } else {
            currentAudio.pause();
            playBtn.textContent = '▶';
            stopWaveformAnimation(trackId);
        }
    } else {
        currentAudio = new Audio(audioFile);
        currentAudio.volume = 0.8;
        currentTrackId = trackId;
        
        createWaveformBars(trackId);
        
        currentAudio.addEventListener('loadedmetadata', function() {
            document.getElementById(`totalTime-${trackId}`).textContent = formatTime(currentAudio.duration);
        });
        
        currentAudio.addEventListener('timeupdate', function() {
            document.getElementById(`currentTime-${trackId}`).textContent = formatTime(currentAudio.currentTime);
            updateWaveformProgress(trackId);
        });
        
        currentAudio.addEventListener('ended', function() {
            playBtn.textContent = '▶';
            stopWaveformAnimation(trackId);
        });
        
        currentAudio.play();
        playBtn.textContent = '⏸';
        startWaveformAnimation(trackId);
    }
}

// ============================================
// WAVEFORM
// ============================================

function createWaveformBars(trackId) {
    const container = document.getElementById(`waveform-${trackId}`);
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-around';
    container.style.gap = '3px';
    container.style.padding = '10px';
    container.style.height = '120px';
    container.style.cursor = 'pointer';
    container.style.background = 'rgba(0, 0, 0, 0.3)';
    container.style.borderRadius = '10px';
    
    container.addEventListener('click', function(e) {
        if(!currentAudio || currentTrackId !== trackId) return;
        
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const seekTime = currentAudio.duration * percentage;
        
        if(!isNaN(seekTime)) {
            currentAudio.currentTime = seekTime;
            updateWaveformProgress(trackId);
        }
    });
    
    for(let i = 0; i < 80; i++) {
        const bar = document.createElement('div');
        bar.className = 'audio-bar';
        const randomHeight = Math.random() * 60 + 40;
        
        bar.style.width = '5px';
        bar.style.height = randomHeight + '%';
        bar.style.backgroundColor = 'rgba(150, 150, 150, 0.9)';
        bar.style.borderRadius = '3px';
        bar.style.transition = 'all 0.3s ease';
        
        container.appendChild(bar);
    }
}

function updateWaveformProgress(trackId) {
    if(!currentAudio || currentTrackId !== trackId) return;
    
    const bars = document.querySelectorAll(`#waveform-${trackId} .audio-bar`);
    const progress = currentAudio.currentTime / currentAudio.duration;
    
    bars.forEach((bar, index) => {
        const barProgress = index / bars.length;
        
        if(barProgress <= progress) {
            bar.style.backgroundColor = '#ff00ff';
            bar.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.8)';
        } else {
            bar.style.backgroundColor = 'rgba(150, 150, 150, 0.9)';
            bar.style.boxShadow = 'none';
        }
    });
}

let animationId;

function startWaveformAnimation(trackId) {
    const bars = document.querySelectorAll(`#waveform-${trackId} .audio-bar`);
    
    function animate() {
        bars.forEach((bar, index) => {
            const pulse = Math.sin(Date.now() / 200 + index) * 0.3 + 1;
            bar.style.transform = `scaleY(${pulse})`;
        });
        
        if(currentAudio && !currentAudio.paused && currentTrackId === trackId) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function stopWaveformAnimation(trackId) {
    if(animationId) {
        cancelAnimationFrame(animationId);
    }
    
    const bars = document.querySelectorAll(`#waveform-${trackId} .audio-bar`);
    bars.forEach(bar => {
        bar.style.transform = 'scaleY(1)';
    });
}

function setVolume(value) {
    if(currentAudio) {
        currentAudio.volume = value / 100;
    }
}

function formatTime(seconds) {
    if(isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
}

function showError(message) {
    document.getElementById('trackListContainer').innerHTML = `
        <div style="text-align: center; color: #ff0000; padding: 40px;">
            <p style="font-size: 1.5rem;">❌ ${message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: rgba(255,0,255,0.3); border: 2px solid #ff00ff; color: #fff; border-radius: 8px; cursor: pointer;">
                Reload Page
            </button>
        </div>
    `;
}
