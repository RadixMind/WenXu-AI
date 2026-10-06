/** API 連線或 OpenAI-compatible 格式不兼容提示。 */

export function ApiCompatibilityModal(props: { details: string; onClose: () => void; allowManualModel?: boolean }) {
  const { details, onClose, allowManualModel = false } = props;

  return (
    <div className="api-compat-backdrop" onClick={onClose}>
      <section
        className="modal-card api-compat-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-compat-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-head">
          <h2 id="api-compat-title">当前模型服务商不兼容本项目</h2>
        </div>
        <p className="api-compat-intro">
          问虚无法连接此模型 API，或服务没有返回项目所需的 OpenAI-compatible 响应。
          {allowManualModel ? '模型列表接口不可用不一定代表聊天接口不可用；可关闭提示并手动填写模型名称后尝试对话。' : ''}
        </p>
        <ul className="api-compat-checks">
          <li>确认 Base URL 正确，通常以 <code>/v1</code> 结尾。</li>
          <li>确认 API Key 和模型名称有效，且接口支持 <code>/chat/completions</code> 流式输出。</li>
          <li>浏览器直连还要求服务商允许当前网站跨域访问；纯静态网站无法替 API 添加 CORS 响应头。</li>
        </ul>
        <details className="api-compat-details">
          <summary>查看接口返回信息</summary>
          <pre>{details}</pre>
        </details>
        <div className="modal-actions modal-actions-right">
          <button type="button" className="modal-btn modal-btn-primary" onClick={onClose}>
            知道了
          </button>
        </div>
      </section>
    </div>
  );
}