import React, { useState, useEffect } from 'react';
import { Trash2, Check, Volume2, Mail, Calendar, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { VoiceRecorder } from './components/VoiceRecorder';
import { EmailVerificationModal } from './components/EmailVerificationModal';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from './api';

function App() {
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [detectedEmail, setDetectedEmail] = useState(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verifiedEmails, setVerifiedEmails] = useState([]);
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification state
  const [notifications, setNotifications] = useState([]);

  // Hämta todos vid komponentens första rendering
  useEffect(() => {
    loadTodos();
  }, []);

  // Remove notifications after timeout
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Function to add a notification
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  // Function to remove a notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const loadTodos = async () => {
    try {
      setIsLoading(true);
      const todosData = await fetchTodos();
      setTodos(todosData);
      addNotification('Alla att göra-poster har laddats', 'info');
    } catch (error) {
      console.error('Failed to load todos:', error);
      addNotification('Kunde inte ladda att göra-poster', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newTodo.trim()) {
      try {
        // Förbereda todo-data enligt backend DTO struktur
        const todoData = {
          description: newTodo,
          dueDate: dueDate || null,
          completed: false
        };
        
        // Om vi har e-post eller ljudurl, lägg till som extra egenskaper
        if (currentAudioUrl) {
          todoData.audioUrl = currentAudioUrl;
        }
        
        if (verifiedEmails.length > 0) {
          todoData.email = verifiedEmails[verifiedEmails.length - 1];
        }
        
        // Skicka till backend
        const createdTodo = await createTodo(todoData);
        
        // Uppdatera den lokala listan med todos
        setTodos(prevTodos => [...prevTodos, createdTodo]);
        
        // Visa bekräftelse
        addNotification('Ny att göra-post har skapats', 'success');
        
        // Återställ formuläret
        resetForm();
      } catch (error) {
        console.error('Failed to create todo:', error);
        addNotification('Kunde inte skapa att göra-post', 'error');
      }
    } else {
      addNotification('Du måste ange en beskrivning', 'warning');
    }
  };

  const handleToggleTodo = async (id, completed) => {
    try {
      // Uppdatera i UI först för omedelbar feedback
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === id ? { ...todo, completed: !completed } : todo
        )
      );
      
      // Skicka uppdatering till API
      await updateTodo(id, { completed: !completed });
      addNotification(
        `Markerad som ${!completed ? 'slutförd' : 'ej slutförd'}`, 
        'success'
      );
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      // Återställ vid fel
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === id ? { ...todo, completed } : todo
        )
      );
      addNotification('Kunde inte uppdatera status', 'error');
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      // Hitta todo för meddelande
      const todoToDelete = todos.find(todo => todo.id === id);
      
      // Ta bort från UI först för omedelbar feedback
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
      
      // Skicka borttagning till API
      await deleteTodo(id);
      addNotification(`"${todoToDelete?.description.substring(0, 20)}${todoToDelete?.description.length > 20 ? '...' : ''}" har tagits bort`, 'info');
    } catch (error) {
      console.error('Failed to delete todo:', error);
      // Återställ vid fel genom att hämta todos på nytt
      loadTodos();
      addNotification('Kunde inte ta bort post', 'error');
    }
  };

  const resetForm = () => {
    setNewTodo('');
    setDueDate('');
    setShowDatePicker(false);
    setCurrentAudioUrl(null);
    setTranscription('');
    setDetectedEmail(null);
  };

  const handleEmailDetected = (email) => {
    setDetectedEmail(email);
    setIsVerifyingEmail(true);
    addNotification(`E-postadress upptäckt: ${email}`, 'info');
  };

  const handleConfirmEmail = (email) => {
    setVerifiedEmails([...verifiedEmails, email]);
    setIsVerifyingEmail(false);
    addNotification(`E-postadress verifierad: ${email}`, 'success');
  };

  const handleCancelEmailVerification = () => {
    setIsVerifyingEmail(false);
    addNotification('E-postverifiering avbruten', 'info');
  };

  // Formatera datum för visning
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE');
  };

  // Beräkna om ett datum är passerat
  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    return dueDate < today;
  };

  // Visa datumväljaren
  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  // Get the icon for the notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`flex items-center justify-between p-3 rounded-lg shadow-md animate-slide-in ${
              notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
              notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
              notification.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
              'bg-blue-50 border-l-4 border-blue-500'
            }`}
          >
            <div className="flex items-center gap-2">
              {getNotificationIcon(notification.type)}
              <p className="text-gray-700">{notification.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(notification.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

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
              onRecordingComplete={(url) => {
                setCurrentAudioUrl(url);
                addNotification('Röstinspelning slutförd', 'success');
              }} 
              onTranscriptionReceived={(text) => {
                setTranscription(text);
                addNotification('Transkribering klar', 'success');
              }}
              onEmailDetected={handleEmailDetected}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={toggleDatePicker}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 py-1 px-3 bg-blue-50 rounded-lg"
            >
              <Calendar className="w-4 h-4" />
              {dueDate ? `Slutdatum: ${formatDate(dueDate)}` : "Lägg till slutdatum"}
            </button>
            
            {showDatePicker && (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  addNotification(`Datum satt till ${formatDate(e.target.value)}`, 'info');
                }}
                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            )}
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

        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Laddar todos...</div>
        ) : (
          <ul className="space-y-3">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <button
                  onClick={() => handleToggleTodo(todo.id, todo.completed)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 ${
                    todo.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300'
                  } flex items-center justify-center`}
                >
                  {todo.completed && <Check className="w-4 h-4 text-white" />}
                </button>
                <div className="flex-1">
                  <span
                    className={`block ${
                      todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
                    }`}
                  >
                    {todo.description}
                  </span>
                  
                  {todo.dueDate && (
                    <span 
                      className={`text-xs ${
                        isOverdue(todo.dueDate) && !todo.completed 
                          ? 'text-red-600' 
                          : 'text-gray-500'
                      }`}
                    >
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(todo.dueDate)}
                      {isOverdue(todo.dueDate) && !todo.completed && " (Försenad)"}
                    </span>
                  )}
                </div>
                
                {todo.description && (
                  <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded-full">
                    {todo.description}
                  </span>
                )}
                
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
            {todos.length === 0 && (
              <p className="text-center text-gray-500 py-4">Inga att göra-poster ännu</p>
            )}
          </ul>
        )}
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

// Lägg till CSS för animation
const style = document.createElement('style');
style.innerHTML = `
  @keyframes slide-in {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);

export default App;