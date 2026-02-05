// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// 2. YOUR FIREBASE CONFIG (Kept exactly as you had it)
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY", 
    authDomain: "hungrycaterpillar-c9c97.firebaseapp.com",
    databaseURL: "https://hungrycaterpillar-c9c97-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "hungrycaterpillar-c9c97",
    storageBucket: "hungrycaterpillar-c9c97.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const kissesRef = ref(db, 'kisses');

// 3. SETUP MAPBOX GL (3D ENGINE)
mapboxgl.accessToken = 'pk.eyJ1Ijoia2llcmFuMDEiLCJhIjoiY21sOW41Ynp1MDQ0czNlcXU0OWo4c3E5bSJ9.V6iXqT_iz25DEHZGqBNrZA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12', // Required for 3D buildings
    center: [0, 20], // Mapbox uses [lng, lat]
    zoom: 2,
    pitch: 45, // Initial tilt
    bearing: 0,
    antialias: true
});

// Add 3D Building Layer
map.on('load', () => {
    const layers = map.getStyle().layers;
    const labelLayerId = layers.find(layer => layer.type === 'symbol' && layer.layout['text-field']).id;

    map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6
        }
    }, labelLayerId);
    
    // Register Service Worker for Android Web App
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
});

// 4. THE COUNTER & MARKER LOGIC
let count = 0;
const counterDisplay = document.getElementById('kiss-count');

onChildAdded(kissesRef, (snapshot) => {
    const data = snapshot.val();
    
    // Create an HTML element for the marker (Your 💋 face/icon)
    const el = document.createElement('div');
    el.className = 'marker';
    el.innerHTML = '❤️'; 
    el.style.fontSize = '30px';

    // Mapbox Marker (Note: [lng, lat] order!)
    const marker = new mapboxgl.Marker(el)
        .setLngLat([data.lng, data.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`💋 Kissed here on ${data.date}`))
        .addTo(map);

    count++;
    if(counterDisplay) counterDisplay.innerText = count;
});

// 5. THE BUTTON LOGIC: "WE KISSED HERE!"
document.getElementById('drop-marker').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        
        // Smooth "Snapchat" Flight to Location
        map.flyTo({
            center: [longitude, latitude],
            zoom: 17,
            pitch: 60, // Deep tilt for 3D view
            speed: 1.2,
            curve: 1.42,
            essential: true
        });

        const today = new Date().toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        const newKiss = {
            lat: latitude,
            lng: longitude,
            date: today,
            timestamp: Date.now()
        };
        
        push(kissesRef, newKiss);

    }, (err) => {
        alert("Give location permissions to your browser my little sea monkey");
    }, {
        enableHighAccuracy: true
    });
});

// 6. SNAPCHAT HEADER ANIMATION
setTimeout(() => {
    const header = document.querySelector('.snap-header');
    if (header) {
        header.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 1, 1)";
        header.style.transform = "translateY(-250%)";
        setTimeout(() => { header.style.display = "none"; }, 600);
    }
}, 5000);

// 7. WEB APP COMPAT
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered!'))
      .catch(err => console.log('Service Worker failed:', err));
  });
}