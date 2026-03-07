// Authentication System

let currentUser = null;

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
            
            // Save user profile to Firestore
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
            alert('✅ Logged out successfully!');
        } catch(error) {
            alert('❌ Logout failed: ' + error.message);
        }
    });
    
    // Avatar click - open profile
    document.addEventListener('click', (e) => {
        if(e.target.id === 'userAvatar') {
            openProfileModal();
        }
    });
    
    // Avatar Upload - Change Avatar Button
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    
    if(uploadAvatarBtn) {
        uploadAvatarBtn.addEventListener('click', () => {
            avatarInput.click();
        });
    }
    
    if(avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file) return;
            
            if(!currentUser) {
                alert('Please login first');
                return;
            }

            // Check file size (max 2MB)
            if(file.size > 2 * 1024 * 1024) {
                alert('❌ File too large! Max 2MB allowed.');
                return;
            }

            // Check file type
            if(!file.type.startsWith('image/')) {
                alert('❌ Only image files allowed!');
                return;
            }
            
            try {
                alert('⏳ Uploading avatar...');

                // Convert to Base64 and store in Firestore (no Storage needed!)
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64Image = event.target.result;
                    
                    try {
                        await db.collection('users').doc(currentUser.uid).update({
                            avatar: base64Image
                        });
                        
                        // Update all avatar images on page
                        const allAvatars = document.querySelectorAll('#profileAvatar, #userAvatar, .user-avatar-img');
                        allAvatars.forEach(img => img.src = base64Image);
                        
                        alert('✅ Avatar updated successfully!');
                    } catch(err) {
                        alert('❌ Failed to save avatar: ' + err.message);
                    }
                };
                reader.readAsDataURL(file);

            } catch(error) {
                alert('❌ Avatar upload failed: ' + error.message);
            }
        });
    }
    
    // Update Username
    const updateUsernameBtn = document.getElementById('updateUsernameBtn');
    if(updateUsernameBtn) {
        updateUsernameBtn.addEventListener('click', async () => {
            const newUsername = document.getElementById('profileUsername').value;
            
            if(!currentUser) {
                alert('Please login first');
                return;
            }
            
            try {
                await db.collection('users').doc(currentUser.uid).update({
                    username: newUsername
                });
                
                document.getElementById('username').textContent = newUsername;
                alert('✅ Username updated successfully!');
            } catch(error) {
                alert('❌ Update failed: ' + error.message);
            }
        });
    }
}

function showUserMenu(user) {
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
}

function showLoginButton() {
    document.getElementById('loginBtn').classList.remove('hidden');
    document.getElementById('userMenu').classList.add('hidden');
}

async function loadUserProfile(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        
        if(userDoc.exists) {
            const userData = userDoc.data();
            
            // Set username
            const usernameEl = document.getElementById('username');
            if(usernameEl) usernameEl.textContent = userData.username;
            
            // Set avatar if exists
            if(userData.avatar) {
                const allAvatars = document.querySelectorAll('#userAvatar, .user-avatar-img');
                allAvatars.forEach(img => img.src = userData.avatar);
            }
        }
    } catch(error) {
        console.error('Error loading user profile:', error);
    }
}

function openProfileModal() {
    if(!currentUser) return;
    
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if(doc.exists) {
            const userData = doc.data();
            
            const profileUsername = document.getElementById('profileUsername');
            const profileAvatar = document.getElementById('profileAvatar');
            const profileModal = document.getElementById('profileModal');
            
            if(profileUsername) profileUsername.value = userData.username;
            if(profileAvatar && userData.avatar) profileAvatar.src = userData.avatar;
            if(profileModal) profileModal.classList.remove('hidden');
        }
    });
}
