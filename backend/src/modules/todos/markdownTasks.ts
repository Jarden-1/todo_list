export interface MarkdownTask {
  title: string;
  done: boolean;
}

export interface ParsedMarkdownTask extends MarkdownTask {
  lineIndex: number;
}

const taskLinePattern = /^(\s*)[-*+]\s+\[( |x|X)\]\s+(.*)$/;

function normalizeTaskTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

function renderTaskLine(task: MarkdownTask): string {
  const title = normalizeTaskTitle(task.title);
  return `- [${task.done ? "x" : " "}] ${title}`;
}

export function parseMarkdownTasks(markdown: string): ParsedMarkdownTask[] {
  return markdown
    .split(/\r?\n/)
    .map((line, lineIndex): ParsedMarkdownTask | null => {
      const match = taskLinePattern.exec(line);

      if (!match) {
        return null;
      }

      const checkbox = match[2];
      const title = normalizeTaskTitle(match[3] ?? "");

      if (!title) {
        return null;
      }

      return {
        lineIndex,
        title,
        done: checkbox === "x" || checkbox === "X"
      };
    })
    .filter((task): task is ParsedMarkdownTask => task !== null);
}

export function replaceMarkdownTaskList(
  markdown: string,
  tasks: MarkdownTask[]
): string {
  const renderedTasks = tasks
    .map((task) => ({
      title: normalizeTaskTitle(task.title),
      done: task.done
    }))
    .filter((task) => task.title.length > 0)
    .map(renderTaskLine);

  const lines = markdown.split(/\r?\n/);
  const parsedTasks = parseMarkdownTasks(markdown);

  if (parsedTasks.length === 0) {
    if (renderedTasks.length === 0) {
      return markdown;
    }

    const trimmedMarkdown = markdown.replace(/\s+$/g, "");

    if (!trimmedMarkdown) {
      return renderedTasks.join("\n");
    }

    return `${trimmedMarkdown}\n\n${renderedTasks.join("\n")}`;
  }

  const firstTaskLine = parsedTasks[0]?.lineIndex;
  const taskLineIndexes = new Set(parsedTasks.map((task) => task.lineIndex));
  const nextLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (index === firstTaskLine) {
      nextLines.push(...renderedTasks);
    }

    if (taskLineIndexes.has(index)) {
      continue;
    }

    nextLines.push(lines[index] ?? "");
  }

  return nextLines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s+$/g, "");
}
