export interface TodoOrganizationPromptContext {
  assistantPrompt: string;
  nowIso: string;
  nowLocalText: string;
  timezone: string;
  projectNames: string[];
  tagNames: string[];
}

export interface MarkdownPolishPromptContext {
  assistantPrompt: string;
  nowIso: string;
  nowLocalText: string;
  timezone: string;
}

function joinNames(names: string[]): string {
  return names.length > 0 ? names.join("、") : "无";
}

export function buildTodoOrganizationSystemPrompt(
  context: TodoOrganizationPromptContext
): string {
  return `${context.assistantPrompt}

用户会给你一段自然语言描述，你需要将其整理成结构化的待办事项。

当前时间 ISO：${context.nowIso}
当前时间（用户时区）：${context.nowLocalText}
用户时区：${context.timezone}
已有项目：${joinNames(context.projectNames)}
已有标签：${joinNames(context.tagNames)}

请只返回 JSON 对象，不要返回 Markdown 代码块或任何解释。JSON 字段如下：
{
  "title": "简洁的待办标题",
  "projectName": "项目名称（如果能识别到，否则不填）",
  "priority": "low|medium|high|urgent",
  "dueAt": "ISO 8601 格式的截止时间（如果能识别到，否则不填）",
  "reminders": [{"remindAt": "ISO 8601", "reason": "提醒原因"}],
  "tags": ["标签名"],
  "subtasks": ["子任务1", "子任务2"],
  "contentMarkdown": "Markdown 格式的详细内容，包含目标、子任务列表、注意事项等",
  "confidence": {
    "dueAt": "low|medium|high",
    "priority": "low|medium|high",
    "projectName": "low|medium|high"
  },
  "warnings": ["需要注意的解析说明"]
}

规则：
- 标题必须具体、简洁、可执行。
- priority 只能是 low、medium、high、urgent；不确定时用 medium。
- 所有时间都必须按用户时区理解，并输出完整 ISO 8601 字符串。
- "今天" 默认当天 18:00；"明天" 默认次日 18:00；"周五前" 默认本周五 18:00。
- "上午" 默认 09:00；"下午" 默认 15:00；"晚上" 默认 20:00。
- 如果不确定截止时间，请省略 dueAt，并把 confidence.dueAt 设为 "low"。
- 优先复用已有项目和标签名称，只有用户明显说出新项目或新标签时才返回新的名称。
- 必须原样保留 [[SMARTTODO_IMAGE_N]] 这类图片占位符，不要删除、改名或移动到无关位置。`;
}

export function buildMarkdownPolishSystemPrompt(
  context: MarkdownPolishPromptContext
): string {
  return `${context.assistantPrompt}

请把用户输入整理成清晰、可执行的 Markdown 正文。

当前时间 ISO：${context.nowIso}
当前时间（用户时区）：${context.nowLocalText}
用户时区：${context.timezone}

要求：
- 只返回 Markdown，不要解释。
- 保留用户原有事实、时间、链接、任务完成状态，不要虚构信息。
- 可以优化标题层级、列表、子任务、注意事项和表达清晰度。
- 必须原样保留 [[SMARTTODO_IMAGE_N]] 和 [[IMAGE_N: 名称]] 这类图片占位符，不要删除、改名或移动到无关位置。
- 如果内容里有 - [ ] 或 - [x] 子任务，请保留这种 Markdown 任务列表格式。`;
}
