// --- DATA & CONFIG ---
const masterMappings = {};
const STORAGE_KEY = 'solutioning-workbench-state-v1';
let currentMode = 'enrichment'; 

// Single Source of Truth: All rows live here.
// Each row: { rowId, cells: [], assignedTo: 'staging' | 'targetId', mapping: {}, question: {} }
let allRows = []; 
let columnWidths = []; // Shared widths for all tables
let activeMapColumnIndex = 0; 

const MODE_CONFIG = {
    enrichment: {
        label: 'Data Enrichment Story',
        targets: [
            { id: 'erp-native-body', label: 'Native ERP', color: 'purple' },
            { id: 'erp-plugin-body', label: 'Plugin Input', color: 'blue' },
            { id: 'platform-workbench-body', label: 'Platform Logic', color: 'indigo' }
        ],
        nav: [
            { href: '#phase-2', icon: '🖥️', label: '2. ERP & Plugin' },
            { href: '#phase-3', icon: '⚙️', label: '3. Platform Logic' }
        ],
        sections: [
            {
                id: 'phase-2', badge: 'PHASE 2', badgeColor: 'purple', title: 'ERP & Plugin Context', index: 2,
                components: [
                    { id: 'erp-native-body', title: '2A. Native ERP Data', source: 'General Ledger', desc: 'Data pulled directly from the ERP.' },
                    { id: 'erp-plugin-body', title: '2B. Plugin Enrichment', source: 'User Input', desc: 'Data configured or input by the user.' }
                ],
                qa: 'q-phase-2'
            },
            {
                id: 'phase-3', badge: 'PHASE 3', badgeColor: 'indigo', title: 'FISPAN Platform Logic', index: 3,
                components: [
                    { id: 'platform-workbench-body', title: 'Transformation Rules', desc: 'Rules & Validation Gates.' }
                ],
                qa: 'q-phase-3'
            }
        ]
    },
    logical: {
        label: 'Logical Isolation Story',
        targets: [
            { id: 'phase-fc-body', label: 'File Control', color: 'slate' },
            { id: 'phase-ed-body', label: 'Entity Details', color: 'blue' },
            { id: 'phase-pi-body', label: 'Payment Instr.', color: 'emerald' },
            { id: 'phase-rm-body', label: 'Remittance', color: 'amber' }
        ],
        nav: [
            { href: '#phase-fc', icon: '📂', label: 'File Control' },
            { href: '#phase-ed', icon: '👥', label: 'Entity Details' },
            { href: '#phase-pi', icon: '💸', label: 'Payment Instruction' },
            { href: '#phase-rm', icon: '🧾', label: 'Remittance Data' }
        ],
        sections: [
            {
                id: 'phase-fc', badge: 'THE ENVELOPE', badgeColor: 'slate', title: 'File Control', index: 2,
                desc: 'Metadata that tells the bank how to process the file.',
                components: [{ id: 'phase-fc-body', title: 'Control Headers/Trailers' }], qa: 'q-phase-fc'
            },
            {
                id: 'phase-ed', badge: 'THE ACTORS', badgeColor: 'blue', title: 'Entity Details', index: 3,
                desc: 'Payer & Payee Info.',
                components: [{ id: 'phase-ed-body', title: 'Payer & Payee Fields' }], qa: 'q-phase-ed'
            },
            {
                id: 'phase-pi', badge: 'THE ACTION', badgeColor: 'emerald', title: 'Payment Instruction', index: 3, 
                desc: 'The specific transfer of value.',
                components: [{ id: 'phase-pi-body', title: 'Instruction Fields' }], qa: 'q-phase-pi'
            },
            {
                id: 'phase-rm', badge: 'THE CONTEXT', badgeColor: 'amber', title: 'Remittance Data', index: 3,
                desc: 'Information the vendor needs to reconcile.',
                components: [{ id: 'phase-rm-body', title: 'Remittance Fields' }], qa: 'q-phase-rm'
            }
        ]
    }
};

// --- MODE LOGIC ---
function switchMode(mode, skipSave = false) {
    if (!MODE_CONFIG[mode]) return;
    if(!skipSave) saveState(); 
    currentMode = mode;
    document.querySelectorAll('.mode-toggle-btn').forEach(b => {
        b.classList.remove('bg-white','shadow-sm','text-slate-800');
        b.classList.add('text-slate-500');
    });
    const activeBtn = document.getElementById(`btn-mode-${mode}`);
    if(activeBtn) {
        activeBtn.classList.add('bg-white','shadow-sm','text-slate-800');
        activeBtn.classList.remove('text-slate-500');
    }
    localStorage.setItem(STORAGE_KEY + ':mode', mode);
    renderNav();
    renderWorkbench();
    loadState(); 
}

function renderNav() {
    const nav = document.getElementById('main-nav');
    const config = MODE_CONFIG[currentMode];
    if (!nav) return;
    let html = `
        <div class="px-6 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Solution Phases</div>
        <a href="#spec-manager" class="nav-item flex items-center px-6 py-3 hover:bg-slate-800 transition group text-blue-400">
            <span class="mr-3 text-lg">📤</span> <span class="font-medium text-sm">Spec Manager</span>
        </a>
        <a href="#phase-1" class="nav-item flex items-center px-6 py-3 hover:bg-slate-800 transition group">
            <span class="mr-3 text-lg">🔌</span> <span class="font-medium text-sm">1. Connectivity</span>
        </a>
    `;
    config.nav.forEach(n => {
        html += `
            <a href="${n.href}" class="nav-item flex items-center px-6 py-3 hover:bg-slate-800 transition group">
                <span class="mr-3 text-lg">${n.icon}</span> <span class="font-medium text-sm">${n.label}</span>
            </a>
        `;
    });
    html += `
        <a href="#phase-4" class="nav-item flex items-center px-6 py-3 hover:bg-slate-800 transition group">
            <span class="mr-3 text-lg">🏦</span> <span class="font-medium text-sm">4. Bank Spec</span>
        </a>
    `;
    nav.innerHTML = html;
}

function renderWorkbench() {
    const container = document.getElementById('dynamic-workbench-container');
    if (!container) return;
    container.innerHTML = ''; 
    const config = MODE_CONFIG[currentMode];
    
    config.sections.forEach(sec => {
        const section = document.createElement('section');
        section.id = sec.id;
        section.className = 'scroll-mt-24 pt-12 border-t border-dashed border-slate-200 mt-12 group';
        section.dataset.index = sec.index; 

        let compsHtml = '';
        sec.components.forEach(comp => {
            compsHtml += `
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative mb-8">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="font-bold text-slate-800">${comp.title}</h4>
                        ${comp.source ? `<span class="badge badge-purple">Source: ${comp.source}</span>` : ''}
                    </div>
                    ${comp.desc ? `<p class="text-slate-600 text-sm mb-4">${comp.desc}</p>` : ''}
                    
                    <div id="${comp.id}" class="w-full"></div>
                </div>
            `;
        });

        section.innerHTML = `
            <div class="flex items-center mb-6">
                <span class="bg-${sec.badgeColor}-100 text-${sec.badgeColor}-700 font-bold px-3 py-1 rounded text-sm mr-3">${sec.badge}</span>
                <h3 class="text-2xl font-bold text-slate-900">${sec.title}</h3>
            </div>
            ${sec.desc ? `<p class="mb-6 text-slate-600">${sec.desc}</p>` : ''}
            ${compsHtml}
            
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h5 class="text-xs font-bold text-slate-500 uppercase mb-3">Solutioning Questions</h5>
                <div class="space-y-3" id="${sec.qa}"></div>
                <div class="mt-3 relative inline-block text-left w-full">
                    <button onclick="addCustomQuestion('${sec.qa}')" class="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition bg-white border border-blue-200 px-3 py-2 rounded-lg shadow-sm justify-between"><span>+ Add Question</span></button>
                </div>
                 <div class="mt-4 border-t border-slate-200 pt-2">
                     <button onclick="addNote('${sec.qa}')" class="text-xs text-slate-400 hover:text-slate-600 flex items-center"><span class="mr-1">+</span> Add Note</button>
                </div>
            </div>
        `;
        container.appendChild(section);
    });
}

// --- CORE LOGIC (Persistence, Editing) ---
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw);
        if(state.master) Object.assign(masterMappings, state.master);
        
        // Load Columns
        if(state.columnWidths) columnWidths = state.columnWidths;

        // Load Rows (Unified)
        if(state.allRows) {
            allRows = state.allRows;
        } else if (state.stagingData) {
            // Migration path: old stagingData was just staging.
            // We need to merge any old target data if it exists.
            allRows = state.stagingData.map(r => ({...r, assignedTo: 'staging'}));
        }

        // Render All Tables
        refreshAllTables();
        renderFullSpec();
    } catch (e) { console.warn('loadState failed', e); }
}

function saveState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const state = raw ? JSON.parse(raw) : {};
        state.master = masterMappings;
        state.allRows = allRows;
        state.columnWidths = columnWidths; 
        
        // Save QA Data per mode
        const modeKey = currentMode;
        const modeData = { };
        const config = MODE_CONFIG[currentMode];
        config.sections.forEach(sec => {
            const qContainer = document.getElementById(sec.qa);
            if(qContainer) {
                 modeData[sec.qa] = [];
                 Array.from(qContainer.querySelectorAll('.question-row')).forEach(row => {
                     modeData[sec.qa].push({
                         text: row.querySelector('.q-text').innerText || row.querySelector('.q-text').value,
                         answer: row.querySelector('textarea.answer-text') ? row.querySelector('textarea.answer-text').value : '',
                         confirmed: row.classList.contains('confirmed'),
                         note: row.parentElement.querySelector('.note-area textarea') ? row.parentElement.querySelector('.note-area textarea').value : ''
                     });
                 });
            }
        });
        
        state[modeKey] = modeData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch(e) { console.error(e); }
}

function refreshAllTables() {
    renderSpreadsheet('unassigned-staging', 'staging');
    
    const config = MODE_CONFIG[currentMode];
    config.sections.forEach(sec => {
        sec.components.forEach(comp => {
            renderSpreadsheet(comp.id, comp.id);
        });
        
        // Restore QA
        // (Needs to pull from saved state for this mode)
        // Note: QA saving logic is separate from the row data in this simplified model.
        // Ideally QA would be its own robust data structure too.
    });
    renderGaps();
}


// --- UNIFIED SPREADSHEET RENDERER ---
// containerId: DOM ID to render into
// filterTarget: 'staging' or targetId (e.g. 'phase-fc-body')
function renderSpreadsheet(containerId, filterTarget) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Capture Scroll
    const existingWrapper = container.querySelector('.spreadsheet-container');
    const prevTop = existingWrapper ? existingWrapper.scrollTop : 0;
    const prevLeft = existingWrapper ? existingWrapper.scrollLeft : 0;

    container.innerHTML = '';

    // Filter Rows
    const rows = allRows.filter(r => r.assignedTo === filterTarget);

    if (rows.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 p-3 border rounded bg-white">No rows.</p>';
        return;
    }

    // Calculate Dimensions
    let maxCols = 0;
    allRows.forEach(row => maxCols = Math.max(maxCols, row.cells.length));
    const totalCols = 1 + maxCols;
    while(columnWidths.length < totalCols) columnWidths.push(120);

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'spreadsheet-container';
    const table = document.createElement('table');
    table.className = 'spreadsheet-table';
    
    // Header
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    
    // Action Header
    const thAction = document.createElement('th');
    thAction.className = 'col-action-header';
    thAction.innerText = 'Action';
    thAction.style.width = `${columnWidths[0]}px`;
    const resizerAction = document.createElement('div');
    resizerAction.className = 'resizer';
    resizerAction.addEventListener('mousedown', (e) => initResize(e, 0));
    thAction.appendChild(resizerAction);
    trHead.appendChild(thAction);

    for (let i = 0; i < maxCols; i++) {
        const widthIndex = i + 1;
        const th = document.createElement('th');
        th.style.width = `${columnWidths[widthIndex]}px`;
        
        const radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'activeMapCol'; radio.className = 'map-radio';
        radio.checked = (i === activeMapColumnIndex);
        radio.onclick = () => { activeMapColumnIndex = i; };
        
        const label = document.createElement('span'); label.innerText = `Col ${i + 1}`;
        const delBtn = document.createElement('span'); delBtn.className = 'col-delete-btn'; delBtn.innerText = '✕'; delBtn.title = 'Delete Column'; delBtn.onclick = (e) => { e.stopPropagation(); deleteColumn(i); };
        
        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        resizer.addEventListener('mousedown', (e) => initResize(e, widthIndex));

        th.appendChild(radio); th.appendChild(label); th.appendChild(delBtn); th.appendChild(resizer);
        trHead.appendChild(th);
    }
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(rowObj => {
        const tr = document.createElement('tr');
        // Coloring logic
        if(rowObj.question) {
            if(rowObj.question.resolved) tr.classList.add('row-resolved');
            else tr.classList.add('row-unresolved');
        }

        // Action Cell
        const tdAction = document.createElement('td');
        tdAction.className = 'action-cell';
        
        const actionContainer = document.createElement('div');
        actionContainer.className = 'action-container';

        const idBadge = document.createElement('div');
        idBadge.className = 'row-id-badge';
        idBadge.innerText = `R${rowObj.rowId}`;
        actionContainer.appendChild(idBadge);

        // Unified Assign Dropdown
        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.className = 'action-dropdown-wrapper';
        dropdownWrapper.innerHTML = `
            <button class="action-dropdown-btn" onclick="openActionDropdown(this, event, ${rowObj.rowId})">
                ${getSectionLabel(rowObj.assignedTo)} <span>▾</span>
            </button>
        `;
        actionContainer.appendChild(dropdownWrapper);

        const btnRow = document.createElement('div');
        btnRow.className = 'action-buttons-row';

        // Map Button
        const mapBtn = document.createElement('button');
        let mapClass = 'action-map-btn';
        let mapText = 'Map';
        if (rowObj.mapping) {
            if (rowObj.mapping.status === 'confirmed') { mapClass += ' mapped'; mapText = 'Mapped'; }
            else if (rowObj.mapping.status === 'pending') { mapClass += ' pending-review'; mapText = 'Review'; }
        }
        mapBtn.className = mapClass;
        mapBtn.innerText = mapText;
        mapBtn.onclick = (e) => { e.stopPropagation(); openMapModal(rowObj.rowId); };
        btnRow.appendChild(mapBtn);

        // Question Button
        const qBtn = document.createElement('button');
        let qClass = 'action-question-btn';
        if(rowObj.question) {
            if(rowObj.question.resolved) qClass += ' has-q-resolved';
            else qClass += ' has-q-unresolved';
        }
        qBtn.className = qClass;
        qBtn.innerText = '?';
        qBtn.onclick = (e) => { e.stopPropagation(); openRowQuestionModal(rowObj.rowId); };
        btnRow.appendChild(qBtn);

        actionContainer.appendChild(btnRow);
        tdAction.appendChild(actionContainer);
        tr.appendChild(tdAction);

        for(let i=0; i<maxCols; i++) {
            const td = document.createElement('td');
            td.innerText = rowObj.cells[i] || '';
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    if (prevTop > 0) tableWrapper.scrollTop = prevTop;
    if (prevLeft > 0) tableWrapper.scrollLeft = prevLeft;
}

function getSectionLabel(targetId) {
    if(targetId === 'staging') return 'Assign';
    
    // Find label in config
    let label = 'Assign';
    // Check current mode targets
    const t = MODE_CONFIG[currentMode].targets.find(x => x.id === targetId);
    if(t) label = t.label;
    // Fallback checks if strict names are needed
    return label;
}

function openActionDropdown(btn, e, rowId) {
    e.stopPropagation();
    document.querySelectorAll('.action-dropdown-menu').forEach(m => m.remove());
    
    const rect = btn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'action-dropdown-menu';
    menu.style.top = `${rect.bottom}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.display = 'block';

    // Add "Staging" option if not already there
    const stgBtn = document.createElement('button');
    stgBtn.innerText = "Staging (Unassign)";
    stgBtn.onclick = () => { updateRowAssignment(rowId, 'staging'); menu.remove(); };
    menu.appendChild(stgBtn);

    MODE_CONFIG[currentMode].targets.forEach(t => {
        const item = document.createElement('button');
        item.innerText = t.label;
        item.onclick = () => {
            updateRowAssignment(rowId, t.id);
            menu.remove();
        };
        menu.appendChild(item);
    });
    document.body.appendChild(menu);
    
    const closeMenu = () => { menu.remove(); document.removeEventListener('click', closeMenu); };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

function updateRowAssignment(rowId, targetId) {
    const row = allRows.find(r => r.rowId === rowId);
    if(row) {
        row.assignedTo = targetId;
        saveState();
        refreshAllTables(); // Updates both source and dest
        renderGaps();
        showToast(`Moved Row ${rowId}`, 'success');
    }
}

// --- MAP MODAL LOGIC ---
let activeMapRowId = null;
function openMapModal(rowId) {
    activeMapRowId = rowId;
    const modal = document.getElementById('map-modal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    
    const searchInput = document.getElementById('map-search');
    const resultsDiv = document.getElementById('map-results');
    const previewDiv = document.getElementById('map-preview-area');
    searchInput.value = '';
    resultsDiv.innerHTML = '';
    previewDiv.classList.add('hidden');
    
    // Resizer defaults
    const leftPane = document.getElementById('map-results');
    leftPane.style.width = '33%'; 

    renderMapList(Object.values(masterMappings));

    const row = allRows.find(r => r.rowId === rowId);
    if (row && row.mapping) {
        renderMapPreview(row.mapping);
    }
    searchInput.focus();
}

function renderMapList(items) {
    const list = document.getElementById('map-results');
    list.innerHTML = '';
    if (items.length === 0) { list.innerHTML = '<p class="text-xs text-slate-400 p-2">No results.</p>'; return; }
    items.slice(0, 50).forEach(m => { 
        const div = document.createElement('div');
        div.className = 'p-2 border-b border-slate-100 hover:bg-blue-50 cursor-pointer text-xs text-slate-700';
        div.innerText = m.key;
        div.onclick = () => selectMapping(m);
        list.appendChild(div);
    });
}

document.getElementById('map-search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const matches = Object.values(masterMappings).filter(m => 
        m.key.toLowerCase().includes(val) || (m.description && m.description.toLowerCase().includes(val))
    );
    renderMapList(matches);
});

function selectMapping(mapping) {
    const obj = {
        key: mapping.key,
        status: 'pending', 
        details: mapping
    };
    renderMapPreview(obj);
}

function renderMapPreview(mapObj) {
    const area = document.getElementById('map-preview-area');
    area.classList.remove('hidden');
    document.getElementById('map-key-display').innerText = mapObj.key;
    const jsonString = JSON.stringify(mapObj.details || {}, null, 2);
    const highlighted = jsonString.replace(/"(.*?)":/g, '<span class="ide-key">"$1":</span>')
                                  .replace(/: "(.*?)"/g, ': <span class="ide-string">"$1"</span>')
                                  .replace(/: (true|false|null|[0-9]+)/g, ': <span class="ide-bool">$1</span>');
    document.getElementById('map-json-block').innerHTML = highlighted;
}

function confirmMapping(status) {
    const keyText = document.getElementById('map-key-display').innerText;
    const details = masterMappings[keyText] || {};
    
    const row = allRows.find(r => r.rowId === activeMapRowId);
    if(row) {
        row.mapping = { key: keyText, status: status, details: details };
        saveState();
        refreshAllTables();
        renderGaps();
    }
    closeMapModal();
}

function removeMapping() {
    const row = allRows.find(r => r.rowId === activeMapRowId);
    if(row) { delete row.mapping; saveState(); refreshAllTables(); renderGaps(); }
    closeMapModal();
}

function closeMapModal() {
    document.getElementById('map-modal').classList.add('hidden');
    document.getElementById('map-modal').classList.remove('flex');
}

// --- MODAL RESIZING ---
let modalStartX, modalStartWidth;
function initModalResize(e) {
    e.preventDefault();
    modalStartX = e.clientX;
    const leftPane = document.getElementById('map-results');
    modalStartWidth = leftPane.getBoundingClientRect().width;
    document.documentElement.addEventListener('mousemove', doModalResize);
    document.documentElement.addEventListener('mouseup', stopModalResize);
    document.body.style.cursor = 'col-resize';
    document.getElementById('modal-resizer').classList.add('modal-resizing');
}
function doModalResize(e) {
    const diff = e.clientX - modalStartX;
    const containerWidth = document.getElementById('map-modal').querySelector('.flex.flex-1').getBoundingClientRect().width;
    let newWidth = modalStartWidth + diff;
    if (newWidth < containerWidth * 0.2) newWidth = containerWidth * 0.2;
    if (newWidth > containerWidth * 0.8) newWidth = containerWidth * 0.8;
    const leftPane = document.getElementById('map-results');
    leftPane.style.width = `${newWidth}px`;
    leftPane.style.flex = 'none';
}
function stopModalResize() {
    document.documentElement.removeEventListener('mousemove', doModalResize);
    document.documentElement.removeEventListener('mouseup', stopModalResize);
    document.body.style.cursor = 'default';
    document.getElementById('modal-resizer').classList.remove('modal-resizing');
}

// --- ROW QUESTION MODAL ---
let activeQuestionRowId = null;
function openRowQuestionModal(rowId) {
    activeQuestionRowId = rowId;
    const modal = document.getElementById('row-question-modal');
    const container = document.getElementById('row-question-container');
    container.innerHTML = ''; 
    
    const row = allRows.find(r => r.rowId === rowId);
    if(!row) return;

    const qData = row.question || { text: '', answer: '', resolved: false };
    
    const div = document.createElement('div');
    div.className = `question-row flex flex-col p-3 bg-white rounded border border-slate-200 shadow-sm ${qData.resolved ? 'confirmed' : ''}`;
    
    const header = document.createElement('div');
    header.className = 'flex items-start w-full mb-2';
    
    const icon = document.createElement('div');
    icon.className = `flex-shrink-0 pt-0.5 cursor-pointer mr-3 transition ${qData.resolved ? 'text-emerald-600' : 'text-slate-300'} hover:text-emerald-500`;
    icon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    icon.onclick = () => {
        qData.resolved = !qData.resolved;
        if(qData.resolved) {
             div.classList.add('confirmed');
             icon.classList.remove('text-slate-300'); icon.classList.add('text-emerald-600');
             input.classList.add('text-emerald-700', 'line-through');
        } else {
             div.classList.remove('confirmed');
             icon.classList.add('text-slate-300'); icon.classList.remove('text-emerald-600');
             input.classList.remove('text-emerald-700', 'line-through');
        }
        saveRowQuestion(rowId, qData);
    };

    const input = document.createElement('input');
    input.className = `q-text w-full text-sm outline-none bg-transparent font-medium text-slate-700 ${qData.resolved ? 'text-emerald-700 line-through' : ''}`;
    input.placeholder = "Type your question here...";
    input.value = qData.text;
    input.oninput = (e) => { qData.text = e.target.value; saveRowQuestion(rowId, qData); };

    header.appendChild(icon); header.appendChild(input); div.appendChild(header);

    const ansDiv = document.createElement('div');
    ansDiv.className = 'pl-8 w-full';
    const ansArea = document.createElement('textarea');
    ansArea.className = 'w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 outline-none focus:border-blue-300';
    ansArea.rows = 3;
    ansArea.placeholder = 'Enter answer...';
    ansArea.value = qData.answer;
    ansArea.oninput = (e) => { qData.answer = e.target.value; saveRowQuestion(rowId, qData); };
    
    ansDiv.appendChild(ansArea); div.appendChild(ansDiv); container.appendChild(div);

    modal.classList.remove('hidden'); modal.classList.add('flex');
    if(!qData.text) input.focus();
}

function saveRowQuestion(rowId, qData) {
    const row = allRows.find(r => r.rowId === rowId);
    if(!row) return;
    if(!qData.text && !qData.answer) { delete row.question; } 
    else { row.question = qData; }
    saveState();
    refreshAllTables();
}

function closeRowQuestionModal() {
    document.getElementById('row-question-modal').classList.add('hidden');
    document.getElementById('row-question-modal').classList.remove('flex');
}


// --- COLUMN RESIZING LOGIC ---
let startX, startWidth, resizingColIndex;

function initResize(e, colIndex) {
    e.preventDefault(); 
    startX = e.clientX;
    resizingColIndex = colIndex;
    startWidth = columnWidths[colIndex] || 120;
    
    document.documentElement.addEventListener('mousemove', doResize);
    document.documentElement.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
}

function doResize(e) {
    const diff = e.clientX - startX;
    const newWidth = Math.max(20, startWidth + diff); 
    columnWidths[resizingColIndex] = newWidth;
    
    // Update ALL tables (since widths are global now)
    document.querySelectorAll('.spreadsheet-table').forEach(table => {
         const ths = table.querySelectorAll('th');
         if(ths[resizingColIndex]) {
            ths[resizingColIndex].style.width = `${newWidth}px`;
         }
    });
}

function stopResize() {
    document.documentElement.removeEventListener('mousemove', doResize);
    document.documentElement.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = 'default';
    saveState(); 
}

function deleteColumn(colIndex) {
    if(!confirm(`Delete Column ${colIndex+1}?`)) return;
    allRows.forEach(row => {
        row.cells.splice(colIndex, 1);
    });
    columnWidths.splice(colIndex + 1, 1); 
    if(activeMapColumnIndex >= colIndex && activeMapColumnIndex > 0) activeMapColumnIndex--;
    saveState();
    refreshAllTables();
}

// --- Deep Linking for Gaps ---
function scrollToRow(specText) {
    // Need to search across all rendered tables
    const badges = document.querySelectorAll('.row-id-badge');
    for(let b of badges) {
        // specText in gaps usually is the row value, but let's search text content of rows
        const tr = b.closest('tr');
        if(tr.innerText.includes(specText)) {
             tr.scrollIntoView({behavior: 'smooth', block: 'center'});
             tr.classList.add('highlight-flash');
             setTimeout(()=>tr.classList.remove('highlight-flash'), 2000);
             return;
        }
    }
    showToast('Row not found in current view', 'error');
}

// --- Question Builder Logic ---
function addCustomQuestion(containerId) { const c = document.getElementById(containerId); const div = document.createElement('div'); div.className = 'question-row flex flex-col p-3 bg-white rounded border border-blue-200 shadow-sm mt-2 animate-pulse'; div.innerHTML = `<div class="flex items-start w-full"><div class="flex-shrink-0 pt-0.5 cursor-pointer mr-3 text-slate-300 hover:text-emerald-500 transition" onclick="toggleConfirm(this.closest('.question-row'))"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><input type="text" placeholder="Type your custom question..." class="q-text w-full text-sm outline-none bg-transparent font-medium text-slate-700" onblur="this.parentElement.parentElement.classList.remove('animate-pulse')"></div><div class="mt-2 w-full pl-8"><button onclick="toggleAnswer(this)" class="text-[10px] font-bold text-blue-500 hover:text-blue-700 mb-1">+ Add Answer</button><div class="answer-box hidden"><textarea class="answer-text w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 outline-none focus:border-blue-300" rows="2" placeholder="Answer..."></textarea></div></div>`; c.appendChild(div); div.querySelector('input').focus(); }
function createQuestionEl(container, text, ans, confirmed, note) { const div = document.createElement('div'); div.className = `question-row flex flex-col p-3 bg-white rounded border border-slate-200 mt-2 ${confirmed?'confirmed':''}`; div.innerHTML = `<div class="flex items-start w-full"><div class="flex-shrink-0 pt-0.5 cursor-pointer mr-3 ${confirmed?'text-emerald-600':'text-slate-300'} hover:text-emerald-500 transition" onclick="toggleConfirm(this.closest('.question-row'))"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><p class="q-text text-sm font-medium ${confirmed?'text-emerald-700 line-through':''}">${text}</p></div><div class="mt-2 w-full pl-8"><button onclick="toggleAnswer(this)" class="text-[10px] font-bold text-blue-500 hover:text-blue-700 mb-1">${ans ? '- Hide Answer' : '+ Add Answer'}</button><div class="answer-box ${ans ? 'visible' : 'hidden'}"><textarea class="answer-text w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 outline-none focus:border-blue-300" rows="2" placeholder="Answer...">${ans||''}</textarea></div></div>`; container.appendChild(div); if(note) addNote(container.id, note); }
function toggleConfirm(row) { row.classList.toggle('confirmed'); const icon = row.querySelector('svg').parentElement; const text = row.querySelector('.q-text'); if(row.classList.contains('confirmed')) { icon.classList.remove('text-slate-300'); icon.classList.add('text-emerald-600'); text.classList.add('text-emerald-700','line-through'); } else { icon.classList.add('text-slate-300'); icon.classList.remove('text-emerald-600'); text.classList.remove('text-emerald-700','line-through'); } saveState(); }
function toggleAnswer(btn) { const box = btn.nextElementSibling; box.classList.toggle('hidden'); box.classList.toggle('visible'); btn.innerText = box.classList.contains('hidden') ? "+ Add Answer" : "- Hide Answer"; }
function addNote(containerId, initialValue='') { const c = document.getElementById(containerId).parentElement; let note = c.querySelector('.note-area'); if(!note) { note = document.createElement('div'); note.className = "mt-4 border-t border-slate-100 pt-3 note-area"; note.innerHTML = `<h6 class="text-[10px] font-bold text-slate-400 uppercase mb-2">Notes</h6><textarea class="w-full text-sm bg-yellow-50 border border-yellow-100 rounded p-2 text-slate-700 focus:outline-none focus:border-yellow-300 shadow-sm" rows="3" placeholder="Add context...">${initialValue}</textarea>`; c.appendChild(note); } if(!initialValue) note.querySelector('textarea').focus(); }

// Master Spec
function renderFullSpec() { const tbody = document.getElementById('full-spec-body'); tbody.innerHTML = ''; const filter = (window.__masterFilter || '').toLowerCase().trim(); Object.values(masterMappings).sort((a,b)=>(a.key.localeCompare(b.key))).forEach(m => { if (filter && !(m.key+m.valueType+(m.spec||'')).toLowerCase().includes(filter)) return; const tr = document.createElement('tr'); tr.className = 'hover:bg-slate-50 border-b border-slate-100'; const specDisplay = m.spec ? `<span class="text-blue-700 font-medium">${m.spec}</span> <button class="ml-2 text-[10px] text-red-400 hover:text-red-600 master-clear" data-const="${m.key}">✕</button>` : `<button class="text-[10px] px-2 py-1 bg-slate-100 rounded master-attach" data-const="${m.key}">Attach</button>`; tr.innerHTML = `<td class="p-3 font-mono text-xs text-blue-600"><span class="spec-key" title="${m.key}">${m.key}</span><button class="ml-2 text-slate-300 hover:text-blue-500 master-copy" data-const="${m.key}">📋</button></td><td class="p-3 text-xs text-slate-500">${m.valueType}</td><td class="p-3 text-sm">${specDisplay}</td><td class="p-3"><span class="status-badge ${m.status}" data-const="${m.key}">${m.status}</span></td>`; tbody.appendChild(tr); }); document.getElementById('master-count').innerText = Object.values(masterMappings).length; }
function getAllSpecPool() { const set = new Set(); allRows.forEach(row => { row.cells.forEach(c => set.add(c.trim())); }); return Array.from(set).filter(s=>s.length); }
function assignSpecToConstant(constKey, spec) { masterMappings[constKey].spec = spec; masterMappings[constKey].status = 'mapped'; renderFullSpec(); saveState(); }
document.addEventListener('click', e => {
     const attachBtn = e.target.closest('.master-attach'); if(attachBtn) { const key = attachBtn.dataset.const; const pool = getAllSpecPool(); const widget = document.createElement('div'); widget.className = 'attach-widget'; widget.innerHTML = `<input class="attach-input" placeholder="Search spec..."><div class="attach-list hidden"></div>`; attachBtn.replaceWith(widget); const input = widget.querySelector('input'); const list = widget.querySelector('.attach-list'); const filterList = (v) => { list.innerHTML = ''; pool.filter(p=>p.toLowerCase().includes(v.toLowerCase())).forEach(p=>{ const it = document.createElement('div'); it.className='attach-item'; it.innerText=p; it.onclick=()=>{assignSpecToConstant(key, p)}; list.appendChild(it); }); if(!list.children.length) list.innerHTML='<div class="p-2 text-xs text-gray-400">No matches</div>'; }; input.addEventListener('input', (ev)=>{ list.classList.remove('hidden'); filterList(ev.target.value); }); input.addEventListener('focus', ()=>{ list.classList.remove('hidden'); filterList(''); }); input.addEventListener('blur', ()=>{ setTimeout(()=>{ if(widget.parentNode) { widget.replaceWith(attachBtn); } }, 200); }); input.focus(); }
     const clearBtn = e.target.closest('.master-clear'); if(clearBtn) { masterMappings[clearBtn.dataset.const].spec = ''; masterMappings[clearBtn.dataset.const].status='pending'; renderFullSpec(); saveState(); }
     const copyBtn = e.target.closest('.master-copy'); if(copyBtn) { navigator.clipboard.writeText(copyBtn.dataset.const); showToast('Copied'); }
     const ms = e.target.closest('.status-badge[data-const]'); if(ms) { const sel = document.createElement('select'); sel.className='text-xs border rounded'; ['pending','mapped','gap'].forEach(v=>sel.add(new Option(v,v,false,v===ms.innerText))); sel.onchange=()=>{ masterMappings[ms.dataset.const].status=sel.value; renderFullSpec(); saveState(); }; sel.onblur=()=>renderFullSpec(); ms.replaceWith(sel); sel.focus(); }
});
document.getElementById('master-search').addEventListener('input', (e)=>{ window.__masterFilter=e.target.value; renderFullSpec(); });
document.getElementById('master-toggle-wrap').onclick = function() { document.querySelectorAll('.spec-key').forEach(s=>s.classList.toggle('wrap')); this.querySelector('span').innerText = this.querySelector('span').innerText==='off'?'on':'off'; };

// Boilerplate
function toggleExport() { document.getElementById('export-modal').classList.toggle('hidden'); }
async function copyToClipboardHTML() { /* ... (reusing previous) ... */ }
function downloadCSV() { /* ... (reusing previous) ... */ }
function toggleUploader(){ const m = document.getElementById('uploader-modal'); if(!m.classList.contains('hidden')) movePreviewToStaging(); m.classList.toggle('hidden'); }
async function loadFispanConstants() { try { const paths = ['docs/data/fispan-constants.flat.json', 'data/fispan-constants.flat.json', './data/fispan-constants.flat.json']; let res; for(let p of paths) { try { res = await fetch(p); if(res.ok) break; } catch(e){} } const constants = await res.json(); constants.forEach(c => { if (!masterMappings[c.key]) masterMappings[c.key] = { key: c.key, valueType: c.valueType||'', description: c.description||'', spec: '', status: 'pending' }; }); renderFullSpec(); } catch (e) { console.warn('Fetch error', e); renderFullSpec(); } }
function switchTab(t) { ['summary','full','visualizer','tags'].forEach(x => { document.getElementById('view-'+x).classList.add('hidden'); document.getElementById('btn-'+x).classList.remove('active'); }); document.getElementById('view-'+t).classList.remove('hidden'); document.getElementById('btn-'+t).classList.add('active'); if(t==='tags') renderTagsView(); }
function renderTagsView() { /* ... */ }
function showToast(msg, type='info') { const c = document.getElementById('toast-container') || document.body.appendChild(Object.assign(document.createElement('div'),{id:'toast-container'})); const t = document.createElement('div'); t.className = `toast ${type}`; t.innerText = msg; c.appendChild(t); setTimeout(()=>t.classList.add('show'),10); setTimeout(()=>t.remove(), 3000); }
function saveNow() { saveState(); showToast('Saved', 'success'); }
function resetState() { if(confirm('Reset?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }
document.getElementById('btn-upload-csv').addEventListener('click', () => document.getElementById('csv-file-input').click());
document.getElementById('csv-file-input').addEventListener('change', (e) => handleCSV(e.target.files[0]));
function handleCSV(f) { const r = new FileReader(); r.onload = (e) => { const text = e.target.result; const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); const newRows = []; lines.forEach((line, idx) => { const cells = []; let cur = ''; let inQuotes = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (inQuotes && line[i+1] === '"') { cur += '"'; i++; } else inQuotes = !inQuotes; } else if (ch === ',' && !inQuotes) { cells.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; } else { cur += ch; } } cells.push(cur.trim().replace(/^"|"$/g, '')); newRows.push({ rowId: idx+1, cells: cells, assignedTo: 'staging' }); }); allRows = [...allRows, ...newRows]; refreshAllTables(); saveState(); }; r.readAsText(f); }
function movePreviewToStaging() {}
function updateContext(mode) { const ctx = document.getElementById('dynamic-context'); if(!ctx) return; if(mode === 'sftp') { ctx.className = 'mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 flex items-start'; ctx.innerHTML = '<span class="mr-2">💡</span><p><strong>Nudge:</strong> Since SFTP is selected, suggest PGP Encryption for security compliance.</p>'; } else { ctx.className = 'mb-6 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900 flex items-start'; ctx.innerHTML = '<span class="mr-2">⚠️</span><p><strong>Caution:</strong> API implementations often require complex Idempotency logic.</p>'; } }
function addPresetQuestion(id, text) { const c = document.getElementById(id); if(c) createQuestionEl(c, text); toggleDropdown(id.replace('q-','dd-')); }
function toggleDropdown(id) { document.getElementById(id).classList.toggle('hidden'); }
function closeConstModal() { document.getElementById('const-modal').classList.add('hidden'); document.getElementById('const-modal').classList.remove('flex'); }
const contextToggle = document.getElementById('toggle-feed-context'); const feedContainer = document.getElementById('feed-container');
contextToggle.addEventListener('change', (e) => { if (e.target.checked) { feedContainer.classList.add('show-modals'); document.querySelectorAll('.feed-modal').forEach(m => m.classList.add('enabled')); } else { feedContainer.classList.remove('show-modals'); document.querySelectorAll('.feed-modal').forEach(m => m.classList.remove('enabled')); } });
function toggleSidebar(side) { if (side === 'left') { document.querySelector('aside').classList.toggle('collapsed'); } else { document.querySelector('aside:last-of-type').classList.toggle('collapsed'); } }
document.addEventListener('DOMContentLoaded', () => { loadFispanConstants(); const savedMode = localStorage.getItem(STORAGE_KEY + ':mode'); if(savedMode && MODE_CONFIG[savedMode]) currentMode = savedMode; switchMode(currentMode, true); const leftBtn = document.createElement('button'); leftBtn.className = 'sidebar-toggle'; leftBtn.id = 'toggle-left'; leftBtn.innerHTML = '⬅️'; leftBtn.onclick = () => toggleSidebar('left'); document.body.appendChild(leftBtn); const rightBtn = document.createElement('button'); rightBtn.className = 'sidebar-toggle'; rightBtn.id = 'toggle-right'; rightBtn.innerHTML = '➡️'; rightBtn.onclick = () => toggleSidebar('right'); document.body.appendChild(rightBtn); window.addEventListener('beforeunload', () => saveState()); const mainScroll = document.getElementById('main-scroll'); mainScroll.addEventListener('scroll', () => { const sections = document.querySelectorAll('section'); let currentId = ''; sections.forEach(s => { if(mainScroll.scrollTop >= s.offsetTop - 300) currentId = s.id; }); document.querySelectorAll('.nav-item').forEach(n => { n.classList.remove('active'); if(n.getAttribute('href').includes(currentId)) n.classList.add('active'); }); let phaseIndex = 0; if (currentId === 'phase-1') phaseIndex = 1; else if (currentId === 'phase-4') phaseIndex = 4; else { const sec = document.getElementById(currentId); if(sec && sec.dataset.index) phaseIndex = parseInt(sec.dataset.index); } document.querySelectorAll('.feed-item').forEach(item => { if(parseInt(item.dataset.phase) === phaseIndex) item.classList.add('active'); else item.classList.remove('active'); }); }); });
document.addEventListener('click', e => { if(e.target.matches('.status-badge') && !e.target.hasAttribute('data-const')) { const b = e.target; const vals = ['pending','mapped','gap']; const next = vals[(vals.indexOf(b.innerText)+1)%3]; b.className = `status-badge ${next}`; b.innerText = next; saveState(); } });
function renderGaps() {
     const gaps = [];
     // Simply check all rows that are NOT in staging and see if they are missing mappings
     allRows.filter(r => r.assignedTo !== 'staging').forEach(r => {
         if(!r.mapping || r.mapping.status === 'pending') {
             // Find which section it belongs to for the report
             let targetLabel = 'Unknown';
             MODE_CONFIG[currentMode].targets.forEach(t => { if(t.id === r.assignedTo) targetLabel = t.label; });
             gaps.push({ target: targetLabel, spec: `Row ${r.rowId}: ${r.cells[activeMapColumnIndex]||''}` });
         }
     });

     const c = document.getElementById('gaps-list');
     if(!gaps.length) { c.innerHTML = '<p class="text-xs text-slate-500">No gaps detected.</p>'; return; }
     const grp = {}; gaps.forEach(g => { grp[g.target] = grp[g.target] || []; grp[g.target].push(g.spec); });
     let html = '<div class="space-y-3">'; 
     const icons = {'Control Headers/Trailers':'📂','Payer & Payee Fields':'👤','Instruction Fields':'💸','Remittance Fields':'🧾','Native ERP Data':'🖥️','Plugin Enrichment':'🔌','Transformation Rules':'⚙️'};
     Object.keys(grp).forEach(k => {
         const icon = icons[k] || '🔹';
         html += `<div class="p-3 bg-white rounded border border-slate-200">
            <div class="font-bold text-sm mb-2 text-slate-700">${icon} ${k}</div>
            <ul class="space-y-1">
                ${grp[k].map(s => {
                    return `<li><button onclick="scrollToRow('${s.replace(/'/g,"\\'")}')" class="text-xs text-blue-600 hover:underline hover:text-blue-800 text-left w-full truncate block transition-colors">● ${s}</button></li>`
                }).join('')}
            </ul>
         </div>`; 
     }); 
     c.innerHTML = html + '</div>';
     const countEl = document.getElementById('gap-count');
     if(countEl) countEl.innerText = gaps.length > 0 ? `${gaps.length} items` : '';
}