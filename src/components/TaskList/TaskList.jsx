import { TaskListItem } from './TaskListItem';

/**
 * @typedef {Object} TodoItem
 * @property {string|number} id
 * @property {string|null|undefined} description
 * @property {boolean} completed
 * @property {string|null|undefined} dueDate
 * @property {string|null|undefined} syncStatus
 */

const getTaskTitle = (description) => {
  const trimmedDescription = description?.trim();
  if (!trimmedDescription) return 'Namnlös task';
  return trimmedDescription.split(/\r?\n/)[0];
};

const getTaskInformation = (todo, formatDate) => {
  const details = [];

  if (todo.dueDate) {
    details.push(`Slutdatum ${formatDate(todo.dueDate)}`);
  }

  if (todo.syncStatus) {
    details.push(todo.syncStatus === 'GOOGLE_TASKS_IMPORTED' ? 'Synkad från Google Tasks' : 'Lokal task');
  }

  return details.length > 0 ? details.join(' · ') : 'Ingen kompletterande information';
};

const toTaskListItemData = (todo, formatDate) => ({
  id: todo.id,
  title: getTaskTitle(todo.description),
  information: getTaskInformation(todo, formatDate),
  completed: Boolean(todo.completed),
  dueDate: todo.dueDate,
  syncStatus: todo.syncStatus
});

/**
 * @param {{
 *   todos: TodoItem[],
 *   onToggleTodo: (id: string|number, completed: boolean) => void,
 *   onDeleteTodo: (id: string|number) => void,
 *   formatDate: (dateString: string) => string,
 *   isOverdue: (dateString: string) => boolean
 * }} props
 */
export function TaskList({ todos, onToggleTodo, onDeleteTodo, formatDate, isOverdue }) {
  if (todos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        Inga att göra-poster ännu
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      {todos.map(todo => (
        <TaskListItem
          key={todo.id}
          task={toTaskListItemData(todo, formatDate)}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
          formatDate={formatDate}
          isOverdue={isOverdue}
        />
      ))}
    </ul>
  );
}
