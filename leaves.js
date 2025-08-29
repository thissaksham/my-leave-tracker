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
const maxAccumulationInput = document.getElementById('leave-max-accumulation');
const accumulationWarning = document.getElementById('accumulation-warning');

const annualGrantInput = document.getElementById('leave-annual-grant');
const balanceThisYearInput = document.getElementById('leave-balance-this-year');
const accumulatedBalanceInput = document.getElementById('leave-accumulated-balance');
const totalBalanceInput = document.getElementById('leave-total-balance');


// --- Rendering ---
export function renderLeaveType(leave, memberId, memberName) {
    const annualGrant = leave.annualGrant || 0;
    const percentage = annualGrant > 0 ? (leave.balanceThisYear / annualGrant) * 100 : 0;
    let bgColor = percentage < 25 ? 'bg-red-500' : percentage < 50 ? 'bg-yellow-500' : 'bg-green-500';

    let accumulationHTML = '';
    if (leave.allowAccumulation && leave.maxAccumulation > 0) {
        const totalAvailable = leave.balance || 0;
        const accMax = leave.maxAccumulation;
        let accPercentage = accMax > 0 ? (totalAvailable / accMax) * 100 : 0;
        // Cap the percentage at 100 to prevent overflow
        if (accPercentage > 100) accPercentage = 100;
        const exceedsMax = totalAvailable > accMax;

        accumulationHTML = `
            <div>
                <div class="flex justify-between items-center text-xs mb-1 mt-3">
                    <span class="font-semibold text-gray-600 flex items-center">
                        Accumulated Pool
                        ${exceedsMax ? `<svg class="w-4 h-4 ml-1 text-yellow-500" title="Total balance exceeds maximum accumulation" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.22 3.006-1.742 3.006H4.42c-1.522 0-2.492-1.672-1.742-3.006l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>` : ''}
                    </span>
                    <div><span class="font-bold">${totalAvailable}</span><span class="text-gray-500"> / ${accMax}</span></div>
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
                </div>
                <div class="flex items-baseline space-x-1">
                    <span class="font-bold text-lg">${leave.balanceThisYear}</span> 
                    <span class="text-gray-500 text-sm"> of ${annualGrant} left</span>

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

function calculateTotalBalance() {
    const balanceThisYear = parseFloat(balanceThisYearInput.value) || 0;
    const accumulated = parseFloat(accumulatedBalanceInput.value) || 0;
    totalBalanceInput.value = balanceThisYear + accumulated;

    const max = parseFloat(maxAccumulationInput.value) || 0;
    const allowAccumulation = accumulationCheckbox.checked;
    accumulationWarning.classList.toggle('hidden', !allowAccumulation || (balanceThisYear + accumulated) <= max);
}

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
        annualGrantInput.value = leave.annualGrant;
        balanceThisYearInput.value = leave.balanceThisYear;
        accumulatedBalanceInput.value = leave.accumulatedBalance;
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
            maxAccumulationInput.value = leave.maxAccumulation;
        }
    } else { // Adding new leave
        leaveModalTitle.innerText = 'Add Leave Type';
        document.getElementById('leave-type-id').value = '';
    }

    calculateTotalBalance();
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
        annualGrant: parseFloat(annualGrantInput.value) || 0,
        balanceThisYear: parseFloat(balanceThisYearInput.value) || 0,
        accumulatedBalance: allowAccumulation ? parseFloat(accumulatedBalanceInput.value) || 0 : 0,
        balance: parseFloat(totalBalanceInput.value) || 0,
        resetCycle,
        ...resetDetails,
        allowAccumulation,
        maxAccumulation: allowAccumulation ? parseFloat(maxAccumulationInput.value) || 0 : 0,
    };

    if (!leaveData.type || isNaN(leaveData.annualGrant)) {
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

annualGrantInput.addEventListener('input', calculateTotalBalance);
balanceThisYearInput.addEventListener('input', calculateTotalBalance);
accumulatedBalanceInput.addEventListener('input', calculateTotalBalance);
maxAccumulationInput.addEventListener('input', calculateTotalBalance);
accumulationCheckbox.addEventListener('change', calculateTotalBalance);

leaveForm.addEventListener('submit', handleLeaveFormSubmit);
cycleSelect.addEventListener('change', () => {
    annualOptions.classList.toggle('hidden', cycleSelect.value !== 'annually');
    customOptions.classList.toggle('hidden', cycleSelect.value !== 'custom');
});
accumulationCheckbox.addEventListener('change', () => {
    accumulationOptions.classList.toggle('hidden', !accumulationCheckbox.checked);
});

