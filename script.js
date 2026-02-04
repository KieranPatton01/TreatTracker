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
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap'
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
    alert("I couldn't find your location! Please make sure your GPS is on and you've given the site permission.");
});