// Admin Panel JavaScript
// Password: underground2026 (change this!)

const ADMIN_PASSWORD = "underground2026";

// Check if already logged in
window.addEventListener('DOMContentLoaded', function() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if(isLoggedIn === 'true') {
        showAdminPanel();
    }
});

// Login Form
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if(password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
    } else {
        errorDiv.textContent = '❌ Invalid password!';
        errorDiv.classList.remove('hidden');
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 3000);
    }
});

// Show Admin Panel
function showAdminPanel() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
}

// Logout
function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('loginForm').reset();
}

// Upload Form
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const successMsg = document.getElementById('successMsg');
    const errorMsg = document.getElementById('errorMsg');
    
    // Hide previous messages
    successMsg.classList.add('hidden');
    errorMsg.classList.add('hidden');
    
    // Get form data
    const trackData = {
        title: document.getElementById('trackTitle').value,
        artist: document.getElementById('trackArtist').value,
        genre: document.getElementById('trackGenre').value,
        bpm: document.getElementById('trackBPM').value || null,
        description: document.getElementById('trackDescription').value || '',
        audioFile: document.getElementById('audioFileName').value,
        coverImage: document.getElementById('coverFileName').value,
        uploadedAt: new Date().toISOString(),
        plays: 0,
        likes: 0
    };
    
    try {
        // Add to Firestore
        await db.collection('tracks').add(trackData);
        
        // Show success message
        successMsg.textContent = `✅ Track "${trackData.title}" saved to database! Now upload the files to GitHub.`;
        successMsg.classList.remove('hidden');
        
        // Reset form
        document.getElementById('uploadForm').reset();
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Log success
        console.log('Track added:', trackData);
        
    } catch(error) {
        // Show error message
        errorMsg.textContent = `❌ Error: ${error.message}`;
        errorMsg.classList.remove('hidden');
        console.error('Error adding track:', error);
    }
});

// Helper: Show upload instructions
function showInstructions(audioFile, coverFile) {
    alert(`
📤 NEXT STEPS:

1. Go to GitHub Repository
2. Upload these files:
   - ${audioFile} (to root or /tracks/ folder)
   - ${coverFile} (to root or /covers/ folder)

3. Refresh your website - track will appear automatically!
    `);
}
