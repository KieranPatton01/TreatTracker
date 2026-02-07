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

let allMarkers = []; 

export function initMap() {
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/light-v12", 
        center: [-3.1883, 55.9533],
        zoom: 12,
        pitch: 0,
        bearing: 0,
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
                "fill-extrusion-color": "#f0f0f0",
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "min_height"],
                "fill-extrusion-opacity": 0.6
            }
        }, labelLayerId);
        
        map.setPaintProperty('water', 'fill-color', '#c8e7ff');
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

        const userStats = {};
        const entries = Object.entries(data);
        
        // Convert Firebase data to GeoJSON for Mapbox
        const features = entries.map(([key, kiss], index) => {
            const name = (kiss.user || "unknown").toLowerCase().trim();
            userStats[name] = (userStats[name] || 0) + 1;
            return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [kiss.lng, kiss.lat] },
                properties: { id: key, name: name, date: kiss.date, isFirst: index === 0 }
            };
        });

        const geojson = { type: 'FeatureCollection', features: features };

        // Update or Create Source
        if (map.getSource('kisses')) {
            map.getSource('kisses').setData(geojson);
        } else {
            map.addSource('kisses', {
                type: 'geojson',
                data: geojson,
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: 50 // Radius of each cluster when clustering points
            });
        }

        renderMarkers(map);

        if (countEl) {
            countEl.innerText = entries.length;
            countEl.parentElement.classList.add('bump');
            setTimeout(() => countEl.parentElement.classList.remove('bump'), 200);
        }
        if (callback) callback(userStats);
    });

    // Re-render markers on move/zoom
    map.on('moveend', () => renderMarkers(map));
}

function renderMarkers(map) {
    if (!map.getSource('kisses')) return;

    // Use Mapbox's built-in query for what's currently on screen
    map.getSource('kisses').getClusterExpansionZoom = (clusterId) => {}; // dummy for logic

    // To keep it simple and highly performant for mobile:
    const newMarkers = {};
    const features = map.querySourceFeatures('kisses');

    features.forEach(f => {
        const coords = f.geometry.coordinates;
        const id = f.properties.cluster ? `cluster-${f.properties.cluster_id}` : `point-${f.properties.id}`;
        
        if (newMarkers[id]) return;

        const el = document.createElement('div');
        if (f.properties.cluster) {
            el.className = 'cluster-marker';
            el.innerHTML = `<div class="cluster-inner">${f.properties.point_count}</div>`;
            el.onclick = () => {
                map.flyTo({ center: coords, zoom: map.getZoom() + 2 });
            };
        } else {
            el.className = 'kiss-marker';
            el.innerHTML = f.properties.isFirst ? "👑" : "💋";
            
            const bitID = userAvatars[f.properties.name];
            const faceHtml = bitID 
                ? `<img src="https://cf-st.sc-cdn.net/3d/render/${bitID}.webp?trim=circle&scale=0&ua=2" style="width:60px; height:60px; border-radius:50%; border:3px solid #ff4d6d; margin-bottom: 5px;">`
                : `<span style="font-size:30px;">💋</span>`;

            const popup = new mapboxgl.Popup({ offset: 40, closeButton: false })
                .setHTML(`
                    <div style="text-align:center; display:flex; flex-direction:column; align-items:center; padding: 5px;">
                        ${faceHtml}
                        <strong style="text-transform:capitalize; font-size:14px; color:#333;">${f.properties.name}</strong>
                        <p style="margin:2px 0 0; font-size:10px; color:#888;">${f.properties.date}</p>
                    </div>
                `);

            new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat(coords)
                .setPopup(popup)
                .addTo(map);
            
            newMarkers[id] = true;
            return;
        }

        new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        newMarkers[id] = true;
    });

    // Clean up old markers
    allMarkers.forEach(m => m.remove());
    allMarkers = Object.values(newMarkers); // This is a simplified tracker
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