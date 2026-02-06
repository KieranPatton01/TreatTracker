import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export function checkAccess() {
    // If the 'isLoggedIn' flag isn't in the browser storage, kick them to login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.replace("index.html");
    }
}

export function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUsername");
    window.location.replace("index.html");
}

export async function handleLogin() {
    const nameInput = document.getElementById('nameInput');
    const passInput = document.getElementById('passInput');
    
    const name = nameInput.value.toLowerCase().trim();
    const password = passInput.value; // This will now accept your 123456
    const ghostEmail = `${name}@placeholder.com`;

    try {
        await signInWithEmailAndPassword(auth, ghostEmail, password);
        
        // Success! Save the session
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUsername', name);
        
        // Go to the map
        window.location.href = "richard.html";
    } catch (error) {
        console.error("Login Error:", error.code);
        if (error.code === 'auth/invalid-credential') {
            alert("Incorrect name or password. Remember: Password is 123456");
        } else {
            alert("Error: " + error.message);
        }
    }
}