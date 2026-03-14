// UNDERGROUNDLOOPS - Upload System
// R2 Storage via Cloudflare Workers Proxy

const R2_PUBLIC_URL = 'https://pub-5f696ecb59a944058dd6a3ef1b569457.r2.dev';
const R2_WORKER_URL = 'https://undergroundloops-upload.dj-christern.workers.dev';

async function openUploadPage() {
    if(!currentUser) { alert('Please login to upload!'); document.getElementById('loginBtn').click(); return; }
    const flexWrapper = document.getElementById('mainFlexWrapper');
    if(flexWrapper) flexWrapper.style.display = 'none';
    document.getElementById('profileContainer')?.classList.add('hidden');
    document.getElementById('messagesContainer')?.classList.add('hidden');
    document.getElementById('blogContainer')?.classList.add('hidden');
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
    ['loop','sample','track','acapella'].forEach(t => {
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

    const catSection = document.getElementById('loopCategorySection');
    if(catSection) catSection.style.display = type === 'loop' ? 'block' : 'none';

    const keySection = document.getElementById('keySection');
    if(keySection) keySection.style.display = (type === 'sample' || type === 'acapella' || type === 'loop') ? 'block' : 'none';

    const audioInput = document.getElementById('uploadAudioFile');
    if(type === 'track') {
        audioInput.accept = '.mp3,audio/mpeg';
        document.getElementById('uploadAudioLabel').textContent = 'Click to select MP3 file';
        document.getElementById('audioFormatHint').textContent = 'MP3 format only';
    } else if(type === 'acapella') {
        audioInput.accept = '.wav,.mp3,audio/wav,audio/mpeg';
        document.getElementById('uploadAudioLabel').textContent = 'Click to select WAV or MP3 file';
        document.getElementById('audioFormatHint').textContent = 'WAV or MP3 format';
    } else {
        audioInput.accept = '.wav,audio/wav';
        document.getElementById('uploadAudioLabel').textContent = 'Click to select WAV file';
        document.getElementById('audioFormatHint').textContent = 'WAV format only';
    }
}

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
    if((type === 'loop' || type === 'sample') && !audioFile.name.toLowerCase().endsWith('.wav')) {
        alert('❌ Samples and Loops must be WAV format!'); return;
    }
    if(audioFile.size > 20 * 1024 * 1024) {
        alert('❌ Audio file too large! Max 20MB allowed.'); return;
    }

    const progressDiv = document.getElementById('uploadProgress');
    const progressText = document.getElementById('uploadProgressText');
    progressDiv.classList.remove('hidden');

    try {
        progressText.textContent = '⏳ Uploading audio to R2...';

        const timestamp = Date.now();
        const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
        const audioExt = audioFile.name.split('.').pop();
        const audioKey = `audio/${type}s/${safeTitle}_${timestamp}.${audioExt}`;

        const audioURL = await uploadToR2(audioKey, audioFile, audioFile.type || 'audio/wav');

        progressText.textContent = '⏳ Processing cover image...';
        let coverURL = '';

        if(coverFile) {
            const compressed = await compressImage(coverFile, 400, 400, 0.8);
            const coverBlob = await (await fetch(compressed)).blob();
            const coverKey = `covers/${safeTitle}_${timestamp}.jpg`;
            coverURL = await uploadToR2(coverKey, coverBlob, 'image/jpeg');
        } else {
            const defaultCover = generateDefaultCover(title, genre);
            const coverBlob = await (await fetch(defaultCover)).blob();
            const coverKey = `covers/${safeTitle}_${timestamp}.jpg`;
            coverURL = await uploadToR2(coverKey, coverBlob, 'image/jpeg');
        }

        progressText.textContent = '⏳ Saving to database...';

        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();

        const category = type === 'loop' ? (document.getElementById('uploadCategory')?.value || '') : '';
        const key = (type === 'sample' || type === 'acapella' || type === 'loop') ? (document.getElementById('uploadKey')?.value || '') : '';

        await db.collection('tracks').add({
            title, artist: userData.username,
            userId: currentUser.uid,
            type, genre,
            category: category,
            key: key,
            bpm: bpm ? parseInt(bpm) : null,
            audioFile: audioURL,
            coverImage: coverURL,
            likes: 0,
            plays: 0,
            downloads: 0,
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
// R2 UPLOAD via Netlify/Vercel Function
// ============================================

async function uploadToR2(key, fileOrBlob, contentType) {
    const formData = new FormData();
    formData.append('file', fileOrBlob);
    formData.append('key', key);
    formData.append('contentType', contentType);

    const response = await fetch(R2_WORKER_URL, {
        method: 'POST',
        body: formData
    });

    if(!response.ok) {
        const err = await response.text();
        throw new Error('R2 upload failed: ' + err);
    }

    return `${R2_PUBLIC_URL}/${key}`;
}

// ============================================
// HELPERS
// ============================================

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
