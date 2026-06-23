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

用户会给你一段自然语言描述。你需要判断它包含一个还是多个待办，并整理成结构化数据。

当前时间 ISO：${context.nowIso}
当前时间（用户时区）：${context.nowLocalText}
用户时区：${context.timezone}
已有项目：${joinNames(context.projectNames)}
已有标签：${joinNames(context.tagNames)}

# 输出格式（最重要）
只返回一个 JSON 对象，顶层必须是 { "todos": [ ... ] }，不要返回 Markdown 代码块、不要任何解释文字。
todos 是数组，每个元素是一个待办对象，字段如下：
{
  "title": "简洁的待办标题",
  "projectName": "项目名称（识别到则填，否则不填）",
  "priority": "low|medium|high|urgent",
  "dueAt": "ISO 8601 格式的截止时间（识别到则填，否则不填）",
  "dueAtPrecision": "datetime|day|week|none（截止时间的精度，见下方规则）",
  "reminders": [{"remindAt": "ISO 8601", "reason": "提醒原因"}],
  "tags": ["标签名"],
  "subtasks": ["子任务1", "子任务2"],
  "contentMarkdown": "Markdown 格式的详细内容",
  "confidence": { "dueAt": "low|medium|high", "priority": "low|medium|high", "projectName": "low|medium|high" },
  "warnings": ["需要注意的解析说明"]
}

# 拆分规则（按时间分组，非常重要）
- 判断依据是【截止时间】：把截止时间相同（或都没有时间）的动作合并为同一条待办，多个动作作为该待办的 subtasks。
- 当用户描述了【不同截止时间】的多件事时，按时间拆成多条独立待办，每条各自带自己的 dueAt。
- 只在时间明显不同、或明显是并列的独立任务时才拆分；不要因为一句话里出现多个动词就过度拆分。
- 如果整段只是同一时间点要做的若干步骤，就只产出 1 条待办，步骤放进 subtasks。
- 示例："今天中午前交周报，下午3点开评审会，明天上午联系供应商" → 拆成 3 条：周报(今天12:00)、评审会(今天15:00)、联系供应商(明天09:00)。
- 示例："今天下午把方案写完并发给老板" → 1 条待办，dueAt=今天15:00，subtasks=["写完方案","发给老板"]。

# 时间解析规则（按用户时区，输出完整 ISO 8601）
- 相对日期："今天"=当天；"明天"=次日；"后天"=第三天；"周五前"/"本周五"=本周五；"下周一"=下周一；"月底"=本月最后一天。
- 口语时刻："中午"/"午饭前"=12:00；"上午"=09:00；"下午"=15:00；"傍晚"=18:00；"晚上"/"今晚"=20:00；"早上"=08:00。
- 用户给了具体时刻（如"下午3点"、"15:30"）以用户为准。

# 截止时间精度 dueAtPrecision（重要）
不要把模糊的时间硬编成精确时刻。按下列规则同时给出 dueAt 和 dueAtPrecision：
- "datetime"：用户明确给了具体时刻（如"下午3点"、"今晚8点"、"15:30"）。dueAt 用该精确时刻。
- "day"：用户只说了某天、没给时刻（如"今天做完"、"明天交"、"周五前"）。dueAt 用当天 23:59（仅用于排序/到期判断），界面只显示日期。
- "week"：用户表达"本周内/这周搞定/这礼拜"等只到周的范围。dueAt 用本周日 23:59。
- "none"：完全没提时间。省略 dueAt，dueAtPrecision 填 "none"，并把 confidence.dueAt 设为 "low"。
- 示例："今天做完就行" → dueAt=今天23:59, dueAtPrecision="day"；"下午3点开会" → dueAt=今天15:00, dueAtPrecision="datetime"；"这周写完报告" → dueAt=本周日23:59, dueAtPrecision="week"。

# 项目与标签
- 从输入识别项目归属（如"X项目的…"、"给X模块…"、"关于X的"），填入对应待办的 projectName；不同待办可属于不同项目。
- 优先复用上面"已有项目/已有标签"中的名称（大小写、空格不敏感）；只有用户明显提到新项目/新标签时才返回新名称。

# 其他规则
- title 必须具体、简洁、可执行。
- priority 只能是 low、medium、high、urgent；不确定时用 medium。
- 必须原样保留 [[SMARTTODO_IMAGE_N]] 这类图片占位符，不要删除、改名或移动到无关位置。
- todos 数组至少包含 1 个元素。`;
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
