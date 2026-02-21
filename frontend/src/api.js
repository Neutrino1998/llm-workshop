/**
 * API 调用层
 * 所有后端请求集中管理，前端组件只调用这些函数。
 */

const BASE = '' // Vite proxy handles /api → backend

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`)
  return r.json()
}

async function get(path) {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`)
  return r.json()
}

// ============================================================
// SSE stream helper - 通用 SSE 处理
// ============================================================

function streamPost(path, body, { onStep, onToken, onUsage, onDone, onError }) {
  fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (resp) => {
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`API ${resp.status}: ${text}`)
    }
    if (!resp.body) throw new Error('响应体为空')
    const reader = resp.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const d = line.slice(6)
          if (d === '[DONE]') { onDone?.(); return }
          try {
            const parsed = JSON.parse(d)
            if (parsed.type === 'step') onStep?.(parsed.step)
            else if (parsed.type === 'token') onToken?.(parsed.content)
            else if (parsed.type === 'usage') onUsage?.(parsed.usage)
            // Stage 6 legacy events
            else onStep?.(parsed)
          } catch {}
        }
      }
    }
    onDone?.()
  }).catch((err) => {
    onError?.(err) || onDone?.()
  })
}

// ============================================================
// Stage 1 (SSE)
// ============================================================

export function stage1Chat(input, model, callbacks) {
  streamPost('/api/stage1/chat', { user_input: input, model }, callbacks)
}

// ============================================================
// Stage 2
// ============================================================

export const stage2Presets = () => get('/api/stage2/presets')

export function stage2Chat(input, preset, model, callbacks) {
  streamPost('/api/stage2/chat', { user_input: input, preset, model }, callbacks)
}

// ============================================================
// Stage 3 (SSE)
// ============================================================

export function stage3Chat(input, history, system_prompt, model, callbacks) {
  streamPost('/api/stage3/chat', { user_input: input, history, system_prompt, model }, callbacks)
}

// ============================================================
// Stage 4 (SSE)
// ============================================================

export function stage4Chat(input, model, callbacks) {
  streamPost('/api/stage4/chat', { user_input: input, model }, callbacks)
}

// ============================================================
// Stage 5
// ============================================================

export const stage5FetchURL = (url) =>
  post('/api/stage5/fetch_url', { url })

export const stage5Chunk = (content, chunk_size, chunk_overlap) =>
  post('/api/stage5/chunk', { content, chunk_size, chunk_overlap })

export const stage5Embed = (texts) =>
  post('/api/stage5/embed', { texts })

export const stage5Index = (content, chunk_size, chunk_overlap, doc_id) =>
  post('/api/stage5/index', { content, chunk_size, chunk_overlap, doc_id })

export const stage5Search = (query, top_k, doc_id) =>
  post('/api/stage5/search', { query, top_k, doc_id })

export function stage5Generate(query, search_results, model, callbacks) {
  streamPost('/api/stage5/generate', { query, search_results, model }, callbacks)
}

export async function stage5Upload(file) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(BASE + '/api/stage5/upload', { method: 'POST', body: fd })
  if (!r.ok) throw new Error(`Upload ${r.status}`)
  return r.json()
}

// ============================================================
// Stage 6 (SSE) - ReAct Agent
// ============================================================

export function stage6Run(query, doc_id, enable_search, model, callbacks) {
  streamPost('/api/stage6/run', { query, doc_id, model }, callbacks)
}

// ============================================================
// Utility
// ============================================================

export const getModels = () => get('/api/models')
