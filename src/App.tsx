import React, { useState } from 'react';
import { Trash2, Check, Volume2 } from 'lucide-react';
import { VoiceRecorder } from './components/VoiceRecorder';
import { useTodoStore } from './store';

function App() {
  const [newTodo, setNewTodo] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodoStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      addTodo(newTodo, currentAudioUrl || undefined);
      setNewTodo('');
      setCurrentAudioUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Voice Assistent
        </h1>

        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a new todo..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <VoiceRecorder onRecordingComplete={setCurrentAudioUrl} />
          </div>
          {currentAudioUrl && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Volume2 className="w-4 h-4" />
              <span>Voice message recorded</span>
              <audio src={currentAudioUrl} controls className="h-8" />
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add Todo
          </button>
        </form>

        <ul className="space-y-3">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 ${
                  todo.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300'
                } flex items-center justify-center`}
              >
                {todo.completed && <Check className="w-4 h-4 text-white" />}
              </button>
              <span
                className={`flex-1 ${
                  todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
                }`}
              >
                {todo.text}
              </span>
              {todo.audioUrl && (
                <audio src={todo.audioUrl} controls className="h-8" />
              )}
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;