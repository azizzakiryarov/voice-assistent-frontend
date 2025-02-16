import { create } from 'zustand';

export const useTodoStore = create((set) => ({
  todos: [],
  addTodo: (text, audioUrl) =>
    set((state) => ({
      todos: [
        ...state.todos,
        {
          id: crypto.randomUUID(),
          text,
          completed: false,
          audioUrl,
        },
      ],
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    })),
  deleteTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),
}));