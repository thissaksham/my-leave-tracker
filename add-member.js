import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
// IMPORTANT: This must match the config in your other JS files.
const firebaseConfig = {
  apiKey: "AIzaSyDS_0l3bm0rD9jJQflPKSuOgozW7BER5po",
  authDomain: "my-leave-tracker-36667.firebaseapp.com",
  projectId: "my-leave-tracker-36667",
  storageBucket: "my-leave-tracker-36667.firebasestorage.app",
  messagingSenderId: "636636683959",
  appId: "1:636636683959:web:730b205d836b03a6c83732",
  measurementId: "G-M688YR5B4H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UI Element References ---
const addMemberForm = document.getElementById('add-member-form');
const memberNameInput = document.getElementById('member-name');
const formError = document.getElementById('form-error');
const saveMemberBtn = document.getElementById('save-member-btn');

let currentUserId = null;

// --- Authentication Observer ---
// Protect this page: if no user is logged in, redirect to the login page.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, store their ID
        currentUserId = user.uid;
    } else {
        // No user is signed in, redirect
        window.location.href = 'login.html';
    }
});

// --- Form Submission Handler ---
addMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUserId) {
        formError.innerText = "You must be logged in to add a member.";
        formError.classList.remove('hidden');
        return;
    }

    const memberName = memberNameInput.value.trim();

    if (!memberName) {
        formError.innerText = "Please enter a name.";
        formError.classList.remove('hidden');
        return;
    }

    // Disable button to prevent multiple submissions
    saveMemberBtn.disabled = true;
    saveMemberBtn.innerText = 'Saving...';

    try {
        // Get a reference to the 'members' subcollection for the current user
        const membersColRef = collection(db, `users/${currentUserId}/members`);

        // Add a new document with the member's name and an empty leaves array
        await addDoc(membersColRef, {
            name: memberName,
            leaves: [] // Initialize with an empty array for future leave types
        });

        // Success! Redirect back to the main dashboard
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error adding member:", error);
        formError.innerText = "Failed to save member. Please try again.";
        formError.classList.remove('hidden');
        // Re-enable the button if an error occurs
        saveMemberBtn.disabled = false;
        saveMemberBtn.innerText = 'Save Member';
    }
});
