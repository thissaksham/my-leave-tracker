import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
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
const editMemberForm = document.getElementById('edit-member-form');
const memberNameInput = document.getElementById('member-name');
const formError = document.getElementById('form-error');
const saveMemberBtn = document.getElementById('save-member-btn');

let currentUserId = null;
let memberId = null;

// --- Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Get member ID and name from URL parameters
    const params = new URLSearchParams(window.location.search);
    memberId = params.get('memberId');
    const memberName = params.get('memberName');

    if (!memberId || !memberName) {
        // If parameters are missing, redirect to dashboard
        window.location.href = 'index.html';
        return;
    }

    // Pre-fill the input with the current member name
    memberNameInput.value = memberName;
});

// --- Authentication Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
    } else {
        // If user is not logged in, redirect to the login page
        window.location.href = 'login.html';
    }
});

// --- Form Submission Handler ---
editMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newMemberName = memberNameInput.value.trim();

    if (!newMemberName) {
        formError.innerText = "Member name cannot be empty.";
        formError.classList.remove('hidden');
        return;
    }
    
    if (!currentUserId || !memberId) {
        formError.innerText = "Error: User or member information is missing.";
        formError.classList.remove('hidden');
        return;
    }

    formError.classList.add('hidden');
    saveMemberBtn.disabled = true;
    saveMemberBtn.innerText = 'Saving...';

    // --- Update Firestore ---
    try {
        const memberDocRef = doc(db, `users/${currentUserId}/members/${memberId}`);
        await updateDoc(memberDocRef, {
            name: newMemberName
        });

        // Success, go back to the dashboard
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error updating member:", error);
        formError.innerText = "Failed to save changes. Please try again.";
        formError.classList.remove('hidden');
        saveMemberBtn.disabled = false;
        saveMemberBtn.innerText = 'Save Changes';
    }
});
