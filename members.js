import { doc, addDoc, updateDoc, deleteDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderLeaveType } from "./leaves.js";

let db, userId;
export let allMembersData = []; // Changed to let for reassignment

// --- Initialization ---
export function initMembers(_db, _userId) {
    db = _db;
    userId = _userId;
}

// --- UI Element References ---
const memberModal = document.getElementById('member-modal');
const memberForm = document.getElementById('member-form');
const memberModalTitle = document.getElementById('member-modal-title');
const memberIdInput = document.getElementById('member-id');
const memberNameInput = document.getElementById('member-name');
const deleteModal = document.getElementById('delete-modal');

// --- Rendering ---
export function renderMembers(members) {
    const membersGrid = document.getElementById('members-grid');
    membersGrid.innerHTML = '';
    allMembersData = members; // Update local cache
    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-lg shadow-md';
        const leavesHTML = (member.leaves || []).map(leave => renderLeaveType(leave, member.id, member.name)).join('');
        
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center space-x-2">
                    <h3 class="text-lg font-bold text-gray-900">${member.name}</h3>
                    <button class="edit-member-btn text-gray-400 hover:text-blue-500" data-member-id="${member.id}">
                        <svg class="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                    </button>
                    <button class="delete-member-btn text-gray-400 hover:text-red-500" data-member-id="${member.id}">
                        <svg class="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3A1.5 1.5 0 0 1 13 3.5V5H7V3.5zM5 6V5h10v1H5zm-1 1a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1H4z" /></svg>
                    </button>
                </div>
            </div>
            <div class="mt-4 space-y-3">${leavesHTML}</div>
            <div class="mt-4">
                <button class="add-leave-btn w-full block text-center bg-blue-50 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition" data-member-id="${member.id}">
                    + Add Leave Type
                </button>
            </div>`;
        membersGrid.appendChild(card);
    });
}

// --- Modal Logic ---
function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

function setupMemberModal(memberId = null) {
    memberForm.reset();
    if (memberId) {
        const member = allMembersData.find(m => m.id === memberId);
        memberModalTitle.innerText = 'Edit Member Name';
        memberIdInput.value = member.id;
        memberNameInput.value = member.name;
    } else {
        memberModalTitle.innerText = 'Add New Member';
        memberIdInput.value = '';
    }
    openModal(memberModal);
}

function setupDeleteModal(memberId) {
    const member = allMembersData.find(m => m.id === memberId);
    document.getElementById('delete-modal-title').innerText = `Delete ${member.name}?`;
    document.getElementById('delete-modal-text').innerText = `Are you sure you want to delete this member and all their leave data? This is permanent.`;
    
    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.onclick = () => handleDeleteMember(memberId);
    openModal(deleteModal);
}

// --- Firestore Logic ---
async function handleMemberFormSubmit(e) {
    e.preventDefault();
    const memberId = memberIdInput.value;
    const memberName = memberNameInput.value.trim();
    if (!memberName) return;

    closeModal(memberModal); // Close modal immediately for better UX

    try {
        if (memberId) { // Edit existing member
            const memberDocRef = doc(db, `users/${userId}/members/${memberId}`);
            await updateDoc(memberDocRef, { name: memberName });
        } else { // Add new member
            const membersColRef = collection(db, `users/${userId}/members`);
            await addDoc(membersColRef, { name: memberName, leaves: [] });
        }
    } catch (error) {
        console.error("Error saving member:", error);
        alert("Could not save member details. Please try again.");
    }
}

async function handleDeleteMember(memberId) {
    closeModal(deleteModal); // Close modal immediately
    try {
        const memberDocRef = doc(db, `users/${userId}/members/${memberId}`);
        await deleteDoc(memberDocRef);
    } catch (error) {
        console.error("Error deleting member:", error);
        alert("Could not delete member. Please try again.");
    }
}

// --- Event Listeners ---
document.addEventListener('click', (e) => {
    if (e.target.id === 'add-member-btn') {
        setupMemberModal();
    }
    const editBtn = e.target.closest('.edit-member-btn');
    if (editBtn) {
        setupMemberModal(editBtn.dataset.memberId);
    }
    const deleteBtn = e.target.closest('.delete-member-btn');
    if (deleteBtn) {
        setupDeleteModal(deleteBtn.dataset.memberId);
    }
    if (e.target.closest('.cancel-btn')) {
        closeModal(memberModal);
        closeModal(deleteModal);
    }
});

memberForm.addEventListener('submit', handleMemberFormSubmit);

