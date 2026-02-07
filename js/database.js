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
        center: [0, 20],
        zoom: 1.5,
        pitch: 0,
        bearing: 0,
        antialias: true
    });

    map.on("load", () => {
        // Add 3D buildings
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

let markers = [];

export function listenForKisses(map, callback) {
    onValue(kissesRef, (snapshot) => {
        const data = snapshot.val();
        const countEl = document.getElementById("kiss-count");
        
        if (!data) {
            if (countEl) countEl.innerText = "0";
            return;
        }

        // Remove all existing markers
        markers.forEach(marker => marker.remove());
        markers = [];

        const userStats = {};
        const entries = Object.entries(data);
        const totalKisses = entries.length;

        // Sort by timestamp to find the actual first kiss
        const sortedEntries = entries.sort((a, b) => {
            const timeA = a[1].timestamp || 0;
            const timeB = b[1].timestamp || 0;
            return timeA - timeB;
        });

        // Create a marker for each kiss
        sortedEntries.forEach(([key, kiss], index) => {
            const name = (kiss.user || "unknown").toLowerCase().trim();
            userStats[name] = (userStats[name] || 0) + 1;

            // Create marker element
            const el = document.createElement("div");
            el.className = "kiss-marker";
            // First entry after sorting is the actual first kiss
            if (index === 0) {
                el.classList.add("first-kiss");
                el.innerHTML = "👑";
            } else {
                el.innerHTML = "💋";
            }

            // Create popup
            const bitID = userAvatars[name];
            const faceHtml = bitID 
                ? `<img src="https://cf-st.sc-cdn.net/3d/render/${bitID}.webp?trim=circle&scale=0&ua=2" style="width:60px; height:60px; border-radius:50%; border:3px solid #ff4d6d; margin-bottom: 5px;">`
                : `<span style="font-size:30px;">💋</span>`;

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

            // Create and add marker
            const marker = new mapboxgl.Marker({ 
                element: el,
                anchor: 'bottom'
            })
                .setLngLat([kiss.lng, kiss.lat])
                .setPopup(popup)
                .addTo(map);

            markers.push(marker);
        });

        // Update counter with animation
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

            map.flyTo({ 
                center: [longitude, latitude], 
                zoom: 17, 
                pitch: 70, 
                speed: 1.2 
            });
        }, (error) => {
            console.error('Geolocation error:', error);
            alert('Could not get your location. Please enable location services.');
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}