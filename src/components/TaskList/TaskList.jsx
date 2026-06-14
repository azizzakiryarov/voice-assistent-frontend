import { TaskListItem } from './TaskListItem';

/**
 * @typedef {Object} TodoItem
 * @property {string|number} id
 * @property {string|null|undefined} title
 * @property {string|null|undefined} description
 * @property {boolean} completed
 * @property {string|null|undefined} dueDate
 * @property {string|null|undefined} syncStatus
 */

const splitDescription = (description) => {
  const trimmedDescription = description?.trim();
  if (!trimmedDescription) {
    return { title: 'Namnlös uppgift', details: '' };
  }

  const [firstLine, ...remainingLines] = trimmedDescription.split(/\r?\n/);
  return {
    title: firstLine,
    details: remainingLines.join('\n').trim()
  };
};

const getTaskInformation = (todo, formatDate) => {
  const { details: descriptionDetails } = splitDescription(todo.description);
  const informationParts = [];

  if (descriptionDetails) {
    informationParts.push(descriptionDetails);
  }

  if (todo.dueDate) {
    informationParts.push(`Slutdatum ${formatDate(todo.dueDate)}`);
  }

  if (todo.syncStatus) {
    informationParts.push(todo.syncStatus === 'GOOGLE_TASKS_IMPORTED' ? 'Synkad från Google Tasks' : 'Lokal uppgift');
  }

  informationParts.push(`ID ${todo.id}`);

  return informationParts.join(' · ');
};

const toTaskListItemData = (todo, formatDate) => {
  const descriptionParts = splitDescription(todo.description);

  return {
    id: todo.id,
    title: todo.title?.trim() || descriptionParts.title,
    information: getTaskInformation(todo, formatDate),
    description: todo.description?.trim() || '',
    completed: Boolean(todo.completed),
    dueDate: todo.dueDate,
    syncStatus: todo.syncStatus
  };
};

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
  const openTasks = todos.filter(todo => !todo.completed);
  const completedTasks = todos.filter(todo => todo.completed);

  if (todos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        Inga att göra-poster ännu
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <ul>
        {openTasks.map(todo => (
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

      {completedTasks.length > 0 && (
        <div className={openTasks.length > 0 ? 'border-t border-zinc-200' : ''}>
          <div className="flex min-h-12 items-center px-4 text-sm font-medium text-zinc-700 sm:px-5">
            Slutförda ({completedTasks.length})
          </div>
          <ul>
            {completedTasks.map(todo => (
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
        </div>
      )}
    </div>
  );
}
