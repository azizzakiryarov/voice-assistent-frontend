import React, { useState } from 'react';
import { Trash2, Check, Volume2, Mail } from 'lucide-react';
import { VoiceRecorder } from './components/VoiceRecorder';
import { EmailVerificationModal } from './components/EmailVerificationModal';
import { useTodoStore } from './store';
import { createTodo } from './api';

function App() {
  const [newTodo, setNewTodo] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [detectedEmail, setDetectedEmail] = useState(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verifiedEmails, setVerifiedEmails] = useState([]);
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodoStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newTodo.trim()) {
      try {
        // För att skicka med e-post om sådan finns
        const todoData = {
          text: newTodo,
          audioUrl: currentAudioUrl || undefined,
          email: verifiedEmails.length > 0 ? verifiedEmails[verifiedEmails.length - 1] : undefined
        };
        
        // Skicka till backend
        const response = await createTodo(todoData);
        
        // Lägg till i lokal state
        addTodo(newTodo, currentAudioUrl || undefined, todoData.email);
        
        // Återställ formuläret
        resetForm();
      } catch (error) {
        console.error('Failed to create todo:', error);
      }
    }
  };

  const resetForm = () => {
    setNewTodo('');
    setCurrentAudioUrl(null);
    setTranscription('');
    setDetectedEmail(null);
  };

  const handleEmailDetected = (email) => {
    setDetectedEmail(email);
    setIsVerifyingEmail(true);
  };

  const handleConfirmEmail = (email) => {
    setVerifiedEmails([...verifiedEmails, email]);
    setIsVerifyingEmail(false);
  };

  const handleCancelEmailVerification = () => {
    setIsVerifyingEmail(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Röstassistent
        </h1>

        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Lägg till en ny att göra-post..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <VoiceRecorder 
              onRecordingComplete={setCurrentAudioUrl} 
              onTranscriptionReceived={setTranscription}
              onEmailDetected={handleEmailDetected}
            />
          </div>
          
          {transcription && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-1">Transkribering:</h3>
              <p className="text-gray-600">{transcription}</p>
            </div>
          )}
          
          {currentAudioUrl && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Volume2 className="w-4 h-4" />
              <span>Röstinspelning:</span>
              <audio src={currentAudioUrl} controls className="h-8" />
            </div>
          )}
          
          {verifiedEmails.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
              <Mail className="w-4 h-4" />
              <span>Verifierad e-post: {verifiedEmails[verifiedEmails.length - 1]}</span>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Lägg till att göra-post
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
              
              {todo.email && (
                <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded-full">
                  {todo.email}
                </span>
              )}
              
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
      
      {isVerifyingEmail && detectedEmail && (
        <EmailVerificationModal 
          email={detectedEmail} 
          transcription={transcription}
          onConfirm={handleConfirmEmail}
          onCancel={handleCancelEmailVerification}
        />
      )}
    </div>
  );
}

export default App;