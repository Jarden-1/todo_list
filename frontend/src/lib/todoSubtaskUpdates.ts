import {
  appendMarkdownSubtask,
  deleteMarkdownTask,
  findSubtaskOccurrence,
  updateMarkdownTaskState,
} from "./markdownTasks";
import { createSubtask } from "./todoFactory";
import type { Todo } from "./types";

export function toggleTodoSubtask(todo: Todo, subtaskId: string, now = new Date().toISOString()): Todo {
  const target = findSubtaskOccurrence(todo.subtasks, subtaskId);
  if (!target) return todo;

  const nextDone = !target.subtask.done;

  return {
    ...todo,
    subtasks: todo.subtasks.map((subtask) =>
      subtask.id === subtaskId
        ? { ...subtask, done: nextDone, completedAt: nextDone ? now : undefined }
        : subtask
    ),
    contentMarkdown: updateMarkdownTaskState(
      todo.contentMarkdown,
      target.subtask.title,
      target.occurrence,
      nextDone
    ),
    updatedAt: now,
  };
}

export function addTodoSubtask(todo: Todo, title: string, now = new Date().toISOString()): Todo {
  const subtask = createSubtask(title, now);

  return {
    ...todo,
    subtasks: [...todo.subtasks, subtask],
    contentMarkdown: appendMarkdownSubtask(todo.contentMarkdown, title),
    updatedAt: now,
  };
}

export function deleteTodoSubtask(todo: Todo, subtaskId: string, now = new Date().toISOString()): Todo {
  const target = findSubtaskOccurrence(todo.subtasks, subtaskId);

  return {
    ...todo,
    subtasks: todo.subtasks.filter((subtask) => subtask.id !== subtaskId),
    contentMarkdown: target
      ? deleteMarkdownTask(todo.contentMarkdown, target.subtask.title, target.occurrence)
      : todo.contentMarkdown,
    updatedAt: now,
  };
}
