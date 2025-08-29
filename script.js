import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
// IMPORTANT: Replace this with your own Firebase project configuration!
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
const membersGrid = document.getElementById('members-grid');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const authControls = document.getElementById('auth-controls');
const mainContent = document.getElementById('main-content');

let membersUnsubscribe = null; // To stop listening for data changes when signed out

// --- Authentication Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, show the main content and fetch data
        mainContent.classList.remove('hidden');
        loadingState.classList.remove('hidden');

        // Update UI with user info and sign out button
        authControls.innerHTML = `
            <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-600">${user.email}</span>
                <button id="sign-out-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Sign Out</button>
            </div>
        `;
        document.getElementById('sign-out-btn').addEventListener('click', signOutUser);

        // Start listening for this user's data
        setupRealtimeListener(user.uid);
    } else {
        // User is signed out, redirect to login page
        window.location.href = 'login.html';
    }
});

// --- Sign Out Function ---
async function signOutUser() {
    try {
        await signOut(auth);
        // The onAuthStateChanged observer will handle the redirect
    } catch (error) {
        console.error("Sign out failed: ", error);
    }
}

// --- Realtime Data Listener ---
function setupRealtimeListener(userId) {
    if (membersUnsubscribe) membersUnsubscribe(); // Unsubscribe from any previous listener

    // Path to the members collection for the specific user
    const membersColRef = collection(db, `users/${userId}/members`);

    membersUnsubscribe = onSnapshot(membersColRef, (snapshot) => {
        loadingState.classList.add('hidden');
        const allMembersData = [];
        snapshot.forEach(doc => {
            allMembersData.push({ id: doc.id, ...doc.data() });
        });

        renderMembers(allMembersData);

        if (allMembersData.length === 0) {
            emptyState.classList.remove('hidden');
            membersGrid.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            membersGrid.classList.remove('hidden');
        }
    }, (error) => {
        console.error("Error fetching members: ", error);
        loadingState.innerText = "Error loading data.";
    });
}

// --- Rendering Functions ---
function renderMembers(members) {
    membersGrid.innerHTML = ''; // Clear existing cards
    members.forEach(member => {
        const cardHTML = createMemberCardHTML(member);
        membersGrid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function createMemberCardHTML(member) {
    // Note: For now, we only link to add a member. Edit/add leave type will be added later.
    const leavesHTML = (member.leaves || []).map(renderLeaveType).join('');

    return `
        <div class="bg-white p-5 rounded-lg shadow-md">
            <div class="flex justify-between items-start">
                <div class="flex items-center space-x-2">
                    <h3 class="text-lg font-bold text-gray-900">${member.name}</h3>
                    <!-- Edit link will go here later -->
                    <button class="delete-member-btn text-gray-400 hover:text-red-500" data-id="${member.id}" data-name="${member.name}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3A1.5 1.5 0 0 1 13 3.5V5H7V3.5zM5 6V5h10v1H5zm-1 1a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1H4z" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="mt-4 space-y-3">
                ${leavesHTML}
            </div>
            <div class="mt-4">
                <!-- Add leave type will be a link to a new page -->
                <a href="#" class="add-leave-btn w-full block text-center bg-blue-50 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition" data-member-id="${member.id}">+ Add Leave Type</a>
            </div>
        </div>
    `;
}

function renderLeaveType(leave) {
    const percentage = leave.total > 0 ? (leave.balance / leave.total) * 100 : 0;
    let bgColor = 'bg-green-500';
    if (percentage < 50) bgColor = 'bg-yellow-500';
    if (percentage < 25) bgColor = 'bg-red-500';

    // Simplified for now, will add edit/delete later
    return `
        <div class="leave-item border border-gray-200 p-3 rounded-lg">
            <div class="flex justify-between items-center text-sm mb-2">
                <span class="font-semibold">${leave.type}</span>
                <div class="flex items-baseline space-x-1">
                    <span class="font-bold text-lg">${leave.balance}</span>
                    <span class="text-gray-500 text-sm">/ ${leave.total} left</span>
                </div>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="${bgColor} h-2.5 rounded-full" style="width: ${percentage}%"></div>
            </div>
        </div>
    `;
}


// --- Event Delegation for Delete ---
// NOTE: This assumes you will add a confirmation modal to index.html later.
// For now, it will use the basic browser confirm() dialog.
document.body.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-member-btn');
    if (deleteBtn) {
        const memberId = deleteBtn.dataset.id;
        const memberName = deleteBtn.dataset.name;
        
        if (confirm(`Are you sure you want to delete ${memberName}? This action cannot be undone.`)) {
            try {
                const userId = auth.currentUser.uid;
                const memberDocRef = doc(db, `users/${userId}/members/${memberId}`);
                await deleteDoc(memberDocRef);
                // Real-time listener will automatically update the UI
            } catch (error) {
                console.error("Error deleting member:", error);
                alert("Failed to delete member. Please try again.");
            }
        }
    }
});

