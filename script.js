// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// 2. YOUR FIREBASE CONFIG
// Get these values from: Firebase Console > Project Settings > General > Your Apps
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY", 
  authDomain: "hungrycaterpillar-c9c97.firebaseapp.com",
  databaseURL: "https://hungrycaterpillar-c9c97-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "hungrycaterpillar-c9c97",
  storageBucket: "hungrycaterpillar-c9c97.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const kissesRef = ref(db, 'kisses');

// 3. SETUP THE MAP (LEAFLET)
// We start zoomed out on the world; it zooms in once a location is found.
const map = L.map('map', {
    zoomControl: false // Cleaner for mobile
}).setView([20, 0], 2); 

// This adds a beautiful, clean map style (CartoDB Positron)
//L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    //attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    //maxZoom: 19
//}).addTo(map);

//L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    //ttribution: '©OpenStreetMap',
    //subdomains: 'abcd',
    //maxZoom: 20
//}).addTo(map);

// Replace 'YOUR_MAPBOX_ACCESS_TOKEN' with the key from your dashboard
const mapboxToken = 'pk.eyJ1Ijoia2llcmFuMDEiLCJhIjoiY21sOGhqemV0MDZ6dDNlc2R5cjJrcTJkeiJ9.F5vZa-aLQr1rcncdRPoVHA';

L.tileLayer(`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
    tileSize: 512,
    zoomOffset: -1,
    id: 'mapbox/outdoors-v12', // Options: 'mapbox/streets-v12', 'mapbox/outdoors-v12', or 'mapbox/satellite-streets-v12'
    maxZoom: 30
}).addTo(map);

// Define the Heart Icon
const heartIcon = L.divIcon({
    html: '❤️',
    className: 'heart-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// 4. THE COUNTER LOGIC
let count = 0;
const counterDisplay = document.getElementById('kiss-count');

// 5. LIVE SYNC: This draws existing kisses and any new ones added in real-time
onChildAdded(kissesRef, (snapshot) => {
    const data = snapshot.val();
    
    // Add the heart to the map
    const marker = L.marker([data.lat, data.lng], { icon: heartIcon }).addTo(map);
    
    // Add a popup that shows the date when she taps the heart
    marker.bindPopup(`💋 Kissed here on ${data.date}`);

    // Update the counter
    count++;
    if(counterDisplay) counterDisplay.innerText = count;
});

// 6. THE BUTTON LOGIC: "WE KISSED HERE!"
document.getElementById('drop-marker').addEventListener('click', () => {
    // This triggers the phone's GPS prompt
    map.locate({setView: true, maxZoom: 16});
});

// When the phone successfully finds her location
map.on('locationfound', (e) => {
    const today = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const newKiss = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        date: today,
        timestamp: Date.now()
    };
    
    // This saves it to Firebase. Because of onChildAdded above, 
    // the heart will appear on the map automatically as soon as this finishes.
    push(kissesRef, newKiss);
});

// If GPS fails (e.g., she hits "Deny")
map.on('locationerror', (e) => {
    alert("Give location permissions to your browser my little sea monkey");
});

// Function to make the notification swipe away after 5 seconds
setTimeout(() => {
    const header = document.querySelector('.snap-header');
    if (header) {
        // We set the transition first
        header.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 1, 1)";
        // Then we move it
        header.style.transform = "translateY(-250%)";
        
        // Optional: Remove it from the "physical" page after it slides out 
        // so it doesn't block clicks later
        setTimeout(() => {
            header.style.display = "none";
        }, 600); 
    }
}, 5000);