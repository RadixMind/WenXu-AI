/** 用户模型 API 配置弹窗。 */

import { useState } from 'react';
import { ApiCompatibilityModal } from '@/components/ApiCompatibilityModal';
import {
  fetchAvailableModels,
  loadLocalLLMConfig,
  saveLocalLLMConfig,
  type LocalLLMConfig,
} from '@/lib/local-llm-config';

export function LocalLLMConfigModal(props: { onClose: () => void; onSaved: () => void }) {
  const { onClose, onSaved } = props;
  const [config, setConfig] = useState<LocalLLMConfig>(loadLocalLLMConfig);
  const [saved, setSaved] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [formError, setFormError] = useState('');
  const [compatibilityError, setCompatibilityError] = useState('');

  async function handleFetchModels() {
    if (!config.baseUrl.trim()) {
      setFormError('请先填写 API Base URL。');
      return;
    }
    setFetching(true);
    setFormError('');
    setCompatibilityError('');
    try {
      const models = await fetchAvailableModels(config.baseUrl, config.apiKey);
      if (models.length === 0) throw new Error('服务返回的模型列表为空。');
      setAvailableModels(models);
      if (!config.model.trim() || !models.includes(config.model)) {
        setConfig((previous) => ({ ...previous, model: models[0] }));
      }
    } catch (caught) {
      setCompatibilityError(caught instanceof Error ? caught.message : '无法读取模型列表');
    } finally {
      setFetching(false);
    }
  }

  function handleSave() {
    if (!config.apiKey.trim() || !config.baseUrl.trim() || !config.model.trim()) {
      setFormError('请填写 API Base URL、API Key 和模型名称。');
      return;
    }
    saveLocalLLMConfig(config);
    setSaved(true);
    onSaved();
    window.setTimeout(onClose, 450);
  }

  function handleClear() {
    const empty: LocalLLMConfig = { apiKey: '', baseUrl: '', model: '' };
    setConfig(empty);
    setAvailableModels([]);
    saveLocalLLMConfig(empty);
    setSaved(false);
    setFormError('');
    onSaved();
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card llm-config-card" role="dialog" aria-modal="true" aria-labelledby="llm-config-title" onClick={(event) => event.stopPropagation()}>
          <div className="panel-head">
            <h2 id="llm-config-title">AI 模型配置</h2>
          </div>
          <p className="llm-config-tip">
            填写你自己的 OpenAI-compatible API。配置保存在当前浏览器，对话内容和 API Key 由浏览器直接发送给你选择的服务商。
          </p>
          <div className="llm-config-form">
            <label className="llm-config-label">
              <span>API Key</span>
              <input type="password" autoComplete="off" value={config.apiKey} placeholder="sk-..." onChange={(event) => setConfig({ ...config, apiKey: event.target.value })} />
            </label>
            <label className="llm-config-label">
              <span>API Base URL</span>
              <input type="url" value={config.baseUrl} placeholder="https://api.example.com/v1" onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })} />
            </label>
            <label className="llm-config-label">
              <span>模型名称</span>
              <div className="llm-config-model-row">
                <input
                  type="text"
                  list="llm-available-models"
                  value={config.model}
                  placeholder="例如：deepseek-chat"
                  onChange={(event) => setConfig({ ...config, model: event.target.value })}
                />
                <datalist id="llm-available-models">
                  {availableModels.map((model) => <option key={model} value={model} />)}
                </datalist>
                <button type="button" className="modal-btn modal-btn-secondary llm-fetch-btn" disabled={fetching} onClick={handleFetchModels}>
                  {fetching ? '获取中...' : '获取模型'}
                </button>
              </div>
            </label>
            {formError ? <span className="llm-config-error">{formError}</span> : null}
          </div>
          <div className="modal-actions modal-actions-split">
            <div className="modal-actions-left">
              <button type="button" className="modal-btn modal-btn-secondary" onClick={handleClear}>清除配置</button>
            </div>
            <div className="modal-actions-right">
              <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>取消</button>
              <button type="button" className="modal-btn modal-btn-primary" onClick={handleSave}>{saved ? '已保存' : '保存'}</button>
            </div>
          </div>
        </div>
      </div>
      {compatibilityError ? (
        <ApiCompatibilityModal details={compatibilityError} allowManualModel onClose={() => setCompatibilityError('')} />
      ) : null}
    </>
  );
}