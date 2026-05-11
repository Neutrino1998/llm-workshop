import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import * as api from './api'

// =====================================================
// Shared UI components
// =====================================================

function Code({ children, maxH = 'max-h-60' }) {
  return (
    <pre className={`${maxH} overflow-auto rounded-lg bg-gray-950 border border-gray-800 p-3 text-xs leading-relaxed font-mono`}>
      <code className="text-gray-300 whitespace-pre-wrap break-words">
        {typeof children === 'string' ? children : JSON.stringify(children, null, 2)}
      </code>
    </pre>
  )
}

function Markdown({ children }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-li:my-0.5 prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 prose-code:text-amber-400 prose-a:text-blue-400">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ''}</ReactMarkdown>
    </div>
  )
}

function Insight({ children, color = '#f59e0b' }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed"
      style={{ borderColor: color + '44', backgroundColor: color + '08' }}>
      <span className="text-sm mt-0.5">💡</span>
      <span className="text-gray-300">{children}</span>
    </div>
  )
}

/** 流程一图流：带颜色的 pill + 箭头，可单行或多行 */
function Pill({ children, color = '#6b7280', dim = false }) {
  return (
    <span className="px-2 py-1 rounded text-[11px] font-mono whitespace-nowrap inline-flex items-center gap-1"
      style={{
        backgroundColor: color + (dim ? '12' : '22'),
        color,
        border: `1px solid ${color}${dim ? '33' : '55'}`,
      }}>
      {children}
    </span>
  )
}

function Arr({ label }) {
  return (
    <span className="text-gray-600 text-[11px] inline-flex flex-col items-center leading-none">
      {label && <span className="text-[8px] text-gray-500 mb-0.5">{label}</span>}
      <span>→</span>
    </span>
  )
}

function Plus() {
  return <span className="text-gray-600 text-[11px] px-0.5">+</span>
}

function FlowDiagram({ title, color, sub, children, rows }) {
  return (
    <div className="rounded-xl border p-3.5 bg-[#0d1117]" style={{ borderColor: color + '55' }}>
      {title && (
        <p className="text-[10px] mb-2.5 font-medium tracking-wider uppercase" style={{ color }}>
          🗺️ {title}
        </p>
      )}
      {rows ? (
        <div className="space-y-2.5">
          {rows.map((row, i) => (
            <div key={i}>
              {row.label && <p className="text-[10px] text-gray-500 mb-1">{row.label}</p>}
              <div className="flex items-center gap-1.5 flex-wrap">{row.children}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
      )}
      {sub && <p className="text-[10px] text-gray-500 mt-2.5 leading-relaxed border-t border-gray-900 pt-2">{sub}</p>}
    </div>
  )
}

function Card({ title, badge, color = '#374151', children }) {
  return (
    <div className="rounded-xl border p-4 bg-[#0d1117]" style={{ borderColor: color + '55' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-300 tracking-wider uppercase">{title}</h4>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + '22', color }}>{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, loading, variant = 'primary', className = '' }) {
  const base = 'px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2'
  const vars = {
    primary: 'bg-amber-600 hover:bg-amber-500 text-white',
    secondary: 'border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500',
    danger: 'border border-red-800 text-red-400 hover:bg-red-900/20',
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${vars[variant]} ${className}`}>
      {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

function Input({ value, onChange, placeholder, onKeyDown, className = '' }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={onKeyDown}
      className={`w-full px-3 py-2.5 rounded-lg bg-gray-950 border border-gray-800 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-700 transition ${className}`} />
  )
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2.5 rounded-lg bg-gray-950 border border-gray-800 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-700 transition resize-none" />
  )
}

function StepCard({ step, isLast }) {
  const typeColors = { request: '#6b7280', decision: '#8b5cf6', tool: '#f59e0b', response: '#10b981', think: '#3b82f6', result: '#10b981' }
  const typeIcons = { request: '📤', decision: '🤔', tool: '🔧', response: '✅', think: '🧠', result: '📊' }
  const c = typeColors[step.type] || '#6b7280'
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border" style={{ borderColor: c + '55', backgroundColor: c + '15' }}>
          {typeIcons[step.type] || '📋'}
        </div>
        {!isLast && <div className="w-px flex-1 mt-1" style={{ backgroundColor: c + '33' }} />}
      </div>
      <div className="flex-1 pb-4">
        <p className="text-xs font-medium mb-2" style={{ color: c }}>{step.label}</p>
        <Code maxH="max-h-48">{step.data || step.content}</Code>
      </div>
    </div>
  )
}

/** 模型回答卡片：流式 markdown 渲染 */
function AnswerCard({ content, loading }) {
  if (!content && !loading) return null
  return (
    <Card title="模型回答" color="#10b981">
      <div className="p-3 rounded-lg bg-gray-950 border border-emerald-900/30 text-sm text-gray-300 leading-relaxed">
        {content ? <Markdown>{content}</Markdown> : null}
        {loading && <span className="inline-block w-1.5 h-4 ml-0.5 bg-emerald-400 animate-pulse rounded-sm align-middle" />}
      </div>
    </Card>
  )
}


// =====================================================
// Stage 1: 基础 LLM 调用
// =====================================================

function Stage1() {
  const [input, setInput] = useState('什么是机器学习？')
  const [steps, setSteps] = useState([])
  const [streamContent, setStreamContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [usage, setUsage] = useState(null)

  const run = () => {
    setLoading(true); setSteps([]); setStreamContent(''); setError(null); setUsage(null)
    api.stage1Chat(input, null, {
      onStep: (step) => setSteps(prev => [...prev, step]),
      onToken: (t) => setStreamContent(prev => prev + t),
      onUsage: (u) => setUsage(u),
      onDone: () => setLoading(false),
      onError: (e) => { setError(e.message); setLoading(false) },
    })
  }

  return (
    <div className="space-y-5">
      <FlowDiagram title="基础调用 · Context = 1 条 user 消息" color="#f59e0b"
        sub="messages 数组只有 1 条；模型无状态——每次调用相互独立。">
        <Pill color="#6b7280">💬 user: 问题</Pill>
        <Arr />
        <Pill color="#f59e0b">🤖 LLM</Pill>
        <Arr />
        <Pill color="#10b981">📝 content</Pill>
        <Plus />
        <Pill color="#10b981" dim>📊 usage</Pill>
      </FlowDiagram>
      <Insight>大模型的本质：一个<b className="text-amber-400">"文本进，文本出"的 HTTP API</b>。没有记忆，没有状态，每次调用都是独立的。你发一个 JSON 请求，它返回一个 JSON 响应。</Insight>
      <div className="flex gap-2">
        <Input value={input} onChange={setInput} placeholder="输入你的问题..." onKeyDown={e => e.key === 'Enter' && run()} />
        <Btn onClick={run} loading={loading}>发送</Btn>
      </div>
      {error && <div className="text-xs text-red-400 p-3 rounded-lg bg-red-950/30 border border-red-900/50">{error}</div>}
      {steps.length > 0 && (
        <div className="space-y-1">
          {steps.map((s, i) => <StepCard key={i} step={{ ...s, type: 'request' }} isLast={!streamContent && !loading && i === steps.length - 1} />)}
        </div>
      )}
      <AnswerCard content={streamContent} loading={loading && steps.length > 0} />
      {usage && (
        <Card title="Token 消耗 (usage)" badge="计费依据" color="#6b7280">
          <div className="flex gap-4 text-xs">
            <div className="flex-1 p-2 rounded-lg bg-gray-950 border border-gray-800 text-center">
              <p className="text-gray-500 mb-1">输入 tokens</p>
              <p className="text-lg font-mono text-amber-400">{usage.prompt_tokens}</p>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-gray-950 border border-gray-800 text-center">
              <p className="text-gray-500 mb-1">输出 tokens</p>
              <p className="text-lg font-mono text-emerald-400">{usage.completion_tokens}</p>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-gray-950 border border-gray-800 text-center">
              <p className="text-gray-500 mb-1">总计</p>
              <p className="text-lg font-mono text-gray-200">{usage.total_tokens}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}


// =====================================================
// Stage 2: System Prompt
// =====================================================

function Stage2() {
  const [input, setInput] = useState('什么是机器学习？')
  const [preset, setPreset] = useState('teacher')
  const [results, setResults] = useState({})    // { [preset]: { steps, content } }
  const [loading, setLoading] = useState(null)
  const presetMeta = { default: '默认', coder: '程序员', teacher: '老师', creative: '创意' }
  const presetColors = { default: '#6b7280', coder: '#3b82f6', teacher: '#f59e0b', creative: '#ec4899' }

  const run = (p) => {
    setPreset(p); setLoading(p)
    setResults(prev => ({ ...prev, [p]: { steps: [], content: '' } }))
    api.stage2Chat(input, p, null, {
      onStep: (step) => setResults(prev => ({ ...prev, [p]: { ...prev[p], steps: [...(prev[p]?.steps || []), step] } })),
      onToken: (t) => setResults(prev => ({ ...prev, [p]: { ...prev[p], content: (prev[p]?.content || '') + t } })),
      onDone: () => setLoading(null),
      onError: (e) => { setResults(prev => ({ ...prev, [p]: { ...prev[p], error: e.message } })); setLoading(null) },
    })
  }

  const runAll = async () => {
    for (const p of Object.keys(presetMeta)) {
      await new Promise(resolve => {
        setPreset(p); setLoading(p)
        setResults(prev => ({ ...prev, [p]: { steps: [], content: '' } }))
        api.stage2Chat(input, p, null, {
          onStep: (step) => setResults(prev => ({ ...prev, [p]: { ...prev[p], steps: [...(prev[p]?.steps || []), step] } })),
          onToken: (t) => setResults(prev => ({ ...prev, [p]: { ...prev[p], content: (prev[p]?.content || '') + t } })),
          onDone: () => { setLoading(null); resolve() },
          onError: (e) => { setResults(prev => ({ ...prev, [p]: { ...prev[p], error: e.message } })); setLoading(null); resolve() },
        })
      })
    }
  }

  const cur = results[preset]

  return (
    <div className="space-y-5">
      <FlowDiagram title="System Prompt · 在 Context 前面加'人设'" color="#f59e0b"
        sub="同一问题 + 不同 system → 不同风格的输出；模型本身没变，变的只是开头那段文字。">
        <Pill color="#ec4899">⚙️ system: 人设</Pill>
        <Plus />
        <Pill color="#6b7280">💬 user: 问题</Pill>
        <Arr />
        <Pill color="#f59e0b">🤖 LLM</Pill>
        <Arr />
        <Pill color="#10b981">📝 受人设影响的输出</Pill>
      </FlowDiagram>
      <Insight>System Prompt 是发给模型的第一条"隐藏"消息。它定义了模型的<b className="text-amber-400">角色、语气和行为</b>。同一个问题，不同的 System Prompt 会得到截然不同的回答。</Insight>
      <div className="flex gap-2">
        <Input value={input} onChange={setInput} placeholder="输入问题..." className="flex-1" />
        <Btn onClick={runAll} loading={!!loading}>全部对比</Btn>
      </div>
      <div className="flex gap-2">
        {Object.entries(presetMeta).map(([k, v]) => (
          <button key={k} onClick={() => run(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${preset === k ? 'text-white' : 'text-gray-500 border-gray-800 hover:border-gray-600'}`}
            style={preset === k ? { borderColor: presetColors[k], backgroundColor: presetColors[k] + '22', color: presetColors[k] } : {}}>
            {loading === k ? '⏳' : ''} {v}
          </button>
        ))}
      </div>
      {cur?.steps?.length > 0 && (
        <div className="space-y-1">
          {cur.steps.map((s, i) => <StepCard key={i} step={{ ...s, type: 'request' }} isLast={!cur.content && i === cur.steps.length - 1} />)}
        </div>
      )}
      <AnswerCard content={cur?.content} loading={loading === preset && cur?.steps?.length > 0} />
      {cur?.error && <div className="text-xs text-red-400 p-3 rounded-lg bg-red-950/30 border border-red-900/50">{cur.error}</div>}
    </div>
  )
}


// =====================================================
// Stage 3: 多轮对话
// =====================================================

function Stage3() {
  const [input, setInput] = useState('')
  const [sp, setSp] = useState('你是一个耐心的老师。')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState(null)
  const [streamContent, setStreamContent] = useState('')
  const roleColors = { system: '#8b5cf6', user: '#f59e0b', assistant: '#10b981' }

  const send = () => {
    if (!input.trim()) return
    setLoading(true); setStreamContent('')
    const currentInput = input
    setInput('')
    api.stage3Chat(currentInput, history, sp, null, {
      onToken: (t) => setStreamContent(prev => prev + t),
      onUsage: (u) => setUsage(u),
      onDone: () => {
        setStreamContent(prev => {
          setHistory(h => [...h, { role: 'user', content: currentInput }, { role: 'assistant', content: prev }])
          return ''
        })
        setLoading(false)
      },
      onError: (e) => { alert(e.message); setLoading(false) },
    })
  }

  const allMsgs = sp ? [{ role: 'system', content: sp }, ...history] : history

  return (
    <div className="space-y-5">
      <FlowDiagram title="多轮对话 · 每轮把完整历史重传一次" color="#3b82f6"
        sub="模型没有记忆——是我们每轮把全部历史塞回 Context；越聊 token 越多，成本越高。">
        <Pill color="#ec4899">⚙️ system</Pill>
        <Plus />
        <Pill color="#6b7280">💬 Q₁</Pill>
        <Pill color="#10b981" dim>🤖 A₁</Pill>
        <Plus />
        <Pill color="#6b7280">💬 Q₂</Pill>
        <Pill color="#10b981" dim>🤖 A₂</Pill>
        <Plus />
        <span className="text-gray-600 text-[11px]">…</span>
        <Plus />
        <Pill color="#6b7280">💬 Qₙ</Pill>
        <Arr />
        <Pill color="#3b82f6">🤖 LLM</Pill>
        <Arr />
        <Pill color="#10b981">🤖 Aₙ</Pill>
      </FlowDiagram>
      <Insight color="#3b82f6">
        大模型<b className="text-blue-400">没有记忆</b>！要实现多轮对话，必须把<b className="text-blue-400">完整的对话历史</b>作为 messages 数组传给模型。每多一轮，token 消耗就增长一截。
      </Insight>
      <div className="p-3 rounded-lg border border-gray-800 bg-[#0d1117]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gray-500">System Prompt（可编辑）</span>
          <span className="text-[10px] font-mono text-gray-600">{usage ? `${usage.prompt_tokens}+${usage.completion_tokens}=${usage.total_tokens} tokens` : ''}</span>
        </div>
        <input value={sp} onChange={e => setSp(e.target.value)} className="w-full text-xs bg-transparent border-none text-purple-400 focus:outline-none" />
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {allMsgs.map((m, i) => (
          <div key={i} className="flex gap-2 p-2.5 rounded-lg border" style={{ borderColor: roleColors[m.role] + '33', backgroundColor: roleColors[m.role] + '08' }}>
            <span className="text-[10px] font-mono font-bold shrink-0 mt-0.5 w-16 text-right" style={{ color: roleColors[m.role] }}>{m.role}</span>
            <span className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
        {/* 流式回复中 */}
        {streamContent && (
          <div className="flex gap-2 p-2.5 rounded-lg border" style={{ borderColor: roleColors.assistant + '33', backgroundColor: roleColors.assistant + '08' }}>
            <span className="text-[10px] font-mono font-bold shrink-0 mt-0.5 w-16 text-right" style={{ color: roleColors.assistant }}>assistant</span>
            <div className="text-xs text-gray-300 leading-relaxed">
              <Markdown>{streamContent}</Markdown>
              <span className="inline-block w-1.5 h-3 ml-0.5 bg-emerald-400 animate-pulse rounded-sm align-middle" />
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={setInput} placeholder="继续对话..." onKeyDown={e => e.key === 'Enter' && send()} />
        <Btn onClick={send} loading={loading}>发送</Btn>
        <Btn variant="secondary" onClick={() => { setHistory([]); setUsage(null) }}>清空</Btn>
      </div>
      <p className="text-[10px] text-gray-600 text-center">
        当前发送 {allMsgs.length + 1} 条消息（含下一条 user），每轮增加 2 条（user + assistant）
      </p>
    </div>
  )
}


// =====================================================
// Stage 4: 工具调用
// =====================================================

function Stage4() {
  const [input, setInput] = useState('帮我搜索一下最新的 AI Agent 发展趋势')
  const [steps, setSteps] = useState([])
  const [streamContent, setStreamContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 工具试用区：直接调用 web_search，无 LLM 参与
  const [toolQuery, setToolQuery] = useState('上海今天天气怎么样？')
  const [toolResult, setToolResult] = useState('')
  const [toolLoading, setToolLoading] = useState(false)
  const [toolError, setToolError] = useState(null)

  const runTool = async () => {
    if (!toolQuery.trim()) return
    setToolLoading(true); setToolResult(''); setToolError(null)
    try {
      const r = await api.stage4WebSearch(toolQuery)
      setToolResult(r.result)
    } catch (e) {
      setToolError(e.message)
    }
    setToolLoading(false)
  }

  const run = () => {
    setLoading(true); setSteps([]); setStreamContent(''); setError(null)
    api.stage4Chat(input, null, {
      onStep: (step) => setSteps(prev => [...prev, step]),
      onToken: (t) => setStreamContent(prev => prev + t),
      onDone: () => setLoading(false),
      onError: (e) => { setError(e.message); setLoading(false) },
    })
  }

  return (
    <div className="space-y-5">
      <FlowDiagram title="工具调用 · 两次 LLM 调用，中间夹一次工具执行" color="#8b5cf6"
        sub="模型只输出'调哪个工具、传什么参数'，真正执行靠我们的代码；至少 2 次 LLM 调用。">
        <Pill color="#6b7280">💬 user</Pill>
        <Plus />
        <Pill color="#f59e0b">🔧 tools 定义</Pill>
        <Arr />
        <Pill color="#8b5cf6">🤖 LLM #1</Pill>
        <Arr />
        <Pill color="#8b5cf6" dim>📋 tool_calls</Pill>
        <Arr label="我们的代码" />
        <Pill color="#f59e0b" dim>⚙️ execute_tool()</Pill>
        <Arr />
        <Pill color="#f59e0b" dim>📊 tool_result</Pill>
        <Arr label="塞回 messages" />
        <Pill color="#8b5cf6">🤖 LLM #2</Pill>
        <Arr />
        <Pill color="#10b981">📝 最终回答</Pill>
      </FlowDiagram>
      <Insight color="#8b5cf6">
        模型<b className="text-purple-400">不会自己执行</b>任何工具——它只输出"要调用什么、传什么参数"。工具执行由我们的代码完成（这里是博查搜索 API），结果再喂回模型。至少<b className="text-purple-400">两次 API 调用</b>。
      </Insight>

      {/* ① 工具试用区：先单独调用一下工具本身，证明它就是个普通 API */}
      <Card title="① 工具试用区 — 工具就是一个普通 API（无 LLM）" color="#f59e0b">
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            下面这个调用直接打到后端的 <code className="text-amber-400 bg-amber-950/30 px-1 rounded">web_search()</code> 函数（博查搜索 API），<b className="text-gray-300">全程没有大模型参与</b>。这就是后面模型会"用"的工具——我们的系统已经把它准备好了。
          </p>
          <div className="flex gap-2">
            <Input value={toolQuery} onChange={setToolQuery} placeholder="试试 上海今天天气怎么样？" onKeyDown={e => e.key === 'Enter' && runTool()} />
            <Btn onClick={runTool} loading={toolLoading}>调用 web_search()</Btn>
          </div>
          {toolError && <div className="text-xs text-red-400 p-3 rounded-lg bg-red-950/30 border border-red-900/50">{toolError}</div>}
          {toolResult && (
            <div>
              <p className="text-[10px] text-gray-600 mb-1.5">返回结果（这段文字稍后会被塞回 messages 给模型作为参考）：</p>
              <Code maxH="max-h-64">{toolResult}</Code>
            </div>
          )}
        </div>
      </Card>

      {/* 分隔：进入"模型使用工具"演示 */}
      <div className="flex items-center gap-3 pt-1">
        <div className="h-px flex-1 bg-gray-800" />
        <span className="text-[10px] text-gray-500">② 现在看模型怎么"用"这个工具</span>
        <div className="h-px flex-1 bg-gray-800" />
      </div>

      <div className="flex gap-2">
        <Input value={input} onChange={setInput} placeholder="问一个需要搜索的问题..." onKeyDown={e => e.key === 'Enter' && run()} />
        <Btn onClick={run} loading={loading}>发送</Btn>
      </div>
      {error && <div className="text-xs text-red-400 p-3 rounded-lg bg-red-950/30 border border-red-900/50">{error}</div>}
      {steps.length > 0 && (
        <div className="border border-gray-800 rounded-xl p-4 bg-[#0d1117]">
          <p className="text-xs text-gray-500 mb-3 font-medium">🔄 执行轨迹 ({steps.length} 步)</p>
          {steps.map((s, i) => <StepCard key={i} step={s} isLast={!streamContent && !loading && i === steps.length - 1} />)}
        </div>
      )}
      <AnswerCard content={streamContent} loading={loading && steps.length > 0} />
    </div>
  )
}


// =====================================================
// Stage 5: RAG
// =====================================================

function Stage5() {
  const [phase, setPhase] = useState('load')
  const [docContent, setDocContent] = useState('')
  const [docSource, setDocSource] = useState('')
  const [chunks, setChunks] = useState(null)
  const [embedResult, setEmbedResult] = useState(null)
  const [indexed, setIndexed] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [answer, setAnswer] = useState('')
  const [assembledPrompt, setAssembledPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [embedProgress, setEmbedProgress] = useState(null)
  const [chunkSize, setChunkSize] = useState(1000)
  const [chunkOverlap, setChunkOverlap] = useState(200)

  const phases = [
    { key: 'load', label: '① 加载文档', icon: '📄' },
    { key: 'chunk', label: '② 切分', icon: '✂️' },
    { key: 'embed', label: '③ 向量化', icon: '🔢' },
    { key: 'search', label: '④ 检索', icon: '🔍' },
    { key: 'generate', label: '⑤ 生成', icon: '✅' },
  ]

  // 加载文档
  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const r = await api.stage5Upload(file)
      setDocContent(r.content); setDocSource(r.filename)
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const fetchURL = async (url) => {
    setLoading(true)
    try {
      const r = await api.stage5FetchURL(url)
      setDocContent(r.content); setDocSource(url)
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  // 切分
  const doChunk = async () => {
    setLoading(true)
    try { setChunks(await api.stage5Chunk(docContent, chunkSize, chunkOverlap)); setPhase('chunk') } catch (e) { alert(e.message) }
    setLoading(false)
  }

  // 向量化 + 索引
  const doEmbed = async () => {
    setLoading(true); setEmbedProgress(null)
    try {
      const texts = chunks.chunks.map(c => c.text)
      const embRes = await api.stage5Embed(texts, {
        onProgress: (p) => setEmbedProgress(p),
      })
      setEmbedResult(embRes); setEmbedProgress(null)
      await api.stage5Index(docContent, chunkSize, chunkOverlap, 'demo')
      setIndexed(true); setPhase('embed')
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  // 检索
  const doSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const r = await api.stage5Search(query, 3, 'demo')
      setSearchResults(r); setPhase('search')
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  // 生成（流式）
  const doGenerate = () => {
    setLoading(true); setAnswer(''); setAssembledPrompt('')
    const items = searchResults.results.map(r => ({ text: r.text, score: r.score }))
    api.stage5Generate(query, items, null, {
      onStep: (step) => { if (step.id === 'prompt') setAssembledPrompt(step.data) },
      onToken: (t) => setAnswer(prev => prev + t),
      onDone: () => { setLoading(false); setPhase('generate') },
      onError: (e) => { alert(e.message); setLoading(false) },
    })
    setPhase('generate')
  }

  const [urlInput, setUrlInput] = useState('https://www.anthropic.com/constitution')

  const suggestedQueries = [
    'Claude 的核心价值观优先级是什么？',
    'Operator 和 User 的区别是什么？',
    'Claude 在什么情况下可以拒绝指令？',
  ]

  const QuerySuggestions = () => (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {suggestedQueries.map(q => (
        <button key={q} onClick={() => setQuery(q)}
          className="px-2 py-0.5 text-[10px] rounded-full border border-gray-800 text-gray-500 hover:border-emerald-700 hover:text-emerald-400 transition-colors">
          {q}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-5">
      <FlowDiagram title="RAG · 离线建索引 + 在线检索增强" color="#10b981"
        sub="检索阶段全程无 LLM 参与，只是向量数学；只有最后一步生成才调一次 LLM。"
        rows={[
          {
            label: '① 索引阶段（离线，文档变化时才做）',
            children: <>
              <Pill color="#6b7280">📄 文档</Pill>
              <Arr />
              <Pill color="#10b981" dim>✂️ 切分 chunks</Pill>
              <Arr />
              <Pill color="#10b981" dim>🔢 向量化</Pill>
              <Arr />
              <Pill color="#10b981">💾 向量库</Pill>
            </>,
          },
          {
            label: '② 查询阶段（每次问答）',
            children: <>
              <Pill color="#6b7280">❓ query</Pill>
              <Arr />
              <Pill color="#10b981" dim>🔢 向量化</Pill>
              <Arr />
              <Pill color="#10b981" dim>🔍 检索 Top-K</Pill>
              <Arr />
              <Pill color="#f59e0b">📦 拼装 Prompt</Pill>
              <Arr />
              <Pill color="#10b981">🤖 LLM</Pill>
              <Arr />
              <Pill color="#10b981">📝 答案</Pill>
            </>,
          },
        ]} />
      <Insight color="#10b981">
        RAG = 检索增强生成。核心：不让模型凭空回答，而是先从你的文档中<b className="text-emerald-400">检索</b>相关内容，再让模型<b className="text-emerald-400">基于检索结果</b>回答。每一步的数据都可视化展示。
      </Insight>

      {/* Phase tabs */}
      <div className="flex rounded-lg border border-gray-800 overflow-hidden">
        {phases.map(p => {
          const unlocked = p.key === 'load'
            || (p.key === 'chunk' && !!docContent)
            || (p.key === 'embed' && !!chunks)
            || (p.key === 'search' && !!embedResult && indexed)
            || (p.key === 'generate' && !!searchResults)
          return (
            <button key={p.key} onClick={() => unlocked && setPhase(p.key)} disabled={!unlocked}
              className={`flex-1 py-2 text-[11px] font-medium transition-all ${phase === p.key ? 'bg-emerald-900/20 text-emerald-400' : unlocked ? 'text-gray-600 hover:text-gray-400' : 'text-gray-800 cursor-not-allowed'}`}>
              {p.icon} {p.label}
            </button>
          )
        })}
      </div>

      {/* Phase: Load */}
      {phase === 'load' && (
        <Card title="加载文档" color="#10b981">
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 mb-1 block">从 URL 抓取</label>
                <Input value={urlInput} onChange={setUrlInput} placeholder="https://..." />
              </div>
              <Btn onClick={() => fetchURL(urlInput)} loading={loading}>抓取</Btn>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-800" /><span className="text-[10px] text-gray-600">或</span><div className="h-px flex-1 bg-gray-800" />
            </div>
            <label className="block p-4 border-2 border-dashed border-gray-800 rounded-lg text-center cursor-pointer hover:border-emerald-800 transition">
              <input type="file" accept=".txt,.md,.html" onChange={handleFile} className="hidden" />
              <span className="text-xs text-gray-500">点击上传文档 (.txt / .md)</span>
            </label>
            {docContent && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-500">✅ 已加载: {docSource}</span>
                  <span className="text-[10px] text-gray-600">{docContent.length.toLocaleString()} 字符</span>
                </div>
                <Code maxH="max-h-40">{docContent.slice(0, 2000) + (docContent.length > 2000 ? '\n\n...[已截断]' : '')}</Code>
                <Btn onClick={doChunk} loading={loading}>下一步: 切分文档 →</Btn>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Phase: Chunk */}
      {phase === 'chunk' && chunks && (
        <Card title="文档切分结果" badge={`${chunks.total_chunks} 个块`} color="#10b981">
          <div className="flex gap-3 mb-3">
            <div>
              <label className="text-[10px] text-gray-500">chunk_size</label>
              <input type="number" value={chunkSize} onChange={e => setChunkSize(+e.target.value)}
                className="w-20 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-xs text-gray-300" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">overlap</label>
              <input type="number" value={chunkOverlap} onChange={e => setChunkOverlap(+e.target.value)}
                className="w-20 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-xs text-gray-300" />
            </div>
            <Btn variant="secondary" onClick={doChunk} loading={loading} className="self-end">重新切分</Btn>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {chunks.chunks.map(c => (
              <div key={c.id} className="p-2.5 rounded-lg bg-gray-950 border border-gray-800">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-mono text-emerald-500">chunk_{c.id}</span>
                  <span className="text-[10px] text-gray-600">{c.char_count} chars / ~{c.token_estimate} tokens</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{c.text.slice(0, 200)}{c.text.length > 200 ? '...' : ''}</p>
              </div>
            ))}
          </div>
          <Btn onClick={doEmbed} loading={loading} className="mt-3">下一步: 向量化 →</Btn>
          {embedProgress && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>向量化进度: 批次 {embedProgress.batch}/{embedProgress.total_batches}</span>
                <span>{embedProgress.processed}/{embedProgress.total} chunks</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(embedProgress.batch / embedProgress.total_batches) * 100}%` }} />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Phase: Embed */}
      {phase === 'embed' && embedResult && (
        <Card title="向量化结果" badge={`${embedResult.dimensions} 维`} color="#10b981">
          <p className="text-xs text-gray-400 mb-3">每个 chunk 被 Embedding 模型转为一个 {embedResult.dimensions} 维浮点向量。语义相近的文本 → 向量距离近。</p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {embedResult.embeddings.map(e => (
              <div key={e.id} className="p-2 rounded-lg bg-gray-950 border border-gray-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-emerald-500">chunk_{e.id}</span>
                  <span className="text-[10px] font-mono text-gray-600">norm={e.norm}</span>
                </div>
                <div className="flex items-end gap-px h-8">
                  {e.preview.map((v, i) => (
                    <div key={i} className="flex-1 rounded-t transition-all" style={{
                      height: `${Math.abs(v) * 300}%`,
                      backgroundColor: v >= 0 ? `rgba(16,185,129,${Math.abs(v) * 5 + 0.2})` : `rgba(239,68,68,${Math.abs(v) * 5 + 0.2})`,
                    }} />
                  ))}
                </div>
                <p className="text-[9px] font-mono text-gray-700 mt-1 truncate">[{e.preview.map(v => v.toFixed(3)).join(', ')}, ...]</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 mb-1 block">输入问题进行检索</label>
              <Input value={query} onChange={setQuery} placeholder="问一个关于文档内容的问题..." onKeyDown={e => e.key === 'Enter' && doSearch()} />
            </div>
            <Btn onClick={doSearch} loading={loading}>检索 →</Btn>
          </div>
          <QuerySuggestions />
        </Card>
      )}

      {/* Phase: Search */}
      {phase === 'search' && searchResults && (
        <Card title="检索结果" badge={`Top ${searchResults.results.length}`} color="#f59e0b">
          <p className="text-xs text-gray-400 mb-2">查询: <span className="text-amber-400">"{searchResults.query}"</span></p>
          <div className="space-y-2">
            {searchResults.results.map((r, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-gray-950 border border-gray-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-emerald-500">chunk_{r.chunk_id}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${r.score * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-amber-400">{r.score.toFixed(4)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
          <Btn onClick={doGenerate} loading={loading} className="mt-3">下一步: 组装 Prompt 并生成 →</Btn>
        </Card>
      )}

      {/* Phase: Generate */}
      {phase === 'generate' && (assembledPrompt || answer) && (
        <div className="space-y-4">
          {assembledPrompt && (
            <Card title="组装后的 Prompt" badge="发给模型的完整输入" color="#f59e0b">
              <Code maxH="max-h-48">{assembledPrompt}</Code>
              <p className="mt-2 text-[10px] text-gray-600">☝️ 检索到的文档块被插入 Prompt，模型基于这些"参考资料"生成回答</p>
            </Card>
          )}
          <Card title="模型回答" color="#10b981">
            <div className="p-3 rounded-lg bg-gray-950 border border-emerald-900/30 text-sm text-gray-300 leading-relaxed">
              {answer ? <Markdown>{answer}</Markdown> : null}
              {loading && <span className="inline-block w-1.5 h-4 ml-0.5 bg-emerald-400 animate-pulse rounded-sm align-middle" />}
            </div>
          </Card>
          <div>
            <div className="flex gap-2">
              <Input value={query} onChange={setQuery} placeholder="换一个问题试试..." onKeyDown={e => e.key === 'Enter' && doSearch()} className="flex-1" />
              <Btn onClick={doSearch} loading={loading}>重新检索</Btn>
            </div>
            <QuerySuggestions />
          </div>
        </div>
      )}
    </div>
  )
}


// =====================================================
// Stage 6: Agentic RAG
// =====================================================

function Stage6() {
  const [query, setQuery] = useState('帮我调研一下北京的房价，然后再调研一下东京的房价，最后给出你的投资建议')
  const [steps, setSteps] = useState([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const run = () => {
    setSteps([]); setRunning(true); setError(null)
    api.stage6Run(query, 'demo', true, null, {
      onStep: (step) => setSteps(prev => [...prev, step]),
      onDone: () => setRunning(false),
      onError: (err) => { setError(err.message); setRunning(false) },
    })
  }

  const typeColors = { system: '#6b7280', think: '#3b82f6', tool: '#f59e0b', observe: '#8b5cf6', result: '#10b981' }
  const typeIcons = { system: '⚙️', think: '🧠', tool: '🔧', observe: '👁️', result: '✅' }

  return (
    <div className="space-y-5">
      <FlowDiagram title="Agentic RAG · 把'固定流水线'换成'自主循环'" color="#ef4444"
        sub="普通 RAG：一次检索一次生成，路径固定。Agentic：Agent 每轮自主决定下一步往 Context 里加什么。"
        rows={[
          {
            label: '普通 RAG（固定流水线，1 次 LLM 调用）',
            children: <>
              <Pill color="#6b7280">❓ query</Pill>
              <Arr />
              <Pill color="#10b981" dim>🔍 检索 Top-K</Pill>
              <Arr />
              <Pill color="#f59e0b" dim>📦 拼装</Pill>
              <Arr />
              <Pill color="#10b981">🤖 LLM</Pill>
              <Arr />
              <Pill color="#10b981">📝 答案</Pill>
            </>,
          },
          {
            label: 'Agentic RAG（ReAct 循环，N 次 LLM 调用）',
            children: <>
              <Pill color="#6b7280">❓ query</Pill>
              <Arr />
              <span className="px-2 py-1 rounded text-[11px] font-mono inline-flex items-center gap-1.5 border-2 border-dashed"
                style={{ borderColor: '#ef444466', color: '#fca5a5', backgroundColor: '#ef444411' }}>
                <Pill color="#3b82f6">🧠 思考</Pill>
                <span className="text-gray-600">→</span>
                <Pill color="#f59e0b">🔧 调工具</Pill>
                <span className="text-gray-600">→</span>
                <Pill color="#8b5cf6">👁️ 观察</Pill>
                <span className="text-[10px] text-red-300 ml-1">↻ 循环 N 轮</span>
              </span>
              <Arr label="信息够了" />
              <Pill color="#ef4444">🤖 总结生成</Pill>
              <Arr />
              <Pill color="#10b981">📝 答案</Pill>
            </>,
          },
        ]} />
      <Insight color="#ef4444">
        <b className="text-red-400">普通 RAG</b> 是固定流水线。<b className="text-red-400">Agentic RAG</b> 是 <b className="text-amber-400">ReAct 循环</b>：Agent 思考(Reason) → 选择工具行动(Act) → 观察结果(Observe) → 判断是否足够 → 不够就继续循环。
      </Insight>
      <TextArea value={query} onChange={setQuery} placeholder="输入需要 Agent 解答的问题..." rows={2} />
      <div className="flex items-center gap-3">
        <Btn onClick={run} loading={running}>运行 Agent</Btn>
        <span className="text-[10px] text-gray-600">Agent 会自主决定使用什么工具、搜索几次</span>
      </div>
      {error && <div className="text-xs text-red-400 p-3 rounded-lg bg-red-950/30 border border-red-900/50">{error}</div>}
      {steps.length > 0 && (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">🤖 Agent 执行轨迹 (ReAct)</span>
            <span className="text-[10px] font-mono text-gray-600">{steps.length} 步 {running ? '⏳' : '✅'}</span>
          </div>
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {steps.map((s, i) => (
              <div key={i} className="p-3 rounded-lg border animate-[fadeIn_0.3s_ease-out]"
                style={{ borderColor: (typeColors[s.type] || '#666') + '44', backgroundColor: (typeColors[s.type] || '#666') + '08' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{typeIcons[s.type] || '📋'}</span>
                  <span className="text-[11px] font-medium" style={{ color: typeColors[s.type] || '#aaa' }}>{s.label}</span>
                </div>
                {s.type === 'result' ? (
                  <div className="text-sm text-gray-300 leading-relaxed max-h-48 overflow-y-auto">
                    <Markdown>{s.content}</Markdown>
                  </div>
                ) : (
                  <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{s.content}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// =====================================================
// Main App
// =====================================================

const STAGES = [
  { id: 1, num: '01', title: '基础调用', sub: 'Hello, LLM', icon: '⚡', color: '#f59e0b', Comp: Stage1 },
  { id: 2, num: '02', title: 'System Prompt', sub: '给模型一个角色', icon: '🎭', color: '#f59e0b', Comp: Stage2 },
  { id: 3, num: '03', title: '多轮对话', sub: '上下文与记忆', icon: '💬', color: '#3b82f6', Comp: Stage3 },
  { id: 4, num: '04', title: '工具调用', sub: '扩展模型能力', icon: '🔧', color: '#8b5cf6', Comp: Stage4 },
  { id: 5, num: '05', title: 'RAG', sub: '检索增强生成', icon: '📚', color: '#10b981', Comp: Stage5 },
  { id: 6, num: '06', title: 'Agentic RAG', sub: '智能体编排', icon: '🤖', color: '#ef4444', Comp: Stage6 },
]

export default function App() {
  const [cur, setCur] = useState(1)
  const stage = STAGES.find(s => s.id === cur)

  return (
    <div className="min-h-screen bg-[#080a0f] text-gray-100">
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-gray-800/60 bg-[#0a0c12] flex flex-col">
          <div className="p-4 border-b border-gray-800/60">
            <h1 className="text-sm font-bold tracking-wide text-gray-200">LLM 系统工程</h1>
            <p className="text-[10px] text-gray-600 mt-0.5">渐进式交互培训</p>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {STAGES.map(s => (
              <button key={s.id} onClick={() => setCur(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${s.id === cur ? 'bg-gray-800/50' : 'hover:bg-gray-800/20'}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border transition-all`}
                  style={s.id === cur ? { color: s.color, borderColor: s.color, backgroundColor: s.color + '18', boxShadow: `0 0 12px ${s.color}33` } : { borderColor: s.id < cur ? '#4b5563' : '#1f2937', color: s.id < cur ? '#6b7280' : '#374151' }}>
                  {s.num}
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-medium truncate ${s.id === cur ? 'text-gray-100' : 'text-gray-400 group-hover:text-gray-300'}`}>{s.title}</div>
                  <div className="text-[10px] text-gray-600 truncate">{s.sub}</div>
                </div>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-800/60 text-[10px] text-gray-700 leading-relaxed">
            后端: FastAPI + DashScope<br />搜索: 博查 AI
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="mb-8" key={cur}>
              <div className="flex items-center gap-3 mb-3 animate-[fadeIn_0.3s_ease-out]">
                <span className="text-3xl">{stage.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: stage.color, backgroundColor: stage.color + '18' }}>{stage.num}</span>
                    <h2 className="text-xl font-bold text-gray-100">{stage.title}</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{stage.sub}</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
            </div>
            <div className="animate-[fadeIn_0.4s_ease-out]" key={`c-${cur}`}>
              <stage.Comp />
            </div>
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-800/40">
              <Btn variant="secondary" onClick={() => setCur(Math.max(1, cur - 1))} disabled={cur === 1}>← 上一章</Btn>
              <span className="text-[10px] text-gray-700 font-mono">{cur} / {STAGES.length}</span>
              <Btn variant="secondary" onClick={() => setCur(Math.min(STAGES.length, cur + 1))} disabled={cur === STAGES.length}>下一章 →</Btn>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
