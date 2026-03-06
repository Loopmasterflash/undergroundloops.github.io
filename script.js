// ============================================
// UNDERGROUNDLOOPS - Simple Audio Player
// ============================================

let audio;
let isPlaying = false;
let animationId;

// Initialize Player when page loads
document.addEventListener('DOMContentLoaded', function() {
    initSimplePlayer();
    initGenreButtons();
});

// ============================================
// INITIALIZE SIMPLE AUDIO PLAYER
// ============================================

function initSimplePlayer() {
    // Create Audio Element - DEINE EIGENE MP3! 🎵
    audio = new Audio('tracksdein-track.mp3');
    audio.volume = 0.8;
    
    const playBtn = document.getElementById('playBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const waveformContainer = document.getElementById('waveform');
    
    // Create Visual Bars
    createVisualBars(waveformContainer);
    
    // Make waveform clickable for seeking
    waveformContainer.addEventListener('click', function(e) {
        const rect = waveformContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const seekTime = audio.duration * percentage;
        
        if(!isNaN(seekTime)) {
            audio.currentTime = seekTime;
            updateProgress();
        }
    });
    
    // Change cursor on hover
    waveformContainer.style.cursor = 'pointer';
    
    // Play/Pause Button
    playBtn.addEventListener('click', function() {
        if(isPlaying) {
            audio.pause();
            stopAnimation();
        } else {
            audio.play();
            startAnimation();
        }
        isPlaying = !isPlaying;
        playBtn.textContent = isPlaying ? '⏸' : '▶';
    });
    
    // Volume Control
    volumeSlider.addEventListener('input', function() {
        audio.volume = this.value / 100;
    });
    
    // Update Time
    audio.addEventListener('loadedmetadata', function() {
        totalTimeEl.textContent = formatTime(audio.duration);
    });
    
    audio.addEventListener('timeupdate', function() {
        currentTimeEl.textContent = formatTime(audio.currentTime);
        updateProgress();
    });
    
    audio.addEventListener('ended', function() {
        playBtn.textContent = '▶';
        isPlaying = false;
        stopAnimation();
    });
}

// ============================================
// CREATE VISUAL BARS (Fake Waveform)
// ============================================

function createVisualBars(container) {
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-around';
    container.style.gap = '3px';
    container.style.padding = '10px';
    
    // Create 80 bars
    for(let i = 0; i < 80; i++) {
        const bar = document.createElement('div');
        bar.className = 'audio-bar';
        
        // Random height for visual effect
        const randomHeight = Math.random() * 60 + 40; // 40-100%
        
        bar.style.width = '5px';
        bar.style.height = randomHeight + '%';
        bar.style.backgroundColor = 'rgba(150, 150, 150, 0.9)'; // Mehr sichtbar!
        bar.style.borderRadius = '3px';
        bar.style.transition = 'all 0.3s ease';
        
        container.appendChild(bar);
    }
}

// ============================================
// ANIMATE BARS
// ============================================

function startAnimation() {
    const bars = document.querySelectorAll('.audio-bar');
    
    function animate() {
        bars.forEach((bar, index) => {
            // Get current progress
            const progress = audio.currentTime / audio.duration;
            const barProgress = index / bars.length;
            
            if(barProgress <= progress) {
                // Played part - STARKES LILA!
                bar.style.backgroundColor = '#ff00ff';
                bar.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.8)';
            } else {
                // Not played - Hellgrau
                bar.style.backgroundColor = 'rgba(150, 150, 150, 0.9)';
                bar.style.boxShadow = 'none';
            }
            
            // Pulsing effect while playing
            if(isPlaying) {
                const pulse = Math.sin(Date.now() / 200 + index) * 0.3 + 1;
                bar.style.transform = `scaleY(${pulse})`;
            }
        });
        
        if(isPlaying) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function stopAnimation() {
    if(animationId) {
        cancelAnimationFrame(animationId);
    }
    
    const bars = document.querySelectorAll('.audio-bar');
    bars.forEach(bar => {
        bar.style.transform = 'scaleY(1)';
    });
}

function updateProgress() {
    const bars = document.querySelectorAll('.audio-bar');
    const progress = audio.currentTime / audio.duration;
    
    bars.forEach((bar, index) => {
        const barProgress = index / bars.length;
        
        if(barProgress <= progress) {
            // GESPIELT - STARKES LILA mit GLOW!
            bar.style.backgroundColor = '#ff00ff';
            bar.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.8)';
        } else {
            // NICHT GESPIELT - Hellgrau
            bar.style.backgroundColor = 'rgba(150, 150, 150, 0.9)';
            bar.style.boxShadow = 'none';
        }
    });
}

// ============================================
// FORMAT TIME (seconds to MM:SS)
// ============================================

function formatTime(seconds) {
    if(isNaN(seconds)) return '0:00';
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
            genreButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const genre = this.getAttribute('data-genre');
            console.log('Selected genre:', genre);
        });
    });
}

// ============================================
// DOWNLOAD BUTTON
// ============================================

const downloadBtn = document.querySelector('.download-btn');
downloadBtn.addEventListener('click', function() {
    alert('Download-Funktion wird später implementiert!');
});
