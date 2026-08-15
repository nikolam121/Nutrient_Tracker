import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { firebaseConfig } from './config.js';

const ERROR_TEXT = {
    'auth/email-already-in-use': 'That email is already registered. Try logging in instead.',
    'auth/invalid-email': 'That email address does not look valid.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Network problem. Check your connection and try again.'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const showLoginLink = document.getElementById('show-login');
const showSignupLink = document.getElementById('show-signup');
const authMessage = document.getElementById('auth-message');

function showMessage(text, isError = false) {
    authMessage.textContent = text;
    authMessage.classList.toggle('message--error', isError);
    authMessage.hidden = !text;
}

function swapForms(showLogin) {
    signupForm.hidden = showLogin;
    loginForm.hidden = !showLogin;
    showMessage('');
}

async function submitAuth(form, action, pendingText) {
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    const email = form.querySelector('input[type="email"]').value.trim();
    const password = form.querySelector('input[type="password"]').value;

    button.disabled = true;
    button.textContent = pendingText;
    showMessage('');

    try {
        await action(auth, email, password);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Auth error:', error);
        showMessage(ERROR_TEXT[error.code] ?? 'Something went wrong. Please try again.', true);
        button.disabled = false;
        button.textContent = originalText;
    }
}

showLoginLink.addEventListener('click', event => {
    event.preventDefault();
    swapForms(true);
});

showSignupLink.addEventListener('click', event => {
    event.preventDefault();
    swapForms(false);
});

signupForm.addEventListener('submit', event => {
    event.preventDefault();
    submitAuth(signupForm, createUserWithEmailAndPassword, 'Creating account...');
});

loginForm.addEventListener('submit', event => {
    event.preventDefault();
    submitAuth(loginForm, signInWithEmailAndPassword, 'Logging in...');
});
