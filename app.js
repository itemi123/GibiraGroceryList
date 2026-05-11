/* app.js */
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
        div.innerHTML = `
            <div class="card-body d-flex justify-content-between align-items-center" onclick="openList(${list.id})">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                        <h5 class="mb-1">${list.title}</h5>
                        <button class="btn btn-link btn-sm text-secondary p-0 ms-2 text-decoration-none" 
                                onclick="window.showNamePrompt('edit', ${list.id}, '${list.title.replace(/'/g, "\\'")}'); event.stopPropagation();">
                                ✏️
                        </button>
                    </div>
                    <div class="text-muted small">
                        <span class="me-2">📅 ${list.createdAt || i18n.na}</span>
                        <span>📦 ${list.items.length} ${i18n.itemsCount}</span>
                    </div>
                </div>
                <button class="btn btn-link text-danger p-0 text-decoration-none" onclick="deleteList(event, ${list.id})">✕</button>
            </div>
        `;
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
                      spellcheck="false">${item.name}</span>
            </div>
            <button class="btn btn-link text-danger p-0 ms-2 text-decoration-none" onclick="removeItem(${actualIndex})">✕</button>
        `;

        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);

        listContainer.appendChild(li);
    });
}

// --- 6. Custom Modal Logic ---
window.showNamePrompt = (action, id = null, oldName = '') => {
    modalAction = action;
    editingListId = id;
    modalTitle.innerText = action === 'edit' ? i18n.editListName || "Edit List Name" : i18n.createNewList;
    modalInput.value = oldName;
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

render();

/* app.js registration */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Gibira PWA: Offline mode active.'))
            .catch(err => console.log('PWA Error:', err));
    });
}
