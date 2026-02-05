// 1. IMPORT FIREBASE & CLUSTERING TOOLS
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import Supercluster from 'https://cdn.skypack.dev/supercluster';

// 2. YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "PASTE_YOUR_API_KEY_HERE",
    authDomain: "hungrycaterpillar-c9c97.firebaseapp.com",
    databaseURL: "https://hungrycaterpillar-c9c97-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "hungrycaterpillar-c9c97",
    storageBucket: "hungrycaterpillar-c9c97.appspot.com",
    messagingSenderId: "PASTE_SENDER_ID_HERE",
    appId: "PASTE_APP_ID_HERE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const kissesRef = ref(db, "kisses");

// 3. SETUP MAPBOX GL
mapboxgl.accessToken = "pk.eyJ1Ijoia2llcmFuMDEiLCJhIjoiY21sOW41Ynp1MDQ0czNlcXU0OWo4c3E5bSJ9.V6iXqT_iz25DEHZGqBNrZA";

const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12", 
    center: [0, 20], 
    zoom: 2,
    pitch: 45, 
    bearing: 0,
    antialias: true
});

// Cluster setup
const index = new Supercluster({ radius: 60, maxZoom: 16 });
let markers = {}; // To track active markers on screen
let kissData = []; // To store all kiss coordinates

map.on("load", () => {
    const layers = map.getStyle().layers;
    const labelLayerId = layers.find((layer) => layer.type === "symbol" && layer.layout["text-field"]).id;
    map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.6
        }
    }, labelLayerId);
});

// 4. THE COUNTER & CLUSTER LOGIC
let count = 0;
const counterDisplay = document.getElementById("kiss-count");

// Function to update markers based on zoom/pan
function updateMarkers() {
    const bounds = map.getBounds();
    const zoom = Math.floor(map.getZoom());
    const clusters = index.getClusters([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], zoom);

    // Remove markers that are no longer visible
    const newMarkers = {};
    clusters.forEach(f => {
        const id = f.id || `p${f.properties.kissId}`;
        if (markers[id]) {
            newMarkers[id] = markers[id];
            delete markers[id];
        } else {
            const el = document.createElement("div");
            if (f.properties.cluster) {
                // IT'S A CLUSTER
                el.className = "marker cluster-marker";
                el.innerHTML = `<span>${f.properties.point_count}</span>`;
                el.style.background = "#ff4d6d";
                el.style.color = "white";
                el.style.fontWeight = "bold";
                el.style.width = "40px";
                el.style.height = "40px";
                el.style.border = "2px solid white";
            } else {
                // IT'S A SINGLE KISS
                el.className = "marker";
                el.innerHTML = "❤️";
            }

            const m = new mapboxgl.Marker({ element: el })
                .setLngLat(f.geometry.coordinates)
                .addTo(map);
            
            if (!f.properties.cluster) {
                m.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`💋 Kissed here on ${f.properties.date}`));
            }
            newMarkers[id] = m;
        }
    });

    for (const id in markers) markers[id].remove();
    markers = newMarkers;
}

onChildAdded(kissesRef, (snapshot) => {
    const data = snapshot.val();
    count++;
    if (counterDisplay) counterDisplay.innerText = count;

    // Add to clustering index
    kissData.push({
        type: 'Feature',
        properties: { cluster: false, kissId: count, date: data.date },
        geometry: { type: 'Point', coordinates: [data.lng, data.lat] }
    });
    index.load(kissData);
    updateMarkers();
});

map.on('moveend', updateMarkers);

// 5. THE BUTTON LOGIC (Vibrate + Location)
document.getElementById("drop-marker").addEventListener("click", () => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);

    navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo({ center: [longitude, latitude], zoom: 17, pitch: 60, speed: 1.2, essential: true });
        const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        push(kissesRef, { lat: latitude, lng: longitude, date: today, timestamp: Date.now() });
    }, (err) => alert("Check permissions!"), { enableHighAccuracy: true });
});

// 6. SNAPCHAT HEADER ANIMATION
setTimeout(() => {
    const header = document.querySelector(".snap-header");
    if (header) {
        header.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 1, 1)";
        header.style.transform = "translateY(-250%)";
        setTimeout(() => { header.style.display = "none"; }, 600);
    }
}, 5000);

// 7. HAMBURGER MENU LOGIC
const menuBtn = document.getElementById('menu-btn');
const menuDropdown = document.getElementById('menu-dropdown');

if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', () => { menuDropdown.style.display = 'none'; });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('isLoggedIn');
        window.location.replace('index.html');
    });
    document.getElementById('stats-btn').addEventListener('click', () => alert(`📈 Total Kisses: ${count}`));
    document.getElementById('help-btn').addEventListener('click', () => alert("Hit the 💋 to save a memory!"));
    document.getElementById('about-btn').addEventListener('click', () => alert("Treat Tracker v2.0"));
}

// 8. SERVICE WORKER
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
}