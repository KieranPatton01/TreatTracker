import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { firebaseConfig, mapboxToken } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const kissesRef = ref(db, "kisses");

export function initMap() {
    mapboxgl.accessToken = mapboxToken;
    return new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v12", 
        center: [-3.1883, 55.9533],
        zoom: 12,
        pitch: 45
    });
}

export function listenForKisses(map) {
    onChildAdded(kissesRef, (snapshot) => {
        const data = snapshot.val();
        const el = document.createElement("div");
        el.className = "marker";
        el.innerHTML = "💋";
        
        new mapboxgl.Marker({ element: el })
            .setLngLat([data.lng, data.lat])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`💋 Kiss by ${data.user}<br>${data.date}`))
            .addTo(map);
            
        const countEl = document.getElementById("kiss-count");
        if(countEl) countEl.innerText = parseInt(countEl.innerText) + 1;
    });
}

export function dropKiss(map, user) {
    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo({ center: [longitude, latitude], zoom: 17 });
        const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        push(kissesRef, { 
            lat: latitude, 
            lng: longitude, 
            date: today, 
            user: user, 
            timestamp: Date.now() 
        });
    });
}