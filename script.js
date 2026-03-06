// ============================================
// UNDERGROUNDLOOPS - Dynamic Track System
// ============================================

let currentAudio = null;
let currentTrackId = null;
let allTracks = [];
let filteredTracks = [];
let currentGenre = 'all';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTracksFromFirestore();
    initGenreButtons();
});

// ============================================
// LOAD TRACKS FROM FIRESTORE
// ============================================

async function loadTracksFromFirestore() {
    try {
        const snapshot = await db.collection('tracks').orderBy('uploadedAt', 'desc').get();
        
        allTracks = [];
        snapshot.forEach(doc => {
            allTracks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded tracks:', allTracks.length);
        
        filteredTracks = allTracks;
        renderTracks();
        
    } catch(error) {
        console.error('Error loading tracks:', error);
        document.getElementById('trackListContainer').innerHTML = `
            <div style="text-align: center; color: #ff0000; padding: 40px;">
                <p>❌ Error loading tracks from database</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

// ============================================
// RENDER TRACKS
// ============================================

function renderTracks() {
    const container = document.getElementById('trackListContainer');
    
    if(filteredTracks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #00ffff; padding: 40px;">
                <p style="font-size: 1.5rem;">🎵 No tracks found</p>
                <p style="margin-top: 10px;">Upload your first track in the admin panel!</p>
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
    
    card.innerHTML = `
        <div class="track-header">
            <div class="cover-container">
                <img src="${track.coverImage}" alt="${track.title}" class="track-cover" 
                     onerror="this.src='https://via.placeholder.com/120/ff00ff/ffffff?text=No+Cover'">
            </div>
            <div class="track-info">
                <h3 class="track-title">${track.title}</h3>
                <p class="track-genre">${track.artist} • ${track.genre.toUpperCase()}${bpmText}</p>
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
            <a href="${track.audioFile}" download class="download-btn">⬇ Download</a>
        </div>
    `;
    
    return card;
}

// ============================================
// PLAY / PAUSE TRACK
// ============================================

function togglePlay(trackId, audioFile) {
    const playBtn = document.querySelector(`[data-track-id="${trackId}"] .play-btn`);
    
    // If clicking on a different track, stop current
    if(currentAudio && currentTrackId !== trackId) {
        currentAudio.pause();
        const oldBtn = document.querySelector(`[data-track-id="${currentTrackId}"] .play-btn`);
        if(oldBtn) oldBtn.textContent = '▶';
        stopWaveformAnimation(currentTrackId);
    }
    
    // If same track, toggle play/pause
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
        // New track
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
// WAVEFORM VISUALIZATION
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
    
    // Click to seek
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

// ============================================
// VOLUME CONTROL
// ============================================

function setVolume(value) {
    if(currentAudio) {
        currentAudio.volume = value / 100;
    }
}

// ============================================
// GENRE FILTER
// ============================================

function initGenreButtons() {
    const genreButtons = document.querySelectorAll('.genre-btn');
    
    genreButtons.forEach(button => {
        button.addEventListener('click', function() {
            genreButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            currentGenre = this.getAttribute('data-genre');
            filterTracksByGenre(currentGenre);
        });
    });
}

function filterTracksByGenre(genre) {
    if(genre === 'all') {
        filteredTracks = allTracks;
    } else {
        filteredTracks = allTracks.filter(track => track.genre.toLowerCase() === genre.toLowerCase());
    }
    
    // Stop current playback
    if(currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        currentTrackId = null;
    }
    
    renderTracks();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTime(seconds) {
    if(isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
}

