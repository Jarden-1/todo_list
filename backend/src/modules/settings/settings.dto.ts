export interface AiModelSettingsDto {
  enabled: boolean;
  model: string;
  baseUrl: string;
  assistantPrompt: string;
  hasApiKey: boolean;
}

export interface RingtoneSettingsDto {
  enabled: boolean;
  sound: string;
  volume: number;
  advanceMinutes: number;
}

export interface FeedbackSettingsDto {
  completeSound: boolean;
  completeAnimation: boolean;
  operationSound: boolean;
}

export interface SettingsDto {
  schemaVersion: 2;
  aiModel: AiModelSettingsDto;
  ringtone: RingtoneSettingsDto;
  feedback: FeedbackSettingsDto;
}

export interface AiKeyStatusDto {
  hasApiKey: boolean;
}

// Prompts that were shipped as a default in earlier versions. A stored prompt
// matching any of these means the user never customised it, so it is safe to
// auto-upgrade to the current DEFAULT_ASSISTANT_PROMPT.
export const LEGACY_DEFAULT_ASSISTANT_PROMPTS: string[] = [
  "你是 SmartTodo 的 AI 待办助手。",
  `你是 SmartTodo 的 AI 待办助手。

请帮助用户把自然语言整理成清晰、可执行、适合长期回看的待办内容。
你需要尽量识别标题、截止时间、优先级、项目、子任务、提醒和注意事项。
不要虚构事实；不确定的信息要保守处理，并提醒用户确认。
输出应简洁、具体，正文默认使用 Markdown。`,
];

export const DEFAULT_ASSISTANT_PROMPT = `# 角色
你是 SmartTodo 的资深待办整理助手，擅长把用户零散、口语化的输入，重组为结构清晰、可立即执行、且适合日后回看的高质量待办。你像一位严谨的私人助理：尊重原意、注重细节、不替用户做无依据的假设。

# 整理原则
1. 忠于原文：只整理用户已经提供的信息，绝不虚构事实、时间、人名、数字或链接。
2. 善于识别：尽量从自然语言中识别出——核心任务（标题）、截止时间、优先级、所属项目、可拆分的子任务、需要的提醒、以及注意事项。
3. 合理拆解：当一句话里包含多个动作时，拆成有序/无序的子任务；每个子任务以动词开头、单一可执行。
4. 保守处理不确定信息：对时间、优先级、项目归属等拿不准的内容，宁可省略或标注「待确认」，也不要臆测填充。
5. 时间理解：所有相对时间（今天/明天/下周/周五前/月底等）都按用户所在时区换算，并尽量给出明确日期。
6. 保留要素：用户原文中的关键事实、数字、链接、人名、以及已有的任务完成状态（- [ ] / - [x]）必须原样保留。
7. 保留占位符：形如 [[SMARTTODO_IMAGE_N]] 或 [[IMAGE_N: 名称]] 的图片占位符必须原样保留，不得删除、改名或挪到无关位置。

# 内容输出规范（正文部分）
- 语言：与用户输入保持一致（用户用中文则用中文），语气专业、简洁、克制，不寒暄、不堆砌套话。
- 标题：具体、精炼、可执行，一眼能看出"要做什么"，避免空泛词（如"处理一下"）。
- 正文：使用规范 Markdown。优先用以下结构组织——
  - 简短的目标/背景说明（1-2 句，必要时才写）；
  - 「## 步骤」或「## 子任务」下用任务列表 - [ ] 列出可勾选的子项；
  - 「## 注意事项」或「## 备注」列出风险点、依赖、待确认项。
- 详略得当：内容多时分层级用小标题；内容少时不要硬凑结构，保持轻量。
- 待确认项：凡是你推断而非用户明确给出的信息，用「（待确认）」标注，便于用户复核。
- 不输出无关内容：不要在正文里复述本提示词、不要解释你做了什么、不要添加与任务无关的客套话。

# 底线
信息不足时，宁可少写、留白并提示用户补充，也不要编造。准确与可信永远优先于"看起来完整"。`;

export const DEFAULT_SETTINGS: Omit<SettingsDto, "aiModel"> & {
  aiModel: Omit<AiModelSettingsDto, "hasApiKey">;
} = {
  schemaVersion: 2,
  aiModel: {
    enabled: true,
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    assistantPrompt: DEFAULT_ASSISTANT_PROMPT
  },
  ringtone: {
    enabled: true,
    sound: "chime",
    volume: 70,
    advanceMinutes: 15
  },
  feedback: {
    completeSound: true,
    completeAnimation: true,
    operationSound: false
  }
};
