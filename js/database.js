import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { firebaseConfig, mapboxToken } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentMarkers = {};

const userAvatars = { "kieran": "10226724-246135883_7-s5-v1", "libby": "37237988-100513394046_2416-s5-v1", "isla": "37237988-139859680_123-s5-v1" };

export function initMap() {
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12', // VIBRANT STYLE
        center: [-3.1883, 55.9533],
        zoom: 13
    });
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }));
    return map;
}

export function dropKiss(map, username) {
    navigator.geolocation.getCurrentPosition((position) => {
        push(ref(db, 'kisses'), {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            user: username.toLowerCase().trim(),
            timestamp: serverTimestamp()
        });
    }, () => {
        const center = map.getCenter();
        push(ref(db, 'kisses'), { lat: center.lat, lng: center.lng, user: username.toLowerCase().trim(), timestamp: serverTimestamp() });
    });
}

export function listenForKisses(map, onStatsUpdate) {
    onValue(ref(db, 'kisses'), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        const kissStats = {};
        const entries = Object.entries(data);
        document.getElementById('kiss-count').innerText = entries.length;

        // Find oldest kiss
        let oldestId = null;
        let oldestTime = Infinity;
        entries.forEach(([id, k]) => {
            if (k.timestamp && k.timestamp < oldestTime) { oldestTime = k.timestamp; oldestId = id; }
        });

        entries.forEach(([id, kiss]) => {
            const name = kiss.user.toLowerCase().trim();
            kissStats[name] = (kissStats[name] || 0) + 1;
            const isOldest = (id === oldestId);

            // Re-draw marker if it changes status (e.g. becomes crown)
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
                el.style.cursor = 'pointer';

                const date = kiss.timestamp ? new Date(kiss.timestamp).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : "Recently";
                const bitID = userAvatars[name];
                
                // Detailed Popup: Small Bitmoji, Pink Name, Date
                const popupHTML = `
                    <div style="text-align:center; min-width:110px; font-family:sans-serif;">
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