/**
 * 用户模型 API 配置。设置保存在当前浏览器，并由浏览器直接请求模型服务商。
 */

const STORAGE_KEY = 'wenxu_local_llm_config';

export interface LocalLLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_CONFIG: LocalLLMConfig = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
};

export function loadLocalLLMConfig(): LocalLLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<LocalLLMConfig>;
    return {
      apiKey: parsed.apiKey || '',
      baseUrl: parsed.baseUrl || DEFAULT_CONFIG.baseUrl,
      model: parsed.model || DEFAULT_CONFIG.model,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveLocalLLMConfig(config: LocalLLMConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    apiKey: config.apiKey.trim(),
    baseUrl: config.baseUrl.trim().replace(/\/+$/, ''),
    model: config.model.trim(),
  }));
}

export function hasLocalLLMConfig(): boolean {
  const config = loadLocalLLMConfig();
  return Boolean(config.apiKey.trim() && config.baseUrl.trim() && config.model.trim());
}

function normalizeBaseUrl(baseUrl: string): string {
  const endpoint = baseUrl.trim().replace(/\/+$/, '');
  if (!endpoint) throw new Error('请填写 API Base URL');
  return /\/v\d+$/i.test(endpoint) ? endpoint : `${endpoint}/v1`;
}

function describeResponseError(text: string): string {
  if (!text) return '服务未返回错误详情';
  try {
    const parsed = JSON.parse(text) as { error?: string | { message?: string }; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error && typeof parsed.error.message === 'string') return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    // Use plain-text responses as-is.
  }
  return text.slice(0, 600);
}

/** 从用户填写的 OpenAI-compatible API 读取模型列表。 */
export async function fetchAvailableModels(baseUrl: string, apiKey?: string): Promise<string[]> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, { headers });
  if (!response.ok) {
    const detail = describeResponseError(await response.text().catch(() => ''));
    throw new Error(`模型列表请求失败 (${response.status}): ${detail}`);
  }

  const payload = await response.json() as { data?: Array<{ id?: string }> };
  if (!Array.isArray(payload.data)) {
    throw new Error('服务未返回 OpenAI-compatible 格式的模型列表');
  }
  return payload.data.map((model) => model.id?.trim()).filter((id): id is string => Boolean(id));
}

/** 使用用户配置的 API 进行流式对话。 */
export async function* streamLocalLLM(
  systemPrompt: string,
  userMessage: string,
  config: LocalLLMConfig,
): AsyncGenerator<string> {
  if (!config.apiKey.trim()) throw new Error('请先填写 API Key');
  if (!config.model.trim()) throw new Error('请先填写模型名称');

  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const detail = describeResponseError(await response.text().catch(() => ''));
    throw new Error(`模型请求失败 (${response.status}): ${detail}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('服务未返回可读取的流式响应');

  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Ignore SSE comments and incomplete/malformed events.
      }
    }
  }
}