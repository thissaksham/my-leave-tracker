import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Firebase Configuration ---
// IMPORTANT: Replace this with your own Firebase project configuration!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- UI Element References ---
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authModalTitle = document.getElementById('auth-modal-title');

let isLoginMode = true;

// --- Event Listeners ---

// Toggle between Login and Register modes
authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authError.classList.add('hidden'); // Hide any previous errors
    authForm.reset(); // Clear the inputs

    if (isLoginMode) {
        authModalTitle.innerText = 'Login to your account';
        authSubmitBtn.innerText = 'Login';
        authToggleBtn.innerText = "Don't have an account? Register";
    } else {
        authModalTitle.innerText = 'Create a new account';
        authSubmitBtn.innerText = 'Register';
        authToggleBtn.innerText = 'Already have an account? Login';
    }
});

// Handle form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    
    authError.classList.add('hidden'); // Hide error on new submission

    try {
        if (isLoginMode) {
            // Sign in existing user
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            // Create new user
            await createUserWithEmailAndPassword(auth, email, password);
        }
        // onAuthStateChanged will handle the redirect
    } catch (error) {
        console.error("Authentication Error:", error.message);
        authError.innerText = getFriendlyAuthError(error.code);
        authError.classList.remove('hidden');
    }
});

// --- Auth State Observer ---
// This function checks if the user is already logged in or when they successfully log in.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // If user is logged in, redirect them to the main dashboard page.
        window.location.href = 'index.html';
    }
    // If no user, they stay on the login page.
});

// --- Helper Function ---
function getFriendlyAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters long.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}
