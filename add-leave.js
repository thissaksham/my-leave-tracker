import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const memberNameDisplay = document.querySelector('#member-name-display span');
const addLeaveForm = document.getElementById('add-leave-form');
const formError = document.getElementById('form-error');
const saveLeaveBtn = document.getElementById('save-leave-btn');
const cycleSelect = document.getElementById('leave-reset-cycle');
const annualOptions = document.getElementById('annual-options');
const customOptions = document.getElementById('custom-options');
const accumulationCheckbox = document.getElementById('leave-accumulation');
const accumulationOptions = document.getElementById('accumulation-options');

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

    // Display the member's name on the page
    memberNameDisplay.textContent = memberName;
});

// --- Authentication Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
    } else {
        window.location.href = 'login.html';
    }
});

// --- Form Interaction Logic ---
cycleSelect.addEventListener('change', () => {
    annualOptions.classList.toggle('hidden', cycleSelect.value !== 'annually');
    customOptions.classList.toggle('hidden', cycleSelect.value !== 'custom');
});

accumulationCheckbox.addEventListener('change', () => {
    accumulationOptions.classList.toggle('hidden', !accumulationCheckbox.checked);
});

// --- Form Submission Handler ---
addLeaveForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUserId || !memberId) {
        formError.innerText = "Error: User or member information is missing.";
        formError.classList.remove('hidden');
        return;
    }

    // --- Collect Form Data ---
    const resetCycle = cycleSelect.value;
    const allowAccumulation = accumulationCheckbox.checked;
    
    let resetDetails = {};
    if (resetCycle === 'annually') {
        resetDetails.resetMonth = document.getElementById('leave-reset-month').value;
    } else { // custom
        const selectedMonths = Array.from(customOptions.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selectedMonths.length === 0) {
            formError.innerText = "Please select at least one credit month for the custom cycle.";
            formError.classList.remove('hidden');
            return;
        }
        resetDetails.creditMonths = selectedMonths;
    }

    const leaveData = {
        id: Date.now().toString(), // Unique ID for the leave type
        type: document.getElementById('leave-type').value.trim(),
        total: parseFloat(document.getElementById('leave-total').value),
        balance: parseFloat(document.getElementById('leave-balance').value),
        resetCycle: resetCycle,
        ...resetDetails, // Add either resetMonth or creditMonths
        allowAccumulation: allowAccumulation,
        maxAccumulation: allowAccumulation ? parseFloat(document.getElementById('leave-max-accumulation').value) || 0 : 0,
        accumulatedBalance: allowAccumulation ? parseFloat(document.getElementById('leave-accumulated-balance').value) || 0 : 0,
        log: [] // Initialize with an empty log
    };
    
    // --- Validation ---
    if (!leaveData.type || isNaN(leaveData.total) || isNaN(leaveData.balance)) {
        formError.innerText = "Please fill in all required fields.";
        formError.classList.remove('hidden');
        return;
    }
    
    formError.classList.add('hidden');
    saveLeaveBtn.disabled = true;
    saveLeaveBtn.innerText = 'Saving...';

    // --- Save to Firestore ---
    try {
        const memberDocRef = doc(db, `users/${currentUserId}/members/${memberId}`);
        await updateDoc(memberDocRef, {
            leaves: arrayUnion(leaveData)
        });

        // Success, go back to the dashboard
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error adding leave type:", error);
        formError.innerText = "Failed to save leave type. Please try again.";
        formError.classList.remove('hidden');
        saveLeaveBtn.disabled = false;
        saveLeaveBtn.innerText = 'Save Leave Type';
    }
});
