/* ── Mirror App — app.js ── */

'use strict';

// ── Themes ──────────────────────────────────────────────────────────────────

const THEMES = [
  { id: 'body',    label: 'Body & energy', ink: 'var(--t-body-ink)',    bg: 'var(--t-body-bg)',    dot: 'var(--t-body-dot)'    },
  { id: 'safety',  label: 'Security',      ink: 'var(--t-safety-ink)',  bg: 'var(--t-safety-bg)',  dot: 'var(--t-safety-dot)'  },
  { id: 'belong',  label: 'Belonging',     ink: 'var(--t-belong-ink)',  bg: 'var(--t-belong-bg)',  dot: 'var(--t-belong-dot)'  },
  { id: 'esteem',  label: 'Esteem',        ink: 'var(--t-esteem-ink)',  bg: 'var(--t-esteem-bg)',  dot: 'var(--t-esteem-dot)'  },
  { id: 'purpose', label: 'Purpose',       ink: 'var(--t-purpose-ink)', bg: 'var(--t-purpose-bg)', dot: 'var(--t-purpose-dot)' },
  { id: 'other',   label: 'Other',         ink: 'var(--t-other-ink)',   bg: 'var(--t-other-bg)',   dot: 'var(--t-other-dot)'   },
];

const THEME_MAP = Object.fromEntries(THEMES.map(t => [t.id, t]));

// ── Prompts ──────────────────────────────────────────────────────────────────

const PROMPTS = [
  'What\'s on your mind?',
  'What do you want more of?',
  'What are you moving toward?',
  'What feels stuck right now?',
  'What would feel like freedom?',
  'What matters most today?',
  'What would you do if nothing was in the way?',
  'What are you ready to let go of?',
];

let promptIdx = 0;

// ── State ────────────────────────────────────────────────────────────────────

let entries = [];
let activeFilter = null;
let editingId = null;
const STORAGE_KEY = 'mirror_entries';

// ── Persistence ──────────────────────────────────────────────────────────────

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch {
    entries = [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function guessTheme(text) {
  const t = text.toLowerCase();
  if (/sleep|eat|food|rest|tired|energy|body|health|exercise|breath|pain|ill|sick/.test(t)) return 'body';
  if (/safe|secure|money|home|stable|job|career|fear|anxiety|future|risk|debt|finance/.test(t)) return 'safety';
  if (/friend|family|love|lonely|connect|community|relationship|belong|partner|miss|together/.test(t)) return 'belong';
  if (/proud|respect|achieve|recogni|confiden|worth|success|fail|status|reputation/.test(t)) return 'esteem';
  if (/mean|purpose|creat|grow|learn|dream|become|free|authentic|potential|express|vision/.test(t)) return 'purpose';
  return 'other';
}

function getTheme(id) {
  return THEME_MAP[id] || THEME_MAP['other'];
}

// ── Entry operations ─────────────────────────────────────────────────────────

function addEntry(text) {
  if (!text.trim()) return;
  const entry = {
    id: uid(),
    text: text.trim(),
    theme: guessTheme(text),
    ts: Date.now(),
    done: false,
  };
  entries.unshift(entry);
  saveEntries();
}

function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  saveEntries();
}

function toggleDone(id) {
  const e = entries.find(e => e.id === id);
  if (e) { e.done = !e.done; saveEntries(); }
}

function updateText(id, text) {
  const e = entries.find(e => e.id === id);
  if (e && text.trim()) {
    e.text = text.trim();
    e.theme = guessTheme(e.text);
    saveEntries();
  }
}

function updateTheme(id, themeId) {
  const e = entries.find(e => e.id === id);
  if (e) { e.theme = themeId; saveEntries(); }
}

// ── Export / Import ──────────────────────────────────────────────────────────

function exportData() {
  const payload = {
    version: 1,
    app: 'mirror',
    exported: new Date().toISOString(),
    entries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mirror-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(raw) {
  const data = JSON.parse(raw);
  const imported = Array.isArray(data.entries) ? data.entries : [];
  const existingIds = new Set(entries.map(e => e.id));
  const fresh = imported.filter(e => e.id && !existingIds.has(e.id));
  entries = [...fresh, ...entries];
  saveEntries();
  return fresh.length;
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderFilterBar() {
  const bar = document.getElementById('filter-bar');
  const usedIds = [...new Set(entries.map(e => e.theme))];

  if (usedIds.length <= 1) {
    bar.innerHTML = '';
    return;
  }

  const usedThemes = THEMES.filter(t => usedIds.includes(t.id));

  const allPill = `<button class="filter-pill${activeFilter === null ? ' active' : ''}" data-filter="__all__">All</button>`;
  const themePills = usedThemes.map(t => `
    <button class="filter-pill${activeFilter === t.id ? ' active' : ''}" data-filter="${t.id}">
      <span class="dot" style="background:${t.dot};"></span>
      ${escHtml(t.label)}
    </button>
  `).join('');

  bar.innerHTML = allPill + themePills;

  bar.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      activeFilter = (f === '__all__') ? null : f;
      render();
    });
  });
}

function renderStats() {
  const bar = document.getElementById('stats-bar');
  if (entries.length === 0) { bar.innerHTML = ''; return; }
  const total = entries.length;
  const done  = entries.filter(e => e.done).length;
  bar.innerHTML = `<span><strong>${total}</strong> reflection${total !== 1 ? 's' : ''}</span>` +
    (done > 0 ? `<span><strong>${done}</strong> complete</span>` : '');
}

function renderCards() {
  const container = document.getElementById('cards');
  const empty     = document.getElementById('empty-state');
  const list      = activeFilter ? entries.filter(e => e.theme === activeFilter) : entries;

  empty.style.display = entries.length === 0 ? 'block' : 'none';

  container.innerHTML = list.map(entry => {
    const th        = getTheme(entry.theme);
    const isEditing = editingId === entry.id;

    const textBlock = isEditing
      ? `<textarea
            class="card-text-edit"
            id="edit-${entry.id}"
            rows="2"
            aria-label="Edit reflection"
          >${escHtml(entry.text)}</textarea>`
      : `<div class="card-text">${escHtml(entry.text)}</div>`;

    const tagPickerHtml = isEditing
      ? `<div class="tag-picker">
          ${THEMES.map(t => `
            <button class="tag-option${entry.theme === t.id ? ' sel' : ''}" data-theme="${t.id}">
              ${escHtml(t.label)}
            </button>`).join('')}
         </div>`
      : '';

    return `
      <article class="card${entry.done ? ' is-done' : ''}" id="card-${entry.id}" role="listitem">
        <div class="card-top">
          <div class="card-body">
            ${textBlock}
            <div class="card-meta">
              <button
                class="theme-tag"
                style="background:${th.bg}; color:${th.ink};"
                data-action="tag-toggle"
                data-id="${entry.id}"
                title="Change theme"
                aria-label="Theme: ${th.label}. Click to change."
              >
                <span class="dot" style="background:${th.dot};"></span>
                ${escHtml(th.label)}
              </button>
              <span class="card-date">${fmtDate(entry.ts)}</span>
            </div>
            ${tagPickerHtml}
          </div>
          <div class="card-actions">
            <button class="icon-btn" data-action="done" data-id="${entry.id}" title="${entry.done ? 'Reopen' : 'Mark done'}" aria-label="${entry.done ? 'Reopen' : 'Mark done'}">
              ${entry.done ? checkRotateIcon() : checkIcon()}
            </button>
            <button class="icon-btn" data-action="edit" data-id="${entry.id}" title="Edit" aria-label="Edit">
              ${editIcon()}
            </button>
            <button class="icon-btn danger" data-action="delete" data-id="${entry.id}" title="Delete" aria-label="Delete">
              ${deleteIcon()}
            </button>
          </div>
        </div>
      </article>`;
  }).join('');

  // Attach events
  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleCardAction);
  });

  if (isEditing && editingId) {
    const ta = document.getElementById('edit-' + editingId);
    if (ta) {
      ta.focus();
      ta.selectionStart = ta.value.length;
      ta.addEventListener('blur', () => {
        updateText(editingId, ta.value);
        editingId = null;
        render();
      });
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          ta.blur();
        }
        if (e.key === 'Escape') {
          editingId = null;
          render();
        }
      });
    }
    container.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        updateTheme(editingId, btn.dataset.theme);
        editingId = null;
        render();
      });
    });
  }
}

function handleCardAction(e) {
  const btn    = e.currentTarget;
  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  if (action === 'done')       { toggleDone(id); render(); }
  if (action === 'delete')     { deleteEntry(id); render(); }
  if (action === 'edit')       { editingId = editingId === id ? null : id; render(); }
  if (action === 'tag-toggle') { editingId = editingId === id ? null : id; render(); }
}

function render() {
  renderFilterBar();
  renderStats();
  renderCards();
}

// ── SVG icons ────────────────────────────────────────────────────────────────

function checkIcon() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
}
function checkRotateIcon() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.26"/></svg>`;
}
function editIcon() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}
function deleteIcon() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
}

// ── Boot ─────────────────────────────────────────────────────────────────────

function init() {
  loadEntries();
  render();

  // Compose
  const input      = document.getElementById('main-input');
  const reflectBtn = document.getElementById('reflect-btn');
  const label      = document.getElementById('prompt-label');

  function submit() {
    const text = input.value.trim();
    if (!text) return;
    addEntry(text);
    input.value = '';
    promptIdx = (promptIdx + 1) % PROMPTS.length;
    label.style.opacity = '0';
    setTimeout(() => {
      label.textContent = PROMPTS[promptIdx];
      label.style.opacity = '1';
    }, 200);
    render();
  }

  reflectBtn.addEventListener('click', submit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  });

  // Export
  document.getElementById('export-btn').addEventListener('click', exportData);

  // Import — open modal
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('import-text').value = '';
    document.getElementById('import-text').focus();
  });

  // Close modal
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Confirm import
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const raw = document.getElementById('import-text').value.trim();
    if (!raw) return;
    try {
      const count = importData(raw);
      closeModal();
      render();
      if (count === 0) alert('No new entries found — everything was already imported.');
      else alert(`Imported ${count} new reflection${count !== 1 ? 's' : ''}.`);
    } catch {
      alert('Could not parse the file. Please check it\'s a valid mirror export.');
    }
  });
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
