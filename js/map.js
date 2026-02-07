import { logout } from './auth.js';
import { initMap, listenForKisses, dropKiss } from './database.js';

const map = initMap();
const user = localStorage.getItem('currentUsername') || "guest";

const userAvatars = {
    "kieran": "10226724-246135883_7-s5-v1",
    "libby": "37237988-100513394046_2416-s5-v1",
    "isla": "37237988-139859680_123-s5-v1"
};

const overlay = document.getElementById('modal-overlay');
const statsModal = document.getElementById('stats-modal');
const helpModal = document.getElementById('help-modal');
const mBtn = document.getElementById('menu-btn');
const mDrop = document.getElementById('menu-dropdown');
const banner = document.getElementById("login-banner");

if (userAvatars[user.toLowerCase()]) {
    const picContainer = document.getElementById('user-bitmoji-small');
    if (picContainer) {
        picContainer.innerHTML = `<img src="https://cf-st.sc-cdn.net/3d/render/${userAvatars[user.toLowerCase()]}.webp?trim=circle&scale=0&ua=2" style="width:100%; border-radius:50%;">`;
    }
}
const welcomeText = document.getElementById('welcome-text');
if (welcomeText) welcomeText.innerText = `${user.toUpperCase()} IS TYPING...`;

listenForKisses(map, (stats) => {
    const content = document.getElementById('stats-content');
    if (content) {
        content.innerHTML = '';
        Object.entries(stats).sort((a,b) => b[1] - a[1]).forEach(([name, count]) => {
            const bID = userAvatars[name.toLowerCase()];
            const imgTag = bID ? `<img src="https://cf-st.sc-cdn.net/3d/render/${bID}.webp?trim=circle&scale=0&ua=2" style="width:40px; height:40px; border-radius:50%;">` : `👤`;
            content.innerHTML += `<div style="display:flex; align-items:center; margin:10px 0; background:#f9f9f9; padding:10px; border-radius:15px;">${imgTag}<span style="flex:1; text-align:left; margin-left:15px; font-weight:bold; text-transform:capitalize;">${name}</span><strong>${count}</strong></div>`;
        });
    }
});

document.getElementById("drop-marker").onclick = () => {
    dropKiss(map, user);
    if (window.confetti) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.8 }, colors: ['#ff4d6d', '#ffffff', '#ffb6c1'] });
    }
};

// NEW: Current Location Button
document.getElementById('locate-btn').onclick = () => {
    const btn = document.getElementById('locate-btn');
    
    // Add loading state
    btn.style.transform = 'scale(0.9)';
    btn.innerText = '⌛';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Fly to user's location with smooth animation
                map.flyTo({
                    center: [longitude, latitude],
                    zoom: 15,
                    pitch: 45,
                    bearing: 0,
                    speed: 1.2,
                    curve: 1.5,
                    essential: true
                });
                
                // Reset button
                setTimeout(() => {
                    btn.innerText = '📍';
                    btn.style.transform = 'scale(1)';
                }, 500);
            },
            (error) => {
                // Error handling
                console.error('Location error:', error);
                btn.innerText = '❌';
                
                // Show brief error message
                alert('Could not get your location. Please enable location services.');
                
                setTimeout(() => {
                    btn.innerText = '📍';
                    btn.style.transform = 'scale(1)';
                }, 1500);
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
        btn.innerText = '📍';
        btn.style.transform = 'scale(1)';
    }
};

document.getElementById('logout-btn').onclick = (e) => {
    e.preventDefault();
    logout();
};

if (mBtn) {
    mBtn.onclick = (e) => { 
        e.stopPropagation(); 
        mDrop.style.display = mDrop.style.display === 'block' ? 'none' : 'block';
    };
}

document.getElementById('view-stats').onclick = (e) => { 
    e.preventDefault();
    statsModal.style.display = 'block'; 
    overlay.style.display = 'block'; 
    mDrop.style.display = 'none'; 
};

document.getElementById('view-help').onclick = (e) => { 
    e.preventDefault();
    helpModal.style.display = 'block'; 
    overlay.style.display = 'block'; 
    mDrop.style.display = 'none'; 
};

document.querySelectorAll('.close-btn').forEach(btn => {
    btn.onclick = () => { 
        statsModal.style.display = 'none'; 
        helpModal.style.display = 'none'; 
        overlay.style.display = 'none'; 
    };
});

document.addEventListener('click', (e) => {
    if (mBtn && !mBtn.contains(e.target) && mDrop && !mDrop.contains(e.target)) {
        mDrop.style.display = 'none';
    }
});

setTimeout(() => { if (banner) banner.classList.add("hidden"); }, 7000);