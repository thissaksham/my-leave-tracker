import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const membersGrid = document.getElementById('members-grid');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const authControls = document.getElementById('auth-controls');
const mainContent = document.getElementById('main-content');

let membersUnsubscribe = null;

// --- Authentication Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        mainContent.classList.remove('hidden');
        loadingState.classList.remove('hidden');

        authControls.innerHTML = `
            <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-600">${user.email}</span>
                <button id="sign-out-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Sign Out</button>
            </div>
        `;
        document.getElementById('sign-out-btn').addEventListener('click', signOutUser);

        setupRealtimeListener(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// --- Sign Out Function ---
async function signOutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign out failed: ", error);
    }
}

// --- Realtime Data Listener ---
function setupRealtimeListener(userId) {
    if (membersUnsubscribe) membersUnsubscribe();

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
    membersGrid.innerHTML = '';
    members.forEach(member => {
        const cardHTML = createMemberCardHTML(member);
        membersGrid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function createMemberCardHTML(member) {
    // Pass the entire member object to renderLeaveType
    const leavesHTML = (member.leaves || []).map(leave => renderLeaveType(leave, member.id, member.name)).join('');
    
    const encodedMemberName = encodeURIComponent(member.name);

    return `
        <div class="bg-white p-5 rounded-lg shadow-md">
            <div class="flex justify-between items-start">
                <div class="flex items-center space-x-2">
                    <h3 class="text-lg font-bold text-gray-900">${member.name}</h3>
                    <a href="edit-member.html?memberId=${member.id}&memberName=${encodedMemberName}" class="edit-member-btn text-gray-400 hover:text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                    </a>
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
                <a href="add-leave.html?memberId=${member.id}&memberName=${encodedMemberName}" class="add-leave-btn w-full block text-center bg-blue-50 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition">
                    + Add Leave Type
                </a>
            </div>
        </div>
    `;
}

function renderLeaveType(leave, memberId, memberName) {
    const percentage = leave.total > 0 ? (leave.balance / leave.total) * 100 : 0;
    let bgColor = 'bg-green-500';
    if (percentage < 50) bgColor = 'bg-yellow-500';
    if (percentage < 25) bgColor = 'bg-red-500';

    const encodedMemberName = encodeURIComponent(memberName);

    return `
        <div class="leave-item border border-gray-200 p-3 rounded-lg">
            <div class="flex justify-between items-center text-sm mb-2">
                <div class="flex items-center space-x-2">
                    <span class="font-semibold">${leave.type}</span>
                    <a href="edit-leave.html?memberId=${memberId}&leaveId=${leave.id}&memberName=${encodedMemberName}" class="edit-leave-btn text-gray-400 hover:text-blue-500">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </a>
                </div>
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
            } catch (error) {
                console.error("Error deleting member:", error);
                alert("Failed to delete member. Please try again.");
            }
        }
    }
});

