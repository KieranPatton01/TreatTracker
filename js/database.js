import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { firebaseConfig } from './config.js'; // Token not needed here anymore

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentMarkers = {};

const userAvatars = { "kieran": "10226724-246135883_7-s5-v1", "libby": "37237988-100513394046_2416-s5-v1", "isla": "37237988-139859680_123-s5-v1" };

// initMap removed from here as it's now handled more specifically in richard.html for 3D style

// Updated to accept lat/lng directly so it matches the zoom-in location
export function dropKiss(map, username, lat, lng) {
     push(ref(db, 'kisses'), { 
         lat: lat, 
         lng: lng, 
         user: username.toLowerCase().trim(), 
         timestamp: serverTimestamp() 
     });
}

export function listenForKisses(map, onStatsUpdate) {
    onValue(ref(db, 'kisses'), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        const kissStats = {};
        const entries = Object.entries(data);
        document.getElementById('kiss-count').innerText = entries.length;

        let oldestId = null;
        let oldestTime = Infinity;
        entries.forEach(([id, k]) => {
            if (k.timestamp && k.timestamp < oldestTime) { oldestTime = k.timestamp; oldestId = id; }
        });

        entries.forEach(([id, kiss]) => {
            const name = kiss.user.toLowerCase().trim();
            kissStats[name] = (kissStats[name] || 0) + 1;
            const isOldest = (id === oldestId);

            if (currentMarkers[id]) {
                const currentIcon = currentMarkers[id].getElement().innerText;
                const targetIcon = isOldest ? '👑' : '💋';
                if (currentIcon !== targetIcon) { currentMarkers[id].remove(); delete currentMarkers[id]; }
            }

            if (!currentMarkers[id]) {
                const el = document.createElement('div');
                el.className = 'kiss-marker';
                el.innerText = isOldest ? '👑' : '💋';
                if (isOldest) el.style.fontSize = '45px';

                const date = kiss.timestamp ? new Date(kiss.timestamp).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : "Recently";
                const bitID = userAvatars[name];
                
                const popupHTML = `
                    <div style="text-align:center; min-width:110px;">
                        ${bitID ? `<img src="https://cf-st.sc-cdn.net/3d/render/${bitID}.webp?trim=circle&scale=0&ua=2" style="width:45px; border-radius:50%; margin-bottom:5px;">` : ''}
                        <div style="color:#ff4d6d; font-weight:800; text-transform:uppercase; font-size:13px;">${name}</div>
                        <div style="font-size:10px; color:#999; margin-top:2px;">${date}</div>
                        ${isOldest ? '<div style="font-size:10px; color:#ffd700; font-weight:bold; margin-top:4px;">THE FIRST KISS 👑</div>' : ''}
                    </div>
                `;

                currentMarkers[id] = new mapboxgl.Marker(el)
                    .setLngLat([kiss.lng, kiss.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(popupHTML))
                    .addTo(map);
            }
        });
        if (onStatsUpdate) onStatsUpdate(kissStats);
    });
}