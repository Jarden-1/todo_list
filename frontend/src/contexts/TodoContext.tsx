import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getApiErrorMessage } from "../lib/apiClient";
import {
  applyUndo,
  organizeTodo,
} from "../lib/aiApi";
import * as todosApi from "../lib/todosApi";
import type {
  Project,
  Tag,
  Todo,
  TodoStatus,
  UndoRecord,
  ViewType,
} from "../lib/types";
import {
  fetchWorkspaceBootstrap,
  type WorkspaceBootstrap,
} from "../lib/workspaceApi";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";
import type { TodoContextValue } from "./todoContextTypes";

const TodoContext = createContext<TodoContextValue | null>(null);

function visibleTodos(todos: Todo[]) {
  return todos.filter((todo) => !todo.deletedAt);
}

function visibleProjects(projects: Project[]) {
  return projects.filter((project) => !project.deletedAt);
}

function visibleTags(tags: Tag[]) {
  return tags.filter((tag) => !tag.deletedAt);
}

function upsertTodo(list: Todo[], todo: Todo) {
  if (todo.deletedAt) {
    return list.filter((item) => item.id !== todo.id);
  }

  const existingIndex = list.findIndex((item) => item.id === todo.id);
  if (existingIndex === -1) return [todo, ...list];

  const next = [...list];
  next[existingIndex] = todo;
  return next;
}

function upsertProject(list: Project[], project: Project) {
  if (project.deletedAt) return list.filter((item) => item.id !== project.id);
  return list.some((item) => item.id === project.id)
    ? list.map((item) => (item.id === project.id ? project : item))
    : [...list, project];
}

function upsertTag(list: Tag[], tag: Tag) {
  if (tag.deletedAt) return list.filter((item) => item.id !== tag.id);
  return list.some((item) => item.id === tag.id)
    ? list.map((item) => (item.id === tag.id ? tag : item))
    : [...list, tag];
}

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { hydrateSettings } = useSettings();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [undoRecord, setUndoRecord] = useState<UndoRecord | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrateWorkspace = useCallback(
    (bootstrap: WorkspaceBootstrap) => {
      setTodos(visibleTodos(bootstrap.todos));
      setProjects(visibleProjects(bootstrap.projects));
      setTags(visibleTags(bootstrap.tags));
      setUndoRecord(bootstrap.undoRecord ?? null);
      hydrateSettings(bootstrap.settings);
      setSelectedTodoId((prev) =>
        prev && bootstrap.todos.some((todo) => todo.id === prev && !todo.deletedAt)
          ? prev
          : null
      );
      setError(null);
    },
    [hydrateSettings]
  );

  const refreshWorkspace = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const bootstrap = await fetchWorkspaceBootstrap(signal);
        hydrateWorkspace(bootstrap);
        return bootstrap;
      } catch (caught) {
        if (signal?.aborted) throw caught;
        const message = getApiErrorMessage(caught);
        setError(message);
        throw caught;
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [hydrateWorkspace]
  );

  useEffect(() => {
    if (!user) {
      setTodos([]);
      setProjects([]);
      setTags([]);
      setUndoRecord(null);
      setSelectedTodoId(null);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    void refreshWorkspace(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [refreshWorkspace, user]);

  const addTodo = useCallback(async (partial: todosApi.TodoCreateInput) => {
    const { todo } = await todosApi.createTodo(partial);
    setTodos((prev) => upsertTodo(prev, todo));
    return todo;
  }, []);

  const updateTodo = useCallback(
    async (id: string, updates: todosApi.TodoPatchInput) => {
      const { todo } = await todosApi.updateTodo(id, updates);
      setTodos((prev) => upsertTodo(prev, todo));
      return todo;
    },
    []
  );

  const markReminderSent = useCallback(
    async (todoId: string, reminderId: string, sentAt?: string) => {
      const { reminder } = await todosApi.markReminderSent(todoId, reminderId, sentAt);
      setTodos((prev) =>
        prev.map((todo) => {
          if (todo.id !== todoId) return todo;
          return {
            ...todo,
            reminders: todo.reminders.map((item) =>
              item.id === reminderId ? { ...item, ...reminder } : item
            ),
            updatedAt: reminder.sentAt ?? todo.updatedAt,
          };
        })
      );
    },
    []
  );

  const deleteTodo = useCallback(async (id: string) => {
    const { todo } = await todosApi.deleteTodo(id);
    setTodos((prev) => upsertTodo(prev, todo));
    setSelectedTodoId((prev) => (prev === id ? null : prev));
    return todo;
  }, []);

  const restoreTodo = useCallback(async (id: string, status?: TodoStatus) => {
    const { todo } = await todosApi.restoreTodo(id, status);
    setTodos((prev) => upsertTodo(prev, todo));
    return todo;
  }, []);

  const duplicateTodo = useCallback(async (id: string) => {
    const { todo } = await todosApi.duplicateTodo(id);
    setTodos((prev) => upsertTodo(prev, todo));
    return todo;
  }, []);

  const completeTodo = useCallback(async (id: string) => {
    const { todo } = await todosApi.completeTodo(id);
    setTodos((prev) => upsertTodo(prev, todo));
    return todo;
  }, []);

  const uncompleteTodo = useCallback(async (id: string) => {
    const { todo } = await todosApi.uncompleteTodo(id);
    setTodos((prev) => upsertTodo(prev, todo));
    return todo;
  }, []);

  const cancelTodo = useCallback(async (id: string) => {
    const { todo } = await todosApi.cancelTodo(id);
    setTodos((prev) => upsertTodo(prev, todo));
    return todo;
  }, []);

  const addProject = useCallback(async (name: string, color?: string) => {
    const { project } = await todosApi.createProject(name, color);
    setProjects((prev) => upsertProject(prev, project));
    return project;
  }, []);

  const getProjectById = useCallback(
    (id: string | undefined | null) => projects.find((p) => p.id === id),
    [projects]
  );

  const getTagById = useCallback(
    (id: string) => tags.find((t) => t.id === id),
    [tags]
  );

  const addTag = useCallback(async (name: string, color?: string) => {
    const { tag } = await todosApi.createTag(name, color);
    setTags((prev) => upsertTag(prev, tag));
    return tag;
  }, []);

  const addTodoFromAi = useCallback(
    async (input: string) => {
      const timezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { todo, todos: createdTodos, undoRecord: nextUndoRecord } =
        await organizeTodo(input, timezone);
      // Backend may split into multiple todos by time; fall back to the single
      // `todo` field for older responses.
      const created = createdTodos && createdTodos.length > 0 ? createdTodos : [todo];
      setTodos((prev) => created.reduce((list, item) => upsertTodo(list, item), prev));
      setUndoRecord(nextUndoRecord);
      return created;
    },
    [user?.timezone]
  );

  const undoLastAiCreate = useCallback(async () => {
    if (!undoRecord) return null;

    const { originalInput, deletedTodoId, deletedTodoIds } = await applyUndo(undoRecord.id);
    const removed = deletedTodoIds && deletedTodoIds.length > 0 ? deletedTodoIds : [deletedTodoId];
    const removedSet = new Set(removed);
    setTodos((prev) => prev.filter((todo) => !removedSet.has(todo.id)));
    setUndoRecord(null);
    setSelectedTodoId((prev) => (prev && removedSet.has(prev) ? null : prev));
    return originalInput;
  }, [undoRecord]);

  const toggleSubtask = useCallback(
    async (todoId: string, subtaskId: string) => {
      const todo = todos.find((item) => item.id === todoId);
      const subtask = todo?.subtasks.find((item) => item.id === subtaskId);
      const { todo: nextTodo } = await todosApi.updateSubtask(todoId, subtaskId, {
        done: !subtask?.done,
      });
      setTodos((prev) => upsertTodo(prev, nextTodo));
      return nextTodo;
    },
    [todos]
  );

  const addSubtask = useCallback(async (todoId: string, title: string) => {
    const { todo } = await todosApi.createSubtask(todoId, title);
    setTodos((prev) => upsertTodo(prev, todo));
    return todo;
  }, []);

  const deleteSubtask = useCallback(async (todoId: string, subtaskId: string) => {
    const { todo } = await todosApi.deleteSubtask(todoId, subtaskId);
    setTodos((prev) => upsertTodo(prev, todo));
    return todo;
  }, []);

  const value = useMemo<TodoContextValue>(
    () => ({
      todos,
      projects,
      tags,
      undoRecord,
      selectedTodoId,
      currentView,
      loading,
      error,
      setCurrentView,
      setSelectedTodoId,
      refreshWorkspace: () => refreshWorkspace(),
      hydrateWorkspace,
      addTodo,
      updateTodo,
      deleteTodo,
      restoreTodo,
      markReminderSent,
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
    }),
    [
      addProject,
      addSubtask,
      addTag,
      addTodo,
      addTodoFromAi,
      cancelTodo,
      completeTodo,
      currentView,
      deleteSubtask,
      deleteTodo,
      duplicateTodo,
      error,
      getProjectById,
      getTagById,
      hydrateWorkspace,
      loading,
      markReminderSent,
      projects,
      refreshWorkspace,
      restoreTodo,
      selectedTodoId,
      tags,
      todos,
      toggleSubtask,
      uncompleteTodo,
      undoLastAiCreate,
      undoRecord,
      updateTodo,
    ]
  );

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
}

export function useTodo(): TodoContextValue {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodo must be used within TodoProvider");
  return ctx;
}
