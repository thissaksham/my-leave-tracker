import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, arrayUnion, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
// IMPORTANT: To deploy this on your own, you must replace this with your own Firebase project configuration!
// 1. Go to https://firebase.google.com/ and create a new project.
// 2. In your project, create a new Web App.
// 3. Copy the firebaseConfig object you are given and paste it here.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDS_0l3bm0rD9jJQflPKSuOgozW7BER5po",
  authDomain: "my-leave-tracker-36667.firebaseapp.com",
  projectId: "my-leave-tracker-36667",
  storageBucket: "my-leave-tracker-36667.firebasestorage.app",
  messagingSenderId: "636636683959",
  appId: "1:636636683959:web:730b205d836b03a6c83732",
  measurementId: "G-M688YR5B4H"
};

// A static ID for your app's data collection in Firestore.
const appId = 'leave-tracker-app'; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserId = null;
let membersUnsubscribe = null;

// --- UI Element References ---
const membersGrid = document.getElementById('members-grid');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const memberModal = document.getElementById('member-modal');
const leaveModal = document.getElementById('leave-modal');
const logLeaveModal = document.getElementById('log-leave-modal');
const deleteModal = document.getElementById('delete-modal');

// --- Authentication ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        setupRealtimeListener();
    } else {
        try {
            // Sign in anonymously for a simple, single-user (per-browser) experience.
            await signInAnonymously(auth);
        } catch(error) {
            console.error("Authentication failed: ", error);
            alert("Could not connect to the service. Please check your Firebase configuration and security rules.");
        }
    }
});

// --- Realtime Data Listener ---
function setupRealtimeListener() {
    if (membersUnsubscribe) membersUnsubscribe(); 
    
    const membersColRef = collection(db, `artifacts/${appId}/users/${currentUserId}/members`);
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

// --- Rendering ---
function renderMembers(members) {
    membersGrid.innerHTML = '';
    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-lg shadow-md';
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center space-x-2">
                    <h3 class="text-lg font-bold text-gray-900">${member.name}</h3>
                     <button class="edit-member-btn text-gray-400 hover:text-blue-500" data-id="${member.id}" data-name="${member.name}">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                   </button>
                    <button class="delete-member-btn text-gray-400 hover:text-red-500" data-id="${member.id}" data-name="${member.name}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3A1.5 1.5 0 0 1 13 3.5V5H7V3.5zM5 6V5h10v1H5zm-1 1a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1H4z" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="mt-4 space-y-3">
                ${(member.leaves || []).map(leave => renderLeaveType(member.id, leave)).join('')}
            </div>
            <div class="mt-4">
                <button class="add-leave-btn w-full bg-blue-50 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition" data-member-id="${member.id}">+ Add Leave Type</button>
            </div>
        `;
        membersGrid.appendChild(card);
    });
}

function renderLeaveType(memberId, leave) {
    const percentage = leave.total > 0 ? (leave.balance / leave.total) * 100 : 0;
    let bgColor = 'bg-green-500';
    if (percentage < 50) bgColor = 'bg-yellow-500';
    if (percentage < 25) bgColor = 'bg-red-500';

    let accumulationHTML = '';
    if (leave.allowAccumulation && leave.maxAccumulation > 0) {
        const accumulatedBalance = leave.accumulatedBalance || 0;
        const maxAccumulation = leave.maxAccumulation;
        const accumulatedPercentage = maxAccumulation > 0 ? (accumulatedBalance / maxAccumulation) * 100 : 0;
        
        accumulationHTML = `
            <div>
                <div class="flex justify-between items-center text-xs mb-1 mt-3">
                    <span class="font-semibold text-gray-600">Accumulated Balance</span>
                    <div>
                        <span class="font-bold">${accumulatedBalance}</span>
                        <span class="text-gray-500">/ ${maxAccumulation}</span>
                    </div>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${accumulatedPercentage}%"></div>
                </div>
            </div>
        `;
    }

    return `
        <div class="leave-item border border-gray-200 p-3 rounded-lg">
            <div class="space-y-2">
                <div>
                    <div class="flex justify-between items-center text-sm mb-2">
                        <div class="flex items-center space-x-2">
                            <span class="font-semibold">${leave.type}</span>
                            <button class="edit-leave-btn text-gray-400 hover:text-blue-500" data-member-id="${memberId}" data-leave-data='${JSON.stringify(leave)}'>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                            </button>
                            <button class="delete-leave-btn text-gray-400 hover:text-red-500" data-member-id="${memberId}" data-leave-id="${leave.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
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
                ${accumulationHTML}
            </div>
            <div class="mt-3 flex justify-end">
               <button class="log-leave-btn text-xs bg-gray-600 text-white font-semibold py-1 px-3 rounded-full hover:bg-gray-700" data-member-id="${memberId}" data-leave-id="${leave.id}" data-leave-balance="${leave.balance}">Log Usage</button>
            </div>
        </div>
    `;
}

// --- Modal Handling ---
function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

document.getElementById('add-member-btn').addEventListener('click', () => {
    const form = document.getElementById('member-form');
    form.reset();
    document.getElementById('member-id').value = '';
    document.getElementById('member-modal-title').innerText = 'Add New Member';
    openModal(memberModal);
});

document.getElementById('cancel-member').addEventListener('click', () => closeModal(memberModal));
document.getElementById('cancel-leave').addEventListener('click', () => closeModal(leaveModal));
document.getElementById('cancel-log-leave').addEventListener('click', () => closeModal(logLeaveModal));
document.getElementById('cancel-delete').addEventListener('click', () => closeModal(deleteModal));

document.getElementById('leave-accumulation').addEventListener('change', (e) => {
    document.getElementById('max-accumulation-wrapper').classList.toggle('hidden', !e.target.checked);
});

document.getElementById('leave-reset-cycle').addEventListener('change', (e) => {
    const isAnnual = e.target.value === 'annually';
    document.getElementById('reset-month-wrapper').classList.toggle('hidden', !isAnnual);
    document.getElementById('custom-months-wrapper').classList.toggle('hidden', isAnnual);
});

// --- Event Delegation for Dynamic Content ---
document.body.addEventListener('click', (e) => {
    const addLeaveBtn = e.target.closest('.add-leave-btn');
    if (addLeaveBtn) {
        const memberId = addLeaveBtn.dataset.memberId;
        const form = document.getElementById('leave-form');
        form.reset();
        document.getElementById('leave-member-id').value = memberId;
        document.getElementById('leave-type-id').value = '';
        document.getElementById('leave-modal-title').innerText = 'Add Leave Type';
        document.getElementById('reset-month-wrapper').classList.remove('hidden');
        document.getElementById('custom-months-wrapper').classList.add('hidden');
        document.getElementById('max-accumulation-wrapper').classList.add('hidden');
        document.getElementById('leave-reset-cycle').value = 'annually';
        openModal(leaveModal);
    }

    const deleteMemberBtn = e.target.closest('.delete-member-btn');
    if (deleteMemberBtn) {
        const memberId = deleteMemberBtn.dataset.id;
        const memberName = deleteMemberBtn.dataset.name;
        document.getElementById('delete-modal-title').innerText = `Delete ${memberName}?`;
        document.getElementById('delete-modal-text').innerText = `Are you sure you want to delete this member and all their leave data? This action is permanent.`;
        const confirmBtn = document.getElementById('confirm-delete');
        confirmBtn.onclick = () => deleteMember(memberId);
        openModal(deleteModal);
    }
    
    const deleteLeaveBtn = e.target.closest('.delete-leave-btn');
    if (deleteLeaveBtn) {
        const { memberId, leaveId } = deleteLeaveBtn.dataset;
        document.getElementById('delete-modal-title').innerText = `Delete Leave Type?`;
        document.getElementById('delete-modal-text').innerText = `Are you sure you want to delete this leave type?`;
        const confirmBtn = document.getElementById('confirm-delete');
        confirmBtn.onclick = () => deleteLeaveType(memberId, leaveId);
        openModal(deleteModal);
    }
    
    const editMemberBtn = e.target.closest('.edit-member-btn');
    if (editMemberBtn) {
        const memberId = editMemberBtn.dataset.id;
        const memberName = editMemberBtn.dataset.name;
        
        const form = document.getElementById('member-form');
        form.reset();
        document.getElementById('member-modal-title').innerText = 'Edit Member';
        document.getElementById('member-id').value = memberId;
        document.getElementById('member-name').value = memberName;
        openModal(memberModal);
    }

    const editLeaveBtn = e.target.closest('.edit-leave-btn');
    if (editLeaveBtn) {
        const memberId = editLeaveBtn.dataset.memberId;
        const leaveData = JSON.parse(editLeaveBtn.dataset.leaveData);

        const form = document.getElementById('leave-form');
        form.reset();
        
        document.getElementById('leave-modal-title').innerText = 'Edit Leave Type';
        document.getElementById('leave-member-id').value = memberId;
        document.getElementById('leave-type-id').value = leaveData.id;

        document.getElementById('leave-type').value = leaveData.type;
        document.getElementById('leave-total').value = leaveData.total;
        document.getElementById('leave-balance').value = leaveData.balance;
        document.getElementById('leave-reset-cycle').value = leaveData.resetCycle;
        
        const isAnnual = leaveData.resetCycle === 'annually';
        document.getElementById('reset-month-wrapper').classList.toggle('hidden', !isAnnual);
        document.getElementById('custom-months-wrapper').classList.toggle('hidden', isAnnual);

        if (isAnnual) {
            document.getElementById('leave-reset-month').value = leaveData.resetMonth || '1';
        } else {
            const checkboxes = document.querySelectorAll('.custom-month-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = (leaveData.customMonths || []).includes(parseInt(cb.value));
            });
        }
        
        document.getElementById('leave-accumulation').checked = leaveData.allowAccumulation;
        
        const maxAccumulationWrapper = document.getElementById('max-accumulation-wrapper');
        maxAccumulationWrapper.classList.toggle('hidden', !leaveData.allowAccumulation);
        if (leaveData.allowAccumulation) {
            document.getElementById('leave-max-accumulation').value = leaveData.maxAccumulation;
            document.getElementById('leave-accumulated-balance').value = leaveData.accumulatedBalance || 0;
        }
        
        openModal(leaveModal);
    }

    const logLeaveBtn = e.target.closest('.log-leave-btn');
    if (logLeaveBtn) {
        const { memberId, leaveId, leaveBalance } = logLeaveBtn.dataset;
        const form = document.getElementById('log-leave-form');
        form.reset();
        document.getElementById('log-leave-member-id').value = memberId;
        document.getElementById('log-leave-type-id').value = leaveId;
        const dateInput = document.getElementById('log-leave-date');
        dateInput.value = new Date().toISOString().split('T')[0];
        const countInput = document.getElementById('log-leave-count');
        countInput.max = leaveBalance;
        openModal(logLeaveModal);
    }
});


// --- Firestore C.R.U.D. Operations ---
document.getElementById('member-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberName = document.getElementById('member-name').value.trim();
    const memberId = document.getElementById('member-id').value;
    if (!memberName) return;
    closeModal(memberModal);
    if (memberId) {
        const memberDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/members/${memberId}`);
        await updateDoc(memberDocRef, { name: memberName });
    } else {
        const membersColRef = collection(db, `artifacts/${appId}/users/${currentUserId}/members`);
        await addDoc(membersColRef, { name: memberName, leaves: [] });
    }
});

document.getElementById('leave-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('leave-member-id').value;
    const leaveTypeId = document.getElementById('leave-type-id').value;
    const resetCycle = document.getElementById('leave-reset-cycle').value;
    const allowAccumulation = document.getElementById('leave-accumulation').checked;

    let resetMonth = null;
    let customMonths = null;

    if (resetCycle === 'annually') {
        resetMonth = document.getElementById('leave-reset-month').value;
    } else {
        const checkboxes = document.querySelectorAll('.custom-month-checkbox:checked');
        customMonths = Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    const leaveData = {
        type: document.getElementById('leave-type').value.trim(),
        total: parseFloat(document.getElementById('leave-total').value),
        balance: parseFloat(document.getElementById('leave-balance').value),
        resetCycle: resetCycle,
        resetMonth: resetMonth,
        customMonths: customMonths,
        allowAccumulation: allowAccumulation,
        maxAccumulation: allowAccumulation ? parseFloat(document.getElementById('leave-max-accumulation').value) || 0 : 0,
        accumulatedBalance: allowAccumulation ? parseFloat(document.getElementById('leave-accumulated-balance').value) || 0 : 0,
    };
    closeModal(leaveModal);
    const memberDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/members/${memberId}`);
    if (leaveTypeId) {
        try {
            await runTransaction(db, async (transaction) => {
                const memberDoc = await transaction.get(memberDocRef);
                if (!memberDoc.exists()) throw "Member document not found!";
                const currentLeaves = memberDoc.data().leaves || [];
                const leaveIndex = currentLeaves.findIndex(l => l.id === leaveTypeId);
                if (leaveIndex === -1) throw "Leave type not found to update!";
                const originalLeave = currentLeaves[leaveIndex];
                currentLeaves[leaveIndex] = { ...originalLeave, ...leaveData };
                transaction.update(memberDocRef, { leaves: currentLeaves });
            });
        } catch (error) { console.error("Failed to update leave type:", error); }
    } else {
        const newLeave = { ...leaveData, id: Date.now().toString(), log: [] };
        await updateDoc(memberDocRef, { leaves: arrayUnion(newLeave) });
    }
});

document.getElementById('log-leave-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('log-leave-member-id').value;
    const leaveTypeId = document.getElementById('log-leave-type-id').value;
    const leaveDate = document.getElementById('log-leave-date').value;
    const leaveCount = parseFloat(document.getElementById('log-leave-count').value);
    if (!memberId || !leaveTypeId || !leaveDate || isNaN(leaveCount) || leaveCount <= 0) return;
    closeModal(logLeaveModal);
    const memberDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/members/${memberId}`);
    try {
        await runTransaction(db, async (transaction) => {
            const memberDoc = await transaction.get(memberDocRef);
            if (!memberDoc.exists()) throw "Document does not exist!";
            const leaves = memberDoc.data().leaves || [];
            const leaveIndex = leaves.findIndex(l => l.id === leaveTypeId);
            if (leaveIndex === -1) throw "Leave type not found!";
            const currentLeave = leaves[leaveIndex];
            if (currentLeave.balance < leaveCount) {
                alert("Not enough leave balance.");
                throw "Insufficient balance";
            }
            currentLeave.balance -= leaveCount;
            if (!currentLeave.log) currentLeave.log = [];
            currentLeave.log.push({ date: leaveDate, count: leaveCount });
            transaction.update(memberDocRef, { leaves: leaves });
        });
    } catch (error) { console.error("Transaction failed: ", error); }
});

async function deleteMember(memberId) {
    closeModal(deleteModal);
    const memberDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/members/${memberId}`);
    await deleteDoc(memberDocRef);
}

async function deleteLeaveType(memberId, leaveId) {
    closeModal(deleteModal);
    const memberDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/members/${memberId}`);
    try {
         await runTransaction(db, async (transaction) => {
            const memberDoc = await transaction.get(memberDocRef);
            if (!memberDoc.exists()) throw "Document does not exist!";
            const currentLeaves = memberDoc.data().leaves || [];
            const updatedLeaves = currentLeaves.filter(leave => leave.id !== leaveId);
            transaction.update(memberDocRef, { leaves: updatedLeaves });
         });
    } catch (error) { console.error("Failed to delete leave type: ", error); }
}
