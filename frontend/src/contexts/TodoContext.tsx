import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  AiOrganizeResult,
  Project,
  Tag,
  Todo,
  UndoRecord,
  ViewType,
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
import { createDuplicateTodo } from "../lib/todoClone";
import {
  applyTodoStatus,
  applyTodoUpdates,
  createAiMeta,
  createProject,
  createRemindersFromAi,
  createSubtasksFromAi,
  createTag,
  createTodo,
  createUndoRecord,
  normalizeTodoReminders,
  type TodoCreateInput,
} from "../lib/todoFactory";
import {
  addTodoSubtask,
  deleteTodoSubtask,
  toggleTodoSubtask,
} from "../lib/todoSubtaskUpdates";
import type { TodoContextValue } from "./todoContextTypes";
import { useSettings } from "./SettingsContext";

const TodoContext = createContext<TodoContextValue | null>(null);

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
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
  useEffect(() => {
    setTodos((prev) => {
      let changed = false;
      const next = prev.map((todo) => {
        const normalized = normalizeTodoReminders(todo, settings.ringtone.advanceMinutes);
        if (normalized !== todo) changed = true;
        return normalized;
      });
      return changed ? next : prev;
    });
  }, [settings.ringtone.advanceMinutes]);

  const addTodo = useCallback((partial: TodoCreateInput): Todo => {
    const todo = createTodo(partial, new Date().toISOString(), {
      advanceMinutes: settings.ringtone.advanceMinutes,
    });
    setTodos((prev) => [todo, ...prev]);
    return todo;
  }, [settings.ringtone.advanceMinutes]);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        return applyTodoUpdates(t, updates, new Date().toISOString(), {
          advanceMinutes: settings.ringtone.advanceMinutes,
        });
      })
    );
  }, [settings.ringtone.advanceMinutes]);

  const markReminderSent = useCallback((todoId: string, reminderId: string, sentAt = new Date().toISOString()) => {
    setTodos((prev) =>
      prev.map((todo) => {
        if (todo.id !== todoId) return todo;

        const reminders = todo.reminders.map((reminder) =>
          reminder.id === reminderId ? { ...reminder, sentAt } : reminder
        );

        return { ...todo, reminders, updatedAt: sentAt };
      })
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setSelectedTodoId((prev) => (prev === id ? null : prev));
  }, []);

  const restoreTodo = useCallback((todo: Todo, index?: number) => {
    setTodos((prev) => {
      const existingIndex = prev.findIndex((t) => t.id === todo.id);
      if (existingIndex >= 0) {
        return prev.map((t) => (t.id === todo.id ? todo : t));
      }

      const next = [...prev];
      const insertIndex =
        typeof index === "number"
          ? Math.min(Math.max(index, 0), next.length)
          : 0;
      next.splice(insertIndex, 0, todo);
      return next;
    });
  }, []);

  const replaceWorkspaceData = useCallback((data: {
    todos?: Todo[];
    projects?: Project[];
    tags?: Tag[];
    undoRecord?: UndoRecord | null;
  }) => {
    if (data.todos) setTodos(data.todos);
    if (data.projects) setProjects(data.projects);
    if (data.tags) setTags(data.tags);
    if ("undoRecord" in data) setUndoRecord(data.undoRecord ?? null);
    setSelectedTodoId(null);
  }, []);

  const clearWorkspaceData = useCallback(() => {
    setTodos([]);
    setProjects([]);
    setTags([]);
    setUndoRecord(null);
    setSelectedTodoId(null);
  }, []);

  const duplicateTodo = useCallback((id: string): Todo | null => {
    const source = todos.find((todo) => todo.id === id);
    if (!source) return null;

    const duplicated = createDuplicateTodo(source);

    setTodos((prev) => {
      const sourceIndex = prev.findIndex((todo) => todo.id === id);
      const next = [...prev];
      next.splice(sourceIndex >= 0 ? sourceIndex + 1 : 0, 0, duplicated);
      return next;
    });

    return duplicated;
  }, [todos]);

  const completeTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? applyTodoStatus(t, "done") : t))
    );
  }, []);

  const uncompleteTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? applyTodoStatus(t, "todo") : t))
    );
  }, []);

  const cancelTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? applyTodoStatus(t, "cancelled") : t))
    );
  }, []);

  const addProject = useCallback((name: string, color?: string): Project => {
    const project = createProject(name, color);
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
    const tag = createTag(name, color);
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
          const newProj = createProject(result.projectName, undefined, now);
          setProjects((prev) => [...prev, newProj]);
          projectId = newProj.id;
        }
      }

      const reminders = createRemindersFromAi(result.reminders);
      const todo = addTodo({
        title: result.title,
        status: "todo",
        priority: result.priority,
        projectId,
        tagIds: [],
        dueAt: result.dueAt,
        reminders: reminders.length > 0 ? reminders : undefined,
        contentMarkdown: result.contentMarkdown ?? "",
        originalInput,
        subtasks: createSubtasksFromAi(result.subtasks, now),
        attachments: [],
        aiMeta: createAiMeta(result, now),
      });

      // Save undo record
      setUndoRecord(createUndoRecord(todo.id, originalInput, now));

      return todo;
    },
    [projects, addTodo]
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
      prev.map((todo) => (todo.id === todoId ? toggleTodoSubtask(todo, subtaskId) : todo))
    );
  }, []);

  const addSubtask = useCallback((todoId: string, title: string) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === todoId ? addTodoSubtask(todo, title) : todo))
    );
  }, []);

  const deleteSubtask = useCallback((todoId: string, subtaskId: string) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === todoId ? deleteTodoSubtask(todo, subtaskId) : todo))
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
        restoreTodo,
        markReminderSent,
        replaceWorkspaceData,
        clearWorkspaceData,
        duplicateTodo,
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
