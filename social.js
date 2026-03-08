// UNDERGROUNDLOOPS - Social Features
// Like System, Follow System, Profile Page, Messages

let currentProfileUserId = null;

// ============================================
// PLAY COUNTER
// ============================================

async function incrementPlayCount(trackId) {
    try {
        const trackRef = db.collection('tracks').doc(trackId);
        const trackDoc = await trackRef.get();
        if(trackDoc.exists) {
            const current = trackDoc.data().plays || 0;
            await trackRef.update({ plays: current + 1 });
        }
    } catch(e) { console.error('Play count error:', e); }
}

// ============================================
// DOWNLOAD COUNTER
// ============================================

async function incrementDownloadCount(trackId) {
    try {
        const trackRef = db.collection('tracks').doc(trackId);
        const trackDoc = await trackRef.get();
        if(trackDoc.exists) {
            const current = trackDoc.data().downloads || 0;
            await trackRef.update({ downloads: current + 1 });
        }
    } catch(e) { console.error('Download count error:', e); }
}

// ============================================
// DELETE TRACK
// ============================================

async function deleteTrack(trackId) {
    if(!currentUser) return;
    if(!confirm('Are you sure you want to delete this track? This cannot be undone!')) return;

    try {
        const trackDoc = await db.collection('tracks').doc(trackId).get();
        if(!trackDoc.exists) { alert('Track not found!'); return; }
        if(trackDoc.data().userId !== currentUser.uid) { alert('You can only delete your own tracks!'); return; }

        // Delete from Firestore
        await db.collection('tracks').doc(trackId).delete();

        // Delete likes for this track
        const likesSnap = await db.collection('likes').where('trackId', '==', trackId).get();
        const batch = db.batch();
        likesSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Remove card from DOM everywhere
        document.querySelectorAll(`[data-track-id="${trackId}"]`).forEach(el => el.remove());

        // Remove from allTracks array
        if(typeof allTracks !== 'undefined') {
            allTracks = allTracks.filter(t => t.id !== trackId);
            filteredTracks = filteredTracks.filter(t => t.id !== trackId);
        }

        // Reload uploads in profile if open
        if(!document.getElementById('profileContainer').classList.contains('hidden')) {
            loadUserUploads(currentUser.uid);
            loadProfileStats(currentUser.uid);
        }

        // Close modal if open
        const modal = document.getElementById('playerModal');
        if(modal && modal.style.display === 'flex') {
            modal.style.display = 'none';
            if(typeof currentAudio !== 'undefined' && currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }
        }

        alert('✅ Track deleted successfully!');
    } catch(error) {
        console.error('Delete error:', error);
        alert('❌ Failed to delete: ' + error.message);
    }
}

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
            await likeRef.delete();
            updateLikeButton(trackId, false);
            await updateTrackLikeCount(trackId, -1);
        } else {
            await likeRef.set({ userId: currentUser.uid, trackId, createdAt: new Date().toISOString() });
            updateLikeButton(trackId, true);
            await updateTrackLikeCount(trackId, 1);
        }
    } catch(error) {
        console.error('Error toggling like:', error);
    }
}

function updateLikeButton(trackId, liked) {
    const likeBtn = document.querySelector(`[data-track-id="${trackId}"] .like-btn`);
    if(likeBtn) {
        const count = parseInt(likeBtn.querySelector('.like-count').textContent) + (liked ? 1 : -1);
        likeBtn.classList.toggle('liked', liked);
        likeBtn.innerHTML = `<span class="heart">${liked ? '❤️' : '🤍'}</span> <span class="like-count">${count}</span>`;
    }
}

async function updateTrackLikeCount(trackId, change) {
    try {
        const trackRef = db.collection('tracks').doc(trackId);
        const trackDoc = await trackRef.get();
        if(trackDoc.exists) {
            await trackRef.update({ likes: (trackDoc.data().likes || 0) + change });
        }
    } catch(error) { console.error('Error updating like count:', error); }
}

async function checkIfLiked(trackId) {
    if(!currentUser) return false;
    try {
        const likeDoc = await db.collection('likes').doc(`${currentUser.uid}_${trackId}`).get();
        return likeDoc.exists;
    } catch(error) { return false; }
}

// ============================================
// FOLLOW SYSTEM
// ============================================

async function toggleFollow(userId) {
    if(!currentUser) { alert('Please login to follow users!'); return; }
    if(userId === currentUser.uid) { alert('You cannot follow yourself!'); return; }
    try {
        const followId = `${currentUser.uid}_${userId}`;
        const followRef = db.collection('follows').doc(followId);
        const followDoc = await followRef.get();
        if(followDoc.exists) {
            await followRef.delete();
            updateFollowButton(userId, false);
        } else {
            await followRef.set({ followerId: currentUser.uid, followingId: userId, createdAt: new Date().toISOString() });
            updateFollowButton(userId, true);
        }
        if(currentProfileUserId === userId) loadProfileStats(userId);
    } catch(error) { console.error('Error toggling follow:', error); }
}

function updateFollowButton(userId, following) {
    const followBtn = document.querySelector('.follow-btn');
    if(followBtn && followBtn.getAttribute('data-user-id') === userId) {
        followBtn.classList.toggle('following', following);
        followBtn.textContent = following ? 'Following' : 'Follow';
    }
}

async function checkIfFollowing(userId) {
    if(!currentUser) return false;
    try {
        const followDoc = await db.collection('follows').doc(`${currentUser.uid}_${userId}`).get();
        return followDoc.exists;
    } catch(error) { return false; }
}

// ============================================
// PROFILE PAGE
// ============================================

async function openProfile(userId = null) {
    const targetUserId = userId || currentUser?.uid;
    if(!targetUserId) { alert('Please login first'); return; }
    currentProfileUserId = targetUserId;
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.add('hidden');
    document.getElementById('profileContainer').classList.remove('hidden');
    await loadProfileData(targetUserId);
    await loadProfileStats(targetUserId);
    await loadUserUploads(targetUserId);
    setupProfileTabs();
}

async function loadProfileData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if(!userDoc.exists) return;
        const userData = userDoc.data();
        document.getElementById('profilePageAvatar').src = userData.avatar || '';
        document.getElementById('profilePageUsername').textContent = userData.username;
        document.getElementById('profilePageEmail').textContent = userData.email;
        document.getElementById('profilePageJoined').textContent = `Joined ${new Date(userData.createdAt).toLocaleDateString()}`;

        if(typeof setBannerImage === 'function') setBannerImage(userData.banner || null);

        const editBannerBtn = document.getElementById('editBannerBtn');
        if(editBannerBtn) editBannerBtn.style.display = (currentUser && currentUser.uid === userId) ? 'block' : 'none';

        const actionsDiv = document.getElementById('profileActions');
        if(currentUser && userId === currentUser.uid) {
            actionsDiv.innerHTML = '';
        } else if(currentUser) {
            const isFollowing = await checkIfFollowing(userId);
            actionsDiv.innerHTML = `
                <button class="follow-btn ${isFollowing ? 'following' : ''}" data-user-id="${userId}" onclick="toggleFollow('${userId}')">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>
                <button class="message-user-btn" onclick="startConversation('${userId}')">Message</button>
            `;
        } else {
            actionsDiv.innerHTML = '';
        }
        if(currentUser && userId === currentUser.uid) {
            const sa = document.getElementById('settingsAvatar');
            if(sa) sa.src = userData.avatar || '';
            const su = document.getElementById('settingsUsername');
            if(su) su.value = userData.username;
        }
    } catch(error) { console.error('Error loading profile:', error); }
}

async function loadProfileStats(userId) {
    try {
        const uploadsSnap = await db.collection('tracks').where('userId', '==', userId).get();
        document.getElementById('uploadsCount').textContent = uploadsSnap.size;
        const followersSnap = await db.collection('follows').where('followingId', '==', userId).get();
        document.getElementById('followersCount').textContent = followersSnap.size;
        const followingSnap = await db.collection('follows').where('followerId', '==', userId).get();
        document.getElementById('followingCount').textContent = followingSnap.size;
        let totalLikes = 0;
        uploadsSnap.forEach(doc => { totalLikes += (doc.data().likes || 0); });
        document.getElementById('likesCount').textContent = totalLikes;
    } catch(error) { console.error('Error loading stats:', error); }
}

async function loadUserUploads(userId) {
    try {
        const snapshot = await db.collection('tracks').where('userId', '==', userId).orderBy('uploadedAt', 'desc').get();
        const container = document.getElementById('userUploads');
        if(snapshot.empty) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">No uploads yet</p>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const track = { id: doc.id, ...doc.data() };
            const div = document.createElement('div');
            div.setAttribute('data-track-id', track.id);
            div.style.cssText = 'padding:15px;border:1px solid #ff00ff44;border-radius:8px;margin-bottom:10px;color:#fff;display:flex;align-items:center;gap:12px;transition:border 0.3s;';
            div.onmouseover = () => div.style.border = '1px solid #ff00ff';
            div.onmouseout = () => div.style.border = '1px solid #ff00ff44';

            // Cover
            const img = document.createElement('img');
            img.src = track.coverImage || '';
            img.style.cssText = 'width:50px;height:50px;object-fit:cover;border-radius:6px;flex-shrink:0;';

            // Info
            const info = document.createElement('div');
            info.style.cssText = 'flex:1;cursor:pointer;';
            info.innerHTML = `
                <div style="font-weight:bold;margin-bottom:3px;">${track.title}</div>
                <div style="color:#aaa;font-size:0.8rem;">${track.genre || ''} • ${track.type || 'loop'} ${track.bpm ? '• ' + track.bpm + ' BPM' : ''}</div>
                <div style="color:#666;font-size:0.75rem;margin-top:3px;">
                    👁️ ${track.plays || 0} plays &nbsp; ⬇️ ${track.downloads || 0} downloads &nbsp; ❤️ ${track.likes || 0} likes
                </div>
            `;
            info.onclick = () => openPlayerModal(track);

            div.appendChild(img);
            div.appendChild(info);

            // Delete button - nur für eigene Tracks
            if(currentUser && currentUser.uid === userId) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.title = 'Delete Track';
                deleteBtn.style.cssText = 'background:rgba(255,0,0,0.2);border:1px solid #ff4444;color:#ff4444;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:1rem;flex-shrink:0;transition:all 0.3s;';
                deleteBtn.onmouseover = () => { deleteBtn.style.background = 'rgba(255,0,0,0.4)'; };
                deleteBtn.onmouseout = () => { deleteBtn.style.background = 'rgba(255,0,0,0.2)'; };
                deleteBtn.onclick = (e) => { e.stopPropagation(); deleteTrack(track.id); };
                div.appendChild(deleteBtn);
            }

            container.appendChild(div);
        });
    } catch(error) { console.error('Error loading uploads:', error); }
}

async function loadUserLikedTracks() {
    if(!currentUser) return;
    try {
        const likesSnap = await db.collection('likes').where('userId', '==', currentProfileUserId).get();
        const container = document.getElementById('userLikedTracks');
        if(likesSnap.empty) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">No liked tracks yet</p>';
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
    } catch(error) { console.error('Error loading liked tracks:', error); }
}

function setupProfileTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            const tab = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            if(tab === 'uploads') document.getElementById('uploadsTab').classList.remove('hidden');
            else if(tab === 'liked') { document.getElementById('likedTab').classList.remove('hidden'); loadUserLikedTracks(); }
            else if(tab === 'settings') document.getElementById('settingsTab').classList.remove('hidden');
        };
    });
}

async function showFollowers() {
    if(!currentProfileUserId) return;
    const snapshot = await db.collection('follows').where('followingId', '==', currentProfileUserId).get();
    showFollowModal('Followers', snapshot, 'followerId');
}

async function showFollowing() {
    if(!currentProfileUserId) return;
    const snapshot = await db.collection('follows').where('followerId', '==', currentProfileUserId).get();
    showFollowModal('Following', snapshot, 'followingId');
}

async function showFollowModal(title, snapshot, userIdField) {
    document.getElementById('followModalTitle').textContent = title;
    const content = document.getElementById('followModalContent');
    if(snapshot.empty) {
        content.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No users yet</p>';
    } else {
        content.innerHTML = '';
        for(const doc of snapshot.docs) {
            const userId = doc.data()[userIdField];
            const userDoc = await db.collection('users').doc(userId).get();
            if(userDoc.exists) {
                const userData = userDoc.data();
                const item = document.createElement('div');
                item.className = 'follow-item';
                item.innerHTML = `<img src="${userData.avatar || ''}" class="follow-item-avatar"><span class="follow-item-name" onclick="openProfile('${userId}')">${userData.username}</span>`;
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
    if(!currentUser) { alert('Please login first'); return; }
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.remove('hidden');
    await loadConversations();
}

async function loadConversations() {
    try {
        const sentSnap = await db.collection('messages').where('senderId', '==', currentUser.uid).get();
        const receivedSnap = await db.collection('messages').where('receiverId', '==', currentUser.uid).get();
        const conversations = new Map();
        sentSnap.forEach(doc => {
            const msg = doc.data();
            if(!conversations.has(msg.receiverId)) conversations.set(msg.receiverId, { userId: msg.receiverId, lastMessage: msg.text, timestamp: msg.createdAt });
        });
        receivedSnap.forEach(doc => {
            const msg = doc.data();
            if(!conversations.has(msg.senderId) || msg.createdAt > conversations.get(msg.senderId).timestamp)
                conversations.set(msg.senderId, { userId: msg.senderId, lastMessage: msg.text, timestamp: msg.createdAt, unread: !msg.read });
        });
        const container = document.getElementById('conversationsList');
        if(conversations.size === 0) { container.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No conversations yet</p>'; return; }
        container.innerHTML = '';
        for(const [userId, conv] of conversations) {
            const userDoc = await db.collection('users').doc(userId).get();
            if(userDoc.exists) {
                const userData = userDoc.data();
                const item = document.createElement('div');
                item.className = 'conversation-item';
                item.onclick = () => openConversation(userId);
                item.innerHTML = `<div class="conversation-username">${userData.username}</div><div class="conversation-preview">${conv.lastMessage.substring(0, 50)}...</div>`;
                container.appendChild(item);
            }
        }
        updateUnreadCount();
    } catch(error) { console.error('Error loading conversations:', error); }
}

async function openConversation(userId) {
    currentConversationUserId = userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const messages = await loadMessages(userId);
    const messageView = document.getElementById('messageView');
    messageView.innerHTML = `
        <div class="messages-header">${userData.username}</div>
        <div class="messages-body" id="messagesBody"></div>
        <div class="message-input-area">
            <textarea id="messageInput" placeholder="Type a message..."></textarea>
            <button class="send-message-btn" onclick="sendMessage()">Send</button>
        </div>`;
    const messagesBody = document.getElementById('messagesBody');
    messages.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
        bubble.innerHTML = `<div>${msg.text}</div><div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>`;
        messagesBody.appendChild(bubble);
    });
    messagesBody.scrollTop = messagesBody.scrollHeight;
    await markMessagesAsRead(userId);
}

async function loadMessages(userId) {
    try {
        const sentSnap = await db.collection('messages').where('senderId', '==', currentUser.uid).where('receiverId', '==', userId).get();
        const receivedSnap = await db.collection('messages').where('senderId', '==', userId).where('receiverId', '==', currentUser.uid).get();
        const messages = [];
        sentSnap.forEach(doc => messages.push(doc.data()));
        receivedSnap.forEach(doc => messages.push(doc.data()));
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return messages;
    } catch(error) { return []; }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if(!text || !currentConversationUserId) return;
    try {
        await db.collection('messages').add({ senderId: currentUser.uid, receiverId: currentConversationUserId, text, createdAt: new Date().toISOString(), read: false });
        input.value = '';
        await openConversation(currentConversationUserId);
    } catch(error) { alert('Failed to send message'); }
}

async function startConversation(userId) { await openMessages(); await openConversation(userId); }

async function markMessagesAsRead(userId) {
    try {
        const snapshot = await db.collection('messages').where('senderId', '==', userId).where('receiverId', '==', currentUser.uid).where('read', '==', false).get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.update(doc.ref, { read: true }));
        await batch.commit();
        updateUnreadCount();
    } catch(error) { console.error('Error marking read:', error); }
}

async function updateUnreadCount() {
    if(!currentUser) return;
    try {
        const snapshot = await db.collection('messages').where('receiverId', '==', currentUser.uid).where('read', '==', false).get();
        const badge = document.getElementById('unreadBadge');
        if(snapshot.size > 0) { badge.textContent = snapshot.size; badge.classList.remove('hidden'); }
        else { badge.classList.add('hidden'); }
    } catch(error) { console.error('Error updating unread:', error); }
}

// ============================================
// NAVIGATION
// ============================================

function showMainPage() {
    document.getElementById('mainContainer').classList.remove('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    document.getElementById('messagesContainer').classList.add('hidden');
    const uc = document.getElementById('uploadContainer');
    if(uc) uc.classList.add('hidden');
}

// ============================================
// SETTINGS
// ============================================

async function updateUsername() {
    if(!currentUser) return;
    const newUsername = document.getElementById('settingsUsername').value;
    try {
        await db.collection('users').doc(currentUser.uid).update({ username: newUsername });
        document.getElementById('username').textContent = newUsername;
        document.getElementById('profilePageUsername').textContent = newUsername;
        alert('✅ Username updated!');
    } catch(error) { alert('❌ Failed to update username'); }
}

// ============================================
// INIT
// ============================================

if(typeof firebase !== 'undefined') {
    setTimeout(() => {
        if(firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if(user) { document.getElementById('messagesIcon').classList.remove('hidden'); updateUnreadCount(); }
                else { document.getElementById('messagesIcon').classList.add('hidden'); }
            });
        }
    }, 2000);
}
