import type { Project, Todo, TodoPriority, TodoStatus } from "./types";
import { formatDateTime } from "./dateUtils";

const STATUS_LABEL: Record<TodoStatus, string> = {
  todo: "待办",
  doing: "进行中",
  done: "已完成",
  cancelled: "已取消",
};

const PRIORITY_LABEL: Record<TodoPriority, string> = {
  urgent: "紧急",
  high: "高",
  medium: "普通",
  low: "低",
};

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*]\([^)]+\)/g, "[图片]")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "- ")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<u>(.*?)<\/u>/g, "$1")
    .trim();
}

export function formatTodoPreview(markdown: string, maxLen = 80) {
  const plainText = stripMarkdown(markdown)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("  ");

  return plainText.length > maxLen
    ? `${plainText.slice(0, maxLen)}…`
    : plainText;
}

function getMetadataLines(todo: Todo, project?: Project) {
  return [
    `状态：${STATUS_LABEL[todo.status]}`,
    `优先级：${PRIORITY_LABEL[todo.priority]}`,
    project ? `项目：${project.name}` : null,
    todo.assignee ? `对接人：${todo.assignee}` : null,
    todo.dueAt ? `截止时间：${formatDateTime(todo.dueAt)}` : null,
  ].filter((line): line is string => Boolean(line));
}

export function formatTodoPlainText(todo: Todo, project?: Project) {
  const sections = [
    todo.title,
    getMetadataLines(todo, project).join("\n"),
    todo.contentMarkdown ? stripMarkdown(todo.contentMarkdown) : null,
    todo.subtasks.length
      ? [
          "子任务：",
          ...todo.subtasks.map((subtask) => `${subtask.done ? "✓" : "○"} ${subtask.title}`),
        ].join("\n")
      : null,
  ].filter(Boolean);

  return sections.join("\n\n");
}

export function formatTodoMarkdown(todo: Todo, project?: Project) {
  const metadata = getMetadataLines(todo, project).map((line) => `- ${line}`).join("\n");
  const sections = [
    `# ${todo.title}`,
    metadata,
    todo.contentMarkdown?.trim(),
    todo.subtasks.length
      ? [
          "## 子任务",
          ...todo.subtasks.map((subtask) => `- [${subtask.done ? "x" : " "}] ${subtask.title}`),
        ].join("\n")
      : null,
  ].filter(Boolean);

  return sections.join("\n\n");
}
