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

// Stage 1
export const stage1Chat = (user_input, model) =>
  post('/api/stage1/chat', { user_input, model })

// Stage 2
export const stage2Presets = () => get('/api/stage2/presets')
export const stage2Chat = (user_input, preset, model) =>
  post('/api/stage2/chat', { user_input, preset, model })

// Stage 3
export const stage3Chat = (user_input, history, system_prompt, model) =>
  post('/api/stage3/chat', { user_input, history, system_prompt, model })

// Stage 4
export const stage4Chat = (user_input, model) =>
  post('/api/stage4/chat', { user_input, model })

// Stage 5
export const stage5FetchURL = (url, max_length) =>
  post('/api/stage5/fetch_url', { url, max_length })

export const stage5Chunk = (content, chunk_size, chunk_overlap) =>
  post('/api/stage5/chunk', { content, chunk_size, chunk_overlap })

export const stage5Embed = (texts) =>
  post('/api/stage5/embed', { texts })

export const stage5Index = (content, chunk_size, chunk_overlap, doc_id) =>
  post('/api/stage5/index', { content, chunk_size, chunk_overlap, doc_id })

export const stage5Search = (query, top_k, doc_id) =>
  post('/api/stage5/search', { query, top_k, doc_id })

export const stage5Generate = (query, search_results, model) =>
  post('/api/stage5/generate', { query, search_results, model })

export async function stage5Upload(file) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(BASE + '/api/stage5/upload', { method: 'POST', body: fd })
  if (!r.ok) throw new Error(`Upload ${r.status}`)
  return r.json()
}

// Stage 6 (SSE) - ReAct Agent
export function stage6Run(query, doc_id, enable_search, model, onStep, onDone) {
  // enable_search 参数保留兼容性但不再使用，Agent 自主决策
  const body = JSON.stringify({ query, doc_id, model })
  fetch(BASE + '/api/stage6/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).then(async (resp) => {
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
          try { onStep(JSON.parse(d)) } catch {}
        }
      }
    }
    onDone?.()
  })
}

// Utility
export const getModels = () => get('/api/models')
