import { doc, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { allMembersData } from "./members.js";

let db, userId;

// --- Initialization ---
export function initLeaves(_db, _userId) {
    db = _db;
    userId = _userId;
}

// --- UI Element References ---
const leaveModal = document.getElementById('leave-modal');
const leaveForm = document.getElementById('leave-form');
const leaveModalTitle = document.getElementById('leave-modal-title');
const leaveModalSubtitle = document.getElementById('leave-modal-subtitle');
const cycleSelect = document.getElementById('leave-reset-cycle');
const annualOptions = document.getElementById('annual-options');
const customOptions = document.getElementById('custom-options');
const accumulationCheckbox = document.getElementById('leave-accumulation');
const accumulationOptions = document.getElementById('accumulation-options');
const leaveFormError = document.getElementById('leave-form-error');
const leaveBalanceInput = document.getElementById('leave-balance');
const accumulatedBalanceInput = document.getElementById('leave-accumulated-balance');

// --- Rendering ---
export function renderLeaveType(leave, memberId, memberName) {
    const percentage = leave.total > 0 ? (leave.balance / leave.total) * 100 : 0;
    let bgColor = percentage < 25 ? 'bg-red-500' : percentage < 50 ? 'bg-yellow-500' : 'bg-green-500';

    let accumulationHTML = '';
    if (leave.allowAccumulation && leave.maxAccumulation > 0) {
        const accBalance = leave.accumulatedBalance || 0;
        const accMax = leave.maxAccumulation;
        const accPercentage = accMax > 0 ? (accBalance / accMax) * 100 : 0;
        accumulationHTML = `
            <div>
                <div class="flex justify-between items-center text-xs mb-1 mt-3">
                    <span class="font-semibold text-gray-600">Accumulated</span>
                    <div><span class="font-bold">${accBalance}</span><span class="text-gray-500"> / ${accMax}</span></div>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5"><div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${accPercentage}%"></div></div>
            </div>`;
    }

    return `
        <div class="leave-item border border-gray-200 p-3 rounded-lg">
            <div class="flex justify-between items-center text-sm mb-2">
                <div class="flex items-center space-x-2">
                    <span class="font-semibold">${leave.type}</span>
                    <button class="edit-leave-btn text-gray-400 hover:text-blue-500" data-member-id="${memberId}" data-leave-id="${leave.id}">
                         <svg class="h-4 w-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                    <!-- Delete leave button can be added here -->
                </div>
                <div class="flex items-baseline space-x-1">
                    <span class="font-bold text-lg">${leave.balance}</span>
                    <span class="text-gray-500 text-sm">/ ${leave.total} left</span>
                </div>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="${bgColor} h-2.5 rounded-full" style="width: ${percentage}%"></div>
            </div>
            ${accumulationHTML}
        </div>`;
}

// --- Modal Logic ---
function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

function setupLeaveForm(leave = null, memberId) {
    leaveForm.reset();
    leaveFormError.classList.add('hidden');
    const member = allMembersData.find(m => m.id === memberId);
    
    document.getElementById('leave-member-id').value = memberId;
    leaveModalSubtitle.querySelector('span').innerText = member.name;

    if (leave) { // Editing existing leave
        leaveModalTitle.innerText = 'Edit Leave Type';
        document.getElementById('leave-type-id').value = leave.id;
        document.getElementById('leave-type').value = leave.type;
        document.getElementById('leave-total').value = leave.total;
        leaveBalanceInput.value = leave.balance;
        cycleSelect.value = leave.resetCycle;

        if (leave.resetCycle === 'annually') {
            document.getElementById('leave-reset-month').value = leave.resetMonth;
        } else if (leave.resetCycle === 'custom') {
            customOptions.querySelectorAll('input').forEach(cb => {
                cb.checked = leave.creditMonths?.includes(cb.value);
            });
        }
        accumulationCheckbox.checked = leave.allowAccumulation;
        if (leave.allowAccumulation) {
            document.getElementById('leave-max-accumulation').value = leave.maxAccumulation;
            accumulatedBalanceInput.value = leave.accumulatedBalance;
        }
    } else { // Adding new leave
        leaveModalTitle.innerText = 'Add Leave Type';
        document.getElementById('leave-type-id').value = '';
        // New logic: auto-fill accumulated with current balance when adding
        if (leaveBalanceInput.value) {
            accumulatedBalanceInput.value = leaveBalanceInput.value;
        }
    }

    cycleSelect.dispatchEvent(new Event('change'));
    accumulationCheckbox.dispatchEvent(new Event('change'));
    openModal(leaveModal);
}

// --- Firestore Logic ---
async function handleLeaveFormSubmit(e) {
    e.preventDefault();
    const memberId = document.getElementById('leave-member-id').value;
    const leaveId = document.getElementById('leave-type-id').value;
    
    const resetCycle = cycleSelect.value;
    const allowAccumulation = accumulationCheckbox.checked;
    
    let resetDetails = {};
    if (resetCycle === 'annually') {
        resetDetails.resetMonth = document.getElementById('leave-reset-month').value;
        resetDetails.creditMonths = [];
    } else {
        resetDetails.creditMonths = Array.from(customOptions.querySelectorAll('input:checked')).map(cb => cb.value);
        resetDetails.resetMonth = null;
    }

    const leaveData = {
        type: document.getElementById('leave-type').value.trim(),
        total: parseFloat(document.getElementById('leave-total').value),
        balance: parseFloat(leaveBalanceInput.value),
        resetCycle,
        ...resetDetails,
        allowAccumulation,
        maxAccumulation: allowAccumulation ? parseFloat(document.getElementById('leave-max-accumulation').value) || 0 : 0,
        accumulatedBalance: allowAccumulation ? parseFloat(accumulatedBalanceInput.value) || 0 : 0,
    };

    if (!leaveData.type || isNaN(leaveData.total) || isNaN(leaveData.balance)) {
        leaveFormError.innerText = "Please fill in all required fields.";
        leaveFormError.classList.remove('hidden');
        return;
    }
     if (resetCycle === 'custom' && leaveData.creditMonths.length === 0) {
        leaveFormError.innerText = "Please select at least one credit month for the custom cycle.";
        leaveFormError.classList.remove('hidden');
        return;
    }

    closeModal(leaveModal);

    try {
        const memberDocRef = doc(db, `users/${userId}/members/${memberId}`);
        await runTransaction(db, async (transaction) => {
            const memberDoc = await transaction.get(memberDocRef);
            if (!memberDoc.exists()) throw "Member not found";

            const leaves = memberDoc.data().leaves || [];
            if (leaveId) { 
                const leaveIndex = leaves.findIndex(l => l.id === leaveId);
                if (leaveIndex > -1) {
                    const originalLog = leaves[leaveIndex].log || [];
                    leaves[leaveIndex] = { ...leaves[leaveIndex], ...leaveData, log: originalLog };
                }
            } else { 
                leaves.push({ ...leaveData, id: Date.now().toString(), log: [] });
            }
            transaction.update(memberDocRef, { leaves });
        });
    } catch (error) {
        console.error("Error saving leave type:", error);
        alert("Could not save leave type. Please try again.");
    }
}

// --- Event Listeners ---
document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-leave-btn');
    if (addBtn) {
        setupLeaveForm(null, addBtn.dataset.memberId);
    }
    const editBtn = e.target.closest('.edit-leave-btn');
    if (editBtn) {
        const { memberId, leaveId } = editBtn.dataset;
        const member = allMembersData.find(m => m.id === memberId);
        const leave = member.leaves.find(l => l.id === leaveId);
        setupLeaveForm(leave, memberId);
    }
    if (e.target.closest('.cancel-btn')) {
        closeModal(leaveModal);
    }
});

// New listener for balance input change
leaveBalanceInput.addEventListener('input', (e) => {
    // Only auto-fill when ADDING a new leave
    const isAdding = !document.getElementById('leave-type-id').value;
    if (isAdding) {
        accumulatedBalanceInput.value = e.target.value;
    }
});

leaveForm.addEventListener('submit', handleLeaveFormSubmit);
cycleSelect.addEventListener('change', () => {
    annualOptions.classList.toggle('hidden', cycleSelect.value !== 'annually');
    customOptions.classList.toggle('hidden', cycleSelect.value !== 'custom');
});
accumulationCheckbox.addEventListener('change', () => {
    accumulationOptions.classList.toggle('hidden', !accumulationCheckbox.checked);
});

