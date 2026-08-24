// 저장소 - API 기반 (DB 연동)
class TodoStore {
  constructor() {
    this.apiBase = 'http://localhost:3000';
    this.filterKey = 'todoFilter';
    this.todos = [];
  }

  getAll() {
    // 현재 캐시된 todos 반환
    return this.todos;
  }

  async fetchAll() {
    try {
      const response = await fetch(`${this.apiBase}/api/todos`);
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      const data = await response.json();
      this.todos = data.data || [];
      return this.todos;
    } catch (error) {
      console.error('Failed to load todos:', error);
      return [];
    }
  }

  async add(content) {
    try {
      const response = await fetch(`${this.apiBase}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), isDone: false }),
      });
      if (!response.ok) {
        throw new Error('Failed to add todo');
      }
      const data = await response.json();
      const todo = data.data;
      // 캐시 업데이트
      this.todos.unshift(todo);
      return todo;
    } catch (error) {
      console.error('Failed to add todo:', error);
      throw error;
    }
  }

  async update(id, content) {
    try {
      const response = await fetch(`${this.apiBase}/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!response.ok) {
        throw new Error('Failed to update todo');
      }
      const data = await response.json();
      const todo = data.data;
      // 캐시 업데이트
      const index = this.todos.findIndex(t => t.id === id);
      if (index !== -1) {
        this.todos[index] = todo;
      }
      return todo;
    } catch (error) {
      console.error('Failed to update todo:', error);
      throw error;
    }
  }

  async toggle(id) {
    try {
      const todo = this.todos.find(t => t.id === id);
      if (!todo) throw new Error('Todo not found');

      const response = await fetch(`${this.apiBase}/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone: !todo.isDone }),
      });
      if (!response.ok) {
        throw new Error('Failed to toggle todo');
      }
      const data = await response.json();
      const updatedTodo = data.data;
      // 캐시 업데이트
      const index = this.todos.findIndex(t => t.id === id);
      if (index !== -1) {
        this.todos[index] = updatedTodo;
      }
      return updatedTodo;
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      throw error;
    }
  }

  async remove(id) {
    try {
      const response = await fetch(`${this.apiBase}/api/todos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete todo');
      }
      // 캐시 업데이트
      this.todos = this.todos.filter(t => t.id !== id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      throw error;
    }
  }

  async removeCompleted() {
    try {
      const response = await fetch(`${this.apiBase}/api/todos/completed`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete completed todos');
      }
      // 캐시 업데이트
      this.todos = this.todos.filter(t => !t.isDone);
    } catch (error) {
      console.error('Failed to delete completed todos:', error);
      throw error;
    }
  }

  getFilter() {
    return localStorage.getItem(this.filterKey) || 'all';
  }

  setFilter(filter) {
    localStorage.setItem(this.filterKey, filter);
  }

  getStats() {
    const total = this.todos.length;
    const done = this.todos.filter(t => t.isDone).length;
    const active = total - done;
    return { total, active, done };
  }
}

export const store = new TodoStore();
