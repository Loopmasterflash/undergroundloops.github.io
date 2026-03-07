// UNDERGROUNDLOOPS - Upload System
// Token wird sicher aus Firestore geladen

const GITHUB_OWNER = 'Loopmasterflash';
const GITHUB_REPO = 'undergroundloops.github.io';
const GITHUB_BRANCH = 'master';
let GITHUB_TOKEN = null;

// Load token from Firestore on startup
async function loadGithubToken() {
    try {
        const configDoc = await db.collection('config').doc('github').get();
        if(configDoc.exists) {
            GITHUB_TOKEN = configDoc.data().token;
        }
    } catch(e) {
        console.error('Could not load GitHub token:', e);
    }
}

// Call on page load
setTimeout(loadGithubToken, 2000);

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
    const preview = document.getElementById('coverPreview');
    if(preview) preview.classList.add('hidden');
    selectUploadType('loop');
}

// ============================================
// SELECT TYPE
// ============================================

function selectUploadType(type) {
    ['loop','sample','track'].forEach(t => {
        const btn = document.getElementById('typeBtn_' + t);
        if(btn) {
            btn.style.background = 'rgba(0,0,0,0.3)';
            btn.style.border = '2px solid #444';
            btn.style.color = '#aaa';
        }
    });

    const activeBtn = document.getElementById('typeBtn_' + type);
    if(activeBtn) {
        activeBtn.style.background = 'rgba(255,0,255,0.3)';
        activeBtn.style.border = '2px solid #ff00ff';
        activeBtn.style.color = '#fff';
    }

    document.getElementById('uploadType').value = type;

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
            if(file) document.getElementById('uploadAudioLabel').textContent = '✅ ' + file.name;
        });
    }

    if(coverFile) {
        coverFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                document.getElementById('uploadCoverLabel').textContent = '✅ ' + file.name;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const preview = document.getElementById('coverPreview');
                    if(preview) { preview.src = ev.target.result; preview.classList.remove('hidden'); }
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

    if(!GITHUB_TOKEN) {
        await loadGithubToken();
        if(!GITHUB_TOKEN) { alert('❌ Upload system not ready. Please try again.'); return; }
    }

    const title = document.getElementById('uploadTitle').value.trim();
    const bpm = document.getElementById('uploadBPM').value.trim();
    const genre = document.getElementById('uploadGenre').value;
    const type = document.getElementById('uploadType').value;
    const audioFile = document.getElementById('uploadAudioFile').files[0];
    const coverFile = document.getElementById('uploadCoverFile').files[0];

    if(!title) { alert('Please enter a title!'); return; }
    if(!audioFile) { alert('Please select an audio file!'); return; }

    if(type === 'track' && !audioFile.name.toLowerCase().endsWith('.mp3')) {
        alert('❌ Tracks must be MP3 format!'); return;
    }
    if((type === 'sample' || type === 'loop') && !audioFile.name.toLowerCase().endsWith('.wav')) {
        alert('❌ Samples and Loops must be WAV format!'); return;
    }

    if(audioFile.size > 20 * 1024 * 1024) {
        alert('❌ Audio file too large! Max 20MB allowed.'); return;
    }

    const progressDiv = document.getElementById('uploadProgress');
    const progressText = document.getElementById('uploadProgressText');
    progressDiv.classList.remove('hidden');

    try {
        // Step 1: Upload audio to GitHub
        progressText.textContent = '⏳ Uploading audio to server...';

        const timestamp = Date.now();
        const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
        const audioExt = audioFile.name.split('.').pop();
        const audioFileName = `audio/${type}s/${safeTitle}_${timestamp}.${audioExt}`;

        const audioBase64 = await fileToBase64Raw(audioFile);
        const audioURL = await uploadToGitHub(audioFileName, audioBase64, `Upload ${type}: ${title}`);

        // Step 2: Cover
        progressText.textContent = '⏳ Processing cover image...';
        let coverURL = '';

        if(coverFile) {
            const compressed = await compressImage(coverFile, 400, 400, 0.8);
            const coverBase64Raw = compressed.split(',')[1];
            const coverFileName = `covers/${safeTitle}_${timestamp}.jpg`;
            coverURL = await uploadToGitHub(coverFileName, coverBase64Raw, `Cover for ${title}`);
        } else {
            const defaultCover = generateDefaultCover(title, genre);
            const coverBase64Raw = defaultCover.split(',')[1];
            const coverFileName = `covers/${safeTitle}_${timestamp}.jpg`;
            coverURL = await uploadToGitHub(coverFileName, coverBase64Raw, `Auto cover for ${title}`);
        }

        // Step 3: Save to Firestore
        progressText.textContent = '⏳ Saving to database...';

        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();

        await db.collection('tracks').add({
            title: title,
            artist: userData.username,
            userId: currentUser.uid,
            type: type,
            genre: genre,
            bpm: bpm ? parseInt(bpm) : null,
            audioFile: audioURL,
            coverImage: coverURL,
            likes: 0,
            uploadedAt: new Date().toISOString()
        });

        progressText.textContent = '✅ Upload successful!';

        setTimeout(() => {
            alert('✅ ' + type.charAt(0).toUpperCase() + type.slice(1) + ' "' + title + '" uploaded successfully!');
            openProfile();
        }, 1000);

    } catch(error) {
        progressDiv.classList.add('hidden');
        console.error('Upload error:', error);
        alert('❌ Upload failed: ' + error.message);
    }
}

// ============================================
// GITHUB API
// ============================================

async function uploadToGitHub(filePath, base64Content, commitMessage) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: commitMessage,
            content: base64Content,
            branch: GITHUB_BRANCH
        })
    });

    if(!response.ok) {
        const error = await response.json();
        throw new Error('GitHub upload failed: ' + (error.message || response.statusText));
    }

    const data = await response.json();
    return data.content.download_url;
}

// ============================================
// HELPERS
// ============================================

function fileToBase64Raw(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result.split(',')[1]);
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
                let width = img.width, height = img.height;
                if(width > height) {
                    if(width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
                } else {
                    if(height > maxHeight) { width = Math.round(width * maxHeight / height); height = maxHeight; }
                }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
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
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 400, 400);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);
    ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 380, 380);
    ctx.fillStyle = '#00ffff'; ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(genre.toUpperCase(), 200, 160);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px sans-serif';
    let y = 220, line = '';
    title.split(' ').forEach(word => {
        const test = line + word + ' ';
        if(ctx.measureText(test).width > 360 && line !== '') {
            ctx.fillText(line.trim(), 200, y); line = word + ' '; y += 44;
        } else line = test;
    });
    ctx.fillText(line.trim(), 200, y);
    ctx.fillStyle = 'rgba(255,0,255,0.4)'; ctx.font = '14px sans-serif';
    ctx.fillText('UNDERGROUNDLOOPS', 200, 370);
    return canvas.toDataURL('image/jpeg', 0.8);
}
