import { create } from 'zustand';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  audioUrl?: string;
}

interface TodoStore {
  todos: Todo[];
  addTodo: (text: string, audioUrl?: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
}

export const useTodoStore = create<TodoStore>((set) => ({
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