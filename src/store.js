import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const useTodoStore = create((set) => ({
  todos: [],
  
  addTodo: (text, audioUrl, email) => set((state) => ({
    todos: [
      {
        id: uuidv4(),
        text,
        completed: false,
        audioUrl,
        email,
        createdAt: new Date()
      },
      ...state.todos
    ]
  })),
  
  toggleTodo: (id) => set((state) => ({
    todos: state.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  })),
  
  deleteTodo: (id) => set((state) => ({
    todos: state.todos.filter((todo) => todo.id !== id)
  })),
  
  updateTodo: (id, updates) => set((state) => ({
    todos: state.todos.map((todo) =>
      todo.id === id ? { ...todo, ...updates } : todo
    )
  }))
}));