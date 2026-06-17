// SmartTodo - Todo State Management Context
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { nanoid } from "nanoid";
import {
  Todo,
  Project,
  Tag,
  UndoRecord,
  TodoStatus,
  TodoPriority,
  ViewType,
  AiOrganizeResult,
  Subtask,
} from "../lib/types";
import {
  getTodos,
  saveTodos,
  getProjects,
  saveProjects,
  getTags,
  saveTags,
  getUndoRecord,
  saveUndoRecord,
} from "../lib/storage";

interface TodoContextValue {
  todos: Todo[];
  projects: Project[];
  tags: Tag[];
  undoRecord: UndoRecord | null;
  selectedTodoId: string | null;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  setSelectedTodoId: (id: string | null) => void;

  // CRUD
  addTodo: (partial: Partial<Todo> & { title: string }) => Todo;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  completeTodo: (id: string) => void;
  uncompleteTodo: (id: string) => void; // 撤回已完成
  cancelTodo: (id: string) => void;

  // Projects
  addProject: (name: string, color?: string) => Project;
  getProjectById: (id: string | undefined) => Project | undefined;

  // Tags
  getTagById: (id: string) => Tag | undefined;
  addTag: (name: string, color?: string) => Tag;

  // AI
  addTodoFromAi: (result: AiOrganizeResult, originalInput: string) => Todo;
  undoLastAiCreate: () => string | null; // returns originalInput

  // Subtasks
  toggleSubtask: (todoId: string, subtaskId: string) => void;
  addSubtask: (todoId: string, title: string) => void;
  deleteSubtask: (todoId: string, subtaskId: string) => void;
}

const TodoContext = createContext<TodoContextValue | null>(null);

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>(() => getTodos());
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [tags, setTags] = useState<Tag[]>(() => getTags());
  const [undoRecord, setUndoRecord] = useState<UndoRecord | null>(() => getUndoRecord());
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("today");

  // Persist on change
  useEffect(() => { saveTodos(todos); }, [todos]);
  useEffect(() => { saveProjects(projects); }, [projects]);
  useEffect(() => { saveTags(tags); }, [tags]);
  useEffect(() => { saveUndoRecord(undoRecord); }, [undoRecord]);

  const addTodo = useCallback((partial: Partial<Todo> & { title: string }): Todo => {
    const now = new Date().toISOString();
    const todo: Todo = {
      id: nanoid(),
      title: partial.title,
      status: partial.status ?? "todo",
      priority: partial.priority ?? "medium",
      projectId: partial.projectId,
      tagIds: partial.tagIds ?? [],
      dueAt: partial.dueAt,
      reminders: partial.reminders ?? [],
      contentMarkdown: partial.contentMarkdown ?? "",
      originalInput: partial.originalInput,
      subtasks: partial.subtasks ?? [],
      attachments: partial.attachments ?? [],
      aiMeta: partial.aiMeta,
      createdAt: now,
      updatedAt: now,
    };
    setTodos((prev) => [todo, ...prev]);
    return todo;
  }, []);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setSelectedTodoId((prev) => (prev === id ? null : prev));
  }, []);

  const completeTodo = useCallback((id: string) => {
    const now = new Date().toISOString();
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: "done" as TodoStatus, completedAt: now, updatedAt: now }
          : t
      )
    );
  }, []);

  const uncompleteTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: "todo" as TodoStatus, completedAt: undefined, updatedAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  const cancelTodo = useCallback((id: string) => {
    const now = new Date().toISOString();
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: "cancelled" as TodoStatus, cancelledAt: now, updatedAt: now }
          : t
      )
    );
  }, []);

  const addProject = useCallback((name: string, color?: string): Project => {
    const now = new Date().toISOString();
    const project: Project = {
      id: nanoid(),
      name,
      color: color ?? "#6366F1",
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [...prev, project]);
    return project;
  }, []);

  const getProjectById = useCallback(
    (id: string | undefined) => projects.find((p) => p.id === id),
    [projects]
  );

  const getTagById = useCallback(
    (id: string) => tags.find((t) => t.id === id),
    [tags]
  );

  const addTag = useCallback((name: string, color?: string): Tag => {
    const tag: Tag = { id: nanoid(), name, color: color ?? "#6366F1" };
    setTags((prev) => [...prev, tag]);
    return tag;
  }, []);

  const addTodoFromAi = useCallback(
    (result: AiOrganizeResult, originalInput: string): Todo => {
      const now = new Date().toISOString();

      // Resolve or create project
      let projectId: string | undefined;
      if (result.projectName) {
        const existing = projects.find(
          (p) => p.name.toLowerCase() === result.projectName!.toLowerCase()
        );
        if (existing) {
          projectId = existing.id;
        } else {
          const newProj: Project = {
            id: nanoid(),
            name: result.projectName,
            color: "#6366F1",
            createdAt: now,
            updatedAt: now,
          };
          setProjects((prev) => [...prev, newProj]);
          projectId = newProj.id;
        }
      }

      // Resolve or create tags
      const tagIds: string[] = [];
      if (result.tags) {
        for (const tagName of result.tags) {
          const existing = tags.find(
            (t) => t.name.toLowerCase() === tagName.toLowerCase()
          );
          if (existing) {
            tagIds.push(existing.id);
          } else {
            const newTag: Tag = { id: nanoid(), name: tagName, color: "#8B5CF6" };
            setTags((prev) => [...prev, newTag]);
            tagIds.push(newTag.id);
          }
        }
      }

      const subtasks: Subtask[] = (result.subtasks ?? []).map((title) => ({
        id: nanoid(),
        title,
        done: false,
        createdAt: now,
      }));

      const reminders = (result.reminders ?? []).map((r) => ({
        id: nanoid(),
        remindAt: r.remindAt,
        reason: r.reason,
      }));

      const todo = addTodo({
        title: result.title,
        status: "todo",
        priority: result.priority,
        projectId,
        tagIds,
        dueAt: result.dueAt,
        reminders,
        contentMarkdown: result.contentMarkdown ?? "",
        originalInput,
        subtasks,
        attachments: [],
        aiMeta: {
          aiGenerated: true,
          aiModel: "gpt-4o",
          aiCreatedAt: now,
          confidence: result.confidence,
          warnings: result.warnings,
        },
      });

      // Save undo record
      const undoRec: UndoRecord = {
        id: nanoid(),
        action: "ai_create_todo",
        todoId: todo.id,
        originalInput,
        createdAt: now,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
      setUndoRecord(undoRec);

      return todo;
    },
    [projects, tags, addTodo]
  );

  const undoLastAiCreate = useCallback((): string | null => {
    if (!undoRecord) return null;
    const originalInput = undoRecord.originalInput;
    deleteTodo(undoRecord.todoId);
    setUndoRecord(null);
    return originalInput;
  }, [undoRecord, deleteTodo]);

  const toggleSubtask = useCallback((todoId: string, subtaskId: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== todoId) return t;
        const now = new Date().toISOString();
        return {
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === subtaskId
              ? { ...s, done: !s.done, completedAt: !s.done ? now : undefined }
              : s
          ),
          updatedAt: now,
        };
      })
    );
  }, []);

  const addSubtask = useCallback((todoId: string, title: string) => {
    const now = new Date().toISOString();
    const subtask: Subtask = { id: nanoid(), title, done: false, createdAt: now };
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? { ...t, subtasks: [...t.subtasks, subtask], updatedAt: now }
          : t
      )
    );
  }, []);

  const deleteSubtask = useCallback((todoId: string, subtaskId: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? {
              ...t,
              subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  }, []);

  return (
    <TodoContext.Provider
      value={{
        todos,
        projects,
        tags,
        undoRecord,
        selectedTodoId,
        currentView,
        setCurrentView,
        setSelectedTodoId,
        addTodo,
        updateTodo,
        deleteTodo,
        completeTodo,
        uncompleteTodo,
        cancelTodo,
        addProject,
        getProjectById,
        getTagById,
        addTag,
        addTodoFromAi,
        undoLastAiCreate,
        toggleSubtask,
        addSubtask,
        deleteSubtask,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodo(): TodoContextValue {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodo must be used within TodoProvider");
  return ctx;
}
