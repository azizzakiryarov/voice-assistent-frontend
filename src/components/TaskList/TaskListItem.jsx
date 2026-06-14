import { useState } from 'react';
import { Calendar, Check, ChevronDown, Trash2 } from 'lucide-react';

/**
 * @typedef {Object} TaskListItemData
 * @property {string|number} id
 * @property {string} title
 * @property {string} information
 * @property {boolean} completed
 * @property {string|null|undefined} dueDate
 * @property {string|null|undefined} syncStatus
 */

/**
 * @param {{
 *   task: TaskListItemData,
 *   onToggle: (id: string|number, completed: boolean) => void,
 *   onDelete: (id: string|number) => void,
 *   formatDate: (dateString: string) => string,
 *   isOverdue: (dateString: string) => boolean
 * }} props
 */
export function TaskListItem({ task, onToggle, onDelete, formatDate, isOverdue }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDueDate = Boolean(task.dueDate);
  const overdue = hasDueDate && isOverdue(task.dueDate) && !task.completed;

  return (
    <li className="border-b border-zinc-200 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(prev => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsExpanded(prev => !prev);
          }
        }}
        className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 sm:px-5 ${
          task.completed ? 'bg-zinc-50/70' : 'bg-white'
        }`}
        aria-expanded={isExpanded}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={task.completed ? 'Markera som ej slutförd' : 'Markera som slutförd'}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(task.id, task.completed);
          }}
          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
            task.completed
              ? 'border-emerald-600 bg-emerald-600'
              : 'border-zinc-300 bg-white group-hover:border-zinc-500'
          }`}
        >
          {task.completed && <Check className="h-4 w-4 text-white" />}
        </button>

        <span className="min-w-0">
          <span
            className={`block break-words text-sm font-medium leading-5 ${
              task.completed ? 'text-zinc-400 line-through' : 'text-zinc-950'
            }`}
          >
            {task.title}
          </span>
          <span
            className={`mt-1 block break-words text-sm leading-5 ${
              task.completed ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            {task.information}
          </span>
        </span>

        <span className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
          {hasDueDate && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                overdue
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600'
              }`}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.syncStatus && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
              {task.syncStatus === 'GOOGLE_TASKS_IMPORTED' ? 'Google Tasks' : 'Lokal'}
            </span>
          )}
        </span>

        <span className="flex items-center gap-1">
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          <button
            type="button"
            aria-label="Ta bort task"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task.id);
            }}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>

      {isExpanded && (
        <div className="space-y-2 bg-zinc-50 px-4 pb-4 pl-[3.25rem] pr-5 text-sm text-zinc-600 sm:pl-[3.75rem]">
          <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">ID</span>
            <span className="break-all">{task.id}</span>
          </div>
          <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Status</span>
            <span>{task.completed ? 'Slutförd' : 'Ej slutförd'}</span>
          </div>
          {hasDueDate && (
            <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Slutdatum</span>
              <span>
                {formatDate(task.dueDate)}
                {overdue && ' · Försenad'}
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
