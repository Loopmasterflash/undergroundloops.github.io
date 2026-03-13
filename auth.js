// Authentication System

let currentUser = null;
let currentProfileUID = null;

setTimeout(() => {
    if(typeof firebase === 'undefined' || !firebase.auth) {
        console.error('Firebase Auth not loaded');
        return;
    }
    initAuth();
}, 1500);

function initAuth() {
    const auth = firebase.auth();

    auth.onAuthStateChanged(user => {
        if(user) {
            currentUser = user;
            showUserMenu(user);
            loadUserProfile(user.uid);
            // ✅ Last seen updaten
            db.collection('users').doc(user.uid).set({ lastSeen: new Date().toISOString() }, { merge: true });
        } else {
            currentUser = null;
            showLoginButton();
        }
    });

    document.getElementById('loginBtn').addEventListener('click', () => {
        document.getElementById('authModal').classList.remove('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });

    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    });

    document.getElementById('loginSubmit').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            document.getElementById('authModal').classList.add('hidden');
            alert('✅ Login successful!');
        } catch(error) {
            alert('❌ Login failed: ' + error.message);
        }
    });

    document.getElementById('registerSubmit').addEventListener('click', async () => {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await db.collection('users').doc(user.uid).set({
                username: username,
                email: email,
                avatar: '',
                banner: '',
                createdAt: new Date().toISOString()
            });
            document.getElementById('authModal').classList.add('hidden');
            alert('✅ Registration successful!');
        } catch(error) {
            alert('❌ Registration failed: ' + error.message);
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await auth.signOut();
            showMainPage();
            alert('✅ Logged out successfully!');
        } catch(error) {
            alert('❌ Logout failed: ' + error.message);
        }
    });

    // ✅ Avatar Upload → GitHub
    const avatarUpload = document.getElementById('avatarUpload');
    if(avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file || !currentUser) return;
            if(!file.type.startsWith('image/')) { alert('❌ Only image files allowed!'); return; }
            try {
                alert('⏳ Uploading avatar...');
                const avatarUrl = await uploadImageToGitHub(file, 'avatars', currentUser.uid, 1024, 1024);
                await db.collection('users').doc(currentUser.uid).update({ avatar: avatarUrl });
                ['settingsAvatar', 'profilePageAvatar', 'userAvatar'].forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.src = avatarUrl;
                });
                alert('✅ Avatar updated!');
            } catch(err) {
                alert('❌ Failed to save avatar: ' + err.message);
            }
        });
    }

    // ✅ Banner Upload → GitHub
    const bannerUpload = document.getElementById('bannerUpload');
    if(bannerUpload) {
        bannerUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file || !currentUser) return;
            if(!file.type.startsWith('image/')) { alert('❌ Only image files allowed!'); return; }
            try {
                alert('⏳ Uploading banner...');
                const bannerUrl = await uploadImageToGitHub(file, 'banners', currentUser.uid, 1536, 1024);
                await db.collection('users').doc(currentUser.uid).set({ banner: bannerUrl }, { merge: true });
                setBannerImage(bannerUrl);
                alert('✅ Banner updated!');
            } catch(err) {
                alert('❌ Failed to save banner: ' + err.message);
            }
        });
    }
}

// ✅ Banner anzeigen
function setBannerImage(bannerSrc) {
    const bannerImg = document.getElementById('profileBannerImg');
    const bannerDefault = document.getElementById('bannerDefault');
    if(!bannerImg || !bannerDefault) return;
    
    if(bannerSrc && bannerSrc.length > 10) {
        bannerImg.src = bannerSrc;
        bannerImg.style.display = 'block';
        bannerDefault.style.display = 'none';
    } else {
        bannerImg.src = '';
        bannerImg.style.display = 'none';
        bannerDefault.style.display = 'flex';
    }
}

// ✅ Bild komprimieren (Canvas)
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                if(ratio < 1) { width = Math.round(width * ratio); height = Math.round(height * ratio); }
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

// ✅ Bild zu GitHub hochladen
async function uploadImageToGitHub(file, folder, userId, maxWidth, maxHeight) {
    // GitHub Token aus Firestore holen
    const configDoc = await db.collection('config').doc('github').get();
    if(!configDoc.exists) throw new Error('GitHub config not found');
    const token = configDoc.data().token;

    // Bild komprimieren
    const base64DataUrl = await compressImage(file, maxWidth, maxHeight, 0.9);
    const base64Data = base64DataUrl.split(',')[1];

    const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
    const fileName = `${folder}/${userId}_${Date.now()}.${ext}`;

    const GITHUB_OWNER = 'Loopmasterflash';
    const GITHUB_REPO = 'undergroundloops.github.io';

    // Prüfen ob Datei schon existiert (für SHA)
    let sha = null;
    try {
        const checkRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${fileName}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        if(checkRes.ok) { const d = await checkRes.json(); sha = d.sha; }
    } catch(e) {}

    const body = {
        message: `Upload ${folder}: ${userId}`,
        content: base64Data,
        branch: 'main'
    };
    if(sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${fileName}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if(!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'GitHub upload failed');
    }

    return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${fileName}`;
}

function showUserMenu(user) {
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    const messagesIcon = document.getElementById('messagesIcon');
    if(messagesIcon) messagesIcon.classList.remove('hidden');
}

function showLoginButton() {
    document.getElementById('loginBtn').classList.remove('hidden');
    document.getElementById('userMenu').classList.add('hidden');
    const messagesIcon = document.getElementById('messagesIcon');
    if(messagesIcon) messagesIcon.classList.add('hidden');
}

async function loadUserProfile(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if(userDoc.exists) {
            const userData = userDoc.data();
            const usernameEl = document.getElementById('username');
            if(usernameEl) usernameEl.textContent = userData.username;
            if(userData.avatar) {
                const userAvatar = document.getElementById('userAvatar');
                if(userAvatar) userAvatar.src = userData.avatar;
            }
            // ✅ Banner beim Seitenload immer setzen
            if(userData.banner) {
                setBannerImage(userData.banner);
            }
        }
    } catch(error) {
        console.error('Error loading user profile:', error);
    }
}

function openProfile() {
    if(!currentUser) return;
    showProfilePage(currentUser.uid);
}

async function showProfilePage(uid) {
    currentProfileUID = uid;
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('profileContainer').classList.remove('hidden');
    document.getElementById('messagesContainer').classList.add('hidden');

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if(!userDoc.exists) return;
        const userData = userDoc.data();

        document.getElementById('profilePageUsername').textContent = userData.username;
        document.getElementById('profilePageEmail').textContent = userData.email || '';
        document.getElementById('profilePageJoined').textContent = 'Joined ' + new Date(userData.createdAt).toLocaleDateString();

        if(userData.avatar) {
            document.getElementById('profilePageAvatar').src = userData.avatar;
            const settingsAvatar = document.getElementById('settingsAvatar');
            if(settingsAvatar) settingsAvatar.src = userData.avatar;
        }

        // ✅ Banner laden - immer aufrufen!
        setBannerImage(userData.banner || null);

        // ✅ Edit Banner Button nur für eigenes Profil
        const editBannerBtn = document.getElementById('editBannerBtn');
        if(editBannerBtn) {
            if(currentUser && currentUser.uid === uid) {
                editBannerBtn.style.display = 'block';
                editBannerBtn.style.zIndex = '10';
            } else {
                editBannerBtn.style.display = 'none';
            }
        }

        const settingsUsername = document.getElementById('settingsUsername');
        if(settingsUsername) settingsUsername.value = userData.username;

        const settingsTabBtn = document.querySelector('[data-tab="settings"]');
        if(settingsTabBtn) {
            settingsTabBtn.style.display = (currentUser && currentUser.uid === uid) ? '' : 'none';
        }

        const profileActions = document.getElementById('profileActions');
        if(profileActions) {
            if(currentUser && currentUser.uid !== uid) {
                profileActions.innerHTML = `<button onclick="toggleFollow('${uid}')" style="padding:10px 20px;background:rgba(255,0,255,0.3);border:2px solid #ff00ff;color:#fff;border-radius:8px;cursor:pointer;">Follow</button>`;
            } else {
                profileActions.innerHTML = '';
            }
        }

        loadProfileStats(uid);
        loadUserUploads(uid);

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                btn.classList.add('active');
                document.getElementById(btn.getAttribute('data-tab') + 'Tab').classList.remove('hidden');
            };
        });

    } catch(error) {
        console.error('Error loading profile:', error);
    }
}

async function loadProfileStats(uid) {
    try {
        const tracksSnap = await db.collection('tracks').where('userId', '==', uid).get();
        document.getElementById('uploadsCount').textContent = tracksSnap.size;
        const followersSnap = await db.collection('follows').where('followingId', '==', uid).get();
        document.getElementById('followersCount').textContent = followersSnap.size;
        const followingSnap = await db.collection('follows').where('followerId', '==', uid).get();
        document.getElementById('followingCount').textContent = followingSnap.size;
        let totalLikes = 0;
        tracksSnap.forEach(doc => { totalLikes += (doc.data().likes || 0); });
        document.getElementById('likesCount').textContent = totalLikes;
    } catch(error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUserUploads(uid) {
    try {
        const snap = await db.collection('tracks').where('userId', '==', uid).get();
        const container = document.getElementById('userUploads');
        if(snap.empty) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No uploads yet.</p>';
            return;
        }
        container.innerHTML = '';
        snap.forEach(doc => {
            const track = doc.data();
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px;border:1px solid #ff00ff44;border-radius:8px;margin-bottom:10px;color:#fff;cursor:pointer;transition:border 0.3s;';
            div.innerHTML = `<strong>${track.title}</strong> — ${track.genre || 'Unknown'} • ${track.type || 'Loop'}`;
            div.onmouseover = () => div.style.border = '1px solid #ff00ff';
            div.onmouseout = () => div.style.border = '1px solid #ff00ff44';
            div.onclick = () => openPlayerModal({id: doc.id, ...track});
            container.appendChild(div);
        });
    } catch(error) {
        console.error('Error loading uploads:', error);
    }
}

async function updateUsername() {
    const newUsername = document.getElementById('settingsUsername').value;
    if(!currentUser) { alert('Please login first'); return; }
    try {
        await db.collection('users').doc(currentUser.uid).update({ username: newUsername });
        document.getElementById('username').textContent = newUsername;
        document.getElementById('profilePageUsername').textContent = newUsername;
        alert('✅ Username updated!');
    } catch(error) {
        alert('❌ Update failed: ' + error.message);
    }
}

function showMainPage() {
    document.getElementById('mainContainer').classList.remove('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.add('hidden');
    const uploadContainer = document.getElementById('uploadContainer');
    if(uploadContainer) uploadContainer.classList.add('hidden');
}

function openMessages() {
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.remove('hidden');
}
