import { useCallback, useState } from "react";
import {
  replaceEmbeddedImagesWithPlaceholders,
  restoreEmbeddedImagePlaceholders,
} from "../lib/markdownImages";

interface UseAiPolishMarkdownOptions {
  onSuccess?: (markdown: string) => void;
  onError?: (error: string) => void;
}

export function useAiPolishMarkdown(options: UseAiPolishMarkdownOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const polish = useCallback(
    async (input: string) => {
      if (!input.trim()) return null;
      setLoading(true);
      setError(null);

      try {
        const { markdownWithPlaceholders, images } = replaceEmbeddedImagesWithPlaceholders(input);
        const systemPrompt = `你是一个待办正文润色助手。请把用户输入整理成清晰、可执行的 Markdown 正文。

要求：
- 只返回 Markdown，不要解释。
- 保留用户原有事实、时间、链接、任务完成状态，不要虚构信息。
- 可以优化标题层级、列表、子任务、注意事项和表达清晰度。
- 保留 [[IMAGE_N: 名称]] 这种图片占位符，不能删除、改名或移动到无关位置。
- 如果内容里有 - [ ] 或 - [x] 子任务，请保留这种 Markdown 任务列表格式。`;

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
              { role: "user", content: markdownWithPlaceholders },
            ],
            temperature: 0.25,
          }),
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("AI 返回内容为空");

        const polished = restoreEmbeddedImagePlaceholders(content.trim(), images);
        options.onSuccess?.(polished);
        return polished;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI 润色失败，请重试";
        setError(msg);
        options.onError?.(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { polish, loading, error };
}
