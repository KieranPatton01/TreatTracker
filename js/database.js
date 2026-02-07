import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { firebaseConfig, mapboxToken } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const kissesRef = ref(db, "kisses");

const userAvatars = {
    "kieran": "10226724-246135883_7-s5-v1",
    "libby": "37237988-100513394046_2416-s5-v1",
    "isla": "37237988-139859680_123-s5-v1"
};

export function initMap() {
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/outdoors-v12", 
        center: [-3.1883, 55.9533], 
        zoom: 14,
        pitch: 65, 
        bearing: -17.6,
        antialias: true
    });

    map.on("load", () => {
        const layers = map.getStyle().layers;
        const labelLayerId = layers.find((layer) => layer.type === "symbol" && layer.layout["text-field"]).id;

        map.addLayer({
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
                "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#ffffff", 50, "#ffb6c1", 100, "#ff4d6d"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "min_height"],
                "fill-extrusion-opacity": 0.8
            }
        }, labelLayerId);
    });

    return map;
}

export function listenForKisses(map, callback) {
    onValue(kissesRef, (snapshot) => {
        const data = snapshot.val();
        const countEl = document.getElementById("kiss-count");
        
        if (!data) {
            if (countEl) countEl.innerText = "0";
            return;
        }

        // Remove old markers safely
        const oldMarkers = document.getElementsByClassName('kiss-marker');
        while(oldMarkers[0]) {
            oldMarkers[0].parentNode.removeChild(oldMarkers[0]);
        }

        const userStats = {};
        const entries = Object.entries(data);
        const totalKisses = entries.length;

        entries.forEach(([key, kiss], index) => {
            const name = (kiss.user || "unknown").toLowerCase().trim();
            userStats[name] = (userStats[name] || 0) + 1;

            const el = document.createElement("div");
            el.className = "kiss-marker";
            el.innerHTML = index === 0 ? "👑" : "💋";

            const bitID = userAvatars[name];
            const faceHtml = bitID 
                ? `<img src="https://cf-st.sc-cdn.net/3d/render/${bitID}.webp?trim=circle&scale=0&ua=2" style="width:60px; height:60px; border-radius:50%; border:3px solid #ff4d6d; margin-bottom: 5px;">`
                : `<span style="font-size:30px;">💋</span>`;

            // Adding a small delay to popup creation helps with lag
            const popup = new mapboxgl.Popup({ 
                offset: 40, 
                closeButton: false,
                maxWidth: '200px',
                className: 'custom-popup'
            }).setHTML(`
                <div style="text-align:center; display:flex; flex-direction:column; align-items:center; padding: 5px;">
                    ${faceHtml}
                    <strong style="text-transform:capitalize; font-size:14px; color:#333;">${name}</strong>
                    <p style="margin:2px 0 0; font-size:10px; color:#888;">${kiss.date}</p>
                </div>
            `);

            new mapboxgl.Marker({ 
                element: el,
                anchor: 'bottom' // Helps keep the 💋 pinned to the ground while scrolling
            })
                .setLngLat([kiss.lng, kiss.lat])
                .setPopup(popup)
                .addTo(map);
        });

        if (countEl) {
            countEl.innerText = totalKisses;
            countEl.parentElement.classList.add('bump');
            setTimeout(() => countEl.parentElement.classList.remove('bump'), 200);
        }

        if (callback) callback(userStats);
    });
}

export function dropKiss(map, username) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

            push(kissesRef, {
                lat: latitude,
                lng: longitude,
                date: today,
                user: username.toLowerCase(),
                timestamp: Date.now()
            });

            map.flyTo({ center: [longitude, latitude], zoom: 17, pitch: 70, speed: 1.2 });
        });
    }
}