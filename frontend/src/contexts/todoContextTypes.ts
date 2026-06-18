import type {
  AiOrganizeResult,
  Project,
  Tag,
  Todo,
  UndoRecord,
  ViewType,
} from "../lib/types";
import type { TodoCreateInput } from "../lib/todoFactory";

export interface TodoContextValue {
  todos: Todo[];
  projects: Project[];
  tags: Tag[];
  undoRecord: UndoRecord | null;
  selectedTodoId: string | null;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  setSelectedTodoId: (id: string | null) => void;

  addTodo: (partial: TodoCreateInput) => Todo;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  restoreTodo: (todo: Todo, index?: number) => void;
  markReminderSent: (todoId: string, reminderId: string, sentAt?: string) => void;
  replaceWorkspaceData: (data: {
    todos?: Todo[];
    projects?: Project[];
    tags?: Tag[];
    undoRecord?: UndoRecord | null;
  }) => void;
  clearWorkspaceData: () => void;
  duplicateTodo: (id: string) => Todo | null;
  completeTodo: (id: string) => void;
  uncompleteTodo: (id: string) => void;
  cancelTodo: (id: string) => void;

  addProject: (name: string, color?: string) => Project;
  getProjectById: (id: string | undefined) => Project | undefined;

  getTagById: (id: string) => Tag | undefined;
  addTag: (name: string, color?: string) => Tag;

  addTodoFromAi: (result: AiOrganizeResult, originalInput: string) => Todo;
  undoLastAiCreate: () => string | null;

  toggleSubtask: (todoId: string, subtaskId: string) => void;
  addSubtask: (todoId: string, title: string) => void;
  deleteSubtask: (todoId: string, subtaskId: string) => void;
}
