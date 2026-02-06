import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { firebaseConfig, mapboxToken } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentMarkers = {};

const userAvatars = {
    "kieran": "10226724-246135883_7-s5-v1",
    "libby": "37237988-100513394046_2416-s5-v1",
    "isla": "37237988-139859680_123-s5-v1"
};

export function initMap() {
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-3.1883, 55.9533],
        zoom: 12
    });
    setTimeout(() => { map.resize(); }, 500);
    return map;
}

export function dropKiss(map, username) {
    const center = map.getCenter();
    push(ref(db, 'kisses'), {
        lat: center.lat,
        lng: center.lng,
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

        // Find the oldest kiss (Crown Logic)
        let oldestId = null;
        let oldestTime = Infinity;

        entries.forEach(([id, kiss]) => {
            if (kiss.timestamp && kiss.timestamp < oldestTime) {
                oldestTime = kiss.timestamp;
                oldestId = id;
            }
        });

        entries.forEach(([id, kiss]) => {
            const name = kiss.user.toLowerCase().trim();
            kissStats[name] = (kissStats[name] || 0) + 1;
            
            const isOldest = (id === oldestId);
            
            // Check if we need to redraw marker (e.g. if it became a crown)
            if (currentMarkers[id]) {
                const currentEl = currentMarkers[id].getElement();
                const currentIcon = currentEl.innerText;
                const shouldBeIcon = isOldest ? '👑' : '💋';
                
                if (currentIcon !== shouldBeIcon) {
                    currentMarkers[id].remove();
                    delete currentMarkers[id];
                }
            }

            if (!currentMarkers[id]) {
                const el = document.createElement('div');
                el.className = 'kiss-marker';
                el.innerText = isOldest ? '👑' : '💋';
                
                if (isOldest) {
                    el.style.fontSize = '40px';
                    el.style.zIndex = '100';
                }

                // Prepare Popup Data
                const bitID = userAvatars[name];
                
                // Format Date
                let dateString = "Just now";
                if (kiss.timestamp) {
                    const date = new Date(kiss.timestamp);
                    dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                // Popup HTML: Small Bitmoji, Name, Date
                const popupHTML = `
                    <div style="text-align:center; font-family:'Helvetica Neue', sans-serif;">
                        ${bitID ? `<img src="https://cf-st.sc-cdn.net/3d/render/${bitID}.webp?trim=circle&scale=0&ua=2" style="width:50px; border-radius:50%; margin-bottom:5px;">` : ''}
                        <h3 style="margin:2px 0; color:#ff4d6d; text-transform:capitalize; font-size:16px;">${name}</h3>
                        <p style="margin:0; font-size:11px; color:#888;">${dateString}</p>
                    </div>
                `;

                currentMarkers[id] = new mapboxgl.Marker(el)
                    .setLngLat([kiss.lng, kiss.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupHTML))
                    .addTo(map);
            }
        });

        if (onStatsUpdate) onStatsUpdate(kissStats);
    });
}