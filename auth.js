import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAQWHFj2BSUyljt0Yzs2kraD2sqzuWl0r4",
    authDomain: "calorie-tracker-86995.firebaseapp.com",
    projectId: "calorie-tracker-86995",
    storageBucket: "calorie-tracker-86995.appspot.com",
    messagingSenderId: "90649163295",
    appId: "1:90649163295:web:d77755462ee0d542d6072a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function showSignOutButton() {
    const signOutButton = document.getElementById('signout-btn');
    const loginSignupButton = document.getElementById('login-signup');

    if (signOutButton && loginSignupButton) {
        loginSignupButton.style.display = 'none';
        signOutButton.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const backButton = document.getElementById('back-button');
    const showLoginLink = document.getElementById('show-login');
    const showSignupLink = document.getElementById('show-signup');

    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (showLoginLink && signupForm && loginForm) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }

    if (showSignupLink && loginForm && signupForm) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            createUserWithEmailAndPassword(auth, email, password)
                .then(() => {
                    alert('User signed up successfully!');
                    signupForm.reset();
                    showSignOutButton(); // Add this line
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    alert(`Error signing up: ${error.message}`);
                });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            signInWithEmailAndPassword(auth, email, password)
                .then(() => {
                    alert('User logged in successfully!');
                    loginForm.reset();
                    showSignOutButton();
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    alert(`Error logging in: ${error.message}`);
                });
        });
    }
});
