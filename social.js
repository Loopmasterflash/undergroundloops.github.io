// UNDERGROUNDLOOPS - Social Features
// Like System, Follow System, Profile Page, Messages

let currentProfileUserId = null;

// ============================================
// LIKE SYSTEM
// ============================================

async function toggleLike(trackId) {
    if(!currentUser) {
        alert('Please login to like tracks!');
        document.getElementById('loginBtn').click();
        return;
    }
    
    try {
        const likeId = `${currentUser.uid}_${trackId}`;
        const likeRef = db.collection('likes').doc(likeId);
        const likeDoc = await likeRef.get();
        
        if(likeDoc.exists) {
            // Unlike
            await likeRef.delete();
            updateLikeButton(trackId, false);
            await updateTrackLikeCount(trackId, -1);
        } else {
            // Like
            await likeRef.set({
                userId: currentUser.uid,
                trackId: trackId,
                createdAt: new Date().toISOString()
            });
            updateLikeButton(trackId, true);
            await updateTrackLikeCount(trackId, 1);
        }
    } catch(error) {
        console.error('Error toggling like:', error);
        alert('Failed to like track');
    }
}

function updateLikeButton(trackId, liked) {
    const likeBtn = document.querySelector(`[data-track-id="${trackId}"] .like-btn`);
    if(likeBtn) {
        if(liked) {
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = '<span class="heart">❤️</span> <span class="like-count">' + 
                (parseInt(likeBtn.querySelector('.like-count').textContent) + 1) + '</span>';
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.innerHTML = '<span class="heart">🤍</span> <span class="like-count">' + 
                (parseInt(likeBtn.querySelector('.like-count').textContent) - 1) + '</span>';
        }
    }
}

async function updateTrackLikeCount(trackId, change) {
    try {
        const trackRef = db.collection('tracks').doc(trackId);
        const trackDoc = await trackRef.get();
        
        if(trackDoc.exists) {
            const currentLikes = trackDoc.data().likes || 0;
            await trackRef.update({
                likes: currentLikes + change
            });
        }
    } catch(error) {
        console.error('Error updating like count:', error);
    }
}

async function checkIfLiked(trackId) {
    if(!currentUser) return false;
    
    try {
        const likeId = `${currentUser.uid}_${trackId}`;
        const likeDoc = await db.collection('likes').doc(likeId).get();
        return likeDoc.exists;
    } catch(error) {
        console.error('Error checking like:', error);
        return false;
    }
}

// ============================================
// FOLLOW SYSTEM
// ============================================

async function toggleFollow(userId) {
    if(!currentUser) {
        alert('Please login to follow users!');
        return;
    }
    
    if(userId === currentUser.uid) {
        alert('You cannot follow yourself!');
        return;
    }
    
    try {
        const followId = `${currentUser.uid}_${userId}`;
        const followRef = db.collection('follows').doc(followId);
        const followDoc = await followRef.get();
        
        if(followDoc.exists) {
            // Unfollow
            await followRef.delete();
            updateFollowButton(userId, false);
        } else {
            // Follow
            await followRef.set({
                followerId: currentUser.uid,
                followingId: userId,
                createdAt: new Date().toISOString()
            });
            updateFollowButton(userId, true);
        }
        
        // Reload profile stats
        if(currentProfileUserId === userId) {
            loadProfileStats(userId);
        }
    } catch(error) {
        console.error('Error toggling follow:', error);
        alert('Failed to follow user');
    }
}

function updateFollowButton(userId, following) {
    const followBtn = document.querySelector('.follow-btn');
    if(followBtn && followBtn.getAttribute('data-user-id') === userId) {
        if(following) {
            followBtn.classList.add('following');
            followBtn.textContent = 'Following';
        } else {
            followBtn.classList.remove('following');
            followBtn.textContent = 'Follow';
        }
    }
}

async function checkIfFollowing(userId) {
    if(!currentUser) return false;
    
    try {
        const followId = `${currentUser.uid}_${userId}`;
        const followDoc = await db.collection('follows').doc(followId).get();
        return followDoc.exists;
    } catch(error) {
        console.error('Error checking follow:', error);
        return false;
    }
}

// ============================================
// PROFILE PAGE
// ============================================

async function openProfile(userId = null) {
    const targetUserId = userId || currentUser?.uid;
    
    if(!targetUserId) {
        alert('Please login first');
        return;
    }
    
    currentProfileUserId = targetUserId;
    
    // Hide main page, show profile
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.add('hidden');
    document.getElementById('profileContainer').classList.remove('hidden');
    
    // Load profile data
    await loadProfileData(targetUserId);
    await loadProfileStats(targetUserId);
    await loadUserUploads(targetUserId);
    
    // Setup tabs
    setupProfileTabs();
}

async function loadProfileData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if(userDoc.exists) {
            const userData = userDoc.data();
            
            document.getElementById('profilePageAvatar').src = userData.avatar;
            document.getElementById('profilePageUsername').textContent = userData.username;
            document.getElementById('profilePageEmail').textContent = userData.email;
            
            const joinedDate = new Date(userData.createdAt).toLocaleDateString();
            document.getElementById('profilePageJoined').textContent = `Joined ${joinedDate}`;
            
            // Show appropriate actions
            const actionsDiv = document.getElementById('profileActions');
            if(currentUser && userId === currentUser.uid) {
                // Own profile - no follow button
                actionsDiv.innerHTML = '';
            } else if(currentUser) {
                // Other user's profile
                const isFollowing = await checkIfFollowing(userId);
                actionsDiv.innerHTML = `
                    <button class="follow-btn ${isFollowing ? 'following' : ''}" 
                            data-user-id="${userId}" 
                            onclick="toggleFollow('${userId}')">
                        ${isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button class="message-user-btn" onclick="startConversation('${userId}')">
                        Message
                    </button>
                `;
            } else {
                actionsDiv.innerHTML = '';
            }
            
            // Settings tab data
            if(currentUser && userId === currentUser.uid) {
                document.getElementById('settingsAvatar').src = userData.avatar;
                document.getElementById('settingsUsername').value = userData.username;
            }
        }
    } catch(error) {
        console.error('Error loading profile:', error);
    }
}

async function loadProfileStats(userId) {
    try {
        // Count uploads
        const uploadsSnap = await db.collection('tracks').where('userId', '==', userId).get();
        document.getElementById('uploadsCount').textContent = uploadsSnap.size;
        
        // Count followers
        const followersSnap = await db.collection('follows').where('followingId', '==', userId).get();
        document.getElementById('followersCount').textContent = followersSnap.size;
        
        // Count following
        const followingSnap = await db.collection('follows').where('followerId', '==', userId).get();
        document.getElementById('followingCount').textContent = followingSnap.size;
        
        // Count total likes received
        let totalLikes = 0;
        uploadsSnap.forEach(doc => {
            totalLikes += (doc.data().likes || 0);
        });
        document.getElementById('likesCount').textContent = totalLikes;
        
    } catch(error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUserUploads(userId) {
    try {
        const snapshot = await db.collection('tracks')
            .where('userId', '==', userId)
            .get();
        
        const container = document.getElementById('userUploads');
        
        if(snapshot.empty) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No uploads yet</p>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const track = { id: doc.id, ...doc.data() };
            const trackCard = createTrackCard(track);
            container.appendChild(trackCard);
        });
    } catch(error) {
        console.error('Error loading uploads:', error);
    }
}

async function loadUserLikedTracks() {
    if(!currentUser) return;
    
    try {
        const likesSnap = await db.collection('likes')
            .where('userId', '==', currentProfileUserId)
            .get();
        
        const container = document.getElementById('userLikedTracks');
        
        if(likesSnap.empty) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No liked tracks yet</p>';
            return;
        }
        
        container.innerHTML = '';
        
        for(const likeDoc of likesSnap.docs) {
            const trackId = likeDoc.data().trackId;
            const trackDoc = await db.collection('tracks').doc(trackId).get();
            
            if(trackDoc.exists) {
                const track = { id: trackDoc.id, ...trackDoc.data() };
                const trackCard = createTrackCard(track);
                container.appendChild(trackCard);
            }
        }
    } catch(error) {
        console.error('Error loading liked tracks:', error);
    }
}

function setupProfileTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            
            // Add active to clicked
            btn.classList.add('active');
            
            if(tab === 'uploads') {
                document.getElementById('uploadsTab').classList.remove('hidden');
            } else if(tab === 'liked') {
                document.getElementById('likedTab').classList.remove('hidden');
                loadUserLikedTracks();
            } else if(tab === 'settings') {
                document.getElementById('settingsTab').classList.remove('hidden');
            }
        });
    });
}

// Show followers/following
async function showFollowers() {
    if(!currentProfileUserId) return;
    
    try {
        const snapshot = await db.collection('follows')
            .where('followingId', '==', currentProfileUserId)
            .get();
        
        showFollowModal('Followers', snapshot, 'followerId');
    } catch(error) {
        console.error('Error loading followers:', error);
    }
}

async function showFollowing() {
    if(!currentProfileUserId) return;
    
    try {
        const snapshot = await db.collection('follows')
            .where('followerId', '==', currentProfileUserId)
            .get();
        
        showFollowModal('Following', snapshot, 'followingId');
    } catch(error) {
        console.error('Error loading following:', error);
    }
}

async function showFollowModal(title, snapshot, userIdField) {
    document.getElementById('followModalTitle').textContent = title;
    const content = document.getElementById('followModalContent');
    
    if(snapshot.empty) {
        content.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No users yet</p>';
    } else {
        content.innerHTML = '';
        
        for(const doc of snapshot.docs) {
            const userId = doc.data()[userIdField];
            const userDoc = await db.collection('users').doc(userId).get();
            
            if(userDoc.exists) {
                const userData = userDoc.data();
                const item = document.createElement('div');
                item.className = 'follow-item';
                item.innerHTML = `
                    <img src="${userData.avatar}" class="follow-item-avatar">
                    <span class="follow-item-name" onclick="openProfile('${userId}')">${userData.username}</span>
                `;
                content.appendChild(item);
            }
        }
    }
    
    document.getElementById('followModal').classList.remove('hidden');
}

// ============================================
// MESSAGES SYSTEM
// ============================================

let currentConversationUserId = null;

async function openMessages() {
    if(!currentUser) {
        alert('Please login first');
        return;
    }
    
    // Hide other pages
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.remove('hidden');
    
    // Load conversations
    await loadConversations();
}

async function loadConversations() {
    try {
        // Get all messages where user is sender or receiver
        const sentSnap = await db.collection('messages')
            .where('senderId', '==', currentUser.uid)
            .get();
        
        const receivedSnap = await db.collection('messages')
            .where('receiverId', '==', currentUser.uid)
            .get();
        
        // Build conversation list
        const conversations = new Map();
        
        sentSnap.forEach(doc => {
            const msg = doc.data();
            const otherUserId = msg.receiverId;
            if(!conversations.has(otherUserId)) {
                conversations.set(otherUserId, {
                    userId: otherUserId,
                    lastMessage: msg.text,
                    timestamp: msg.createdAt
                });
            }
        });
        
        receivedSnap.forEach(doc => {
            const msg = doc.data();
            const otherUserId = msg.senderId;
            if(!conversations.has(otherUserId) || msg.createdAt > conversations.get(otherUserId).timestamp) {
                conversations.set(otherUserId, {
                    userId: otherUserId,
                    lastMessage: msg.text,
                    timestamp: msg.createdAt,
                    unread: !msg.read
                });
            }
        });
        
        // Display conversations
        const container = document.getElementById('conversationsList');
        
        if(conversations.size === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No conversations yet</p>';
            return;
        }
        
        container.innerHTML = '';
        
        for(const [userId, conv] of conversations) {
            const userDoc = await db.collection('users').doc(userId).get();
            if(userDoc.exists) {
                const userData = userDoc.data();
                const item = document.createElement('div');
                item.className = 'conversation-item';
                item.onclick = () => openConversation(userId);
                item.innerHTML = `
                    <div class="conversation-username">${userData.username}</div>
                    <div class="conversation-preview">${conv.lastMessage.substring(0, 50)}...</div>
                `;
                container.appendChild(item);
            }
        }
        
        // Update unread count
        updateUnreadCount();
    } catch(error) {
        console.error('Error loading conversations:', error);
    }
}

async function openConversation(userId) {
    currentConversationUserId = userId;
    
    // Load user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    // Load messages
    const messages = await loadMessages(userId);
    
    // Display
    const messageView = document.getElementById('messageView');
    messageView.innerHTML = `
        <div class="messages-header">${userData.username}</div>
        <div class="messages-body" id="messagesBody"></div>
        <div class="message-input-area">
            <textarea id="messageInput" placeholder="Type a message..."></textarea>
            <button class="send-message-btn" onclick="sendMessage()">Send</button>
        </div>
    `;
    
    const messagesBody = document.getElementById('messagesBody');
    messages.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
        bubble.innerHTML = `
            <div>${msg.text}</div>
            <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
        `;
        messagesBody.appendChild(bubble);
    });
    
    // Scroll to bottom
    messagesBody.scrollTop = messagesBody.scrollHeight;
    
    // Mark as read
    await markMessagesAsRead(userId);
}

async function loadMessages(userId) {
    try {
        const sentSnap = await db.collection('messages')
            .where('senderId', '==', currentUser.uid)
            .where('receiverId', '==', userId)
            .get();
        
        const receivedSnap = await db.collection('messages')
            .where('senderId', '==', userId)
            .where('receiverId', '==', currentUser.uid)
            .get();
        
        const messages = [];
        
        sentSnap.forEach(doc => messages.push(doc.data()));
        receivedSnap.forEach(doc => messages.push(doc.data()));
        
        // Sort by timestamp
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        return messages;
    } catch(error) {
        console.error('Error loading messages:', error);
        return [];
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if(!text || !currentConversationUserId) return;
    
    try {
        await db.collection('messages').add({
            senderId: currentUser.uid,
            receiverId: currentConversationUserId,
            text: text,
            createdAt: new Date().toISOString(),
            read: false
        });
        
        input.value = '';
        await openConversation(currentConversationUserId);
    } catch(error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
    }
}

async function startConversation(userId) {
    await openMessages();
    await openConversation(userId);
}

async function markMessagesAsRead(userId) {
    try {
        const snapshot = await db.collection('messages')
            .where('senderId', '==', userId)
            .where('receiverId', '==', currentUser.uid)
            .where('read', '==', false)
            .get();
        
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
        
        updateUnreadCount();
    } catch(error) {
        console.error('Error marking messages as read:', error);
    }
}

async function updateUnreadCount() {
    if(!currentUser) return;
    
    try {
        const snapshot = await db.collection('messages')
            .where('receiverId', '==', currentUser.uid)
            .where('read', '==', false)
            .get();
        
        const count = snapshot.size;
        const badge = document.getElementById('unreadBadge');
        
        if(count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch(error) {
        console.error('Error updating unread count:', error);
    }
}

// ============================================
// NAVIGATION
// ============================================

function showMainPage() {
    document.getElementById('mainContainer').classList.remove('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.add('hidden');
}

// ============================================
// SETTINGS
// ============================================

async function updateUsername() {
    if(!currentUser) return;
    
    const newUsername = document.getElementById('settingsUsername').value;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            username: newUsername
        });
        
        document.getElementById('username').textContent = newUsername;
        document.getElementById('profilePageUsername').textContent = newUsername;
        alert('✅ Username updated!');
    } catch(error) {
        alert('❌ Failed to update username');
    }
}

// Avatar upload handled in auth.js

// ============================================
// INIT
// ============================================

// Show messages icon when logged in
if(typeof firebase !== 'undefined') {
    setTimeout(() => {
        if(firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if(user) {
                    document.getElementById('messagesIcon').classList.remove('hidden');
                    updateUnreadCount();
                } else {
                    document.getElementById('messagesIcon').classList.add('hidden');
                }
            });
        }
    }, 2000);
}
