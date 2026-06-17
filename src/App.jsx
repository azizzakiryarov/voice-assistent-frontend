import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Info,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Volume2,
  X
} from 'lucide-react';
import { VoiceRecorder } from './components/VoiceRecorder';
import { EmailVerificationModal } from './components/EmailVerificationModal';
import { TaskList } from './components/TaskList/TaskList';
import { TextAnalysisPanel } from './components/TextAnalysisPanel';
import {
  approveVoiceCommand,
  createTodo,
  deleteTodo,
  fetchCurrentUser,
  fetchSyncStatus,
  fetchTodos,
  loginWithGoogle,
  logout,
  syncGoogleTasks,
  updateTodo
} from './api';

function App() {
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [detectedEmail, setDetectedEmail] = useState(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verifiedEmails, setVerifiedEmails] = useState([]);
  const [pendingVoiceCommand, setPendingVoiceCommand] = useState(null);
  const [isApprovingVoiceCommand, setIsApprovingVoiceCommand] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncingGoogleTasks, setIsSyncingGoogleTasks] = useState(false);
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser?.authenticated) {
      loadTodos();
      loadSyncStatus();
    } else {
      setTodos([]);
      setSyncStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.authenticated]);

  useEffect(() => {
    if (notifications.length === 0) return undefined;
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [notifications]);

  const addNotification = (message, type = 'info') => {
    setNotifications(prev => [...prev, { id: Date.now(), message, type }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const loadCurrentUser = async () => {
    try {
      setIsAuthLoading(true);
      setCurrentUser(await fetchCurrentUser());
    } catch (error) {
      console.error('Failed to load current user:', error);
      setCurrentUser({ authenticated: false });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      setSyncStatus(await fetchSyncStatus());
    } catch (error) {
      console.error('Failed to load sync status:', error);
      setSyncStatus(null);
    }
  };

  const loadTodos = async () => {
    if (!currentUser?.authenticated) return;
    try {
      setIsLoading(true);
      setTodos(await fetchTodos());
    } catch (error) {
      console.error('Failed to load todos:', error);
      addNotification('Kunde inte ladda att göra-poster', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setCurrentUser({ authenticated: false });
      setTodos([]);
      setPendingVoiceCommand(null);
      setTranscription('');
      setSyncStatus(null);
    }
  };

  const handleSyncGoogleTasks = async () => {
    try {
      setIsSyncingGoogleTasks(true);
      const result = await syncGoogleTasks();
      addNotification(
        `Google Tasks synkade: ${result.importedCount || 0} nya, ${result.updatedCount || 0} uppdaterade`,
        'success'
      );
      await loadTodos();
      await loadSyncStatus();
    } catch (error) {
      console.error('Failed to sync Google Tasks:', error);
      addNotification(error.response?.data?.message || 'Kunde inte synka Google Tasks', 'error');
    } finally {
      setIsSyncingGoogleTasks(false);
    }
  };

  const handleVoicePreview = (preview) => {
    setPendingVoiceCommand(preview);
    setTranscription(preview.transcription || '');
    setNewTodo(preview.transcription || '');
    addNotification('Röstkommando redo för granskning', 'info');
  };

  const updatePendingVoiceCommand = (section, field, value) => {
    setPendingVoiceCommand(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updatePendingParticipant = (field, value) => {
    setPendingVoiceCommand(prev => {
      const participants = prev.meeting?.participants?.length
        ? [...prev.meeting.participants]
        : [{ name: '', email: '' }];
      participants[0] = { ...participants[0], [field]: value };

      return {
        ...prev,
        meeting: {
          ...prev.meeting,
          participants
        }
      };
    });
  };

  const approvePendingVoiceCommand = async () => {
    if (!pendingVoiceCommand) return;

    try {
      setIsApprovingVoiceCommand(true);
      const result = await approveVoiceCommand(pendingVoiceCommand);

      if (result?.type === 'TODO') {
        addNotification('Att göra-post har sparats', 'success');
        loadTodos();
      } else if (result?.type === 'MEETING') {
        addNotification(
          result.googleSynced ? 'Möte har skapats i Google Kalender' : 'Möte sparat, men Google-synk misslyckades',
          result.googleSynced ? 'success' : 'warning'
        );
        loadSyncStatus();
      } else {
        addNotification('Röstkommandot har behandlats', 'success');
      }
      setPendingVoiceCommand(null);
      setNewTodo('');
    } catch (error) {
      console.error('Failed to approve voice command:', error);
      addNotification(error.response?.data?.message || 'Kunde inte godkänna röstkommandot', 'error');
    } finally {
      setIsApprovingVoiceCommand(false);
    }
  };

  const cancelPendingVoiceCommand = () => {
    setPendingVoiceCommand(null);
    addNotification('Röstkommando avbrutet', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) {
      addNotification('Du måste ange en beskrivning', 'warning');
      return;
    }

    try {
      const todoData = {
        description: newTodo,
        dueDate: dueDate || null,
        completed: false
      };

      if (currentAudioUrl) {
        todoData.audioUrl = currentAudioUrl;
      }

      if (verifiedEmails.length > 0) {
        todoData.email = verifiedEmails[verifiedEmails.length - 1];
      }

      const createdTodo = await createTodo(todoData);
      setTodos(prevTodos => [...prevTodos, createdTodo]);
      addNotification('Ny att göra-post har skapats', 'success');
      resetForm();
      loadTodos();
    } catch (error) {
      console.error('Failed to create todo:', error);
      addNotification('Kunde inte skapa att göra-post', 'error');
    }
  };

  const handleToggleTodo = async (id, completed) => {
    try {
      setTodos(prevTodos =>
        prevTodos.map(todo =>
          todo.id === id ? { ...todo, completed: !completed } : todo
        )
      );

      await updateTodo(id, { completed: !completed });
      addNotification(`Markerad som ${!completed ? 'slutförd' : 'ej slutförd'}`, 'success');
    } catch (error) {
      console.error('Failed to toggle todo:', error);
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
      const todoToDelete = todos.find(todo => todo.id === id);
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
      await deleteTodo(id);
      addNotification(`"${todoToDelete?.description.substring(0, 20)}${todoToDelete?.description.length > 20 ? '...' : ''}" har tagits bort`, 'info');
    } catch (error) {
      console.error('Failed to delete todo:', error);
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

  const handleConfirmEmail = (email) => {
    setVerifiedEmails([...verifiedEmails, email]);
    setIsVerifyingEmail(false);
    addNotification(`E-postadress verifierad: ${email}`, 'success');
  };

  const handleCancelEmailVerification = () => {
    setIsVerifyingEmail(false);
    addNotification('E-postverifiering avbruten', 'info');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('sv-SE');
  };

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString);
    return targetDate < today;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-sky-600" />;
    }
  };

  const syncBadgeClass = (value) => (
    value === 'CONNECTED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-700'
  );

  const completedCount = todos.filter(todo => todo.completed).length;
  const googleTasksCount = todos.filter(todo => todo.syncStatus === 'GOOGLE_TASKS_IMPORTED').length;

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-700 shadow-sm">
          Laddar profil...
        </div>
      </div>
    );
  }

  if (!currentUser?.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <div className="w-full max-w-md space-y-5 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950">Röstassistent</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Logga in med Google för att hantera dina todos, möten och synkronisering.
            </p>
          </div>
          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <LogIn className="h-5 w-5" />
            Logga in med Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="fixed right-4 top-4 z-50 w-[min(22rem,calc(100vw-2rem))] space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`flex items-center justify-between gap-3 rounded-lg border p-3 shadow-sm animate-slide-in ${
              notification.type === 'success' ? 'border-emerald-200 bg-emerald-50' :
              notification.type === 'error' ? 'border-rose-200 bg-rose-50' :
              notification.type === 'warning' ? 'border-amber-200 bg-amber-50' :
              'border-sky-200 bg-sky-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {getNotificationIcon(notification.type)}
              <p className="text-sm text-zinc-800">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950">Röstassistent</h1>
            <p className="mt-1 text-sm text-zinc-600">Todos, röstkommandon och Google-synk för ditt konto.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm">
              {currentUser.pictureUrl && (
                <img
                  src={currentUser.pictureUrl}
                  alt=""
                  className="h-10 w-10 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-950">{currentUser.name || currentUser.email}</p>
                <p className="truncate text-xs text-zinc-500">{currentUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-950"
            >
              <LogOut className="h-4 w-4" />
              Logga ut
            </button>
          </div>
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="space-y-5">
            <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Lägg till en ny att göra-post..."
                  className="min-h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
                />
                <div className="flex items-center gap-2">
                  <VoiceRecorder
                    onRecordingComplete={(url) => {
                      setCurrentAudioUrl(url);
                      addNotification('Röstinspelning slutförd', 'success');
                    }}
                    onPreviewReceived={handleVoicePreview}
                  />
                  <button
                    type="submit"
                    className="min-h-11 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                  >
                    Lägg till
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex min-h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <Calendar className="h-4 w-4" />
                  {dueDate ? `Slutdatum: ${formatDate(dueDate)}` : 'Lägg till slutdatum'}
                </button>

                {showDatePicker && (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      addNotification(`Datum satt till ${formatDate(e.target.value)}`, 'info');
                    }}
                    className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
                    min={new Date().toISOString().split('T')[0]}
                  />
                )}
              </div>
            </form>

            <TextAnalysisPanel
              addNotification={addNotification}
              onApproved={() => {
                loadTodos();
                loadSyncStatus();
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">Att göra</h2>
                <p className="text-sm text-zinc-500">{todos.length} poster</p>
              </div>
              <button
                type="button"
                onClick={handleSyncGoogleTasks}
                disabled={isSyncingGoogleTasks}
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 disabled:text-zinc-400"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncingGoogleTasks ? 'animate-spin' : ''}`} />
                {isSyncingGoogleTasks ? 'Synkar...' : 'Synka Google Tasks'}
              </button>
            </div>

            {transcription && (
              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-medium text-zinc-950">Transkribering</h3>
                <p className="mt-1 text-sm text-zinc-600">{transcription}</p>
              </div>
            )}

            {currentAudioUrl && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600 shadow-sm">
                <Volume2 className="h-4 w-4" />
                <span>Röstinspelning</span>
                <audio src={currentAudioUrl} controls className="h-8" />
              </div>
            )}

            {pendingVoiceCommand && (
              <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-950">Granska röstkommando</h3>
                  <span className="rounded-full border border-teal-200 bg-white px-2 py-1 text-xs font-medium text-teal-700">
                    {pendingVoiceCommand.type}
                  </span>
                </div>

                {pendingVoiceCommand.type === 'TODO' && (
                  <>
                    <input
                      type="text"
                      value={pendingVoiceCommand.todo?.description || ''}
                      onChange={(e) => updatePendingVoiceCommand('todo', 'description', e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      placeholder="Beskrivning"
                    />
                    <input
                      type="date"
                      value={pendingVoiceCommand.todo?.dueDate || ''}
                      onChange={(e) => updatePendingVoiceCommand('todo', 'dueDate', e.target.value || null)}
                      className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    />
                  </>
                )}

                {pendingVoiceCommand.type === 'MEETING' && (
                  <>
                    <input
                      type="text"
                      value={pendingVoiceCommand.meeting?.title || ''}
                      onChange={(e) => updatePendingVoiceCommand('meeting', 'title', e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      placeholder="Titel"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="datetime-local"
                        value={pendingVoiceCommand.meeting?.startTimestamp?.slice(0, 16) || ''}
                        onChange={(e) => updatePendingVoiceCommand('meeting', 'startTimestamp', e.target.value ? `${e.target.value}:00` : null)}
                        className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      />
                      <input
                        type="datetime-local"
                        value={pendingVoiceCommand.meeting?.endTimestamp?.slice(0, 16) || ''}
                        onChange={(e) => updatePendingVoiceCommand('meeting', 'endTimestamp', e.target.value ? `${e.target.value}:00` : null)}
                        className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        value={pendingVoiceCommand.meeting?.participants?.[0]?.name || ''}
                        onChange={(e) => updatePendingParticipant('name', e.target.value)}
                        className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        placeholder="Deltagare"
                      />
                      <input
                        type="email"
                        value={pendingVoiceCommand.meeting?.participants?.[0]?.email || ''}
                        onChange={(e) => updatePendingParticipant('email', e.target.value)}
                        className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        placeholder="E-post, valfritt"
                      />
                    </div>
                  </>
                )}

                {pendingVoiceCommand.type === 'UNKNOWN' && (
                  <p className="text-sm text-zinc-700">
                    {pendingVoiceCommand.message || 'Kommandot kunde inte tolkas.'}
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={approvePendingVoiceCommand}
                    disabled={isApprovingVoiceCommand || pendingVoiceCommand.type === 'UNKNOWN'}
                    className="min-h-10 flex-1 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-zinc-300"
                  >
                    {isApprovingVoiceCommand ? 'Sparar...' : 'Godkänn'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelPendingVoiceCommand}
                    className="min-h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}

            {verifiedEmails.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <Mail className="h-4 w-4" />
                <span>Verifierad e-post: {verifiedEmails[verifiedEmails.length - 1]}</span>
              </div>
            )}

            {isLoading ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 shadow-sm">Laddar todos...</div>
            ) : (
              <TaskList
                todos={todos}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
                formatDate={formatDate}
                isOverdue={isOverdue}
              />
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-950">Synkstatus</h2>
              <div className="mt-3 space-y-2">
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${syncBadgeClass(syncStatus?.googleCalendar)}`}>
                  <span>Google Kalender</span>
                  <span>{syncStatus?.googleCalendar || 'KONTROLLERAS'}</span>
                </div>
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${syncBadgeClass(syncStatus?.googleTasks)}`}>
                  <span>Google Tasks</span>
                  <span>{syncStatus?.googleTasks || 'KONTROLLERAS'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-950">Översikt</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Totalt</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-950">{todos.length}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Klara</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-950">{completedCount}</p>
                </div>
                <div className="col-span-2 rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Från Google Tasks</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-950">{googleTasksCount}</p>
                </div>
              </div>
            </div>
          </aside>
        </main>

        {isVerifyingEmail && detectedEmail && (
          <EmailVerificationModal
            email={detectedEmail}
            transcription={transcription}
            onConfirm={handleConfirmEmail}
            onCancel={handleCancelEmailVerification}
          />
        )}
      </div>
    </div>
  );
}

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
