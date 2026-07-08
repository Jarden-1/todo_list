import type { TodoCreateInput, TodoPatchInput } from "../lib/todosApi";
import type { WorkspaceBootstrap } from "../lib/workspaceApi";
import type {
  Project,
  Tag,
  Todo,
  TodoStatus,
  UndoRecord,
  ViewType,
} from "../lib/types";

export interface TodoContextValue {
  todos: Todo[];
  projects: Project[];
  tags: Tag[];
  undoRecord: UndoRecord | null;
  selectedTodoId: string | null;
  currentView: ViewType;
  loading: boolean;
  error: string | null;
  setCurrentView: (view: ViewType) => void;
  setSelectedTodoId: (id: string | null) => void;

  refreshWorkspace: () => Promise<WorkspaceBootstrap>;
  hydrateWorkspace: (bootstrap: WorkspaceBootstrap) => void;

  addTodo: (partial: TodoCreateInput) => Promise<Todo>;
  updateTodo: (id: string, updates: TodoPatchInput) => Promise<Todo>;
  deleteTodo: (id: string) => Promise<Todo>;
  bulkDeleteTodos: (scope: { all?: boolean; ids?: string[] }) => Promise<string[]>;
  bulkMoveTodos: (ids: string[], projectId: string | null) => Promise<Todo[]>;
  restoreTodo: (id: string, status?: TodoStatus) => Promise<Todo>;
  markReminderSent: (todoId: string, reminderId: string, sentAt?: string) => Promise<void>;
  duplicateTodo: (id: string) => Promise<Todo>;
  completeTodo: (id: string) => Promise<Todo>;
  uncompleteTodo: (id: string) => Promise<Todo>;
  cancelTodo: (id: string) => Promise<Todo>;

  addProject: (name: string, color?: string) => Promise<Project>;
  updateProject: (id: string, data: { name?: string; color?: string | null }) => Promise<Project>;
  deleteProject: (id: string, mode: "move" | "delete") => Promise<Project>;
  getProjectById: (id: string | undefined | null) => Project | undefined;

  getTagById: (id: string) => Tag | undefined;
  addTag: (name: string, color?: string) => Promise<Tag>;

  addTodoFromAi: (input: string) => Promise<Todo[]>;
  undoLastAiCreate: () => Promise<string | null>;

  toggleSubtask: (todoId: string, subtaskId: string) => Promise<Todo>;
  addSubtask: (todoId: string, title: string) => Promise<Todo>;
  deleteSubtask: (todoId: string, subtaskId: string) => Promise<Todo>;
  // Optimistically update a todo's subtasks in local state from its markdown
  // task list, without an API call. The backend reconciles on the next
  // contentMarkdown save (replaceActiveSubtasksFromMarkdown).
  syncSubtasksLocally: (todoId: string, markdown: string) => void;
}
