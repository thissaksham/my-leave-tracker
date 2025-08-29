import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const editLeaveForm = document.getElementById('edit-leave-form');
const formError = document.getElementById('form-error');
const saveLeaveBtn = document.getElementById('save-leave-btn');
const cycleSelect = document.getElementById('leave-reset-cycle');
const annualOptions = document.getElementById('annual-options');
const customOptions = document.getElementById('custom-options');
const accumulationCheckbox = document.getElementById('leave-accumulation');
const accumulationOptions = document.getElementById('accumulation-options');

let currentUserId = null;
let memberId = null;
let leaveId = null;

// --- Authentication Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        loadLeaveData(); // Load data once user is authenticated
    } else {
        window.location.href = 'login.html';
    }
});

// --- Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    memberId = params.get('memberId');
    leaveId = params.get('leaveId');
    const memberName = params.get('memberName');

    if (!memberId || !leaveId || !memberName) {
        window.location.href = 'index.html';
        return;
    }

    memberNameDisplay.textContent = memberName;
});

// --- Data Loading and Form Population ---
async function loadLeaveData() {
    if (!currentUserId || !memberId || !leaveId) return;

    try {
        const memberDocRef = doc(db, `users/${currentUserId}/members/${memberId}`);
        const memberDoc = await getDoc(memberDocRef);

        if (memberDoc.exists()) {
            const leaves = memberDoc.data().leaves || [];
            const leaveToEdit = leaves.find(l => l.id === leaveId);

            if (leaveToEdit) {
                populateForm(leaveToEdit);
            } else {
                console.error("Leave type not found");
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error("Error fetching leave data:", error);
        formError.innerText = "Could not load leave data.";
        formError.classList.remove('hidden');
    }
}

function populateForm(leave) {
    document.getElementById('leave-type').value = leave.type;
    document.getElementById('leave-total').value = leave.total;
    document.getElementById('leave-balance').value = leave.balance;
    cycleSelect.value = leave.resetCycle;

    // Toggle visibility based on loaded data
    annualOptions.classList.toggle('hidden', leave.resetCycle !== 'annually');
    customOptions.classList.toggle('hidden', leave.resetCycle !== 'custom');
    
    if (leave.resetCycle === 'annually') {
        document.getElementById('leave-reset-month').value = leave.resetMonth;
    } else if (leave.resetCycle === 'custom') {
        const checkboxes = customOptions.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = leave.creditMonths?.includes(cb.value);
        });
    }

    accumulationCheckbox.checked = leave.allowAccumulation;
    accumulationOptions.classList.toggle('hidden', !leave.allowAccumulation);

    if (leave.allowAccumulation) {
        document.getElementById('leave-max-accumulation').value = leave.maxAccumulation;
        document.getElementById('leave-accumulated-balance').value = leave.accumulatedBalance;
    }
}

// --- Form Interaction Logic ---
cycleSelect.addEventListener('change', () => {
    annualOptions.classList.toggle('hidden', cycleSelect.value !== 'annually');
    customOptions.classList.toggle('hidden', cycleSelect.value !== 'custom');
});

accumulationCheckbox.addEventListener('change', () => {
    accumulationOptions.classList.toggle('hidden', !accumulationCheckbox.checked);
});

// --- Form Submission Handler ---
editLeaveForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUserId || !memberId || !leaveId) {
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
        resetDetails.creditMonths = []; // Clear custom months
    } else { // custom
        const selectedMonths = Array.from(customOptions.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selectedMonths.length === 0) {
            formError.innerText = "Please select at least one credit month for the custom cycle.";
            formError.classList.remove('hidden');
            return;
        }
        resetDetails.creditMonths = selectedMonths;
        resetDetails.resetMonth = null; // Clear annual month
    }

    const updatedLeaveData = {
        id: leaveId, // Keep the original ID
        type: document.getElementById('leave-type').value.trim(),
        total: parseFloat(document.getElementById('leave-total').value),
        balance: parseFloat(document.getElementById('leave-balance').value),
        resetCycle: resetCycle,
        ...resetDetails,
        allowAccumulation: allowAccumulation,
        maxAccumulation: allowAccumulation ? parseFloat(document.getElementById('leave-max-accumulation').value) || 0 : 0,
        accumulatedBalance: allowAccumulation ? parseFloat(document.getElementById('leave-accumulated-balance').value) || 0 : 0,
    };
    
    if (!updatedLeaveData.type || isNaN(updatedLeaveData.total) || isNaN(updatedLeaveData.balance)) {
        formError.innerText = "Please fill in all required fields correctly.";
        formError.classList.remove('hidden');
        return;
    }
    
    formError.classList.add('hidden');
    saveLeaveBtn.disabled = true;
    saveLeaveBtn.innerText = 'Saving...';

    // --- Update Firestore using a Transaction ---
    try {
        const memberDocRef = doc(db, `users/${currentUserId}/members/${memberId}`);
        await runTransaction(db, async (transaction) => {
            const memberDoc = await transaction.get(memberDocRef);
            if (!memberDoc.exists()) {
                throw "Member document not found!";
            }

            const currentLeaves = memberDoc.data().leaves || [];
            const leaveIndex = currentLeaves.findIndex(l => l.id === leaveId);

            if (leaveIndex === -1) {
                throw "Leave type not found to update!";
            }
            
            // Preserve the original log
            const originalLog = currentLeaves[leaveIndex].log || [];
            updatedLeaveData.log = originalLog;

            // Replace the old leave object with the updated one
            currentLeaves[leaveIndex] = updatedLeaveData;
            
            transaction.update(memberDocRef, { leaves: currentLeaves });
        });

        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error updating leave type:", error);
        formError.innerText = "Failed to save changes. Please try again.";
        formError.classList.remove('hidden');
        saveLeaveBtn.disabled = false;
        saveLeaveBtn.innerText = 'Save Changes';
    }
});
