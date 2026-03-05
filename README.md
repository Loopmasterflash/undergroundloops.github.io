# UNDERGROUNDLOOPS - Landing Page

## 🎵 Cyberpunk Music Website

Deine Underground Techno & Electronic Loops Platform!

---

## 📦 DATEIEN:

- `index.html` - Hauptseite
- `style.css` - Design (Glasmorphism + Neon)
- `script.js` - Audio Player (WaveSurfer.js)
- `cyberpunk-skyline.jpg` - Hintergrundbild (muss hinzugefügt werden!)

---

## 🚀 WIE DU ES AUF GITHUB HOCHLÄDST:

### SCHRITT 1: GitHub Repository erstellen

1. Geh auf: https://github.com
2. Klick auf **"New Repository"** (grüner Button)
3. Repository Name: `undergroundloops.github.io`
4. Beschreibung: "Underground Techno Loops Website"
5. Setze auf **"Public"**
6. ✅ Haken bei **"Add a README file"**
7. Klick **"Create Repository"**

### SCHRITT 2: Dateien hochladen

1. Im Repository klick auf **"Add file"** → **"Upload files"**
2. Ziehe diese Dateien rein:
   - `index.html`
   - `style.css`
   - `script.js`
   - `cyberpunk-skyline.jpg` (dein Hintergrundbild!)
3. Klick **"Commit changes"**

### SCHRITT 3: GitHub Pages aktivieren

1. Geh zu **"Settings"** (im Repository)
2. Scroll runter zu **"Pages"**
3. Bei **"Source"** wähle: **"main"** branch
4. Klick **"Save"**
5. **FERTIG!** Deine Seite ist jetzt live auf: `https://undergroundloops.github.io`

### SCHRITT 4: Custom Domain verbinden (undergroundloops.com)

1. Noch in **GitHub Pages Settings**
2. Bei **"Custom domain"** trage ein: `undergroundloops.com`
3. Klick **"Save"**

4. Geh zu **Namecheap**:
   - Dashboard → Domain List → undergroundloops.com
   - Manage → Advanced DNS
   - Füge hinzu:
     ```
     Type: A Record
     Host: @
     Value: 185.199.108.153
     
     Type: A Record
     Host: @
     Value: 185.199.109.153
     
     Type: A Record
     Host: @
     Value: 185.199.110.153
     
     Type: A Record
     Host: @
     Value: 185.199.111.153
     
     Type: CNAME
     Host: www
     Value: undergroundloops.github.io
     ```

5. **Warte 10-30 Minuten** (DNS-Propagation)

6. **BOOM!** → `undergroundloops.com` zeigt deine Website! 🔥

---

## 🎨 WICHTIG: HINTERGRUNDBILD!

Das Cyberpunk Skyline Bild muss als `cyberpunk-skyline.jpg` hochgeladen werden!

**Dein ChatGPT Bild:**
- Speichere es als `cyberpunk-skyline.jpg`
- Lade es mit den anderen Dateien hoch

---

## 🎵 EIGENE MUSIK HINZUFÜGEN (später):

Im `script.js` diese Zeile ändern:
```javascript
wavesurfer.load('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
```

Ersetze mit deinem eigenen MP3 Link!

**Wo MP3 hosten?**
- Firebase Storage (kostenlos bis 5GB)
- Cloudinary
- Oder direkt in GitHub (max 100MB pro File)

---

## ✨ FEATURES:

✅ Cyberpunk Skyline Background (fixed, fullscreen)
✅ Neon Logo "UNDERGROUNDLOOPS" (pulsierend)
✅ Genre Buttons (Glasmorphism)
✅ Audio Player mit Waveform (wie SoundCloud)
✅ Play/Pause/Volume Controls
✅ Download Button
✅ Responsive (Mobile + Desktop)

---

## 🔥 NÄCHSTE SCHRITTE (später hinzufügen):

- Mehr Tracks
- Upload System
- User Accounts
- Comments
- Likes/Favorites
- Playlists

---

## 💬 FRAGEN?

Schreib mir einfach! Ich helfe dir! 😊

**LET'S GO!** 🚀
