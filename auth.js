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

    // ✅ Avatar Upload
    const avatarUpload = document.getElementById('avatarUpload');
    if(avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file || !currentUser) return;
            if(!file.type.startsWith('image/')) { alert('❌ Only image files allowed!'); return; }
            try {
                const compressedBase64 = await compressImage(file, 200, 200, 0.7);
                await db.collection('users').doc(currentUser.uid).update({ avatar: compressedBase64 });
                ['settingsAvatar', 'profilePageAvatar', 'userAvatar'].forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.src = compressedBase64;
                });
                alert('✅ Avatar updated successfully!');
            } catch(err) {
                alert('❌ Failed to save avatar: ' + err.message);
            }
        });
    }

    // ✅ Banner Upload
    const bannerUpload = document.getElementById('bannerUpload');
    if(bannerUpload) {
        bannerUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file || !currentUser) return;
            if(!file.type.startsWith('image/')) { alert('❌ Only image files allowed!'); return; }
            try {
                const compressedBase64 = await compressImage(file, 1200, 300, 0.75);
                if(compressedBase64.length > 900000) {
                    alert('❌ Banner image too large! Please use a smaller image.'); return;
                }
                await db.collection('users').doc(currentUser.uid).set({ banner: compressedBase64 }, { merge: true });
                setBannerImage(compressedBase64);
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
    if(bannerSrc && bannerImg) {
        bannerImg.src = bannerSrc;
        bannerImg.style.display = 'block';
        if(bannerDefault) bannerDefault.style.display = 'none';
    } else {
        if(bannerImg) bannerImg.style.display = 'none';
        if(bannerDefault) bannerDefault.style.display = 'flex';
    }
}

// ✅ Bild komprimieren
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

        // ✅ Banner laden
        setBannerImage(userData.banner || '');

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
