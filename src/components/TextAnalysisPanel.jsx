import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Check, ClipboardList, FileText, Loader2, X } from 'lucide-react';
import { analyzeTextWithJob, approveTextAnalysis } from '../api';

const categories = ['SCHOOL', 'WORK', 'FAMILY', 'HEALTH', 'FINANCE', 'TRAVEL', 'AUTHORITY', 'MEETING', 'OTHER'];
const urgencies = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const deadlineTypes = ['EXACT_DATE', 'EXACT_DATE_TIME', 'AS_SOON_AS_POSSIBLE', 'EARLIEST_CONVENIENCE', 'RECURRING', 'NONE', 'UNKNOWN'];
const jobStatusText = {
  PENDING: 'Väntar på ledig analyskö...',
  RUNNING: 'Analyserar med lokal LLM...',
  SUCCEEDED: 'Analysen är klar',
  FAILED: 'Analysen misslyckades'
};

const nowWithOffset = () => {
  const date = new Date();
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const minutes = String(abs % 60).padStart(2, '0');
  return `${date.toISOString().slice(0, 19)}${sign}${hours}:${minutes}`;
};

const withSelection = (items = []) => items.map(item => ({ ...item, selected: true }));

const stripSelection = ({ selected: _selected, ...item }) => item;

const dateTimeInputValue = (value) => {
  if (!value) return '';
  return value.length === 10 ? value : value.slice(0, 16);
};

const fromDateTimeInput = (value, allDay = false) => {
  if (!value) return null;
  return allDay ? value.slice(0, 10) : `${value}:00`;
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SectionHeader({ icon, title, count }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-semibold text-zinc-950">{title}</h4>
      </div>
      <span className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600">{count}</span>
    </div>
  );
}

export function TextAnalysisPanel({ onApproved, addNotification }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState('EMAIL');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');

  const selectedCount = useMemo(() => {
    if (!analysis) return 0;
    return [...analysis.events, ...analysis.todos].filter(item => item.selected).length;
  }, [analysis]);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!text.trim()) {
      addNotification('Klistra in eller skriv en text först', 'warning');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisStatus('Startar analys...');
      const result = await analyzeTextWithJob(
        {
          title: title.trim() || null,
          text,
          sourceType,
          receivedAt: nowWithOffset(),
          timeZone: 'Europe/Stockholm'
        },
        (job) => setAnalysisStatus(jobStatusText[job.status] || 'Analyserar...')
      );
      setAnalysis({
        ...result,
        events: withSelection(result.events),
        todos: withSelection(result.todos),
        informationalItems: result.informationalItems || [],
        warnings: result.warnings || []
      });
      addNotification('Texten är analyserad och redo för granskning', 'success');
    } catch (error) {
      const message = error.code === 'ECONNABORTED'
        ? 'Textanalysen tog för lång tid. Försök igen när modellen är ledig.'
        : error.response?.data?.message || error.message || 'Kunde inte analysera texten';
      addNotification(message, 'error');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  const updateItem = (section, index, field, value) => {
    setAnalysis(prev => ({
      ...prev,
      [section]: prev[section].map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
  };

  const approveSelected = async () => {
    if (!analysis || selectedCount === 0) {
      addNotification('Välj minst ett objekt att skapa', 'warning');
      return;
    }

    try {
      setIsApproving(true);
      const payload = {
        events: analysis.events.filter(item => item.selected).map(stripSelection),
        todos: analysis.todos.filter(item => item.selected).map(stripSelection)
      };
      const result = await approveTextAnalysis(payload);
      addNotification(
        `Skapade ${result.createdEvents?.length || 0} kalenderhändelser och ${result.createdTodos?.length || 0} todos`,
        'success'
      );
      setAnalysis(null);
      setText('');
      setTitle('');
      onApproved?.();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Kunde inte skapa valda objekt', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <form onSubmit={handleAnalyze} className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal-700" />
          <h2 className="text-base font-semibold text-zinc-950">Analysera text</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-10 rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            placeholder="Rubrik eller källa, t.ex. Mejl från skolan"
            maxLength={160}
          />
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value)}
            className="min-h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          >
            {['EMAIL', 'LETTER', 'MESSAGE', 'WEB', 'NOTE', 'OTHER'].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="min-h-40 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          placeholder="Klistra in mejlet eller texten här..."
          maxLength={12000}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-zinc-500">
            {isAnalyzing && analysisStatus ? analysisStatus : `${text.length}/12000 tecken`}
          </span>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:bg-zinc-300"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {isAnalyzing ? 'Analyserar...' : 'Analysera text'}
          </button>
        </div>
      </form>

      {analysis && (
        <div className="space-y-4 border-t border-zinc-200 pt-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Sammanfattning</h3>
            <p className="mt-1 text-sm text-zinc-600">{analysis.summary}</p>
          </div>

          {analysis.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <SectionHeader
                icon={<AlertTriangle className="h-4 w-4 text-amber-700" />}
                title="Varningar"
                count={analysis.warnings.length}
              />
              <ul className="mt-2 space-y-2">
                {analysis.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`} className="text-sm text-amber-900">
                    <span className="font-medium">{warning.code}</span>: {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.events.length > 0 && (
            <div className="space-y-3">
              <SectionHeader
                icon={<CalendarPlus className="h-4 w-4 text-teal-700" />}
                title="Föreslagna kalenderhändelser"
                count={analysis.events.length}
              />
              {analysis.events.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-lg border border-zinc-200 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(event) => updateItem('events', index, 'selected', event.target.checked)}
                      className="h-4 w-4"
                    />
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(event) => updateItem('events', index, 'title', event.target.value)}
                      className="min-h-9 flex-1 rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Start">
                      <input
                        type={item.allDay ? 'date' : 'datetime-local'}
                        value={dateTimeInputValue(item.startDateTime)}
                        onChange={(event) => updateItem('events', index, 'startDateTime', fromDateTimeInput(event.target.value, item.allDay))}
                        className="min-h-9 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      />
                    </Field>
                    <Field label="Slut">
                      <input
                        type={item.allDay ? 'date' : 'datetime-local'}
                        value={dateTimeInputValue(item.endDateTime)}
                        onChange={(event) => updateItem('events', index, 'endDateTime', fromDateTimeInput(event.target.value, item.allDay))}
                        className="min-h-9 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      />
                    </Field>
                    <Field label="Kategori">
                      <select
                        value={item.category || 'OTHER'}
                        onChange={(event) => updateItem('events', index, 'category', event.target.value)}
                        className="min-h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                      >
                        {categories.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </Field>
                    <Field label="Urgency">
                      <select
                        value={item.urgency || 'LOW'}
                        onChange={(event) => updateItem('events', index, 'urgency', event.target.value)}
                        className="min-h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                      >
                        {urgencies.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </Field>
                  </div>
                  <textarea
                    value={item.description || ''}
                    onChange={(event) => updateItem('events', index, 'description', event.target.value)}
                    className="mt-3 min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Beskrivning"
                  />
                  <input
                    type="text"
                    value={item.location || ''}
                    onChange={(event) => updateItem('events', index, 'location', event.target.value)}
                    className="mt-3 min-h-9 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Plats"
                  />
                  {item.sourceText && <p className="mt-2 text-xs text-zinc-500">Källa: {item.sourceText}</p>}
                </div>
              ))}
            </div>
          )}

          {analysis.todos.length > 0 && (
            <div className="space-y-3">
              <SectionHeader
                icon={<ClipboardList className="h-4 w-4 text-teal-700" />}
                title="Föreslagna todos"
                count={analysis.todos.length}
              />
              {analysis.todos.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-lg border border-zinc-200 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(event) => updateItem('todos', index, 'selected', event.target.checked)}
                      className="h-4 w-4"
                    />
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(event) => updateItem('todos', index, 'title', event.target.value)}
                      className="min-h-9 flex-1 rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Deadline-typ">
                      <select
                        value={item.deadlineType || 'UNKNOWN'}
                        onChange={(event) => updateItem('todos', index, 'deadlineType', event.target.value)}
                        className="min-h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                      >
                        {deadlineTypes.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </Field>
                    <Field label="Deadline">
                      <input
                        type={item.deadlineType === 'EXACT_DATE_TIME' ? 'datetime-local' : 'date'}
                        value={dateTimeInputValue(item.deadline)}
                        onChange={(event) => updateItem('todos', index, 'deadline', fromDateTimeInput(event.target.value, item.deadlineType !== 'EXACT_DATE_TIME'))}
                        disabled={!['EXACT_DATE', 'EXACT_DATE_TIME'].includes(item.deadlineType)}
                        className="min-h-9 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-zinc-100"
                      />
                    </Field>
                    <Field label="Urgency">
                      <select
                        value={item.urgency || 'LOW'}
                        onChange={(event) => updateItem('todos', index, 'urgency', event.target.value)}
                        className="min-h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                      >
                        {urgencies.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Kategori">
                      <select
                        value={item.category || 'OTHER'}
                        onChange={(event) => updateItem('todos', index, 'category', event.target.value)}
                        className="min-h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                      >
                        {categories.map(value => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </Field>
                  </div>
                  <textarea
                    value={item.description || ''}
                    onChange={(event) => updateItem('todos', index, 'description', event.target.value)}
                    className="mt-3 min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Beskrivning"
                  />
                  {item.sourceText && <p className="mt-2 text-xs text-zinc-500">Källa: {item.sourceText}</p>}
                </div>
              ))}
            </div>
          )}

          {analysis.informationalItems.length > 0 && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
              <SectionHeader
                icon={<FileText className="h-4 w-4 text-sky-700" />}
                title="Informationspunkter"
                count={analysis.informationalItems.length}
              />
              <ul className="mt-2 space-y-2">
                {analysis.informationalItems.map((item, index) => (
                  <li key={`${item.title}-${index}`} className="text-sm text-sky-950">
                    <span className="font-medium">{item.title}</span>
                    {item.description ? `: ${item.description}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={approveSelected}
              disabled={isApproving || selectedCount === 0}
              className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-zinc-300"
            >
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isApproving ? 'Skapar...' : `Godkänn valda (${selectedCount})`}
            </button>
            <button
              type="button"
              onClick={() => setAnalysis(null)}
              className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <X className="h-4 w-4" />
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
