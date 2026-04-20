// State Management
let state = {
    bills: [],
    userName: localStorage.getItem('billChecklist_userName') || '',
    scriptUrl: 'https://script.google.com/macros/s/AKfycbz_bl7F8i3Nq6ePmPqhVJxsGLdx46zxIJkqIDyHTL5hUQw9bASZUi0atx3r9VsEaePu/exec',
    nextBillId: 1
};

// DOM Element References (will be assigned in init)
let billList, saveSheetsBtn, newJourneyBtn, totalBillsCount, overallProgressText, overallProgressBar, userNameDisplay;
let userLoginModal, userNameInput, submitUserNameBtn, scriptTemplateModal, closeScriptModalBtn, copyScriptBtn;
let expandedBillId = null;
let searchQuery = '';

// Initialize
function init() {
    // Assign DOM Elements once DOM is ready
    billList = document.getElementById('billList');
    saveSheetsBtn = document.getElementById('saveSheetsBtn');
    newJourneyBtn = document.getElementById('newJourneyBtn');
    totalBillsCount = document.getElementById('totalBillsCount');
    overallProgressText = document.getElementById('overallProgressText');
    overallProgressBar = document.getElementById('overallProgressBar');
    userNameDisplay = document.getElementById('userNameDisplay');
    
    userLoginModal = document.getElementById('userLoginModal');
    userNameInput = document.getElementById('userNameInput');
    submitUserNameBtn = document.getElementById('submitUserNameBtn');
    scriptTemplateModal = document.getElementById('scriptTemplateModal');
    closeScriptModalBtn = document.getElementById('closeScriptModalBtn');
    copyScriptBtn = document.getElementById('copyScriptBtn');
    const addBillBtn = document.getElementById('addBillBtn');

    loadState();
    
    if (!state.userName) {
        userLoginModal.classList.add('active');
    } else {
        userNameDisplay.textContent = state.userName;
    }

    renderBills();
    updateStats();
    
    // Event Listeners
    saveSheetsBtn.addEventListener('click', handleSaveToSheets);
    newJourneyBtn.addEventListener('click', handleNewJourney);
    submitUserNameBtn.addEventListener('click', saveUserName);
    addBillBtn.addEventListener('click', () => createNewBill());
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderBills();
        });
    }
    closeScriptModalBtn.addEventListener('click', () => scriptTemplateModal.classList.remove('active'));
    copyScriptBtn.addEventListener('click', copyScriptToClipboard);
}

// Load from LocalStorage
function loadState() {
    const saved = localStorage.getItem('billChecklist_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.bills = parsed.bills || [];
            // Migration: Ensure all existing bills have a type
            state.bills.forEach(b => {
                if (!b.type) b.type = 'Final';
            });
            state.nextBillId = parsed.nextBillId || 1;
        } catch(e) {
            state.bills = [];
        }
    }
    
    if (state.bills.length === 0) {
        createNewBill();
    }
}

function saveState() {
    localStorage.setItem('billChecklist_state', JSON.stringify({
        bills: state.bills,
        nextBillId: state.nextBillId
    }));
}

function saveUserName() {
    const name = userNameInput.value.trim();
    if (name) {
        state.userName = name;
        localStorage.setItem('billChecklist_userName', name);
        userNameDisplay.textContent = name;
        userLoginModal.classList.remove('active');
        showToast(`Welcome, ${name}!`);
    } else {
        showToast("Please enter your name.");
    }
}

function createNewBill(name = '') {
    let nextName = name;
    if (!nextName) {
        if (state.bills.length > 0) {
            const lastBill = state.bills[state.bills.length - 1];
            const lastNumberMatch = lastBill.name.match(/\d+$/);
            if (lastNumberMatch) {
                const lastNum = parseInt(lastNumberMatch[0]);
                const prefix = lastBill.name.substring(0, lastNumberMatch.index);
                nextName = `${prefix}${lastNum + 1}`;
            } else {
                nextName = `Bill #${state.bills.length + 1}`;
            }
        } else {
            nextName = "1";
        }
    }

    const bill = {
        id: Date.now(),
        name: nextName,
        type: 'Final',
        steps: { create: false, photo: false, upload: false, fms: false, update: false },
        details: '',
        createdAt: new Date().toISOString()
    };
    state.bills.push(bill);
    saveState();
    if (billList) renderBills();
    if (totalBillsCount) updateStats();
}

function renderBills() {
    if (!billList) return;
    billList.innerHTML = '';
    
    // Sort bills by ID (which is timestamp) descending
    const sortedBills = [...state.bills].sort((a, b) => b.id - a.id);

    const filteredBills = sortedBills.filter(bill => 
        bill.name.toLowerCase().includes(searchQuery) || 
        (bill.id.toString().includes(searchQuery))
    );

    let lastDate = null;

    filteredBills.forEach((bill, index) => {
        const billDate = new Date(bill.id).toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        if (billDate !== lastDate && !searchQuery) {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerHTML = `<span>${formatFriendlyDate(bill.id)}</span>`;
            billList.appendChild(dateHeader);
            lastDate = billDate;
        }

        const item = createBillItem(bill, index + 1);
        billList.appendChild(item);
    });

    if (filteredBills.length === 0 && searchQuery) {
        billList.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No bills found matching "${searchQuery}"</div>`;
    }
}

function formatFriendlyDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric' 
    });
}

function createBillItem(bill, index) {
    const item = document.createElement('div');
    const isExpanded = bill.id === expandedBillId;
    item.className = `bill-item ${isExpanded ? 'expanded' : ''}`;
    
    const progress = calculateBillProgress(bill);
    const stepCount = Object.values(bill.steps).filter(Boolean).length;
    const billType = bill.type || 'Final';
    const typeClass = `type-${billType.toLowerCase()}`;
    
    const timeStr = bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'New';

    item.innerHTML = `
        <div class="bill-main" onclick="toggleExpand(${bill.id})">
            <div class="bill-info">
                <span class="bill-number">${index}.</span>
                <div class="bill-name-wrapper">
                    <input type="text" class="bill-name-input" value="${bill.name}" 
                           data-prev="${bill.name}" onblur="checkUpdateName(${bill.id}, this)"
                           onclick="event.stopPropagation()">
                    <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">
                        ${timeStr} • <span class="bill-type-toggle ${typeClass}" onclick="event.stopPropagation(); cycleBillType(${bill.id})">${billType}</span>
                    </div>
                </div>
            </div>
            
            <div class="battery-container" onclick="event.stopPropagation(); toggleExpand(${bill.id})">
                <div class="battery-percentage">${Math.round(progress)}%</div>
                <div class="battery-shell" data-level="${stepCount}">
                    <div class="battery-segment"></div>
                    <div class="battery-segment"></div>
                    <div class="battery-segment"></div>
                    <div class="battery-segment"></div>
                    <div class="battery-segment"></div>
                </div>
            </div>
        </div>
        
        <div class="bill-content">
            <div class="bill-inner">
                <div class="checklist">
                    <div class="step-item ${bill.steps.create ? 'completed' : ''}" onclick="toggleStep(${bill.id}, 'create')">
                        <div class="checkbox"></div><span>1. Bill Created</span>
                    </div>
                    <div class="step-item ${bill.steps.photo ? 'completed' : ''}" onclick="toggleStep(${bill.id}, 'photo')">
                        <div class="checkbox"></div><span>2. Photo Taken</span>
                    </div>
                    <div class="step-item ${bill.steps.upload ? 'completed' : ''}" onclick="toggleStep(${bill.id}, 'upload')">
                        <div class="checkbox"></div><span>3. Group Upload</span>
                    </div>
                    <div class="step-item ${bill.steps.fms ? 'completed' : ''}" onclick="toggleStep(${bill.id}, 'fms')">
                        <div class="checkbox"></div><span>4. FMS Sheet</span>
                    </div>
                    <div class="step-item ${bill.steps.update ? 'completed' : ''}" onclick="toggleStep(${bill.id}, 'update')">
                        <div class="checkbox"></div><span>5. Bill Update Sheet</span>
                    </div>
                </div>
                
                <textarea class="details-textarea" placeholder="Add specific notes or details here..." 
                          oninput="updateBillDetails(${bill.id}, this.value)">${bill.details}</textarea>
                
                <div class="bill-footer">
                    <span>Entry ID: ${bill.id}</span>
                    <button class="delete-bill" onclick="deleteBill(${bill.id})">Remove Entry</button>
                </div>
            </div>
        </div>
    `;
    return item;
}

function toggleExpand(billId) {
    expandedBillId = (expandedBillId === billId) ? null : billId;
    renderBills();
}

function checkUpdateName(billId, input) {
    const newName = input.value.trim();
    if (newName && newName !== input.dataset.prev) {
        const bill = state.bills.find(b => b.id === billId);
        if (bill) {
            bill.name = newName;
            input.dataset.prev = newName;
            saveState();
        }
    }
}

function cycleBillType(billId) {
    const bill = state.bills.find(b => b.id === billId);
    if (bill) {
        const types = ['Final', 'Provisional', 'Cancelled'];
        bill.type = types[(types.indexOf(bill.type) + 1) % types.length];
        saveState();
        renderBills();
    }
}

function updateBillDetails(billId, value) {
    const bill = state.bills.find(b => b.id === billId);
    if (bill) {
        bill.details = value;
        saveState();
    }
}

function deleteBill(billId) {
    if (confirm('Delete this bill?')) {
        state.bills = state.bills.filter(b => b.id !== billId);
        saveState();
        renderBills();
        updateStats();
    }
}

function calculateBillProgress(bill) {
    const steps = Object.values(bill.steps);
    return (steps.filter(Boolean).length / steps.length) * 100;
}

function toggleStep(billId, key) {
    const bill = state.bills.find(b => b.id === billId);
    if (bill) {
        bill.steps[key] = !bill.steps[key];
        saveState();
        renderBills();
        updateStats();
    }
}

function updateStats() {
    if (!totalBillsCount) return;
    const total = state.bills.length;
    const avg = total > 0 ? Math.round(state.bills.reduce((a, b) => a + calculateBillProgress(b), 0) / total) : 0;
    totalBillsCount.textContent = total;
    if (overallProgressText) overallProgressText.textContent = `${avg}%`;
    if (overallProgressBar) overallProgressBar.style.width = `${avg}%`;
}

async function handleSaveToSheets() {
    if (state.scriptUrl.includes('YOUR_GOOGLE_SCRIPT_URL_HERE')) {
        showToast("Set Script URL in script.js!"); return;
    }
    if (state.bills.length === 0) {
        showToast("No bills to save!"); return;
    }
    saveSheetsBtn.disabled = true;
    saveSheetsBtn.textContent = 'Syncing...';
    try {
        await fetch(state.scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ userName: state.userName, bills: state.bills })
        });
        showToast("✓ Records saved!");
    } catch (e) {
        showToast("✕ Connection Error");
    } finally {
        saveSheetsBtn.disabled = false;
        saveSheetsBtn.innerHTML = '<span class="icon">📊</span> Save';
    }
}

function handleNewJourney() {
    if (confirm('Clear and start fresh?')) {
        state.bills = [];
        createNewBill();
        saveState();
        renderBills();
        updateStats();
        showToast("✨ Fresh start!");
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function copyScriptToClipboard() {
    const code = document.getElementById('scriptCode').textContent.trim();
    navigator.clipboard.writeText(code);
    showToast("Code copied!");
}

// Start once DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
