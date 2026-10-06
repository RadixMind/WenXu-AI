/** AI 对话面板：浏览器直接调用用户配置的模型 API。 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiCompatibilityModal } from '@/components/ApiCompatibilityModal';
import { MessageMarkdown } from '@/components/MessageMarkdown';
import { hasLocalLLMConfig, loadLocalLLMConfig, streamLocalLLM } from '@/lib/local-llm-config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type PendingQuestion = { question: string; displayText?: string };

export function ChatPanel(props: {
  systemPrompt: string;
  defaultQuestion: string;
  configVersion: number;
  onConfigRequest: () => void;
  initialPrompt?: string;
  initialDisplay?: string;
  autoSend?: string;
  pendingSend?: string;
}) {
  const { systemPrompt, defaultQuestion, configVersion, onConfigRequest, initialPrompt, initialDisplay, autoSend, pendingSend } = props;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(defaultQuestion);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState('');
  const [compatibilityError, setCompatibilityError] = useState('');
  const abortRef = useRef(false);
  const pendingQuestionRef = useRef<PendingQuestion | null>(null);
  const initialPromptSentRef = useRef(false);
  const prevAutoSendRef = useRef<string | undefined>(undefined);
  const prevPendingSendRef = useRef<string | undefined>(undefined);

  const sendQuestionWithDisplay = useCallback(async (question: string, displayText?: string) => {
    if (!question.trim() || isStreaming) return;

    const config = loadLocalLLMConfig();
    if (!hasLocalLLMConfig()) {
      pendingQuestionRef.current = { question, displayText };
      setError('请先配置 API 地址、API Key 和模型名称。');
      onConfigRequest();
      return;
    }

    setError('');
    setCompatibilityError('');
    setMessages((previous) => [...previous, { role: 'user', content: displayText ?? question }]);
    setInput('');
    setIsStreaming(true);
    setIsWaiting(true);
    abortRef.current = false;

    let assistantContent = '';
    try {
      for await (const chunk of streamLocalLLM(systemPrompt, question, config)) {
        if (abortRef.current) break;
        if (assistantContent === '') setIsWaiting(false);
        assistantContent += chunk;
        setMessages((previous) => {
          const updated = [...previous];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: assistantContent };
          } else {
            updated.push({ role: 'assistant', content: assistantContent });
          }
          return updated;
        });
      }
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : '未知的 API 请求错误';
      setError('模型请求未完成，请查看兼容性提示。');
      setCompatibilityError(detail);
    } finally {
      setIsStreaming(false);
      setIsWaiting(false);
    }
  }, [isStreaming, onConfigRequest, systemPrompt]);

  useEffect(() => {
    if (!configVersion || !pendingQuestionRef.current || !hasLocalLLMConfig()) return;
    const pending = pendingQuestionRef.current;
    pendingQuestionRef.current = null;
    void sendQuestionWithDisplay(pending.question, pending.displayText);
  }, [configVersion, sendQuestionWithDisplay]);

  const sendQuestion = useCallback((question: string) => {
    return sendQuestionWithDisplay(question);
  }, [sendQuestionWithDisplay]);

  useEffect(() => {
    if (!initialPrompt || initialPromptSentRef.current || !systemPrompt) return;
    initialPromptSentRef.current = true;
    void sendQuestionWithDisplay(initialPrompt, initialDisplay);
  }, [initialPrompt, initialDisplay, systemPrompt, sendQuestionWithDisplay]);

  useEffect(() => {
    if (!autoSend || autoSend === prevAutoSendRef.current || !systemPrompt) {
      prevAutoSendRef.current = autoSend;
      return;
    }
    prevAutoSendRef.current = autoSend;
    void sendQuestion(autoSend);
  }, [autoSend, systemPrompt, sendQuestion]);

  useEffect(() => {
    if (!pendingSend || pendingSend === prevPendingSendRef.current || !systemPrompt) {
      prevPendingSendRef.current = pendingSend;
      return;
    }
    prevPendingSendRef.current = pendingSend;
    void sendQuestion(pendingSend);
  }, [pendingSend, systemPrompt, sendQuestion]);

  const handleSend = useCallback(() => {
    void sendQuestion(input);
  }, [input, sendQuestion]);

  function handleStop() {
    abortRef.current = true;
    setIsStreaming(false);
    setIsWaiting(false);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion(input);
    }
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-head">
        <h2>AI 解读</h2>
        <div className="chat-mode-actions">
          <button type="button" className="chat-config-btn" onClick={onConfigRequest}>
            API 设置
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>基于排盘结果，向 AI 提问获取解读。</p>
            <p className="chat-empty-hint">对话由浏览器直接发送到你配置的模型服务商。</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`chat-message chat-message-${message.role}`}>
            <div className="chat-message-role">{message.role === 'user' ? '你' : 'AI'}</div>
            <div className="chat-message-content">
              {message.role === 'assistant' ? (
                <>
                  <MessageMarkdown content={message.content} />
                  {isStreaming && index === messages.length - 1 && <span className="chat-cursor" />}
                </>
              ) : message.content}
            </div>
          </div>
        ))}
        {isWaiting && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-message-role">AI</div>
            <div className="chat-thinking">
              <span className="chat-thinking-dot" />
              <span className="chat-thinking-dot" />
              <span className="chat-thinking-dot" />
            </div>
          </div>
        )}
      </div>

      {error && <div className="chat-error">{error}</div>}

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          placeholder="输入你的问题..."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <div className="chat-input-actions">
          {isStreaming ? (
            <button type="button" className="chat-send-btn chat-stop-btn" onClick={handleStop}>停止</button>
          ) : (
            <button type="button" className="chat-send-btn" disabled={!input.trim()} onClick={handleSend}>发送</button>
          )}
        </div>
      </div>

      {compatibilityError ? (
        <ApiCompatibilityModal details={compatibilityError} onClose={() => setCompatibilityError('')} />
      ) : null}
    </section>
  );
}