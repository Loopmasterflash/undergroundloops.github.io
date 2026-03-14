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

        await db.collection('tracks').doc(trackId).delete();

        const likesSnap = await db.collection('likes').where('trackId', '==', trackId).get();
        const batch = db.batch();
        likesSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        document.querySelectorAll(`[data-track-id="${trackId}"]`).forEach(el => el.remove());

        if(typeof allTracks !== 'undefined') {
            allTracks = allTracks.filter(t => t.id !== trackId);
            filteredTracks = filteredTracks.filter(t => t.id !== trackId);
        }

        if(!document.getElementById('profileContainer').classList.contains('hidden')) {
            loadUserUploads(currentUser.uid);
            loadProfileStats(currentUser.uid);
        }

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

// ============================================
// MY UPLOADS
// ============================================

async function loadUserUploads(userId) {
    try {
        const snapshot = await db.collection('tracks').where('userId', '==', userId).get();
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

            const img = document.createElement('img');
            img.src = track.coverImage || '';
            img.style.cssText = 'width:50px;height:50px;object-fit:cover;border-radius:6px;flex-shrink:0;';

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

            if(currentUser && currentUser.uid === userId) {
                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️';
                editBtn.title = 'Edit Track';
                editBtn.style.cssText = 'background:rgba(0,255,255,0.15);border:1px solid #00ffff;color:#00ffff;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:1rem;flex-shrink:0;transition:all 0.3s;margin-right:6px;';
                editBtn.onmouseover = () => editBtn.style.background = 'rgba(0,255,255,0.35)';
                editBtn.onmouseout = () => editBtn.style.background = 'rgba(0,255,255,0.15)';
                editBtn.onclick = (e) => { e.stopPropagation(); openEditModal(track); };

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.title = 'Delete Track';
                deleteBtn.style.cssText = 'background:rgba(255,0,0,0.2);border:1px solid #ff4444;color:#ff4444;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:1rem;flex-shrink:0;transition:all 0.3s;';
                deleteBtn.onmouseover = () => deleteBtn.style.background = 'rgba(255,0,0,0.4)';
                deleteBtn.onmouseout = () => deleteBtn.style.background = 'rgba(255,0,0,0.2)';
                deleteBtn.onclick = (e) => { e.stopPropagation(); deleteTrack(track.id); };

                div.appendChild(editBtn);
                div.appendChild(deleteBtn);
            }

            container.appendChild(div);
        });
    } catch(error) { console.error('Error loading uploads:', error); }
}

// ============================================
// EDIT MODAL (mit Cover Upload!)
// ============================================

function openEditModal(track) {
    // Altes Modal entfernen falls vorhanden
    const old = document.getElementById('editTrackModal');
    if(old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'editTrackModal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.88);
        z-index:10000;display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(8px);
    `;

    modal.innerHTML = `
        <div style="
            background:#111;border:1px solid #00ffff;border-radius:12px;
            padding:30px;width:90%;max-width:500px;
            box-shadow:0 0 40px rgba(0,255,255,0.2);
            position:relative;max-height:90vh;overflow-y:auto;
        ">
            <button onclick="document.getElementById('editTrackModal').remove()" style="
                position:absolute;top:12px;right:14px;
                background:none;border:none;color:#aaa;font-size:1.4rem;cursor:pointer;
            ">✕</button>

            <h3 style="font-family:'Orbitron',sans-serif;color:#00ffff;font-size:0.9rem;letter-spacing:2px;margin-bottom:24px;">✏️ EDIT TRACK</h3>

            <!-- Titel -->
            <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Titel</label>
                <input type="text" id="editTitle" value="${track.title || ''}" style="
                    width:100%;background:#1a1a1a;border:1px solid #333;border-radius:4px;
                    color:#fff;font-size:0.9rem;padding:10px 14px;outline:none;box-sizing:border-box;
                ">
            </div>

            <!-- Genre -->
            <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Genre</label>
                <input type="text" id="editGenre" value="${track.genre || ''}" style="
                    width:100%;background:#1a1a1a;border:1px solid #333;border-radius:4px;
                    color:#fff;font-size:0.9rem;padding:10px 14px;outline:none;box-sizing:border-box;
                ">
            </div>

            <!-- BPM -->
            <div style="margin-bottom:16px;">
                <label style="display:block;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">BPM</label>
                <input type="number" id="editBpm" value="${track.bpm || ''}" style="
                    width:100%;background:#1a1a1a;border:1px solid #333;border-radius:4px;
                    color:#fff;font-size:0.9rem;padding:10px 14px;outline:none;box-sizing:border-box;
                ">
            </div>

            <!-- Cover Upload -->
            <div style="margin-bottom:20px;">
                <label style="display:block;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Cover Bild ersetzen</label>

                <!-- Aktuelles Cover -->
                <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
                    <img id="editCoverPreview" src="${track.coverImage || ''}"
                         style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:2px solid #333;"
                         onerror="this.style.display='none'">
                    <span style="color:#666;font-size:0.8rem;">Aktuelles Cover</span>
                </div>

                <!-- File Picker -->
                <input type="file" id="editCoverFile" accept="image/*" style="display:none">
                <div onclick="document.getElementById('editCoverFile').click()" style="
                    padding:14px;border:2px dashed #00ffff44;border-radius:8px;
                    text-align:center;cursor:pointer;color:#aaa;font-size:0.85rem;
                    background:rgba(0,255,255,0.04);transition:all 0.2s;
                "
                onmouseover="this.style.borderColor='#00ffff';this.style.background='rgba(0,255,255,0.1)'"
                onmouseout="this.style.borderColor='#00ffff44';this.style.background='rgba(0,255,255,0.04)'"
                >
                    🖼️ <span id="editCoverLabel">Neues Cover auswählen (optional)</span>
                </div>
            </div>

            <!-- Status -->
            <div id="editStatus" style="font-size:0.8rem;color:#888;margin-bottom:14px;min-height:18px;"></div>

            <!-- Buttons -->
            <div style="display:flex;gap:10px;">
                <button id="editSaveBtn" onclick="saveEditModal('${track.id}')" style="
                    flex:1;background:#00ffff;color:#000;border:none;border-radius:6px;
                    font-family:'Courier New',monospace;font-weight:bold;font-size:0.9rem;
                    padding:12px;cursor:pointer;transition:background 0.2s;
                ">💾 SPEICHERN</button>
                <button onclick="document.getElementById('editTrackModal').remove()" style="
                    background:#1a1a1a;border:1px solid #333;color:#888;border-radius:6px;
                    font-family:'Courier New',monospace;font-size:0.9rem;
                    padding:12px 20px;cursor:pointer;
                ">Abbrechen</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Cover Vorschau bei Auswahl
    document.getElementById('editCoverFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            document.getElementById('editCoverLabel').textContent = '✅ ' + file.name;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('editCoverPreview').src = ev.target.result;
                document.getElementById('editCoverPreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Klick außerhalb schließt Modal
    modal.addEventListener('click', (e) => {
        if(e.target === modal) modal.remove();
    });
}

async function saveEditModal(trackId) {
    const title  = document.getElementById('editTitle').value.trim();
    const genre  = document.getElementById('editGenre').value.trim();
    const bpm    = document.getElementById('editBpm').value;
    const coverFile = document.getElementById('editCoverFile').files[0];

    if(!title) { document.getElementById('editStatus').textContent = '❌ Titel darf nicht leer sein!'; return; }

    const saveBtn = document.getElementById('editSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Speichern...';

    const R2_PUBLIC_URL = 'https://pub-5f696ecb59a944058dd6a3ef1b569457.r2.dev';
    const R2_WORKER_URL = 'https://undergroundloops-upload.dj-christern.workers.dev';

    try {
        const updates = {
            title,
            genre,
            bpm: bpm ? parseInt(bpm) : null,
        };

        // Cover hochladen falls neu gewählt
        if(coverFile) {
            document.getElementById('editStatus').textContent = '⏳ Cover wird hochgeladen...';

            // Komprimieren
            const compressed = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        if(w > 400) { h = Math.round(h * 400 / w); w = 400; }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(coverFile);
            });

            const coverBlob = await (await fetch(compressed)).blob();
            const coverKey = `covers/edit_${trackId}_${Date.now()}.jpg`;

            const response = await fetch(`${R2_WORKER_URL}/upload`, {
                method: 'POST',
                headers: {
                    'X-File-Key': coverKey,
                    'Content-Type': 'image/jpeg',
                },
                body: coverBlob
            });

            if(!response.ok) throw new Error('Cover Upload fehlgeschlagen');
            updates.coverImage = `${R2_PUBLIC_URL}/${coverKey}`;
        }

        // Firebase updaten
        await db.collection('tracks').doc(trackId).update(updates);

        document.getElementById('editStatus').style.color = '#00ffcc';
        document.getElementById('editStatus').textContent = '✅ Gespeichert!';

        // Lokale Daten updaten
        if(typeof allTracks !== 'undefined') {
            const idx = allTracks.findIndex(t => t.id === trackId);
            if(idx !== -1) Object.assign(allTracks[idx], updates);
        }

        setTimeout(() => {
            document.getElementById('editTrackModal').remove();
            if(typeof loadUserUploads === 'function' && typeof currentUser !== 'undefined' && currentUser) {
                loadUserUploads(currentUser.uid);
            }
        }, 800);

    } catch(err) {
        document.getElementById('editStatus').style.color = '#ff4444';
        document.getElementById('editStatus').textContent = '❌ Fehler: ' + err.message;
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 SPEICHERN';
    }
}

// ============================================
// LIKED TRACKS
// ============================================

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
