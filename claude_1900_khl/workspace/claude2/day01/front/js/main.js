import { store } from './store.js';
import { validateContent, sanitizeContent } from './validate.js';
import { renderTodos, renderStats, updateCounter, showError, enterEditMode, exitEditMode } from './render.js';

let currentFilter = store.getFilter();

async function init() {
  const input = document.getElementById('todoInput');
  const addBtn = document.getElementById('addBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const clearBtn = document.getElementById('clearCompletedBtn');

  // DB에서 초기 데이터 로드
  try {
    await store.fetchAll();
  } catch (error) {
    console.error('Failed to load todos on init:', error);
  }

  // 입력창 자동 포커스
  input.focus();

  // 이벤트 리스너
  input.addEventListener('input', () => updateCounter(input));
  input.addEventListener('keydown', (e) => handleAddKeydown(e, input));
  addBtn.addEventListener('click', () => handleAdd(input));

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => handleFilterChange(e.target.value));
  });

  clearBtn.addEventListener('click', handleClearCompleted);

  // 할일 목록 이벤트 (이벤트 위임)
  document.getElementById('todoList').addEventListener('click', handleTodoListClick);
  document.getElementById('todoList').addEventListener('dblclick', handleTodoListDblclick);

  // 초기 렌더링
  render();
}

function handleAddKeydown(e, input) {
  if (e.key === 'Enter' && !e.isComposing) {
    handleAdd(input);
  }
}

async function handleAdd(input) {
  const content = sanitizeContent(input.value);
  const validation = validateContent(content);

  if (!validation.valid) {
    showError(validation.error);
    input.focus();
    return;
  }

  try {
    await store.add(content);
    input.value = '';
    updateCounter(input);
    input.focus();
    render();
  } catch (error) {
    showError(error.message);
  }
}

function handleFilterChange(filter) {
  currentFilter = filter;
  store.setFilter(filter);

  // UI 상태 업데이트
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.value === filter);
  });

  render();
}

async function handleTodoListClick(e) {
  const todoItem = e.target.closest('.todo-item');
  if (!todoItem) return;

  const id = parseInt(todoItem.dataset.id);

  if (e.target.classList.contains('todo-checkbox')) {
    try {
      await store.toggle(id);
      render();
    } catch (error) {
      showError(error.message);
    }
  } else if (e.target.classList.contains('btn-delete')) {
    if (confirm('정말 삭제하시겠어요?')) {
      try {
        await store.remove(id);
        render();
      } catch (error) {
        showError(error.message);
      }
    }
  } else if (e.target.classList.contains('btn-edit')) {
    const { input, originalContent } = enterEditMode(todoItem);

    const saveEdit = async () => {
      const newContent = sanitizeContent(input.value);
      const validation = validateContent(newContent);

      if (!validation.valid) {
        showError(validation.error);
        input.focus();
        return;
      }

      try {
        await store.update(id, newContent);
        render();
      } catch (error) {
        showError(error.message);
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        saveEdit();
      } else if (e.key === 'Escape') {
        exitEditMode(todoItem, originalContent);
        todoItem.classList.remove('editing');
      }
    });

    input.addEventListener('blur', saveEdit);
  }
}

async function handleTodoListDblclick(e) {
  const todoText = e.target.closest('.todo-text');
  if (!todoText) return;

  const todoItem = todoText.closest('.todo-item');
  if (todoItem.classList.contains('editing')) return;

  const { input, originalContent } = enterEditMode(todoItem);
  const id = parseInt(todoItem.dataset.id);

  const saveEdit = async () => {
    const newContent = sanitizeContent(input.value);
    const validation = validateContent(newContent);

    if (!validation.valid) {
      showError(validation.error);
      input.focus();
      return;
    }

    try {
      await store.update(id, newContent);
      render();
    } catch (error) {
      showError(error.message);
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      saveEdit();
    } else if (e.key === 'Escape') {
      exitEditMode(todoItem, originalContent);
      todoItem.classList.remove('editing');
    }
  });

  input.addEventListener('blur', saveEdit);
}

async function handleClearCompleted() {
  const stats = store.getStats();
  if (stats.done === 0) return;

  if (confirm(`완료된 ${stats.done}개를 삭제할까요?`)) {
    try {
      await store.removeCompleted();
      render();
    } catch (error) {
      showError(error.message);
    }
  }
}

function render() {
  renderTodos(currentFilter);
  renderStats();

  // 필터 버튼 UI 업데이트
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.value === currentFilter);
  });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => init());
