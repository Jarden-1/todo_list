// SmartTodo - AI Organize Hook
// Uses the built-in Forge API to call LLM for todo organization
import { useState, useCallback } from "react";
import { AiOrganizeResult } from "../lib/types";

interface UseAiOrganizeOptions {
  onSuccess?: (result: AiOrganizeResult, originalInput: string) => void;
  onError?: (error: string) => void;
}

export function useAiOrganize(options: UseAiOrganizeOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organize = useCallback(
    async (input: string, context?: { projects?: string[] }) => {
      if (!input.trim()) return;
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const systemPrompt = `你是一个智能待办整理助手。用户会给你一段自然语言描述，你需要将其整理成结构化的待办事项。

当前时间：${now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
用户时区：Asia/Shanghai
已有项目：${context?.projects?.join("、") ?? "无"}

请返回以下 JSON 格式（不要有任何其他内容，只返回 JSON）：
{
  "title": "简洁的待办标题",
  "projectName": "项目名称（如果能识别到，否则不填）",
  "priority": "low|medium|high|urgent",
  "dueAt": "ISO 8601 格式的截止时间（如果能识别到，否则不填）",
  "reminders": [{"remindAt": "ISO 8601", "reason": "提醒原因"}],
  "subtasks": ["子任务1", "子任务2"],
  "contentMarkdown": "Markdown 格式的详细内容，包含目标、子任务列表、注意事项等",
  "confidence": {
    "dueAt": "low|medium|high",
    "priority": "low|medium|high",
    "projectName": "low|medium|high"
  },
  "warnings": ["需要注意的解析说明"]
}

时间识别规则：
- "今天" → 当天 18:00
- "明天" → 次日 18:00
- "周五前" → 本周五 18:00
- "上午" → 09:00
- "下午" → 15:00
- "晚上" → 20:00
- 如果不确定，confidence.dueAt 设为 "low"`;

        const apiUrl = import.meta.env.VITE_FRONTEND_FORGE_API_URL;
        const apiKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;

        const response = await fetch(`${apiUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: input },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
          }),
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("AI 返回内容为空");

        const result: AiOrganizeResult = JSON.parse(content);
        options.onSuccess?.(result, input);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI 整理失败，请重试";
        setError(msg);
        options.onError?.(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { organize, loading, error };
}
