// Authentication System

let currentUser = null;
let currentProfileUID = null;

// Wait for Firebase Auth to load
setTimeout(() => {
    if(typeof firebase === 'undefined' || !firebase.auth) {
        console.error('Firebase Auth not loaded');
        return;
    }
    initAuth();
}, 1500);

function initAuth() {
    const auth = firebase.auth();

    // Check if user is logged in
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

    // Login Button
    document.getElementById('loginBtn').addEventListener('click', () => {
        document.getElementById('authModal').classList.remove('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    });

    // Close Modal
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });

    // Switch Forms
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

    // Login Submit
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

    // Register Submit
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
                createdAt: new Date().toISOString()
            });
            document.getElementById('authModal').classList.add('hidden');
            alert('✅ Registration successful!');
        } catch(error) {
            alert('❌ Registration failed: ' + error.message);
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await auth.signOut();
            showMainPage();
            alert('✅ Logged out successfully!');
        } catch(error) {
            alert('❌ Logout failed: ' + error.message);
        }
    });

    // ✅ Avatar Upload - ID ist "avatarUpload" laut index.html
    const avatarUpload = document.getElementById('avatarUpload');
    if(avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file) return;

            if(!currentUser) { alert('Please login first'); return; }

            if(file.size > 2 * 1024 * 1024) {
                alert('❌ File too large! Max 2MB allowed.');
                return;
            }

            if(!file.type.startsWith('image/')) {
                alert('❌ Only image files allowed!');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Image = event.target.result;
                try {
                    await db.collection('users').doc(currentUser.uid).update({ avatar: base64Image });
                    // Update alle Avatar Bilder auf der Seite
                    ['settingsAvatar', 'profilePageAvatar', 'userAvatar'].forEach(id => {
                        const el = document.getElementById(id);
                        if(el) el.src = base64Image;
                    });
                    alert('✅ Avatar updated successfully!');
                } catch(err) {
                    alert('❌ Failed to save avatar: ' + err.message);
                }
            };
            reader.readAsDataURL(file);
        });
    }
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

// Eigenes Profil öffnen
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

        const settingsUsername = document.getElementById('settingsUsername');
        if(settingsUsername) settingsUsername.value = userData.username;

        // Settings Tab nur für eigenes Profil
        const settingsTabBtn = document.querySelector('[data-tab="settings"]');
        if(settingsTabBtn) {
            settingsTabBtn.style.display = (currentUser && currentUser.uid === uid) ? '' : 'none';
        }

        // Follow Button für fremde Profile
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

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                btn.classList.add('active');
                const tabId = btn.getAttribute('data-tab') + 'Tab';
                document.getElementById(tabId).classList.remove('hidden');
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
            div.style.cssText = 'padding:15px;border:1px solid #ff00ff44;border-radius:8px;margin-bottom:10px;color:#fff;';
            div.innerHTML = `<strong>${track.title}</strong> — ${track.genre || 'Unknown'} • ${track.type || 'Loop'}`;
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
}

function openMessages() {
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.remove('hidden');
}
