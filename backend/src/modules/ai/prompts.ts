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

# 你的两大核心能力

## 1. 润色
把用户的原始输入润色成清晰、规范、可执行的表述：
- 修正错别字、口语化表达、不完整句子。
- 保留用户原意和专业术语，不要虚构信息。
- title 用简洁可执行的动作短语；contentMarkdown 用规范的 Markdown 正文。

## 2. 主动意图识别
不要被动等用户明说，要主动从输入中推测：
- 项目归属：提到"X项目""X模块""关于X""给X做的"都算；即使没说"项目"二字，只要能推断出归属就填 projectName。
- 优先级：含"紧急""尽快""马上"→urgent/high；"有空""不急"→low；其余→medium。
- 截止时间：相对日期（今天/明天/周五）+ 口语时刻（上午/下午/晚上）都要识别。
- 子任务：多个动作步骤自动拆成 subtasks。
- 标签：识别出的话题关键词可作为标签。

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
  "contentMarkdown": "Markdown 格式的正文（必须填写，不能为空字符串，不能只复述标题；需按助手提示词中的正文写作规范撰写，包含任务目标、步骤、注意事项等）",
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
- 主动识别项目归属：凡能从输入中推断出项目/模块/产品名的，一律填入 projectName，后端会自动判断是复用已有项目还是新建。
- 优先复用上面"已有项目/已有标签"中的名称（大小写、空格不敏感）。
- 找不到匹配的已有项目时，直接返回识别到的名称作为新项目名——不要因为"用户没说'新建项目'"就留空。
- 不同待办可属于不同项目。

# 意图推测示例（few-shot）
- 输入"明天交周报" → projectName="周报"(新建)，dueAt=明天18:00，dueAtPrecision="day"，priority="medium"，subtasks=["整理本周工作","撰写周报","提交"]
- 输入"todo_list 项目的输入框要简化一下，这周搞定" → projectName="todo_list"(复用)，dueAt=本周日23:59，dueAtPrecision="week"，priority="high"，subtasks=["设计简化方案","实现单输入框模式","测试"]
- 输入"urgent 客户反馈了bug赶紧修" → priority="urgent"，title="修复客户反馈的 Bug"，confidence.priority="high"

# 其他规则
- title 必须具体、简洁、可执行。
- contentMarkdown 必须填写且有实质内容：不能为空、不能只复述标题、不能只写一句话。即使是简单任务也至少用一句话说明目标。多步骤任务需用任务列表（- [ ]）拆分步骤。
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
