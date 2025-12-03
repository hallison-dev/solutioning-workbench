// --- DATA & CONFIG ---
const masterMappings = {};
const STORAGE_KEY = 'solutioning-workbench-state-v1';
let currentMode = 'enrichment'; 
// Staging Data: Array of objects { rowId: 1, cells: ["val1", "val2"], category: "payer" }
let stagingData = [];
// Which column index is the "Active" mapping column? (Default 0 for Col 2 value if preserving structure)
// Logic: Col 0 = Row ID (internal), Cells[0] = Col 1 (CSV), Cells[1] = Col 2 (CSV).
let activeMapColumnIndex = 0; // Default to first data column

const MODE_CONFIG = {
    enrichment: {
        label: 'Data Enrichment Story',
        targets: [
            { id: 'erp-native-body', label: 'ERP', color: 'purple' },
            { id: 'erp-plugin-body', label: 'PLG', color: 'blue' },
            { id: 'platform-workbench-body', label: 'PLT', color: 'indigo' }
        ],
        nav: [
            { href: '#phase-2', icon: '🖥️', label: '2. ERP & Plugin' },
            { href: '#phase-3', icon: '⚙️', label: '3. Platform Logic' }
        ],
        sections: [
            {
                id: 'phase-2', badge: 'PHASE 2', badgeColor: 'purple', title: 'ERP & Plugin Context', index: 2,
                components: [
                    { id: 'erp-native-body', title: '2A. Native ERP Data', source: 'General Ledger', desc: 'Data pulled directly from the ERP (e.g., Vendor Master, Open Bills).', btnLabel: 'Add Native Mapping' },
                    { id: 'erp-plugin-body', title: '2B. Plugin Enrichment', source: 'User Input', desc: 'Data configured or input by the user at runtime.', btnLabel: 'Add Plugin Mapping' }
                ],
                qa: 'q-phase-2'
            },
            {
                id: 'phase-3', badge: 'PHASE 3', badgeColor: 'indigo', title: 'FISPAN Platform Logic', index: 3,
                components: [
                    { id: 'platform-workbench-body', title: 'Transformation Rules', desc: 'Transformation Rules & Validation Gates (e.g., File Naming, Encryption).', btnLabel: 'Add Logic Rule' }
                ],
                qa: 'q-phase-3'
            }
        ],
        tags: [
            { id: 'payer', label: 'Payer' }, { id: 'payee', label: 'Payee' }, { id: 'bill', label: 'Bill' }
        ]
    },
    logical: {
        label: 'Logical Isolation Story',
        targets: [
            { id: 'phase-fc-body', label: 'FC', color: 'slate' },
            { id: 'phase-ed-body', label: 'ED', color: 'blue' },
            { id: 'phase-pi-body', label: 'PI', color: 'emerald' },
            { id: 'phase-rm-body', label: 'RM', color: 'amber' }
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
                desc: 'Metadata that tells the bank how to process the file (Dates, Totals).',
                components: [{ id: 'phase-fc-body', title: 'Control Headers/Trailers', btnLabel: 'Add Control Mapping' }], qa: 'q-phase-fc'
            },
            {
                id: 'phase-ed', badge: 'THE ACTORS', badgeColor: 'blue', title: 'Entity Details', index: 3,
                desc: 'Payer & Payee Info: The two parties involved in the transaction.',
                components: [{ id: 'phase-ed-body', title: 'Payer & Payee Fields', btnLabel: 'Add Entity Mapping' }], qa: 'q-phase-ed'
            },
            {
                id: 'phase-pi', badge: 'THE ACTION', badgeColor: 'emerald', title: 'Payment Instruction', index: 3, 
                desc: 'The specific transfer of value (Check Num, Amount, Date).',
                components: [{ id: 'phase-pi-body', title: 'Instruction Fields', btnLabel: 'Add Instruction Mapping' }], qa: 'q-phase-pi'
            },
            {
                id: 'phase-rm', badge: 'THE CONTEXT', badgeColor: 'amber', title: 'Remittance Data', index: 3,
                desc: 'Information the vendor needs to reconcile their books (Invoice #s).',
                components: [{ id: 'phase-rm-body', title: 'Remittance Fields', btnLabel: 'Add Remittance Mapping' }], qa: 'q-phase-rm'
            }
                ],
        tags: [
            { id: 'fc', label: 'File Control' }, { id: 'ed', label: 'Entity Details' }, 
            { id: 'pi', label: 'Payment Instr.' }, { id: 'rm', label: 'Remittance' }
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
    renderGaps();
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
                    <div class="border border-slate-200 rounded-lg overflow-hidden mb-4">
                        <table class="w-full text-sm text-left">
                            <thead class="bg-slate-50 text-slate-700 font-bold">
                                <tr><th class="p-3 border-b bg-slate-100 w-1/3">Spec Requirement</th><th class="p-3 border-b bg-slate-100 w-1/3">FISPAN Source</th><th class="p-3 border-b bg-slate-100">Status</th><th class="p-3 border-b bg-slate-100 text-right">Action</th></tr>
                            </thead>
                            <tbody id="${comp.id}" class="divide-y divide-slate-100"></tbody>
                        </table>
                        <div class="p-2 bg-slate-50 border-t border-slate-200 text-center"><button onclick="addRow('${comp.id}')" class="text-xs text-blue-600 font-bold hover:text-blue-800">+ ${comp.btnLabel}</button></div>
                    </div>
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
        // Load Staging Data
        if(state.stagingData) stagingData = state.stagingData;
        else if(state.staging) {
            // Migration from old string-based staging to cell-based staging
            stagingData = state.staging.map((s, i) => ({ 
                rowId: i+1, 
                cells: typeof s === 'string' ? [s] : [s.text], 
                category: s.category 
            }));
        }

        const modeKey = currentMode; 
        const modeData = state[modeKey] || {};
        const config = MODE_CONFIG[currentMode];
        config.sections.forEach(sec => {
            sec.components.forEach(comp => {
                const tbody = document.getElementById(comp.id);
                if(tbody && modeData[comp.id]) {
                    tbody.innerHTML = '';
                    modeData[comp.id].forEach(r => createTableRow(tbody, r));
                }
            });
            if(modeData[sec.qa]) {
               const qContainer = document.getElementById(sec.qa);
               if(qContainer) {
                   qContainer.innerHTML = '';
                   modeData[sec.qa].forEach(q => createQuestionEl(qContainer, q.text, q.answer, q.confirmed, q.note));
               }
            }
        });
        
        renderStagingTable(); // Replaces old renderStagingRow logic
        renderFullSpec();
    } catch (e) { console.warn('loadState failed', e); }
}

function saveState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const state = raw ? JSON.parse(raw) : {};
        state.master = masterMappings;
        state.stagingData = stagingData; // Save robust staging data
        
        const modeKey = currentMode;
        const modeData = { };
        const config = MODE_CONFIG[currentMode];
        config.sections.forEach(sec => {
            sec.components.forEach(comp => {
                const tbody = document.getElementById(comp.id);
                if(tbody) {
                    modeData[comp.id] = [];
                    Array.from(tbody.querySelectorAll('tr')).forEach(tr => modeData[comp.id].push(extractRowData(tr)));
                }
            });
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

function extractRowData(tr) {
    const spec = tr.children[0].innerText.replace(tr.children[0].querySelector('.tag-badge')?.innerText || '', '').trim();
    const mapInput = tr.children[1].querySelector('input');
    const mapping = mapInput ? mapInput.value : tr.children[1].innerText;
    const statusBadge = tr.children[2].querySelector('.status-badge') || tr.children[2].querySelector('select');
    const status = statusBadge.value || statusBadge.innerText;
    const category = tr.dataset.category;
    return { spec, mapping, status, category };
}

function createTableRow(tbody, data) {
    const tr = document.createElement('tr');
    const catHtml = data.category ? `<span class="tag-badge">${data.category}</span>` : '';
    
    // Visual Split Logic
    let specDisplay = data.spec;
    const match = data.spec.match(/^Row\s+(\d+)[:\s]+(.*)/i);
    if (match) {
        specDisplay = `<span class="row-id-badge">Row ${match[1]}</span><span class="font-bold text-slate-700 text-sm">${match[2]}</span>`;
    } else {
        specDisplay = `<span class="text-sm font-medium text-slate-700">${data.spec}</span>`;
    }

    tr.innerHTML = `
        <td class="p-3 align-middle">${specDisplay} ${catHtml}</td>
        <td class="p-3">
            <div class="autocomplete-wrapper">
                <input type="text" placeholder="Map to..." value="${data.mapping||''}" class="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-sm" oninput="saveState()" autocomplete="off">
                <div class="autocomplete-list"></div>
            </div>
        </td>
        <td class="p-3 align-middle"></td>
        <td class="p-3 text-right align-middle"><button class="text-xs text-blue-600 hover:underline" onclick="editRow(this)">Edit</button></td>
    `;
    if(data.category) tr.dataset.category = data.category;
    tbody.appendChild(tr);
    
    setupFispanAutocomplete(tr.querySelector('input'), tr.querySelector('.autocomplete-list'));

    const tdStatus = tr.children[2];
    const badge = document.createElement('span');
    badge.className = `status-badge ${data.status||'pending'}`;
    badge.innerText = data.status||'pending';
    tdStatus.appendChild(badge);
}

function setupFispanAutocomplete(input, list) {
    input.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if (!val) { list.style.display = 'none'; return; }
        const matches = Object.values(masterMappings).filter(m => 
            m.key.toLowerCase().includes(val) || (m.description && m.description.toLowerCase().includes(val))
        );
        list.innerHTML = '';
        if(matches.length > 0) {
            list.style.display = 'block';
            matches.slice(0, 10).forEach(m => { 
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerHTML = `<strong>${m.key}</strong><span class="autocomplete-desc">${m.description || ''}</span>`;
                div.onclick = () => {
                    input.value = m.key;
                    list.style.display = 'none';
                    saveState();
                    renderGaps(); 
                };
                list.appendChild(div);
            });
        } else {
            list.style.display = 'none';
        }
    });
    input.addEventListener('blur', () => setTimeout(() => list.style.display = 'none', 200));
    input.addEventListener('focus', (e) => { if(e.target.value) e.target.dispatchEvent(new Event('input')); });
}

// --- STAGING LOGIC (Updated for Spreadsheet) ---
function renderStagingTable() {
    const container = document.getElementById('unassigned-staging');
    if (!container) return;
    container.innerHTML = '';

    if (stagingData.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 p-3">No unassigned rows.</p>';
        return;
    }

    // Determine max columns
    let maxCols = 0;
    stagingData.forEach(row => maxCols = Math.max(maxCols, row.cells.length));

    // Create Table
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'spreadsheet-container';
    const table = document.createElement('table');
    table.className = 'spreadsheet-table';
    
    // Header
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    
    // Col 0: Action/RowID
    const thAction = document.createElement('th');
    thAction.className = 'col-action-header';
    thAction.innerText = 'Action';
    trHead.appendChild(thAction);

    for (let i = 0; i < maxCols; i++) {
        const th = document.createElement('th');
        // Radio for mapping selection
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'activeMapCol';
        radio.className = 'map-radio';
        radio.checked = (i === activeMapColumnIndex);
        radio.onclick = () => { activeMapColumnIndex = i; };
        
        const label = document.createElement('span');
        label.innerText = `Col ${i + 1}`;
        
        const delBtn = document.createElement('span');
        delBtn.className = 'col-delete-btn';
        delBtn.innerText = '✕';
        delBtn.title = 'Delete Column';
        delBtn.onclick = (e) => { e.stopPropagation(); deleteColumn(i); };

        th.appendChild(radio);
        th.appendChild(label);
        th.appendChild(delBtn);
        trHead.appendChild(th);
    }
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    stagingData.forEach((rowObj, idx) => {
        const tr = document.createElement('tr');
        
        // Action Cell
        const tdAction = document.createElement('td');
        tdAction.className = 'bg-slate-50 sticky left-0 z-10 border-r';
        
        // Render Action Buttons (Stacked/Compact)
        const btnDiv = document.createElement('div');
        btnDiv.className = 'flex flex-col gap-1';
        // Row ID Badge
        const idBadge = document.createElement('div');
        idBadge.className = 'row-id-badge mb-1 text-center';
        idBadge.innerText = `Row ${rowObj.rowId}`;
        btnDiv.appendChild(idBadge);

        MODE_CONFIG[currentMode].targets.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `text-[9px] bg-${t.color}-100 text-${t.color}-700 px-1 py-0.5 rounded hover:bg-${t.color}-200 w-full text-center`;
            btn.innerText = t.label;
            btn.onclick = () => assignStagingRow(idx, t.id);
            btnDiv.appendChild(btn);
        });
        tdAction.appendChild(btnDiv);
        tr.appendChild(tdAction);

        // Data Cells
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
}

function assignStagingRow(dataIndex, targetId) {
    const rowObj = stagingData[dataIndex];
    const val = rowObj.cells[activeMapColumnIndex] || rowObj.cells[0]; // Fallback
    const specText = `Row ${rowObj.rowId}: ${val}`;
    
    const tbody = document.getElementById(targetId);
    if(tbody) {
        createTableRow(tbody, { spec: specText, mapping: '', status: 'pending', category: '' });
        stagingData.splice(dataIndex, 1); // Remove from staging
        renderStagingTable();
        saveState();
        renderGaps();
        showToast('Assigned row ' + rowObj.rowId, 'success');
    }
}

function deleteColumn(colIndex) {
    if(!confirm(`Delete Column ${colIndex+1}?`)) return;
    stagingData.forEach(row => {
        row.cells.splice(colIndex, 1);
    });
    // Adjust active index if needed
    if(activeMapColumnIndex >= colIndex && activeMapColumnIndex > 0) activeMapColumnIndex--;
    renderStagingTable();
    saveState();
}

function assignRow(btn, targetId) {
    // Legacy/Fallback logic if needed, but assignStagingRow replaces this for staging
}
function addRow(tbodyId) {
    createTableRow(document.getElementById(tbodyId), { spec: 'New Requirement', mapping: '', status: 'pending' });
    saveState();
}
function editRow(btn) {
    const tr = btn.closest('tr');
    const actionTd = tr.children[3];
    actionTd.innerHTML = `
        <div class="flex gap-2 justify-end">
             <button class="text-xs text-blue-600" onclick="saveRowBtn(this)">Save</button>
             <button class="text-xs text-red-600" onclick="toggleUnassignMark(this)">Unassign</button>
        </div>
    `;
}
function saveRowBtn(btn) {
    const tr = btn.closest('tr');
    if(tr.dataset.unassign === '1') {
        // Unassign logic: Move back to staging?
        // Extract original text. This is hard because we formatted it.
        // For MVP, just delete or create a basic staging row.
        const specRaw = tr.children[0].innerText; 
        // Try to parse "Row 123: Value"
        const m = specRaw.match(/Row\s+(\d+)[:\s]+(.*)/);
        if(m) {
            stagingData.push({ rowId: m[1], cells: [m[2]], category: '' });
        } else {
            stagingData.push({ rowId: '?', cells: [specRaw], category: '' });
        }
        renderStagingTable();
        tr.remove();
    } else {
        const actionTd = tr.children[3];
        actionTd.innerHTML = `<button class="text-xs text-blue-600 hover:underline" onclick="editRow(this)">Edit</button>`;
    }
    saveState();
    renderGaps();
}
function toggleUnassignMark(btn) {
    const tr = btn.closest('tr');
    if(tr.dataset.unassign === '1') {
        delete tr.dataset.unassign; tr.classList.remove('unassign-mark'); btn.innerText = 'Unassign';
    } else {
        tr.dataset.unassign = '1'; tr.classList.add('unassign-mark'); btn.innerText = 'Undo';
    }
}

// --- Deep Linking for Gaps ---
function scrollToRow(specText) {
    const cells = document.querySelectorAll('td:first-child');
    for(let td of cells) {
        if(td.innerText.includes(specText)) {
            const tr = td.parentElement;
            tr.scrollIntoView({behavior: 'smooth', block: 'center'});
            tr.classList.add('highlight-flash');
            setTimeout(()=>tr.classList.remove('highlight-flash'), 2000);
            const input = tr.querySelector('input');
            if(input) input.focus();
            return;
        }
    }
    showToast('Row not found in current view', 'error');
}

// --- Question Builder Logic ---
function addCustomQuestion(containerId) {
     const c = document.getElementById(containerId);
     const div = document.createElement('div');
     div.className = 'question-row flex flex-col p-3 bg-white rounded border border-blue-200 shadow-sm mt-2 animate-pulse';
     div.innerHTML = `
        <div class="flex items-start w-full">
            <div class="flex-shrink-0 pt-0.5 cursor-pointer mr-3 text-slate-300 hover:text-emerald-500 transition" onclick="toggleConfirm(this.closest('.question-row'))"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
            <input type="text" placeholder="Type your custom question..." class="q-text w-full text-sm outline-none bg-transparent font-medium text-slate-700" onblur="this.parentElement.parentElement.classList.remove('animate-pulse')">
        </div>
        <div class="mt-2 w-full pl-8"><button onclick="toggleAnswer(this)" class="text-[10px] font-bold text-blue-500 hover:text-blue-700 mb-1">+ Add Answer</button><div class="answer-box hidden"><textarea class="answer-text w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 outline-none focus:border-blue-300" rows="2" placeholder="Answer..."></textarea></div></div>
     `;
     c.appendChild(div);
     div.querySelector('input').focus();
}
function createQuestionEl(container, text, ans, confirmed, note) {
     const div = document.createElement('div');
     div.className = `question-row flex flex-col p-3 bg-white rounded border border-slate-200 mt-2 ${confirmed?'confirmed':''}`;
     div.innerHTML = `
        <div class="flex items-start w-full">
            <div class="flex-shrink-0 pt-0.5 cursor-pointer mr-3 ${confirmed?'text-emerald-600':'text-slate-300'} hover:text-emerald-500 transition" onclick="toggleConfirm(this.closest('.question-row'))"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
            <p class="q-text text-sm font-medium ${confirmed?'text-emerald-700 line-through':''}">${text}</p>
        </div>
        <div class="mt-2 w-full pl-8">
            <button onclick="toggleAnswer(this)" class="text-[10px] font-bold text-blue-500 hover:text-blue-700 mb-1">${ans ? '- Hide Answer' : '+ Add Answer'}</button>
            <div class="answer-box ${ans ? 'visible' : 'hidden'}"><textarea class="answer-text w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 outline-none focus:border-blue-300" rows="2" placeholder="Answer...">${ans||''}</textarea></div>
        </div>
     `;
     container.appendChild(div);
     if(note) addNote(container.id, note);
}
function toggleConfirm(row) {
    row.classList.toggle('confirmed');
    const icon = row.querySelector('svg').parentElement;
    const text = row.querySelector('.q-text');
    if(row.classList.contains('confirmed')) { icon.classList.remove('text-slate-300'); icon.classList.add('text-emerald-600'); text.classList.add('text-emerald-700','line-through'); }
    else { icon.classList.add('text-slate-300'); icon.classList.remove('text-emerald-600'); text.classList.remove('text-emerald-700','line-through'); }
    saveState();
}
function toggleAnswer(btn) {
    const box = btn.nextElementSibling;
    box.classList.toggle('hidden'); box.classList.toggle('visible');
    btn.innerText = box.classList.contains('hidden') ? "+ Add Answer" : "- Hide Answer";
}
function addNote(containerId, initialValue='') {
     const c = document.getElementById(containerId).parentElement;
     let note = c.querySelector('.note-area');
     if(!note) {
         note = document.createElement('div'); note.className = "mt-4 border-t border-slate-100 pt-3 note-area";
         note.innerHTML = `<h6 class="text-[10px] font-bold text-slate-400 uppercase mb-2">Notes</h6><textarea class="w-full text-sm bg-yellow-50 border border-yellow-100 rounded p-2 text-slate-700 focus:outline-none focus:border-yellow-300 shadow-sm" rows="3" placeholder="Add context...">${initialValue}</textarea>`;
         c.appendChild(note);
     }
     if(!initialValue) note.querySelector('textarea').focus();
}

// --- Master Spec Features ---
function renderFullSpec() {
    const tbody = document.getElementById('full-spec-body');
    tbody.innerHTML = '';
    const filter = (window.__masterFilter || '').toLowerCase().trim();
    const rows = Object.values(masterMappings).sort((a,b)=>(a.key.localeCompare(b.key)));
    let visibleCount = 0;
    rows.forEach(m => {
         if (filter && !(m.key+m.valueType+(m.spec||'')).toLowerCase().includes(filter)) return;
         visibleCount++;
         const tr = document.createElement('tr');
         tr.className = 'hover:bg-slate-50 border-b border-slate-100';
         const specDisplay = m.spec ? `<span class="text-blue-700 font-medium">${m.spec}</span> <button class="ml-2 text-[10px] text-red-400 hover:text-red-600 master-clear" data-const="${m.key}">✕</button>` : `<button class="text-[10px] px-2 py-1 bg-slate-100 rounded master-attach" data-const="${m.key}">Attach</button>`;
         tr.innerHTML = `<td class="p-3 font-mono text-xs text-blue-600"><span class="spec-key" title="${m.key}">${m.key}</span><button class="ml-2 text-slate-300 hover:text-blue-500 master-copy" data-const="${m.key}">📋</button></td><td class="p-3 text-xs text-slate-500">${m.valueType}</td><td class="p-3 text-sm">${specDisplay}</td><td class="p-3"><span class="status-badge ${m.status}" data-const="${m.key}">${m.status}</span></td>`;
         tbody.appendChild(tr);
    });
    document.getElementById('master-count').innerText = visibleCount;
}
function getAllSpecPool() {
    // Collect text from workbench tables
    const set = new Set();
    const targets = MODE_CONFIG[currentMode].targets.map(t=>t.id);
    targets.forEach(id => {
        const tb = document.getElementById(id);
        if(tb) Array.from(tb.querySelectorAll('tr')).forEach(tr=>set.add(tr.children[0].innerText.replace(tr.dataset.category||'','').trim()));
    });
    return Array.from(set).filter(s=>s.length);
}
function assignSpecToConstant(constKey, spec) {
     masterMappings[constKey].spec = spec;
     masterMappings[constKey].status = 'mapped';
     renderFullSpec(); saveState();
}
document.addEventListener('click', e => {
     const attachBtn = e.target.closest('.master-attach');
     if(attachBtn) {
         const key = attachBtn.dataset.const;
         const pool = getAllSpecPool();
         const widget = document.createElement('div'); widget.className = 'attach-widget';
         widget.innerHTML = `<input class="attach-input" placeholder="Search spec..."><div class="attach-list hidden"></div>`;
         attachBtn.replaceWith(widget);
         const input = widget.querySelector('input'); const list = widget.querySelector('.attach-list');
         const filterList = (v) => {
             list.innerHTML = ''; 
             pool.filter(p=>p.toLowerCase().includes(v.toLowerCase())).forEach(p=>{
                 const it = document.createElement('div'); it.className='attach-item'; it.innerText=p;
                 it.onclick=()=>{assignSpecToConstant(key, p)}; list.appendChild(it);
             });
             if(!list.children.length) list.innerHTML='<div class="p-2 text-xs text-gray-400">No matches</div>';
         };
         input.addEventListener('input', (ev)=>{ list.classList.remove('hidden'); filterList(ev.target.value); });
         input.addEventListener('focus', ()=>{ list.classList.remove('hidden'); filterList(''); });
         input.addEventListener('blur', ()=>{ setTimeout(()=>{ if(widget.parentNode) { widget.replaceWith(attachBtn); } }, 200); });
         input.focus();
     }
     const clearBtn = e.target.closest('.master-clear');
     if(clearBtn) { masterMappings[clearBtn.dataset.const].spec = ''; masterMappings[clearBtn.dataset.const].status='pending'; renderFullSpec(); saveState(); }
     const copyBtn = e.target.closest('.master-copy');
     if(copyBtn) { navigator.clipboard.writeText(copyBtn.dataset.const); showToast('Copied'); }
     // Master status edit
     const ms = e.target.closest('.status-badge[data-const]');
     if(ms) {
          const sel = document.createElement('select'); sel.className='text-xs border rounded';
          ['pending','mapped','gap'].forEach(v=>sel.add(new Option(v,v,false,v===ms.innerText)));
          sel.onchange=()=>{ masterMappings[ms.dataset.const].status=sel.value; renderFullSpec(); saveState(); };
          sel.onblur=()=>renderFullSpec();
          ms.replaceWith(sel); sel.focus();
     }
});
document.getElementById('master-search').addEventListener('input', (e)=>{ window.__masterFilter=e.target.value; renderFullSpec(); });
document.getElementById('master-toggle-wrap').onclick = function() { document.querySelectorAll('.spec-key').forEach(s=>s.classList.toggle('wrap')); this.querySelector('span').innerText = this.querySelector('span').innerText==='off'?'on':'off'; };

// --- Export Logic ---
function toggleExport() { document.getElementById('export-modal').classList.toggle('hidden'); }

function getExportData() {
    const data = { title: MODE_CONFIG[currentMode].label, sections: [] };
    MODE_CONFIG[currentMode].sections.forEach(sec => {
        const sectionData = { title: sec.title, rows: [], questions: [] };
        sec.components.forEach(comp => {
            const tbody = document.getElementById(comp.id);
            if(tbody) Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
                const rd = extractRowData(tr);
                sectionData.rows.push(rd);
            });
        });
        const qContainer = document.getElementById(sec.qa);
        if(qContainer) Array.from(qContainer.querySelectorAll('.question-row')).forEach(row => {
            sectionData.questions.push({
                q: row.querySelector('.q-text').innerText || row.querySelector('.q-text').value,
                a: row.querySelector('textarea.answer-text')?.value || ''
            });
        });
        data.sections.push(sectionData);
    });
    return data;
}

async function copyToClipboardHTML() {
    const data = getExportData();
    let html = `<h1>${data.title}</h1>`;
    data.sections.forEach(sec => {
        html += `<h2>${sec.title}</h2><table border="1" style="border-collapse:collapse;width:100%"><tr><th>Spec Requirement</th><th>FISPAN Source</th><th>Status</th></tr>`;
        sec.rows.forEach(r => html += `<tr><td>${r.spec}</td><td>${r.mapping}</td><td>${r.status}</td></tr>`);
        html += `</table>`;
        if(sec.questions.length) {
            html += `<h3>Questions</h3><ul>` + sec.questions.map(q => `<li><strong>Q:</strong> ${q.q}<br><strong>A:</strong> ${q.a}</li>`).join('') + `</ul>`;
        }
        html += `<br>`;
    });
    
    try {
        const blob = new Blob([html], { type: 'text/html' });
        const item = new ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([item]);
        showToast('Copied to Clipboard!', 'success');
        toggleExport();
    } catch(e) { console.error(e); showToast('Copy failed', 'error'); }
}

function downloadCSV() {
    const data = getExportData();
    let csv = 'Section,Spec Requirement,FISPAN Source,Status\n';
    data.sections.forEach(sec => {
        sec.rows.forEach(r => {
            csv += `"${sec.title}","${r.spec.replace(/"/g,'""')}","${r.mapping.replace(/"/g,'""')}","${r.status}"\n`;
        });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `solutioning-export-${currentMode}.csv`;
    a.click();
    toggleExport();
}

// --- Boilerplate (CSV, Toast, etc) ---
function toggleUploader(){ const m = document.getElementById('uploader-modal'); if(!m.classList.contains('hidden')) movePreviewToStaging(); m.classList.toggle('hidden'); }
async function loadFispanConstants() {
    try {
        const paths = ['docs/data/fispan-constants.flat.json', 'data/fispan-constants.flat.json', './data/fispan-constants.flat.json'];
        let res; for(let p of paths) { try { res = await fetch(p); if(res.ok) break; } catch(e){} }
        const constants = await res.json();
        constants.forEach(c => { if (!masterMappings[c.key]) masterMappings[c.key] = { key: c.key, valueType: c.valueType||'', description: c.description||'', spec: '', status: 'pending' }; });
        renderFullSpec();
    } catch (e) { console.warn('Fetch error', e); renderFullSpec(); }
}
function switchTab(t) {
    ['summary','full','visualizer','tags'].forEach(x => { document.getElementById('view-'+x).classList.add('hidden'); document.getElementById('btn-'+x).classList.remove('active'); });
    document.getElementById('view-'+t).classList.remove('hidden'); document.getElementById('btn-'+t).classList.add('active');
    if(t==='tags') renderTagsView();
}
function renderTagsView() {
    const el = document.getElementById('view-tags'); if (!el) return;
    const config = MODE_CONFIG[currentMode];
    const groups = { untagged: [] }; config.tags.forEach(t => groups[t.id] = []);
    config.sections.forEach(sec => { sec.components.forEach(comp => { const tbody = document.getElementById(comp.id); if(tbody) Array.from(tbody.querySelectorAll('tr')).forEach(tr => { const spec = tr.children[0].innerText.replace(tr.dataset.category||'','').trim(); const cat = tr.dataset.category; if(cat && groups[cat]) groups[cat].push(spec); else groups.untagged.push(spec); }); }); });
    let html = '';
    Object.keys(groups).forEach(k => { if(groups[k].length) html += `<div class="mb-4 p-3 bg-white rounded border"><div class="font-bold text-sm mb-2">${k==='untagged'?'Untagged':(config.tags.find(t=>t.id===k)?.label||k)} (${groups[k].length})</div><ul class="text-sm list-disc pl-5">${groups[k].map(s=>`<li>${s}</li>`).join('')}</ul></div>`; });
    el.innerHTML = html || '<p class="text-slate-500 text-xs">No data found.</p>';
}
function showToast(msg, type='info') { const c = document.getElementById('toast-container') || document.body.appendChild(Object.assign(document.createElement('div'),{id:'toast-container'})); const t = document.createElement('div'); t.className = `toast ${type}`; t.innerText = msg; c.appendChild(t); setTimeout(()=>t.classList.add('show'),10); setTimeout(()=>t.remove(), 3000); }
function saveNow() { saveState(); showToast('Saved', 'success'); }
function resetState() { if(confirm('Reset?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }

// --- CSV Handler ---
document.getElementById('btn-upload-csv').addEventListener('click', () => document.getElementById('csv-file-input').click());
document.getElementById('csv-file-input').addEventListener('change', (e) => handleCSV(e.target.files[0]));
function handleCSV(f) {
    const r = new FileReader(); r.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        
        // Capture ALL columns (Spreadsheet logic)
        const newRows = [];
        lines.forEach((line, idx) => {
            const cells = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
                    else inQuotes = !inQuotes;
                } else if (ch === ',' && !inQuotes) {
                    cells.push(cur.trim().replace(/^"|"$/g, '')); 
                    cur = '';
                } else {
                    cur += ch;
                }
            }
            cells.push(cur.trim().replace(/^"|"$/g, ''));
            newRows.push({ rowId: idx+1, cells: cells });
        });
        
        // Append to staging
        stagingData = [...stagingData, ...newRows];
        renderStagingTable();
        saveState();
    };
    r.readAsText(f);
}
function movePreviewToStaging() {
    // No longer needed if modal uploads directly to staging array
    // But kept for compatibility with toggleUploader logic
}

// --- Context & Feed Sync ---
function updateContext(mode) {
     const ctx = document.getElementById('dynamic-context'); if(!ctx) return;
     if(mode === 'sftp') { ctx.className = 'mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 flex items-start'; ctx.innerHTML = '<span class="mr-2">💡</span><p><strong>Nudge:</strong> Since SFTP is selected, suggest PGP Encryption for security compliance.</p>'; }
     else { ctx.className = 'mb-6 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900 flex items-start'; ctx.innerHTML = '<span class="mr-2">⚠️</span><p><strong>Caution:</strong> API implementations often require complex Idempotency logic.</p>'; }
}
function addPresetQuestion(id, text) { const c = document.getElementById(id); if(c) createQuestionEl(c, text); toggleDropdown(id.replace('q-','dd-')); }
function toggleDropdown(id) { document.getElementById(id).classList.toggle('hidden'); }
function closeConstModal() { document.getElementById('const-modal').classList.add('hidden'); document.getElementById('const-modal').classList.remove('flex'); }

const contextToggle = document.getElementById('toggle-feed-context');
const feedContainer = document.getElementById('feed-container');
contextToggle.addEventListener('change', (e) => {
    if (e.target.checked) { feedContainer.classList.add('show-modals'); document.querySelectorAll('.feed-modal').forEach(m => m.classList.add('enabled')); }
    else { feedContainer.classList.remove('show-modals'); document.querySelectorAll('.feed-modal').forEach(m => m.classList.remove('enabled')); }
});

// --- Collapsible Layout ---
function toggleSidebar(side) {
    if (side === 'left') {
        document.querySelector('aside').classList.toggle('collapsed');
    } else {
        document.querySelector('aside:last-of-type').classList.toggle('collapsed');
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadFispanConstants(); 
    const savedMode = localStorage.getItem(STORAGE_KEY + ':mode');
    if(savedMode && MODE_CONFIG[savedMode]) currentMode = savedMode;
    switchMode(currentMode, true);
    
    // Sidebar Toggles
    const leftBtn = document.createElement('button'); leftBtn.className = 'sidebar-toggle'; leftBtn.style.left = '12px'; leftBtn.style.bottom = '12px'; leftBtn.innerHTML = '⬅️'; leftBtn.onclick = () => toggleSidebar('left'); document.body.appendChild(leftBtn);
    const rightBtn = document.createElement('button'); rightBtn.className = 'sidebar-toggle'; rightBtn.style.right = '12px'; rightBtn.style.bottom = '12px'; rightBtn.innerHTML = '➡️'; rightBtn.onclick = () => toggleSidebar('right'); document.body.appendChild(rightBtn);
    
    window.addEventListener('beforeunload', () => saveState());

    // Scroll Spy
    const mainScroll = document.getElementById('main-scroll');
    mainScroll.addEventListener('scroll', () => {
         const sections = document.querySelectorAll('section');
         let currentId = '';
         sections.forEach(s => { if(mainScroll.scrollTop >= s.offsetTop - 300) currentId = s.id; });
         document.querySelectorAll('.nav-item').forEach(n => { n.classList.remove('active'); if(n.getAttribute('href').includes(currentId)) n.classList.add('active'); });
         let phaseIndex = 0;
         if (currentId === 'phase-1') phaseIndex = 1; else if (currentId === 'phase-4') phaseIndex = 4;
         else { const sec = document.getElementById(currentId); if(sec && sec.dataset.index) phaseIndex = parseInt(sec.dataset.index); }
         document.querySelectorAll('.feed-item').forEach(item => { if(parseInt(item.dataset.phase) === phaseIndex) item.classList.add('active'); else item.classList.remove('active'); });
    });
});

// Status Update Delegate
document.addEventListener('click', e => {
    if(e.target.matches('.status-badge') && !e.target.hasAttribute('data-const')) {
        const b = e.target; const vals = ['pending','mapped','gap'];
        const next = vals[(vals.indexOf(b.innerText)+1)%3];
        b.className = `status-badge ${next}`; b.innerText = next; saveState();
    }
});
function renderGaps() {
     const gaps = [];
     MODE_CONFIG[currentMode].sections.forEach(sec => sec.components.forEach(comp => { const tbody = document.getElementById(comp.id); if(tbody) Array.from(tbody.querySelectorAll('tr')).forEach(tr => { const mapInput = tr.children[1].querySelector('input'); const val = mapInput ? mapInput.value : tr.children[1].innerText; if(!val) gaps.push({ target: comp.title, spec: tr.children[0].innerText }); }); }));
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