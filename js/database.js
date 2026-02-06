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
    return new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-3.1883, 55.9533],
        zoom: 12
    });
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
        
        if (!data) {
            if (onStatsUpdate) onStatsUpdate({ "kieran": 0, "libby": 0, "isla": 0 });
            return;
        }

        const kissStats = {};
        document.getElementById('kiss-count').innerText = Object.keys(data).length;

        Object.keys(data).forEach(id => {
            const kiss = data[id];
            const name = kiss.user.toLowerCase().trim();
            
            kissStats[name] = (kissStats[name] || 0) + 1;

            if (!currentMarkers[id]) {
                const el = document.createElement('div');
                el.className = 'kiss-marker';
                el.innerText = '💋';
                
                const bitID = userAvatars[name];
                const standingUrl = bitID 
                    ? `https://render.bitstrips.com/v2/cpanel/${bitID}.png?transparent=1&width=80`
                    : null;
                
                const popupContent = standingUrl 
                    ? `<div style="text-align:center;"><img src="${standingUrl}" style="width:60px;"><br><strong>${name}</strong></div>`
                    : `<div style="text-align:center;"><strong>${name}</strong></div>`;

                currentMarkers[id] = new mapboxgl.Marker(el)
                    .setLngLat([kiss.lng, kiss.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
                    .addTo(map);
            }
        });
        
        if (onStatsUpdate) onStatsUpdate(kissStats);
    });
}