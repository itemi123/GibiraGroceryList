/* app.js */
window.GIBIRA_VERSION = "v1.0.5";
const listContainer = document.getElementById('mainList');
const inputField = document.getElementById('groceryInput');
const searchInput = document.getElementById('searchInput');
const addBtn = document.getElementById('add-btn');
const clearAllBtn = document.getElementById('clearAll');
const langToggleBtn = document.getElementById('langToggle');
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const clearAllListsBtn = document.getElementById('clearAllLists');

// --- Custom Modal Elements ---
const nameModalEl = document.getElementById('nameModal');
const nameModal = new bootstrap.Modal(nameModalEl);
const modalInput = document.getElementById('modalInput');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalTitle = document.getElementById('modalTitle');

let modalAction = null; // 'create' or 'edit'
let editingListId = null;

function updateThemeIcon() {
    if (currentTheme === 'light') {
        themeIcon.classList.remove('bulb-on');
        themeIcon.classList.add('bulb-off');
    } else {
        themeIcon.classList.remove('bulb-off');
        themeIcon.classList.add('bulb-on');
    }
}

// --- 1. Language & Theme Setup ---
let currentLang = localStorage.getItem('gibira_lang') || (navigator.language.startsWith('bs') ? 'bs' : 'en');
let i18n = translations[currentLang];

const getPreferredTheme = () => {
    const saved = localStorage.getItem('gibira_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

let currentTheme = getPreferredTheme();
document.documentElement.setAttribute('data-theme', currentTheme);

window.changeLanguage = () => {
    currentLang = currentLang === 'en' ? 'bs' : 'en';
    i18n = translations[currentLang];
    render();
};

window.toggleTheme = () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('gibira_theme', currentTheme);
    updateThemeIcon();
};

// --- 2. State Management ---
let allLists = JSON.parse(localStorage.getItem('gibira_all_lists')) || [];
let currentListId = localStorage.getItem('gibira_current_id') || null;
let draggedItemIndex = null;

const getCurrentList = () => allLists.find(l => l.id == currentListId);

// --- 3. Main Render Controller ---
function render() {
    langToggleBtn.innerText = i18n.toggleLang;
    addBtn.innerText = i18n.addButton;
    inputField.placeholder = i18n.addItemPlaceholder;
    searchInput.placeholder = i18n.searchPlaceholder;
    clearAllBtn.innerText = i18n.clearAll;
    clearAllListsBtn.innerText = i18n.deleteAllLists;
    updateThemeIcon();
	document.getElementById('version-display').innerText = window.GIBIRA_VERSION;
    if (!currentListId) {
        renderDashboard();
    } else {
        renderActiveList();
    }

    localStorage.setItem('gibira_all_lists', JSON.stringify(allLists));
    localStorage.setItem('gibira_current_id', currentListId || "");
    localStorage.setItem('gibira_lang', currentLang);
}

// --- 4. View: Dashboard ---
function renderDashboard() {
	
	document.getElementById('activeListHeader').style.display = 'none'; // Hide title
    document.querySelector('.input-group').style.display = 'none'; 
    if (searchInput) searchInput.parentElement.style.display = 'none'; 
    clearAllBtn.style.display = 'none';
    clearAllListsBtn.style.display = allLists.length > 0 ? 'block' : 'none';
    langToggleBtn.style.visibility = 'visible';
    themeToggleBtn.style.visibility = 'visible';

    listContainer.innerHTML = `
        <h2 class="h5 fw-bold mb-3 text-secondary text-center">${i18n.myLists}</h2>
        <div class="d-grid gap-2 mb-4">
            <button class="btn btn-success fw-bold p-3 rounded-3 shadow-sm" onclick="window.showNamePrompt('create')">
                ${i18n.createNewList}
            </button>
        </div>
    `;

    const sortedDashboard = [...allLists].sort((a, b) => b.id - a.id);
    sortedDashboard.forEach(list => {
    const div = document.createElement('div');
    div.className = 'card mb-2 shadow-sm border-0 list-card';
    // Use an empty h5 with a specific class for the title
    div.innerHTML = `
		<div class="card-body d-flex justify-content-between align-items-start" onclick="openList(${list.id})">
			<div class="flex-grow-1 pe-3">
				<div class="list-title-wrapper">
					<h5 class="mb-1 d-inline list-title-display"></h5>
					<button class="btn btn-link btn-sm text-secondary p-0 ms-1 edit-btn-inline" 
							onclick="window.showNamePrompt('edit', ${list.id}); event.stopPropagation();">
							✏️
					</button>
				</div>
				<div class="text-muted small">
					<span class="me-2">📅 ${list.createdAt || i18n.na}</span>
					<span>📦 ${list.items.length} ${i18n.itemsCount}</span>
				</div>
			</div>
			<button class="btn btn-link text-danger p-0 text-decoration-none fs-5" onclick="deleteList(event, ${list.id})">✕</button>
		</div>
	`;
    
    // Set title as plain text
    div.querySelector('.list-title-display').textContent = list.title;
    
    listContainer.appendChild(div);
});
}

// --- 5. View: Active List ---
function renderActiveList() {
    const list = getCurrentList();
    if (!list) { goHome(); return; }
	
	// Show the header and set the text
    const header = document.getElementById('activeListHeader');
    const titleDisplay = document.getElementById('activeListTitle');
    header.style.display = 'block';
    titleDisplay.innerText = list.title;

    langToggleBtn.style.visibility = 'hidden';
    themeToggleBtn.style.visibility = 'hidden';
    
    document.querySelector('.input-group').style.display = 'flex';
    if (searchInput) searchInput.parentElement.style.display = 'block';
    clearAllBtn.style.display = 'block';
    clearAllListsBtn.style.display = 'none';
    const sortLabel = list.isReversed ? i18n.oldestTop : i18n.newestTop;

    listContainer.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <button class="btn btn-link text-success p-0 text-decoration-none fw-bold" onclick="goHome()">
                ${i18n.backToLists}
            </button>
            <button class="btn btn-sm btn-outline-success border-0 fw-bold" onclick="toggleSort()">
                ${sortLabel}
            </button>
        </div>
    `;

    const unchecked = list.items.filter(i => !i.done);
    const checked = list.items.filter(i => i.done);
    if (list.isReversed) unchecked.reverse();
    const displayItems = [...unchecked, ...checked];

    displayItems.forEach((item) => {
        const actualIndex = list.items.indexOf(item);
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center border-bottom px-0 bg-transparent';
        li.draggable = true;
        li.dataset.index = actualIndex;
        
        li.innerHTML = `
			<div class="d-flex align-items-center flex-grow-1">
				<input type="checkbox" class="form-check-input me-3 border-success" 
					   ${item.done ? 'checked' : ''} onchange="toggleItem(${actualIndex})">
				<span class="editable-text fs-2 ${item.done ? 'text-decoration-line-through text-muted' : ''}" 
					  contenteditable="true" 
					  onblur="editItem(${actualIndex}, this.innerText)"
					  spellcheck="false"></span>
			</div>
			<button class="btn btn-link text-danger p-0 ms-2 text-decoration-none" onclick="removeItem(${actualIndex})">✕</button>
		`;

		// Set item name as plain text
		li.querySelector('.editable-text').textContent = item.name;		

        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);

        listContainer.appendChild(li);
    });
}

// --- 6. Custom Modal Logic ---
// Updated showNamePrompt function
window.showNamePrompt = (action, id = null) => {
    modalAction = action;
    editingListId = id;
    
    let oldName = '';
    if (action === 'edit' && id !== null) {
        // Look up the name by ID directly from your state
        const list = allLists.find(l => l.id == id);
        if (list) oldName = list.title;
    }

    modalTitle.innerText = action === 'edit' ? i18n.editListName || "Edit List Name" : i18n.createNewList;
    modalInput.value = oldName; // modalInput.value is inherently XSS-safe
    nameModal.show();
    setTimeout(() => modalInput.focus(), 500);
};

modalConfirmBtn.onclick = () => {
    const name = modalInput.value.trim();
    if (!name) return;

    if (modalAction === 'create') {
        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE') + ' ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const newList = { id: Date.now(), title: name, items: [], createdAt: dateStr, isReversed: false };
        allLists.push(newList);
        currentListId = newList.id;
    } else if (modalAction === 'edit') {
        const list = allLists.find(l => l.id == editingListId);
        if (list) list.title = name;
    }

    nameModal.hide();
    render();
};

// --- 7. Logic: List Operations ---
window.openList = (id) => { currentListId = id; render(); };
window.goHome = () => { 
	currentListId = null; 
	document.getElementById('activeListHeader').style.display = 'none';
	if(searchInput) searchInput.value = ''; render(); 
};

window.deleteList = (e, id) => {
    e.stopPropagation(); 
    if (confirm(i18n.confirmDeleteList)) {
        allLists = allLists.filter(l => l.id !== id);
        if (currentListId == id) currentListId = null;
        render();
    }
};

window.toggleSort = () => {
    const list = getCurrentList();
    if (list) { list.isReversed = !list.isReversed; render(); }
};

// --- 8. Logic: Item Operations ---
window.addItem = () => {
    const text = inputField.value.trim();
    const list = getCurrentList();
    if (!list || !text) return;
    list.items.unshift({ name: text, done: false });
    inputField.value = '';
    render();
};

window.toggleItem = (idx) => {
    const list = getCurrentList();
    list.items[idx].done = !list.items[idx].done;
    if (list.items[idx].done) {
        const item = list.items.splice(idx, 1)[0];
        list.items.push(item);
    } else {
        const item = list.items.splice(idx, 1)[0];
        list.items.unshift(item);
    }
    render();
};

window.removeItem = (idx) => {
    const list = getCurrentList();
    if (list) { list.items.splice(idx, 1); render(); }
};

window.editItem = (idx, txt) => {
    const list = getCurrentList();
    if (!list || txt.trim() === "") { render(); return; }
    list.items[idx].name = txt.trim();
    localStorage.setItem('gibira_all_lists', JSON.stringify(allLists));
};

window.deleteAllLists = () => {
    if (confirm(i18n.confirmDeleteAll)) {
        allLists = [];
        currentListId = null;
        render();
    }
};

// --- 9. Drag and Drop Logic ---
function handleDragStart(e) { draggedItemIndex = this.dataset.index; this.classList.add('dragging'); }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e) {
    e.preventDefault();
    const targetIndex = this.dataset.index;
    const list = getCurrentList();
    if (draggedItemIndex === null || !list) return;
    const movedItem = list.items.splice(draggedItemIndex, 1)[0];
    list.items.splice(targetIndex, 0, movedItem);
    render();
}
function handleDragEnd() { this.classList.remove('dragging'); draggedItemIndex = null; }

// --- 10. Global Event Listeners ---
addBtn.onclick = () => window.addItem();
inputField.onkeypress = (e) => { if (e.key === 'Enter') window.addItem(); };

if (searchInput) {
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const items = listContainer.querySelectorAll('li.list-group-item');
        items.forEach(li => {
            const textSpan = li.querySelector('.editable-text');
            if (textSpan) {
                const text = textSpan.innerText.toLowerCase();
                li.style.setProperty('display', text.includes(term) ? 'flex' : 'none', 'important');
            }
        });
    };
}

clearAllBtn.onclick = () => {
    const list = getCurrentList();
    if (list && confirm(i18n.confirmClearList)) {
        list.items = [];
        render();
    }
};

window.exportData = () => {
    // 1. Prepare the data
    const dataStr = JSON.stringify(allLists, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // 2. Generate detailed timestamp: YYYY-MM-DD_HH-mm
    const now = new Date();
    const datePart = now.toISOString().split('T')[0]; // 2026-05-11
    const timePart = now.getHours().toString().padStart(2, '0') + '-' + 
                     now.getMinutes().toString().padStart(2, '0');
    
    const filename = `gibira_backup_${datePart}_${timePart}.json`;

    // 3. Create a temporary download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 4. Trigger download and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

window.importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024) { 
        alert("File is too large. Backup must be under 1MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const rawData = JSON.parse(e.target.result);
            if (!Array.isArray(rawData)) {
                alert("Invalid format: Backup must be a list array.");
                return;
            }

            // --- DEEP VALIDATION ---
            const incomingLists = rawData.filter(list => {
                // 1. Basic List Structure Check
                const hasBasicFields = list.hasOwnProperty('id') && 
                                     list.hasOwnProperty('title') && 
                                     Array.isArray(list.items);
                
                if (!hasBasicFields) return false;

                // 2. Internal Items Integrity Check
                // Ensure every item is an object with a name string and done boolean
                const itemsAreValid = list.items.every(item => 
                    item && 
                    typeof item === 'object' && 
                    typeof item.name === 'string' &&
                    item.hasOwnProperty('done')
                );

                return itemsAreValid;
            });

            if (incomingLists.length === 0) {
                alert("No valid grocery lists found. File may be corrupted or in the wrong format.");
                return;
            }

            const message = `Importing ${incomingLists.length} valid list(s). Update existing IDs and add new ones?`;
            
            if (confirm(message)) {
                incomingLists.forEach(incoming => {
                    const existingIndex = allLists.findIndex(l => l.id === incoming.id);

                    // Re-construct the object to sanitize fields and apply defaults
                    const sanitizedList = {
                        id: incoming.id,
                        title: incoming.title,
                        items: incoming.items.map(item => ({
                            name: item.name,
                            done: !!item.done // Force to boolean
                        })),
                        createdAt: incoming.createdAt || new Date().toLocaleString(),
                        isReversed: !!incoming.isReversed
                    };

                    if (existingIndex !== -1) {
                        allLists[existingIndex] = sanitizedList;
                    } else {
                        allLists.push(sanitizedList);
                    }
                });

                render();
                event.target.value = ''; 
                alert("Import successful!");
            }
        } catch (err) {
            console.error("Import error:", err);
            alert("Error: The file is not valid JSON.");
        }
    };
    reader.readAsText(file);
};

render();

/* app.js registration */


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register but don't let the browser auto-update in the background
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'all' })
            .then(reg => {
                console.log('Gibira PWA: Locked version active.');
                // We store the registration object globally to trigger it later
                window.swRegistration = reg;
            });
    });
}

window.checkForUpdatesManually = () => {
    if (!navigator.onLine) {
        alert("You are offline. Please connect to Wi-Fi to check for updates.");
        return;
    }

    if (window.swRegistration) {
        console.log("Gibira: Manual handshake initiated...");
        
        window.swRegistration.update().then(reg => {
            // Check if there is already a version waiting or if a new one was just found
            if (reg.waiting || reg.installing) {
                alert("A new version is ready! Please close all tabs of this app and restart to apply changes.");
            } else {
                // We listen for the 'updatefound' event which triggers if the update() found something new
                reg.onupdatefound = () => {
                    const newWorker = reg.installing;
                    newWorker.onstatechange = () => {
                        if (newWorker.state === 'installed') {
                            alert("Update downloaded! Close the app and reopen it to see changes.");
                        }
                    };
                };
                
                // If nothing was found after a few seconds
                setTimeout(() => {
                    if (!reg.waiting && !reg.installing) {
                        alert("You are up to date!");
                    }
                }, 2000);
            }
        }).catch(err => {
            console.error("Update check failed:", err);
            alert("Could not reach GitHub. Version remains locked.");
        });
    } else {
        alert("Service Worker not active. Update check skipped.");
    }
};
