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
        center: [0, 20],  // Centered on world, slightly north
        zoom: 1.5,        // Zoomed out to see whole globe
        pitch: 0,         // Flat view for world perspective
        bearing: 0,       // No rotation
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

        const oldMarkers = document.getElementsByClassName('kiss-marker');
        while(oldMarkers[0]) {
            oldMarkers[0].parentNode.removeChild(oldMarkers[0]);
        }

        // Also remove cluster markers
        const oldClusters = document.getElementsByClassName('cluster-marker');
        while(oldClusters[0]) {
            oldClusters[0].parentNode.removeChild(oldClusters[0]);
        }

        const userStats = {};
        const entries = Object.entries(data);
        const totalKisses = entries.length;

        // Convert to GeoJSON for clustering
        const features = entries.map(([key, kiss], index) => {
            const name = (kiss.user || "unknown").toLowerCase().trim();
            userStats[name] = (userStats[name] || 0) + 1;

            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [kiss.lng, kiss.lat]
                },
                properties: {
                    id: key,
                    name: name,
                    date: kiss.date,
                    isFirst: index === 0
                }
            };
        });

        // Simple clustering algorithm
        const clusters = clusterMarkers(features, map);

        // Render clusters and individual markers
        clusters.forEach(cluster => {
            if (cluster.count > 1) {
                // Create cluster marker
                const el = document.createElement("div");
                el.className = "cluster-marker";
                el.innerHTML = `<div class="cluster-inner">${cluster.count}</div>`;
                
                new mapboxgl.Marker({ 
                    element: el,
                    anchor: 'center'
                })
                    .setLngLat(cluster.coordinates)
                    .addTo(map);
            } else {
                // Create individual marker
                const kiss = cluster.features[0].properties;
                const el = document.createElement("div");
                el.className = "kiss-marker";
                el.innerHTML = kiss.isFirst ? "👑" : "💋";

                const bitID = userAvatars[kiss.name];
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
                        <strong style="text-transform:capitalize; font-size:14px; color:#333;">${kiss.name}</strong>
                        <p style="margin:2px 0 0; font-size:10px; color:#888;">${kiss.date}</p>
                    </div>
                `);

                new mapboxgl.Marker({ 
                    element: el,
                    anchor: 'bottom'
                })
                    .setLngLat(cluster.coordinates)
                    .setPopup(popup)
                    .addTo(map);
            }
        });

        if (countEl) {
            countEl.innerText = totalKisses;
            countEl.parentElement.classList.add('bump');
            setTimeout(() => countEl.parentElement.classList.remove('bump'), 200);
        }

        if (callback) callback(userStats);
    });
}

// Simple clustering function
function clusterMarkers(features, map) {
    const zoom = map.getZoom();
    const clusterRadius = zoom < 10 ? 100 : (zoom < 15 ? 50 : 30); // pixels
    
    const clusters = [];
    const processed = new Set();

    features.forEach((feature, i) => {
        if (processed.has(i)) return;

        const point = map.project(feature.geometry.coordinates);
        const cluster = {
            coordinates: feature.geometry.coordinates,
            features: [feature],
            count: 1
        };

        // Find nearby markers
        features.forEach((otherFeature, j) => {
            if (i === j || processed.has(j)) return;

            const otherPoint = map.project(otherFeature.geometry.coordinates);
            const distance = Math.sqrt(
                Math.pow(point.x - otherPoint.x, 2) + 
                Math.pow(point.y - otherPoint.y, 2)
            );

            if (distance < clusterRadius) {
                cluster.features.push(otherFeature);
                cluster.count++;
                processed.add(j);
            }
        });

        processed.add(i);
        clusters.push(cluster);
    });

    return clusters;
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