import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initMembers, renderMembers } from "./members.js";
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
        authControls.innerHTML = `<div class="flex items-center space-x-4">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span class="text-white font-bold text-sm">${user.email.charAt(0).toUpperCase()}</span>
                    </div>
                    <span class="text-sm text-gray-700 font-medium">${user.email}</span>
                </div>
                <button id="sign-out-btn" class="btn-secondary bg-white text-gray-700 font-semibold py-2 px-4 rounded-xl hover:bg-gray-50 border border-gray-200 transition duration-200">Sign Out</button>
            </div>`;
        document.getElementById('sign-out-btn').addEventListener('click', () => signOut(auth));
        
        initMembers(db, user.uid);
        initLeaves(db, user.uid);

        setupRealtimeListener(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// --- Realtime Data Listener ---
function setupRealtimeListener(userId) {
    if (membersUnsubscribe) membersUnsubscribe();
    
    const membersColRef = collection(db, `users/${userId}/members`);
    const q = query(membersColRef, orderBy("createdAt"));

    loadingState.classList.remove('hidden');

    membersUnsubscribe = onSnapshot(q, (snapshot) => {
        let members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fallback sort for older members without a timestamp
        members.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return aTime - bTime;
        });

        renderMembers(members); 
        
        loadingState.classList.add('hidden');
        const hasMembers = members.length > 0;
        emptyState.classList.toggle('hidden', hasMembers);
        membersGrid.classList.toggle('hidden', !hasMembers);

    }, (error) => {
        console.error("Error fetching members: ", error);
        loadingState.innerText = "Error loading data.";
    });
}

