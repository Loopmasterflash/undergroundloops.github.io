// UNDERGROUNDLOOPS - Social Features
// Like System, Follow System, Profile Page, Messages, Playlists

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
            if(typeof currentAudio !== 'undefined' && currentAudio) { currentAudio.pause(); currentAudio = null; }
        }
        alert('✅ Track deleted successfully!');
    } catch(error) { console.error('Delete error:', error); alert('❌ Failed to delete: ' + error.message); }
}

// ============================================
// LIKE SYSTEM
// ============================================

async function toggleLike(trackId) {
    if(!currentUser) { alert('Please login to like tracks!'); document.getElementById('loginBtn').click(); return; }
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
    } catch(error) { console.error('Error toggling like:', error); }
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
        if(trackDoc.exists) await trackRef.update({ likes: (trackDoc.data().likes || 0) + change });
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
        if(followDoc.exists) { await followRef.delete(); updateFollowButton(userId, false); }
        else { await followRef.set({ followerId: currentUser.uid, followingId: userId, createdAt: new Date().toISOString() }); updateFollowButton(userId, true); }
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
// PLAYLIST SYSTEM
// ============================================

// Playlist Popup im Player Modal
async function openPlaylistPopup(trackId) {
    if(!currentUser) { alert('Please login to add to playlist!'); return; }

    const old = document.getElementById('playlistPopup');
    if(old) old.remove();

    // Lade bestehende Playlists
    const snap = await db.collection('playlists')
        .where('userId', '==', currentUser.uid)
        .get();

    const playlists = [];
    snap.forEach(doc => playlists.push({ id: doc.id, ...doc.data() }));

    const popup = document.createElement('div');
    popup.id = 'playlistPopup';
    popup.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.85);
        z-index:10001;display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(8px);
    `;

    const playlistItems = playlists.map(pl => `
        <div onclick="addToPlaylist('${pl.id}','${trackId}')" style="
            padding:12px 16px;border:1px solid #ff00ff33;border-radius:8px;
            cursor:pointer;color:#fff;margin-bottom:8px;
            background:rgba(255,0,255,0.05);transition:all 0.2s;
            display:flex;align-items:center;gap:10px;
        " onmouseover="this.style.background='rgba(255,0,255,0.2)'"
           onmouseout="this.style.background='rgba(255,0,255,0.05)'">
            🎵 <span>${pl.name}</span>
            <span style="color:#666;font-size:0.75rem;margin-left:auto;">${(pl.trackIds||[]).length} tracks</span>
        </div>
    `).join('') || '<p style="color:#666;text-align:center;padding:10px;">Noch keine Playlists</p>';

    popup.innerHTML = `
        <div style="background:#111;border:1px solid #ff00ff;border-radius:12px;padding:28px;width:90%;max-width:420px;position:relative;">
            <button onclick="document.getElementById('playlistPopup').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;color:#aaa;font-size:1.4rem;cursor:pointer;">✕</button>
            <h3 style="font-family:'Orbitron',sans-serif;color:#ff00ff;font-size:0.9rem;letter-spacing:2px;margin-bottom:20px;">🎵 ZUR PLAYLIST HINZUFÜGEN</h3>

            <!-- Neue Playlist erstellen -->
            <div style="margin-bottom:16px;">
                <div style="display:flex;gap:8px;">
                    <input type="text" id="newPlaylistName" placeholder="Neue Playlist Name..." style="
                        flex:1;background:#1a1a1a;border:1px solid #ff00ff44;
                        border-radius:6px;color:#fff;font-size:0.85rem;
                        padding:8px 12px;outline:none;
                    ">
                    <button onclick="createAndAddPlaylist('${trackId}')" style="
                        background:#ff00ff;color:#000;border:none;
                        border-radius:6px;padding:8px 14px;cursor:pointer;
                        font-family:'Courier New',monospace;font-weight:bold;font-size:0.8rem;
                        white-space:nowrap;
                    ">+ Neu</button>
                </div>
            </div>

            <div style="border-top:1px solid #ff00ff22;padding-top:16px;">
                <p style="color:#888;font-size:0.75rem;margin-bottom:12px;font-family:'Orbitron',sans-serif;letter-spacing:1px;">BESTEHENDE PLAYLISTS:</p>
                ${playlistItems}
            </div>
        </div>
    `;

    document.body.appendChild(popup);
    popup.addEventListener('click', e => { if(e.target === popup) popup.remove(); });
}

async function createAndAddPlaylist(trackId) {
    const name = document.getElementById('newPlaylistName').value.trim();
    if(!name) { alert('Bitte Namen eingeben!'); return; }
    try {
        const ref = await db.collection('playlists').add({
            userId: currentUser.uid,
            name,
            trackIds: [trackId],
            createdAt: new Date().toISOString()
        });
        document.getElementById('playlistPopup').remove();
        alert(`✅ Playlist "${name}" erstellt und Track hinzugefügt!`);
    } catch(e) { alert('❌ Fehler: ' + e.message); }
}

async function addToPlaylist(playlistId, trackId) {
    try {
        const plRef = db.collection('playlists').doc(playlistId);
        const plDoc = await plRef.get();
        if(!plDoc.exists) return;
        const trackIds = plDoc.data().trackIds || [];
        if(trackIds.includes(trackId)) {
            alert('Track ist bereits in dieser Playlist!');
            return;
        }
        await plRef.update({ trackIds: [...trackIds, trackId] });
        document.getElementById('playlistPopup').remove();
        alert('✅ Track zur Playlist hinzugefügt!');
    } catch(e) { alert('❌ Fehler: ' + e.message); }
}

// Playlists im Profil laden
async function loadUserPlaylists(userId) {
    const container = document.getElementById('playlistsTab');
    if(!container) return;

    const isOwn = currentUser && currentUser.uid === userId;

    container.innerHTML = `
        ${isOwn ? `
        <div style="text-align:right;margin-bottom:20px;">
            <button onclick="showCreatePlaylistForm()" style="
                padding:10px 20px;
                background:linear-gradient(135deg,rgba(255,0,255,0.3),rgba(0,255,255,0.2));
                border:2px solid #ff00ff;color:#fff;border-radius:8px;
                cursor:pointer;font-family:'Orbitron',sans-serif;font-size:0.75rem;
            ">+ NEUE PLAYLIST</button>
        </div>
        <div id="createPlaylistForm" style="display:none;margin-bottom:20px;background:rgba(0,0,0,0.4);border:1px solid #ff00ff33;border-radius:8px;padding:16px;">
            <input type="text" id="playlistNameInput" placeholder="Playlist Name..." style="
                width:100%;background:#1a1a1a;border:1px solid #ff00ff44;
                border-radius:6px;color:#fff;font-size:0.9rem;
                padding:10px 14px;outline:none;box-sizing:border-box;margin-bottom:10px;
            ">
            <div style="display:flex;gap:8px;">
                <button onclick="createPlaylist()" style="flex:1;padding:10px;background:#ff00ff;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">✅ Erstellen</button>
                <button onclick="document.getElementById('createPlaylistForm').style.display='none'" style="padding:10px 16px;background:#1a1a1a;border:1px solid #333;color:#888;border-radius:6px;cursor:pointer;">Abbrechen</button>
            </div>
        </div>` : ''}
        <div id="playlistsList"></div>
    `;

    try {
        const snap = await db.collection('playlists').where('userId', '==', userId).get();
        const listContainer = document.getElementById('playlistsList');

        if(snap.empty) {
            listContainer.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">Noch keine Playlists</p>';
            return;
        }

        const playlists = [];
        snap.forEach(doc => playlists.push({ id: doc.id, ...doc.data() }));
        playlists.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        listContainer.innerHTML = '';
        playlists.forEach(pl => {
            const div = document.createElement('div');
            div.style.cssText = 'border:1px solid #ff00ff33;border-radius:8px;margin-bottom:12px;overflow:hidden;transition:border 0.2s;';
            div.onmouseover = () => div.style.border = '1px solid #ff00ff';
            div.onmouseout = () => div.style.border = '1px solid #ff00ff33';

            div.innerHTML = `
                <div style="padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;background:rgba(0,0,0,0.4);" onclick="togglePlaylistTracks('${pl.id}')">
                    <span style="font-size:1.5rem;">🎵</span>
                    <div style="flex:1;">
                        <div style="color:#fff;font-weight:bold;margin-bottom:2px;">${pl.name}</div>
                        <div style="color:#888;font-size:0.75rem;">${(pl.trackIds||[]).length} Tracks</div>
                    </div>
                    <button onclick="event.stopPropagation();playPlaylist('${pl.id}')" style="
                        background:rgba(255,0,255,0.3);border:1px solid #ff00ff;
                        color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:0.8rem;
                    ">▶ Play</button>
                    ${isOwn ? `<button onclick="event.stopPropagation();deletePlaylist('${pl.id}')" style="
                        background:rgba(255,0,0,0.2);border:1px solid #ff4444;
                        color:#ff4444;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;
                    ">🗑️</button>` : ''}
                    <span style="color:#666;">▼</span>
                </div>
                <div id="playlistTracks_${pl.id}" style="display:none;padding:10px 16px;background:rgba(0,0,0,0.3);"></div>
            `;
            listContainer.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

function showCreatePlaylistForm() {
    const form = document.getElementById('createPlaylistForm');
    if(form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function createPlaylist() {
    const name = document.getElementById('playlistNameInput').value.trim();
    if(!name) { alert('Bitte Namen eingeben!'); return; }
    try {
        await db.collection('playlists').add({
            userId: currentUser.uid,
            name,
            trackIds: [],
            createdAt: new Date().toISOString()
        });
        document.getElementById('playlistNameInput').value = '';
        document.getElementById('createPlaylistForm').style.display = 'none';
        loadUserPlaylists(currentUser.uid);
    } catch(e) { alert('❌ Fehler: ' + e.message); }
}

async function deletePlaylist(playlistId) {
    if(!confirm('Playlist löschen?')) return;
    try {
        await db.collection('playlists').doc(playlistId).delete();
        loadUserPlaylists(currentUser.uid);
    } catch(e) { alert('❌ Fehler: ' + e.message); }
}

async function togglePlaylistTracks(playlistId) {
    const container = document.getElementById(`playlistTracks_${playlistId}`);
    if(!container) return;
    if(container.style.display === 'block') { container.style.display = 'none'; return; }
    container.style.display = 'block';
    container.innerHTML = '<p style="color:#666;font-size:0.8rem;">Lade Tracks...</p>';

    try {
        const plDoc = await db.collection('playlists').doc(playlistId).get();
        if(!plDoc.exists) return;
        const trackIds = plDoc.data().trackIds || [];
        const isOwn = currentUser && currentUser.uid === plDoc.data().userId;

        if(trackIds.length === 0) { container.innerHTML = '<p style="color:#666;font-size:0.8rem;padding:8px 0;">Keine Tracks in dieser Playlist</p>'; return; }

        container.innerHTML = '';
        for(const tid of trackIds) {
            const tDoc = await db.collection('tracks').doc(tid).get();
            if(!tDoc.exists) continue;
            const track = { id: tDoc.id, ...tDoc.data() };
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #ffffff11;';
            row.innerHTML = `
                <img src="${track.coverImage||''}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">
                <div style="flex:1;cursor:pointer;min-width:0;" onclick="openPlayerModal(${JSON.stringify(track).replace(/"/g,'&quot;')})">
                    <div style="color:#fff;font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${track.title}</div>
                    <div style="color:#888;font-size:0.7rem;">${track.artist||''} • ${track.genre||''}</div>
                </div>
                <button onclick="openPlayerModal(${JSON.stringify(track).replace(/"/g,'&quot;')})" style="background:rgba(255,0,255,0.2);border:1px solid #ff00ff;color:#fff;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:0.75rem;">▶</button>
                ${isOwn ? `<button onclick="removeFromPlaylist('${playlistId}','${tid}')" style="background:rgba(255,0,0,0.2);border:1px solid #ff4444;color:#ff4444;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:0.7rem;">✕</button>` : ''}
            `;
            container.appendChild(row);
        }
    } catch(e) { container.innerHTML = '<p style="color:#ff4444;font-size:0.8rem;">Fehler beim Laden</p>'; }
}

async function removeFromPlaylist(playlistId, trackId) {
    try {
        const plRef = db.collection('playlists').doc(playlistId);
        const plDoc = await plRef.get();
        if(!plDoc.exists) return;
        const trackIds = (plDoc.data().trackIds || []).filter(id => id !== trackId);
        await plRef.update({ trackIds });
        togglePlaylistTracks(playlistId);
        togglePlaylistTracks(playlistId);
    } catch(e) { alert('❌ Fehler: ' + e.message); }
}

async function playPlaylist(playlistId) {
    try {
        const plDoc = await db.collection('playlists').doc(playlistId).get();
        if(!plDoc.exists) return;
        const trackIds = plDoc.data().trackIds || [];
        if(trackIds.length === 0) { alert('Playlist ist leer!'); return; }
        currentPlaylistTracks = [];
        for(const tid of trackIds) {
            const tDoc = await db.collection('tracks').doc(tid).get();
            if(tDoc.exists) currentPlaylistTracks.push({ id: tDoc.id, ...tDoc.data() });
        }
        playPlaylistTrack(0);
    } catch(e) { alert('❌ Fehler: ' + e.message); }
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
    // ✅ FIX: Modal schließen aber Audio NICHT stoppen wenn MiniPlayer läuft
    const playerModal = document.getElementById('playerModal');
    if(playerModal) playerModal.style.display = 'none';
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
        } else { actionsDiv.innerHTML = ''; }

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
        if(snapshot.empty) { container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">No uploads yet</p>'; return; }
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
                <div style="color:#666;font-size:0.75rem;margin-top:3px;">👁️ ${track.plays || 0} plays &nbsp; ⬇️ ${track.downloads || 0} downloads &nbsp; ❤️ ${track.likes || 0} likes</div>
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
// EDIT MODAL
// ============================================

function openEditModal(track) {
    const old = document.getElementById('editTrackModal');
    if(old) old.remove();

    const keys = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const genres = ['techno','minimal','industrial','goa','psytrance','rap','hiphop','chillout','drumandbass','electronic','house','dubstep','trap'];

    function pillsHTML(groupId, options, current) {
        return options.map(o => {
            const active = (o.val === current || o.val === (current||'').toLowerCase()) ? 'background:#cc00ff;border-color:#cc00ff;color:#000;font-weight:bold;' : 'background:#1a1a1a;border-color:#333;color:#aaa;';
            return `<span class="epill" data-group="${groupId}" data-val="${o.val}" onclick="editPillSelect(this,'${groupId}')" style="${active}border:1px solid;border-radius:20px;padding:5px 12px;font-size:0.75rem;cursor:pointer;user-select:none;font-family:'Courier New',monospace;">${o.label}</span>`;
        }).join('');
    }

    const keyOptions = [{val:'',label:'–'}].concat(keys.map(k=>({val:k,label:k})));
    const bpmOptions = [{val:'',label:'–'},{val:'slow',label:'Slow <90'},{val:'mid',label:'Mid 90-130'},{val:'fast',label:'Fast >130'}];
    const typeOptions = [{val:'loop',label:'Loop'},{val:'sample',label:'Sample'},{val:'track',label:'Track'},{val:'acapella',label:'Acapella'}];
    const catOptions = [{val:'',label:'–'},{val:'bass',label:'Bass'},{val:'clap',label:'Clap & Snare'},{val:'hihats',label:'Hihats'},{val:'kick',label:'Kick & Drums'},{val:'percussion',label:'Percussions'},{val:'synth',label:'Synth'}];
    const genreOptions = genres.map(g=>({val:g,label:g.charAt(0).toUpperCase()+g.slice(1)}));

    const modal = document.createElement('div');
    modal.id = 'editTrackModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';

    modal.innerHTML = `
        <div style="background:#111;border:1px solid #00ffff;border-radius:12px;padding:28px;width:90%;max-width:560px;box-shadow:0 0 40px rgba(0,255,255,0.2);position:relative;max-height:90vh;overflow-y:auto;">
            <button onclick="document.getElementById('editTrackModal').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;color:#aaa;font-size:1.4rem;cursor:pointer;">✕</button>
            <h3 style="font-family:'Orbitron',sans-serif;color:#00ffff;font-size:0.9rem;letter-spacing:2px;margin-bottom:22px;">✏️ EDIT TRACK</h3>
            <div style="margin-bottom:16px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Titel</label><input type="text" id="editTitle" value="${track.title || ''}" style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#fff;font-size:0.9rem;padding:10px 14px;outline:none;box-sizing:border-box;"></div>
            <div style="margin-bottom:16px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Kategorie</label><div style="display:flex;flex-wrap:wrap;gap:6px;">${pillsHTML('editType', typeOptions, track.type)}</div></div>
            <div style="margin-bottom:16px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Loop Typ</label><div style="display:flex;flex-wrap:wrap;gap:6px;">${pillsHTML('editCategory', catOptions, track.category)}</div></div>
            <div style="margin-bottom:16px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Key (Tonart)</label><div style="display:flex;flex-wrap:wrap;gap:6px;">${pillsHTML('editKey', keyOptions, track.key)}</div></div>
            <div style="margin-bottom:16px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">BPM Range</label><div style="display:flex;flex-wrap:wrap;gap:6px;">${pillsHTML('editBpmRange', bpmOptions, track.bpmRange)}</div></div>
            <div style="margin-bottom:16px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">BPM (exakt)</label><input type="number" id="editBpm" value="${track.bpm || ''}" min="40" max="300" style="width:100%;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#fff;font-size:0.9rem;padding:10px 14px;outline:none;box-sizing:border-box;"></div>
            <div style="margin-bottom:16px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Genre</label><div style="display:flex;flex-wrap:wrap;gap:6px;">${pillsHTML('editGenre', genreOptions, track.genre)}</div></div>
            <div style="margin-bottom:16px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🎵 Audio Datei ersetzen</label><input type="file" id="editAudioFile" accept="audio/*" style="display:none"><div onclick="document.getElementById('editAudioFile').click()" style="padding:12px;border:2px dashed #ff00ff44;border-radius:8px;text-align:center;cursor:pointer;color:#aaa;font-size:0.85rem;background:rgba(255,0,255,0.04);transition:all 0.2s;" onmouseover="this.style.borderColor='#ff00ff'" onmouseout="this.style.borderColor='#ff00ff44'">🎵 <span id="editAudioLabel">Neue Audio-Datei auswählen (optional)</span></div></div>
            <div style="margin-bottom:20px;"><label style="display:block;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🖼️ Cover Bild ersetzen</label><div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;"><img id="editCoverPreview" src="${track.coverImage || ''}" style="width:65px;height:65px;object-fit:cover;border-radius:8px;border:2px solid #333;" onerror="this.style.display='none'"><span style="color:#666;font-size:0.8rem;">Aktuelles Cover</span></div><input type="file" id="editCoverFile" accept="image/*" style="display:none"><div onclick="document.getElementById('editCoverFile').click()" style="padding:12px;border:2px dashed #00ffff44;border-radius:8px;text-align:center;cursor:pointer;color:#aaa;font-size:0.85rem;background:rgba(0,255,255,0.04);transition:all 0.2s;" onmouseover="this.style.borderColor='#00ffff'" onmouseout="this.style.borderColor='#00ffff44'">🖼️ <span id="editCoverLabel">Neues Cover auswählen (optional)</span></div></div>
            <div id="editStatus" style="font-size:0.8rem;color:#888;margin-bottom:14px;min-height:18px;"></div>
            <div style="display:flex;gap:10px;">
                <button id="editSaveBtn" onclick="saveEditModal('${track.id}')" style="flex:1;background:#00ffff;color:#000;border:none;border-radius:6px;font-family:'Courier New',monospace;font-weight:bold;font-size:0.9rem;padding:12px;cursor:pointer;">💾 SPEICHERN</button>
                <button onclick="document.getElementById('editTrackModal').remove()" style="background:#1a1a1a;border:1px solid #333;color:#888;border-radius:6px;font-family:'Courier New',monospace;font-size:0.9rem;padding:12px 20px;cursor:pointer;">Abbrechen</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('editAudioFile').addEventListener('change', (e) => { const file = e.target.files[0]; if(file) document.getElementById('editAudioLabel').textContent = '✅ ' + file.name; });
    document.getElementById('editCoverFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            document.getElementById('editCoverLabel').textContent = '✅ ' + file.name;
            const reader = new FileReader();
            reader.onload = (ev) => { document.getElementById('editCoverPreview').src = ev.target.result; document.getElementById('editCoverPreview').style.display = 'block'; };
            reader.readAsDataURL(file);
        }
    });
    modal.addEventListener('click', (e) => { if(e.target === modal) modal.remove(); });
}

function editPillSelect(el, groupId) {
    document.querySelectorAll(`.epill[data-group="${groupId}"]`).forEach(p => { p.style.background = '#1a1a1a'; p.style.borderColor = '#333'; p.style.color = '#aaa'; p.style.fontWeight = 'normal'; });
    el.style.background = '#cc00ff'; el.style.borderColor = '#cc00ff'; el.style.color = '#000'; el.style.fontWeight = 'bold';
}

function getEditPill(groupId) {
    const all = document.querySelectorAll(`.epill[data-group="${groupId}"]`);
    for(const p of all) { if(p.style.color === 'rgb(0, 0, 0)' || p.style.fontWeight === 'bold') return p.dataset.val; }
    return '';
}

async function saveEditModal(trackId) {
    const title = document.getElementById('editTitle').value.trim();
    const bpm = document.getElementById('editBpm').value;
    const coverFile = document.getElementById('editCoverFile').files[0];
    const audioFile = document.getElementById('editAudioFile').files[0];
    const type = getEditPill('editType');
    const category = getEditPill('editCategory');
    const key = getEditPill('editKey');
    const bpmRange = getEditPill('editBpmRange');
    const genre = getEditPill('editGenre');

    if(!title) { document.getElementById('editStatus').textContent = '❌ Titel darf nicht leer sein!'; return; }

    const saveBtn = document.getElementById('editSaveBtn');
    saveBtn.disabled = true; saveBtn.textContent = '⏳ Speichern...';

    const R2_PUBLIC_URL = 'https://pub-5f696ecb59a944058dd6a3ef1b569457.r2.dev';
    const R2_WORKER_URL = 'https://undergroundloops-upload.dj-christern.workers.dev';

    try {
        const updates = { title, genre, type, category, key, bpmRange: bpmRange || null, bpm: bpm ? parseInt(bpm) : null };

        if(audioFile) {
            document.getElementById('editStatus').textContent = '⏳ Audio wird hochgeladen...';
            const audioExt = audioFile.name.split('.').pop();
            const audioKey = `audio/edit_${trackId}_${Date.now()}.${audioExt}`;
            const audioResponse = await fetch(`${R2_WORKER_URL}/upload`, { method:'POST', headers:{'X-File-Key':audioKey,'Content-Type':audioFile.type||'audio/wav'}, body:audioFile });
            if(!audioResponse.ok) throw new Error('Audio Upload fehlgeschlagen');
            updates.audioFile = `${R2_PUBLIC_URL}/${audioKey}`;
        }

        if(coverFile) {
            document.getElementById('editStatus').textContent = '⏳ Cover wird hochgeladen...';
            const compressed = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); let w=img.width,h=img.height; if(w>400){h=Math.round(h*400/w);w=400;} canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);resolve(canvas.toDataURL('image/jpeg',0.85)); }; img.onerror=reject; img.src=e.target.result; };
                reader.onerror=reject; reader.readAsDataURL(coverFile);
            });
            const coverBlob = await (await fetch(compressed)).blob();
            const coverKey = `covers/edit_${trackId}_${Date.now()}.jpg`;
            const response = await fetch(`${R2_WORKER_URL}/upload`, { method:'POST', headers:{'X-File-Key':coverKey,'Content-Type':'image/jpeg'}, body:coverBlob });
            if(!response.ok) throw new Error('Cover Upload fehlgeschlagen');
            updates.coverImage = `${R2_PUBLIC_URL}/${coverKey}`;
        }

        await db.collection('tracks').doc(trackId).update(updates);
        document.getElementById('editStatus').style.color = '#00ffcc';
        document.getElementById('editStatus').textContent = '✅ Gespeichert!';
        if(typeof allTracks !== 'undefined') { const idx = allTracks.findIndex(t => t.id === trackId); if(idx !== -1) Object.assign(allTracks[idx], updates); }
        setTimeout(() => { document.getElementById('editTrackModal').remove(); if(typeof loadUserUploads === 'function' && currentUser) loadUserUploads(currentUser.uid); }, 800);
    } catch(err) {
        document.getElementById('editStatus').style.color = '#ff4444';
        document.getElementById('editStatus').textContent = '❌ Fehler: ' + err.message;
        saveBtn.disabled = false; saveBtn.textContent = '💾 SPEICHERN';
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
        if(likesSnap.empty) { container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">No liked tracks yet</p>'; return; }
        container.innerHTML = '';
        for(const likeDoc of likesSnap.docs) {
            const trackId = likeDoc.data().trackId;
            const trackDoc = await db.collection('tracks').doc(trackId).get();
            if(trackDoc.exists) {
                const track = { id: trackDoc.id, ...trackDoc.data() };
                const div = document.createElement('div');
                div.style.cssText = 'padding:12px;border:1px solid #ff00ff33;border-radius:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px;cursor:pointer;color:#fff;';
                div.onclick = () => openPlayerModal(track);
                div.innerHTML = `<img src="${track.coverImage||''}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'"><div><div style="font-weight:bold;font-size:0.85rem;">${track.title}</div><div style="color:#888;font-size:0.75rem;">${track.artist||''} • ${track.genre||''}</div></div>`;
                container.appendChild(div);
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
            else if(tab === 'playlists') { document.getElementById('playlistsTab').classList.remove('hidden'); loadUserPlaylists(currentProfileUserId); }
            else if(tab === 'stats') { document.getElementById('statsTab').classList.remove('hidden'); loadUserStats(currentProfileUserId); }
            else if(tab === 'sociallinks') { document.getElementById('sociallinksTab').classList.remove('hidden'); loadSocialLinks(currentProfileUserId); }
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
    if(snapshot.empty) { content.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No users yet</p>'; }
    else {
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
        sentSnap.forEach(doc => { const msg = doc.data(); if(!conversations.has(msg.receiverId)) conversations.set(msg.receiverId, { userId: msg.receiverId, lastMessage: msg.text, timestamp: msg.createdAt }); });
        receivedSnap.forEach(doc => { const msg = doc.data(); if(!conversations.has(msg.senderId) || msg.createdAt > conversations.get(msg.senderId).timestamp) conversations.set(msg.senderId, { userId: msg.senderId, lastMessage: msg.text, timestamp: msg.createdAt, unread: !msg.read }); });
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
    messageView.innerHTML = `<div class="messages-header">${userData.username}</div><div class="messages-body" id="messagesBody"></div><div class="message-input-area"><textarea id="messageInput" placeholder="Type a message..."></textarea><button class="send-message-btn" onclick="sendMessage()">Send</button></div>`;
    const messagesBody = document.getElementById('messagesBody');
    messages.forEach(msg => { const bubble = document.createElement('div'); bubble.className = `message-bubble ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`; bubble.innerHTML = `<div>${msg.text}</div><div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>`; messagesBody.appendChild(bubble); });
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
    document.getElementById('forumContainer')?.classList.add('hidden');
    document.getElementById('blogContainer')?.classList.add('hidden');
    const uc = document.getElementById('uploadContainer');
    if(uc) uc.classList.add('hidden');
    const fw = document.getElementById('mainFlexWrapper');
    if(fw) fw.style.display = 'flex';
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
// STATS TAB
// ============================================

async function loadUserStats(userId) {
    const container = document.getElementById('statsTab');
    if(!container) return;
    container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;font-family:Orbitron,sans-serif;font-size:0.8rem;">⏳ Lade Statistiken...</p>';

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        const tracksSnap = await db.collection('tracks').where('userId', '==', userId).get();
        let totalDownloads = 0, totalLikes = 0, totalPlays = 0, totalTracks = tracksSnap.size;
        tracksSnap.forEach(doc => {
            const d = doc.data();
            totalDownloads += (d.downloads || 0);
            totalLikes += (d.likes || 0);
            totalPlays += (d.plays || 0);
        });

        const followersSnap = await db.collection('follows').where('followingId', '==', userId).get();
        const followingSnap = await db.collection('follows').where('followerId', '==', userId).get();
        const commentsSnap = await db.collection('comments').where('userId', '==', userId).get();
        const playlistsSnap = await db.collection('playlists').where('userId', '==', userId).get();
        const memberSince = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('de-DE', {day:'2-digit',month:'long',year:'numeric'}) : '–';

        function statCard(value, label, color) {
            return `<div style="background:rgba(0,0,0,0.5);border:1px solid ${color}44;border-radius:12px;padding:20px;text-align:center;transition:all 0.3s;" onmouseover="this.style.borderColor='${color}';this.style.boxShadow='0 0 20px ${color}33'" onmouseout="this.style.borderColor='${color}44';this.style.boxShadow='none'">
                <div style="font-family:'Orbitron',sans-serif;color:${color};font-size:1.6rem;font-weight:bold;text-shadow:0 0 15px ${color}66;">${value.toLocaleString('de-DE')}</div>
                <div style="color:#888;font-size:0.75rem;margin-top:6px;font-family:'Orbitron',sans-serif;letter-spacing:1px;">${label}</div>
            </div>`;
        }

        container.innerHTML = `
            <div style="padding:10px 0 20px 0;">
                <h3 style="font-family:'Orbitron',sans-serif;color:#ff00ff;font-size:1rem;letter-spacing:3px;margin-bottom:25px;text-shadow:0 0 15px rgba(255,0,255,0.5);border-bottom:1px solid #ff00ff33;padding-bottom:12px;">📊 STATISTICS</h3>

                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;margin-bottom:30px;">
                    ${statCard(totalTracks, 'UPLOADS', '#ff00ff')}
                    ${statCard(totalDownloads, 'DOWNLOADS', '#00ffff')}
                    ${statCard(totalLikes, 'LIKES', '#ff4488')}
                    ${statCard(totalPlays, 'PLAYS', '#ff8800')}
                    ${statCard(followersSnap.size, 'FOLLOWERS', '#00ff88')}
                    ${statCard(followingSnap.size, 'FOLLOWING', '#8800ff')}
                    ${statCard(commentsSnap.size, 'COMMENTS', '#ffff00')}
                    ${statCard(playlistsSnap.size, 'PLAYLISTS', '#ff00aa')}
                </div>

                <div style="background:rgba(0,0,0,0.4);border:1px solid #ff00ff22;border-radius:12px;padding:20px;">
                    <div>
                        <div style="color:#888;font-size:0.72rem;font-family:'Orbitron',sans-serif;letter-spacing:1px;margin-bottom:4px;">MEMBER SINCE</div>
                        <div style="color:#fff;font-size:1rem;font-weight:bold;">${memberSince}</div>
                    </div>
                </div>
            </div>
        `;
    } catch(e) {
        container.innerHTML = '<p style="color:#ff4444;text-align:center;padding:40px;">❌ Fehler beim Laden</p>';
        console.error(e);
    }
}


// ============================================
// SOCIAL LINKS
// ============================================

async function loadSocialLinks(userId) {
    const container = document.getElementById('sociallinksTab');
    if(!container) return;
    const isOwn = currentUser && currentUser.uid === userId;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const links = userDoc.exists ? (userDoc.data().socialLinks || []) : [];

        container.innerHTML = `
            <div style="padding:10px 0 20px 0;">
                <h3 style="font-family:'Orbitron',sans-serif;color:#ff00ff;font-size:1rem;letter-spacing:3px;margin-bottom:25px;text-shadow:0 0 15px rgba(255,0,255,0.5);border-bottom:1px solid #ff00ff33;padding-bottom:12px;">🔗 SOCIAL LINKS</h3>

                ${isOwn ? `
                <div style="background:rgba(0,0,0,0.4);border:1px solid #ff00ff33;border-radius:8px;padding:16px;margin-bottom:20px;">
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <input type="text" id="newLinkName" placeholder="Name (z.B. SoundCloud)" style="flex:1;background:#1a1a1a;border:1px solid #ff00ff44;border-radius:6px;color:#fff;font-size:0.85rem;padding:8px 12px;outline:none;">
                        <input type="text" id="newLinkUrl" placeholder="URL (https://...)" style="flex:2;background:#1a1a1a;border:1px solid #ff00ff44;border-radius:6px;color:#fff;font-size:0.85rem;padding:8px 12px;outline:none;">
                        <button onclick="addSocialLink()" style="background:#ff00ff;color:#000;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:bold;white-space:nowrap;">+ Add</button>
                    </div>
                </div>` : ''}

                <div id="socialLinksList">
                    ${links.length === 0
                        ? '<p style="color:#666;text-align:center;padding:30px;">No social links yet</p>'
                        : links.map((l, i) => `
                            <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #ff00ff33;border-radius:8px;margin-bottom:8px;background:rgba(0,0,0,0.3);">
                                <a href="${l.url}" target="_blank" rel="noopener" style="flex:1;color:#00ffff;text-decoration:none;font-size:0.9rem;font-weight:bold;" onmouseover="this.style.color='#ff00ff'" onmouseout="this.style.color='#00ffff'">${l.name}</a>
                                <span style="color:#666;font-size:0.78rem;flex:2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.url}</span>
                                ${isOwn ? `<button onclick="removeSocialLink(${i})" style="background:rgba(255,0,0,0.2);border:1px solid #ff4444;color:#ff4444;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.75rem;flex-shrink:0;">✕</button>` : ''}
                            </div>`).join('')
                    }
                </div>
            </div>
        `;
    } catch(e) { console.error(e); }
}

async function addSocialLink() {
    if(!currentUser) return;
    const name = document.getElementById('newLinkName').value.trim();
    const url = document.getElementById('newLinkUrl').value.trim();
    if(!name || !url) { alert('Bitte Name und URL eingeben!'); return; }
    if(!url.startsWith('http')) { alert('URL muss mit http:// oder https:// beginnen!'); return; }
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const userDoc = await userRef.get();
        const links = userDoc.data().socialLinks || [];
        links.push({ name, url });
        await userRef.update({ socialLinks: links });
        loadSocialLinks(currentUser.uid);
    } catch(e) { alert('❌ Fehler: ' + e.message); }
}

async function removeSocialLink(index) {
    if(!currentUser) return;
    if(!confirm('Link löschen?')) return;
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const userDoc = await userRef.get();
        const links = userDoc.data().socialLinks || [];
        links.splice(index, 1);
        await userRef.update({ socialLinks: links });
        loadSocialLinks(currentUser.uid);
    } catch(e) { alert('❌ Fehler: ' + e.message); }
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

// ============================================
// PLAYLIST AUTOPLAY
// ============================================

let currentPlaylistTracks = [];
let currentPlaylistIndex = 0;

function playPlaylistTrack(index) {
    if(index >= currentPlaylistTracks.length) {
        currentPlaylistTracks = [];
        currentPlaylistIndex = 0;
        return;
    }
    currentPlaylistIndex = index;
    openPlayerModal(currentPlaylistTracks[index]);
    setTimeout(() => {
        if(currentAudio) {
            currentAudio.onended = () => playPlaylistTrack(index + 1);
        }
    }, 800);
}
