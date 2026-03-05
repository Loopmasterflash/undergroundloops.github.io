// ============================================
// UNDERGROUNDLOOPS - Audio Player Script
// ============================================

let wavesurfer;
let isPlaying = false;

// Initialize WaveSurfer when page loads
document.addEventListener('DOMContentLoaded', function() {
    initPlayer();
    initGenreButtons();
});

// ============================================
// INITIALIZE WAVESURFER PLAYER
// ============================================

function initPlayer() {
    // Create WaveSurfer instance
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'rgba(100, 100, 100, 0.5)',
        progressColor: '#ff00ff',
        cursorColor: '#00ffff',
        barWidth: 3,
        barRadius: 3,
        cursorWidth: 2,
        height: 120,
        barGap: 2,
        responsive: true,
        normalize: true
    });
    
    // Load demo audio - using a reliable source
    wavesurfer.load('https://cdn.freesound.org/previews/412/412017_7337381-lq.mp3');
    
    // Alternative: You can also use an empty peaks array for visual demo
    // wavesurfer.load('', [0.1, 0.3, 0.5, 0.7, 0.9, 0.7, 0.5, 0.3, 0.1]);
    
    // ============================================
    // PLAYER CONTROLS
    // ============================================
    
    const playBtn = document.getElementById('playBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    
    // Play/Pause Button
    playBtn.addEventListener('click', function() {
        wavesurfer.playPause();
        isPlaying = !isPlaying;
        playBtn.textContent = isPlaying ? '⏸' : '▶';
    });
    
    // Volume Control
    volumeSlider.addEventListener('input', function() {
        const volume = this.value / 100;
        wavesurfer.setVolume(volume);
    });
    
    // Set initial volume
    wavesurfer.setVolume(0.8);
    
    // ============================================
    // UPDATE TIME DISPLAY
    // ============================================
    
    wavesurfer.on('ready', function() {
        const duration = wavesurfer.getDuration();
        totalTimeEl.textContent = formatTime(duration);
        console.log('WaveSurfer ready! Duration:', duration);
    });
    
    wavesurfer.on('audioprocess', function() {
        const currentTime = wavesurfer.getCurrentTime();
        currentTimeEl.textContent = formatTime(currentTime);
    });
    
    wavesurfer.on('finish', function() {
        playBtn.textContent = '▶';
        isPlaying = false;
    });
    
    wavesurfer.on('error', function(e) {
        console.error('WaveSurfer error:', e);
    });
}

// ============================================
// FORMAT TIME (seconds to MM:SS)
// ============================================

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
}

// ============================================
// GENRE BUTTONS
// ============================================

function initGenreButtons() {
    const genreButtons = document.querySelectorAll('.genre-btn');
    
    genreButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            genreButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get selected genre
            const genre = this.getAttribute('data-genre');
            console.log('Selected genre:', genre);
            
            // TODO: Filter tracks by genre (implement later)
        });
    });
}

// ============================================
// DOWNLOAD BUTTON
// ============================================

const downloadBtn = document.querySelector('.download-btn');
downloadBtn.addEventListener('click', function() {
    alert('Download-Funktion wird später implementiert!');
    // TODO: Implement download functionality
});
