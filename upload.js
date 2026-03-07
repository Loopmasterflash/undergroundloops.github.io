// UNDERGROUNDLOOPS - Upload System
// Track (MP3), Sample (WAV), Loop (WAV)

// ============================================
// OPEN UPLOAD PAGE
// ============================================

function openUploadPage() {
    if(!currentUser) {
        alert('Please login to upload!');
        document.getElementById('loginBtn').click();
        return;
    }

    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.add('hidden');
    document.getElementById('uploadContainer').classList.remove('hidden');

    // Reset form
    resetUploadForm();
}

function resetUploadForm() {
    document.getElementById('uploadTitle').value = '';
    document.getElementById('uploadBPM').value = '';
    document.getElementById('uploadGenre').value = 'techno';
    document.getElementById('uploadAudioFile').value = '';
    document.getElementById('uploadCoverFile').value = '';
    document.getElementById('uploadAudioLabel').textContent = 'Click to select audio file';
    document.getElementById('uploadCoverLabel').textContent = 'Click to select cover image (optional)';
    document.getElementById('uploadProgress').classList.add('hidden');
    selectUploadType('loop'); // default
}

// ============================================
// SELECT TYPE
// ============================================

function selectUploadType(type) {
    // Update buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('typeBtn_' + type).classList.add('active');

    // Update hidden input
    document.getElementById('uploadType').value = type;

    // Update accepted file format label
    const audioInput = document.getElementById('uploadAudioFile');
    if(type === 'track') {
        audioInput.accept = '.mp3,audio/mpeg';
        document.getElementById('uploadAudioLabel').textContent = 'Click to select MP3 file';
        document.getElementById('audioFormatHint').textContent = 'MP3 format only';
    } else {
        audioInput.accept = '.wav,audio/wav';
        document.getElementById('uploadAudioLabel').textContent = 'Click to select WAV file';
        document.getElementById('audioFormatHint').textContent = 'WAV format only';
    }
}

// ============================================
// FILE SELECTION DISPLAY
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const audioFile = document.getElementById('uploadAudioFile');
    const coverFile = document.getElementById('uploadCoverFile');

    if(audioFile) {
        audioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                document.getElementById('uploadAudioLabel').textContent = '✅ ' + file.name;
            }
        });
    }

    if(coverFile) {
        coverFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                document.getElementById('uploadCoverLabel').textContent = '✅ ' + file.name;

                // Preview
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const preview = document.getElementById('coverPreview');
                    if(preview) {
                        preview.src = ev.target.result;
                        preview.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// ============================================
// SUBMIT UPLOAD
// ============================================

async function submitUpload() {
    if(!currentUser) { alert('Please login first!'); return; }

    const title = document.getElementById('uploadTitle').value.trim();
    const bpm = document.getElementById('uploadBPM').value.trim();
    const genre = document.getElementById('uploadGenre').value;
    const type = document.getElementById('uploadType').value;
    const audioFile = document.getElementById('uploadAudioFile').files[0];
    const coverFile = document.getElementById('uploadCoverFile').files[0];

    // Validation
    if(!title) { alert('Please enter a title!'); return; }
    if(!audioFile) { alert('Please select an audio file!'); return; }

    // Check format
    if(type === 'track' && !audioFile.name.toLowerCase().endsWith('.mp3')) {
        alert('❌ Tracks must be MP3 format!');
        return;
    }
    if((type === 'sample' || type === 'loop') && !audioFile.name.toLowerCase().endsWith('.wav')) {
        alert('❌ Samples and Loops must be WAV format!');
        return;
    }

    // Check audio file size (max 20MB)
    if(audioFile.size > 20 * 1024 * 1024) {
        alert('❌ Audio file too large! Max 20MB allowed.');
        return;
    }

    // Show progress
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.classList.remove('hidden');
    document.getElementById('uploadProgressText').textContent = 'Converting audio file...';

    try {
        // Convert audio to base64
        const audioBase64 = await fileToBase64(audioFile);

        document.getElementById('uploadProgressText').textContent = 'Processing cover image...';

        // Cover image
        let coverBase64 = '';
        if(coverFile) {
            coverBase64 = await compressImage(coverFile, 400, 400, 0.8);
        } else {
            // Default cover placeholder
            coverBase64 = generateDefaultCover(title, genre);
        }

        document.getElementById('uploadProgressText').textContent = 'Saving to database...';

        // Get user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();

        // Save to Firestore
        await db.collection('tracks').add({
            title: title,
            artist: userData.username,
            userId: currentUser.uid,
            type: type,
            genre: genre,
            bpm: bpm ? parseInt(bpm) : null,
            audioFile: audioBase64,
            coverImage: coverBase64,
            likes: 0,
            uploadedAt: new Date().toISOString()
        });

        document.getElementById('uploadProgressText').textContent = '✅ Upload successful!';

        setTimeout(() => {
            alert('✅ ' + type.charAt(0).toUpperCase() + type.slice(1) + ' uploaded successfully!');
            // Go back to profile
            openProfile();
        }, 1000);

    } catch(error) {
        progressDiv.classList.add('hidden');
        console.error('Upload error:', error);
        alert('❌ Upload failed: ' + error.message);
    }
}

// ============================================
// HELPERS
// ============================================

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if(width > height) {
                    if(width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
                } else {
                    if(height > maxHeight) { width = Math.round(width * maxHeight / height); height = maxHeight; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function generateDefaultCover(title, genre) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 400, 400);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);

    // Neon border
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 380, 380);

    // Genre text
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 24px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(genre.toUpperCase(), 200, 160);

    // Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Orbitron, sans-serif';
    const words = title.split(' ');
    let y = 220;
    let line = '';
    words.forEach(word => {
        const testLine = line + word + ' ';
        if(ctx.measureText(testLine).width > 360 && line !== '') {
            ctx.fillText(line.trim(), 200, y);
            line = word + ' ';
            y += 44;
        } else {
            line = testLine;
        }
    });
    ctx.fillText(line.trim(), 200, y);

    // UNDERGROUNDLOOPS watermark
    ctx.fillStyle = 'rgba(255,0,255,0.4)';
    ctx.font = '14px Orbitron, sans-serif';
    ctx.fillText('UNDERGROUNDLOOPS', 200, 370);

    return canvas.toDataURL('image/jpeg', 0.8);
}
