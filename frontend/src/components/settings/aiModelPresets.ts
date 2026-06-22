// Recommended AI model presets. Selecting one auto-fills both the model id and
// its vendor's OpenAI-compatible Base URL. Users can always type a custom model
// name and Base URL instead — these are just one-click shortcuts.
export interface AiModelPreset {
  /** Stable id for the preset chip. */
  id: string;
  /** Vendor display name shown on the chip. */
  vendor: string;
  /** Model id sent to the API. */
  model: string;
  /** Human-readable model label. */
  modelLabel: string;
  /** OpenAI-compatible Base URL for this vendor. */
  baseUrl: string;
  /** Whether this is a domestic (China) model — shown first. */
  domestic: boolean;
}

export const AI_MODEL_PRESETS: AiModelPreset[] = [
  // 国产主流模型（优先推荐）
  {
    id: "deepseek",
    vendor: "DeepSeek 深度求索",
    model: "deepseek-chat",
    modelLabel: "deepseek-chat",
    baseUrl: "https://api.deepseek.com/v1",
    domestic: true,
  },
  {
    id: "kimi",
    vendor: "Kimi 月之暗面",
    model: "moonshot-v1-8k",
    modelLabel: "moonshot-v1-8k",
    baseUrl: "https://api.moonshot.cn/v1",
    domestic: true,
  },
  {
    id: "qwen",
    vendor: "通义千问 Qwen",
    model: "qwen-plus",
    modelLabel: "qwen-plus",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    domestic: true,
  },
  {
    id: "glm",
    vendor: "智谱 GLM",
    model: "glm-4-plus",
    modelLabel: "glm-4-plus",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    domestic: true,
  },
  {
    id: "doubao",
    vendor: "豆包 Doubao",
    model: "doubao-pro-32k",
    modelLabel: "doubao-pro-32k",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    domestic: true,
  },
  {
    id: "minimax",
    vendor: "MiniMax",
    model: "abab6.5s-chat",
    modelLabel: "abab6.5s-chat",
    baseUrl: "https://api.minimax.chat/v1",
    domestic: true,
  },
  // 国际模型
  {
    id: "openai-4o",
    vendor: "OpenAI",
    model: "gpt-4o",
    modelLabel: "gpt-4o",
    baseUrl: "https://api.openai.com/v1",
    domestic: false,
  },
  {
    id: "openai-4o-mini",
    vendor: "OpenAI",
    model: "gpt-4o-mini",
    modelLabel: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    domestic: false,
  },
  {
    id: "claude",
    vendor: "Anthropic Claude",
    model: "claude-3-5-sonnet-20241022",
    modelLabel: "claude-3.5-sonnet",
    baseUrl: "https://api.anthropic.com/v1",
    domestic: false,
  },
];
