import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  Camera,
  ClipboardList,
  FileImage,
  Loader2,
  Trash2,
  Upload
} from 'lucide-react';
import { approveFormScan, scanForm } from '../api';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

const toInputDateTime = (value) => (value ? value.slice(0, 16) : '');
const toApiDateTime = (value, allDay) => {
  if (!value) return null;
  return allDay ? value.slice(0, 10) : `${value}:00`;
};

const withDefaults = (scan) => ({
  ...scan,
  events: (scan.suggestedCalendarEvents || []).map(event => ({ ...event })),
  todos: (scan.suggestedTodos || []).map(todo => ({ ...todo })),
  warnings: scan.warnings || [],
});

export function FormScanPanel({ onApproved, addNotification }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scan, setScan] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const suggestedCount = useMemo(() => (
    (scan?.events?.length || 0) + (scan?.todos?.length || 0)
  ), [scan]);

  const chooseFile = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!acceptedTypes.includes(selected.type)) {
      addNotification('Välj en JPEG-, PNG- eller WebP-bild', 'warning');
      event.target.value = '';
      return;
    }
    if (selected.size > MAX_IMAGE_BYTES) {
      addNotification('Bilden får vara högst 10 MB', 'warning');
      event.target.value = '';
      return;
    }
    setFile(selected);
    setScan(null);
  };

  const startScan = async () => {
    if (!file) {
      addNotification('Ta eller välj en bild av formuläret först', 'warning');
      return;
    }
    try {
      setIsScanning(true);
      const result = await scanForm(file);
      setScan(withDefaults(result));
      addNotification('Formuläret är analyserat och redo för granskning', 'success');
    } catch (error) {
      addNotification(
        error.response?.data?.message || 'Kunde inte läsa formuläret. Försök med en skarpare bild.',
        'error'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const updateItem = (section, index, field, value) => {
    setScan(previous => ({
      ...previous,
      [section]: previous[section].map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const discardItem = (section, index) => {
    setScan(previous => ({
      ...previous,
      [section]: previous[section].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const approve = async () => {
    if (!scan || suggestedCount === 0) {
      addNotification('Behåll minst ett förslag att skapa, eller avbryt granskningen', 'warning');
      return;
    }
    try {
      setIsApproving(true);
      const result = await approveFormScan(scan.scanId, {
        events: scan.events,
        todos: scan.todos,
      });
      const approval = result.approval || {};
      addNotification(
        `Skapade ${approval.createdEvents?.length || 0} kalenderhändelser och ${approval.createdTodos?.length || 0} todos`,
        'success'
      );
      (result.warnings || []).forEach(message => addNotification(message, 'warning'));
      setScan(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onApproved?.();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Kunde inte godkänna formuläret', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const cancel = () => {
    setScan(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    addNotification('Formulärgranskningen avbröts. Inget skapades.', 'info');
  };

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-teal-700" />
          <h2 className="text-base font-semibold text-zinc-950">Skanna formulär</h2>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          Ta en bild av ett pappersformulär. Förslag är alltid utkast tills du godkänner dem.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50">
          <Upload className="h-4 w-4" />
          Ta foto eller välj bild
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={chooseFile}
          />
        </label>
        <button
          type="button"
          onClick={startScan}
          disabled={!file || isScanning}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:bg-zinc-300"
        >
          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
          {isScanning ? 'Läser formuläret...' : 'Analysera bild'}
        </button>
        <p className="text-xs leading-5 text-zinc-500">JPEG, PNG eller WebP, högst 10 MB.</p>
      </div>

      {previewUrl && (
        <img src={previewUrl} alt="Förhandsvisning av valt formulär" className="max-h-64 rounded-lg border border-zinc-200 object-contain" />
      )}

      {scan && (
        <div className="space-y-4 border-t border-zinc-200 pt-4">
          <div className="grid gap-3 rounded-lg bg-zinc-50 p-3 text-sm sm:grid-cols-3">
            <div><span className="block text-xs text-zinc-500">Typ</span><span className="font-medium">{scan.detectedFormType || 'other'}</span></div>
            <div><span className="block text-xs text-zinc-500">Barn</span><span className="font-medium">{scan.childName || 'Inte identifierat'}</span></div>
            <div><span className="block text-xs text-zinc-500">Bedömd säkerhet</span><span className="font-medium">{Math.round((scan.confidence || 0) * 100)}%</span></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Sammanfattning</h3>
            <p className="mt-1 text-sm text-zinc-600">{scan.summary}</p>
          </div>

          {scan.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" /> Kontrollera innan godkännande</div>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {scan.warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}
              </ul>
            </div>
          )}

          <details className="rounded-lg border border-zinc-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-zinc-700">Visa OCR-text</summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-zinc-600">{scan.extractedText}</pre>
          </details>

          {scan.events.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950"><CalendarPlus className="h-4 w-4 text-teal-700" /> Kalenderhändelser</h3>
              {scan.events.map((event, index) => (
                <div key={`${event.title}-${index}`} className="space-y-3 rounded-lg border border-zinc-200 p-3">
                  <div className="flex gap-2"><input value={event.title || ''} onChange={e => updateItem('events', index, 'title', e.target.value)} className="min-h-9 flex-1 rounded-lg border border-zinc-300 px-3 text-sm" /><button type="button" onClick={() => discardItem('events', index)} className="rounded-lg border border-rose-200 px-3 text-rose-700 hover:bg-rose-50" aria-label="Ta bort kalenderhändelse"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="grid gap-3 sm:grid-cols-2"><input type={event.allDay ? 'date' : 'datetime-local'} value={toInputDateTime(event.startDateTime)} onChange={e => updateItem('events', index, 'startDateTime', toApiDateTime(e.target.value, event.allDay))} className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm" /><input type={event.allDay ? 'date' : 'datetime-local'} value={toInputDateTime(event.endDateTime)} onChange={e => updateItem('events', index, 'endDateTime', toApiDateTime(e.target.value, event.allDay))} className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm" /></div>
                  <textarea value={event.description || ''} onChange={e => updateItem('events', index, 'description', e.target.value)} className="min-h-16 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="Beskrivning" />
                </div>
              ))}
            </div>
          )}

          {scan.todos.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950"><ClipboardList className="h-4 w-4 text-teal-700" /> Todos</h3>
              {scan.todos.map((todo, index) => (
                <div key={`${todo.title}-${index}`} className="space-y-3 rounded-lg border border-zinc-200 p-3">
                  <div className="flex gap-2"><input value={todo.title || ''} onChange={e => updateItem('todos', index, 'title', e.target.value)} className="min-h-9 flex-1 rounded-lg border border-zinc-300 px-3 text-sm" /><button type="button" onClick={() => discardItem('todos', index)} className="rounded-lg border border-rose-200 px-3 text-rose-700 hover:bg-rose-50" aria-label="Ta bort todo"><Trash2 className="h-4 w-4" /></button></div>
                  <input type={todo.deadlineType === 'EXACT_DATE_TIME' ? 'datetime-local' : 'date'} value={toInputDateTime(todo.deadline)} onChange={e => updateItem('todos', index, 'deadline', e.target.value ? toApiDateTime(e.target.value, todo.deadlineType !== 'EXACT_DATE_TIME') : null)} className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm" />
                  <textarea value={todo.description || ''} onChange={e => updateItem('todos', index, 'description', e.target.value)} className="min-h-16 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="Beskrivning" />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={approve} disabled={isApproving || suggestedCount === 0} className="min-h-10 flex-1 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-zinc-300">
              {isApproving ? 'Skapar...' : `Godkänn ${suggestedCount} förslag`}
            </button>
            <button type="button" onClick={cancel} disabled={isApproving} className="min-h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Avbryt – skapa inget</button>
          </div>
        </div>
      )}
    </section>
  );
}
