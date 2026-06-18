import { nanoid } from "nanoid";
import type { Subtask } from "./types";

interface MarkdownTaskLine {
  lineIndex: number;
  title: string;
  done: boolean;
}

const MARKDOWN_TASK_RE = /^(\s*[-*+]\s+\[)( |x|X)(\]\s+)(.*?)(\s*)$/;

function normalizeTaskTitle(title: string) {
  return title.trim().replace(/\s+/g, " ");
}

export function parseMarkdownTasks(markdown: string): MarkdownTaskLine[] {
  return markdown
    .split("\n")
    .map((line, lineIndex) => {
      const match = line.match(MARKDOWN_TASK_RE);
      if (!match) return null;
      const title = normalizeTaskTitle(match[4]);
      if (!title) return null;
      return {
        lineIndex,
        title,
        done: match[2].toLowerCase() === "x",
      };
    })
    .filter((item): item is MarkdownTaskLine => item !== null);
}

export function syncSubtasksFromMarkdown(
  markdown: string,
  existingSubtasks: Subtask[],
  now: string
): Subtask[] {
  const pools = new Map<string, Subtask[]>();

  existingSubtasks.forEach((subtask) => {
    const key = normalizeTaskTitle(subtask.title);
    pools.set(key, [...(pools.get(key) ?? []), subtask]);
  });

  return parseMarkdownTasks(markdown).map((task) => {
    const key = normalizeTaskTitle(task.title);
    const match = pools.get(key)?.shift();
    const completedAt = task.done ? match?.completedAt ?? now : undefined;

    return {
      id: match?.id ?? nanoid(),
      title: task.title,
      done: task.done,
      createdAt: match?.createdAt ?? now,
      completedAt,
    };
  });
}

export function findSubtaskOccurrence(subtasks: Subtask[], subtaskId: string) {
  const subtask = subtasks.find((item) => item.id === subtaskId);
  if (!subtask) return null;

  const key = normalizeTaskTitle(subtask.title);
  const occurrence = subtasks
    .slice(0, subtasks.findIndex((item) => item.id === subtaskId) + 1)
    .filter((item) => normalizeTaskTitle(item.title) === key).length;

  return { subtask, occurrence };
}

function findMarkdownTaskLineIndex(markdown: string, title: string, occurrence: number) {
  const key = normalizeTaskTitle(title);
  let seen = 0;

  for (const task of parseMarkdownTasks(markdown)) {
    if (normalizeTaskTitle(task.title) !== key) continue;
    seen += 1;
    if (seen === occurrence) return task.lineIndex;
  }

  return -1;
}

export function appendMarkdownSubtask(markdown: string, title: string) {
  const cleanTitle = normalizeTaskTitle(title);
  const lines = markdown.split("\n");
  const tasks = parseMarkdownTasks(markdown);

  if (!cleanTitle) return markdown;

  if (!markdown.trim()) {
    return `## 子任务\n- [ ] ${cleanTitle}`;
  }

  if (tasks.length > 0) {
    const nextLines = [...lines];
    nextLines.splice(tasks[tasks.length - 1].lineIndex + 1, 0, `- [ ] ${cleanTitle}`);
    return nextLines.join("\n");
  }

  const trimmedEnd = markdown.replace(/\s+$/, "");
  return `${trimmedEnd}\n\n## 子任务\n- [ ] ${cleanTitle}`;
}

export function updateMarkdownTaskState(
  markdown: string,
  title: string,
  occurrence: number,
  done: boolean
) {
  const lines = markdown.split("\n");
  const lineIndex = findMarkdownTaskLineIndex(markdown, title, occurrence);

  if (lineIndex < 0) return markdown;

  lines[lineIndex] = lines[lineIndex].replace(
    MARKDOWN_TASK_RE,
    (_full, prefix: string, _checked: string, suffix: string, taskTitle: string, trailing: string) =>
      `${prefix}${done ? "x" : " "}${suffix}${taskTitle}${trailing}`
  );

  return lines.join("\n");
}

export function deleteMarkdownTask(markdown: string, title: string, occurrence: number) {
  const lines = markdown.split("\n");
  const lineIndex = findMarkdownTaskLineIndex(markdown, title, occurrence);

  if (lineIndex < 0) return markdown;

  lines.splice(lineIndex, 1);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

export function resetMarkdownTaskChecks(markdown: string) {
  return markdown.replace(/^(\s*[-*+]\s+\[)(x|X)(\]\s+)/gm, "$1 $3");
}
