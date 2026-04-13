const STORAGE_KEY = 'juku_todos';

let tasks = [];
let currentFilter = 'all';
let currentCategory = 'all';
let searchQuery = '';

// --- Persistence ---
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  tasks = raw ? JSON.parse(raw) : [];
}

// --- Date helpers ---
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function dueLabelClass(dateStr) {
  if (!dateStr) return '';
  const today = todayStr();
  if (dateStr < today) return 'overdue';
  if (dateStr === today) return 'today';
  return '';
}

function dueLabelText(dateStr) {
  if (!dateStr) return '';
  const today = todayStr();
  if (dateStr < today) return `期限切れ：${formatDate(dateStr)}`;
  if (dateStr === today) return `今日が期限：${formatDate(dateStr)}`;
  return `期限：${formatDate(dateStr)}`;
}

// --- Filter & Search ---
function getFilteredTasks() {
  return tasks.filter(t => {
    const statusOk =
      currentFilter === 'all' ||
      (currentFilter === 'active' && !t.done) ||
      (currentFilter === 'done' && t.done);
    const catOk = currentCategory === 'all' || t.category === currentCategory;
    const searchOk = searchQuery === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.student && t.student.toLowerCase().includes(searchQuery.toLowerCase()));
    return statusOk && catOk && searchOk;
  });
}

// --- Render ---
function render() {
  const list = document.getElementById('task-list');
  const emptyMsg = document.getElementById('empty-msg');
  const statsEl = document.getElementById('task-stats');

  const filtered = getFilteredTasks();

  const priorityOrder = { '高': 0, '中': 1, '低': 2 };
  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item priority-${task.priority}${task.done ? ' done' : ''}`;
      li.dataset.id = task.id;

      const dueClass = dueLabelClass(task.due);
      const dueText = dueLabelText(task.due);

      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} title="完了にする">
        <div class="task-body">
          <div class="task-title">${escHtml(task.title)}</div>
          <div class="task-meta">
            <span class="badge badge-category">${escHtml(task.category)}</span>
            ${task.student ? `<span class="badge badge-student">👤 ${escHtml(task.student)}</span>` : ''}
            ${dueText ? `<span class="badge-due ${dueClass}">${escHtml(dueText)}</span>` : ''}
          </div>
        </div>
        <button class="task-delete" title="削除">✕</button>
      `;

      li.querySelector('.task-checkbox').addEventListener('change', () => toggleDone(task.id));
      li.querySelector('.task-delete').addEventListener('click', () => deleteTask(task.id));

      list.appendChild(li);
    });
  }

  // Stats
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const overdueCount = tasks.filter(t => !t.done && t.due && t.due < todayStr()).length;
  statsEl.textContent =
    `全${total}件 ／ 完了${done}件 ／ 未完了${total - done}件` +
    (overdueCount > 0 ? ` ／ ⚠️ 期限切れ${overdueCount}件` : '');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Actions ---
function addTask(title, category, priority, due, student) {
  tasks.push({
    id: Date.now(),
    title,
    category,
    priority,
    due,
    student,
    done: false,
    createdAt: new Date().toISOString(),
  });
  saveTasks();
  render();
}

function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (t) {
    t.done = !t.done;
    saveTasks();
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function clearDoneTasks() {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  render();
}

// --- Event listeners ---
document.getElementById('task-form').addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  if (!title) return;
  const category = document.getElementById('task-category').value;
  const priority = document.getElementById('task-priority').value;
  const due = document.getElementById('task-due').value;
  const student = document.getElementById('task-student').value.trim();
  addTask(title, category, priority, due, student);
  e.target.reset();
  document.getElementById('task-priority').value = '中';
  document.getElementById('task-title').focus();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

document.getElementById('category-filter').addEventListener('change', e => {
  currentCategory = e.target.value;
  render();
});

document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value;
  render();
});

document.getElementById('clear-done').addEventListener('click', () => {
  if (tasks.filter(t => t.done).length === 0) return;
  if (confirm('完了済みタスクをすべて削除しますか？')) {
    clearDoneTasks();
  }
});

// --- Today's date ---
function showToday() {
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('today').textContent =
    new Date().toLocaleDateString('ja-JP', options);
}

// --- Init ---
loadTasks();
showToday();
render();
