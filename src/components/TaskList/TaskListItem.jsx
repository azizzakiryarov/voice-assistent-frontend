import { useState } from 'react';
import { Calendar, Check, ChevronDown, Trash2 } from 'lucide-react';

/**
 * @typedef {Object} TaskListItemData
 * @property {string|number} id
 * @property {string} title
 * @property {string} information
 * @property {string} description
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
        className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-5 ${
          task.completed ? 'bg-zinc-50 text-zinc-400' : 'bg-white text-zinc-950'
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
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
            task.completed
              ? 'border-blue-600 bg-blue-600'
              : 'border-zinc-400 bg-white group-hover:border-blue-600'
          }`}
        >
          {task.completed && <Check className="h-3.5 w-3.5 text-white" />}
        </button>

        <div className="min-w-0">
          <p
            className={`break-words text-sm font-medium leading-5 ${
              task.completed ? 'text-zinc-400 line-through' : 'text-zinc-950'
            }`}
          >
            {task.title}
          </p>
          <p
            className={`mt-1 break-words text-xs leading-5 sm:text-sm ${
              task.completed ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            {task.information}
          </p>
          {hasDueDate && (
            <p className={`mt-1 inline-flex items-center gap-1 text-xs ${overdue ? 'text-rose-600' : 'text-blue-600'}`}>
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(task.dueDate)}
              {overdue && ' · Försenad'}
            </p>
          )}
        </div>

        <span className="flex items-center gap-1">
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform group-hover:text-zinc-600 ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          <button
            type="button"
            aria-label="Ta bort task"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task.id);
            }}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>

      {isExpanded && (
        <div className="space-y-3 bg-zinc-50 px-4 pb-4 pl-[3.25rem] pr-5 text-sm text-zinc-600 sm:pl-[3.75rem]">
          {task.description && (
            <p className="break-words leading-6 text-zinc-700">{task.description}</p>
          )}
          <dl className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <dt className="text-xs font-medium uppercase text-zinc-400">ID</dt>
            <dd className="break-all">{task.id}</dd>
            <dt className="text-xs font-medium uppercase text-zinc-400">Status</dt>
            <dd>{task.completed ? 'Slutförd' : 'Ej slutförd'}</dd>
            {task.syncStatus && (
              <>
                <dt className="text-xs font-medium uppercase text-zinc-400">Källa</dt>
                <dd>{task.syncStatus === 'GOOGLE_TASKS_IMPORTED' ? 'Google Tasks' : 'Lokal uppgift'}</dd>
              </>
            )}
          </dl>
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
