import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initMembers, renderMembers, allMembersData } from "./members.js";
import { initLeaves } from "./leaves.js";

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

// --- Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global State ---
let membersUnsubscribe = null;

// --- UI Element References ---
const mainContent = document.getElementById('main-content');
const authControls = document.getElementById('auth-controls');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const membersGrid = document.getElementById('members-grid');

// --- Authentication ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        mainContent.classList.remove('hidden');
        authControls.innerHTML = `<span class="text-sm text-gray-600">${user.email}</span><button id="sign-out-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Sign Out</button>`;
        document.getElementById('sign-out-btn').addEventListener('click', () => signOut(auth));
        
        // Initialize modules with Firebase instances and user ID
        initMembers(db, user.uid);
        initLeaves(db, user.uid);

        // Start listening for data
        setupRealtimeListener(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// --- Realtime Data Listener ---
function setupRealtimeListener(userId) {
    if (membersUnsubscribe) membersUnsubscribe();
    const membersColRef = collection(db, `users/${userId}/members`);

    loadingState.classList.remove('hidden');

    membersUnsubscribe = onSnapshot(membersColRef, (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Update the shared members array in the members module
        allMembersData.splice(0, allMembersData.length, ...members); 

        // Call the render function from the members module
        renderMembers(allMembersData);
        
        loadingState.classList.add('hidden');
        emptyState.classList.toggle('hidden', allMembersData.length > 0);
        membersGrid.classList.toggle('hidden', allMembersData.length === 0);

    }, (error) => {
        console.error("Error fetching members: ", error);
        loadingState.innerText = "Error loading data.";
    });
}

