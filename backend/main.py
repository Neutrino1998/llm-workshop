"""
LLM 系统工程培训 - 后端服务
============================
6 个渐进式阶段，每个端点返回完整的中间过程数据供前端可视化。
"""

import os
import json
import time
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from models import *
from services.llm_service import LLMService
from services.embedding_service import EmbeddingService
from services.rag_service import RAGService
from services.web_service import WebService

load_dotenv()

# ================================================================
# App Lifecycle
# ================================================================

llm: Optional[LLMService] = None
emb: Optional[EmbeddingService] = None
rag: Optional[RAGService] = None
web: Optional[WebService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global llm, emb, rag, web
    llm = LLMService()
    emb = EmbeddingService()
    rag = RAGService(emb)
    web = WebService()
    print("✅ All services initialized")
    yield


app = FastAPI(title="LLM Workshop API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================================
# Stage 1: 基础 LLM 调用
# ================================================================

@app.post("/api/stage1/chat", tags=["Stage 1"])
async def stage1_chat(req: ChatRequest):
    """基础调用: user_input → messages → API → response"""
    messages = [{"role": "user", "content": req.user_input}]
    request_body = {"model": req.model or llm.default_model, "messages": messages}

    result = await llm.chat(messages, model=req.model)

    return {
        "steps": [
            {"id": "input", "label": "用户输入", "data": req.user_input},
            {"id": "request", "label": "API 请求体", "data": request_body},
            {"id": "response", "label": "API 响应", "data": {
                "content": result["content"],
                "usage": result["usage"],
            }},
        ]
    }


# ================================================================
# Stage 2: System Prompt
# ================================================================

PRESETS = {
    "default": {"name": "默认", "prompt": "You are a helpful assistant."},
    "coder": {"name": "程序员", "prompt": "你是一个资深 Python 开发者。用代码示例来解释概念，保持简洁专业。"},
    "teacher": {"name": "老师", "prompt": "你是一个耐心的老师。用简单的类比和生活中的例子来解释概念，让零基础的人也能理解。"},
    "creative": {"name": "创意", "prompt": "你是一个富有创意的作家。用生动有趣、充满想象力的方式来表达，可以用emoji和比喻。"},
}


@app.get("/api/stage2/presets", tags=["Stage 2"])
async def stage2_presets():
    return PRESETS


@app.post("/api/stage2/chat", tags=["Stage 2"])
async def stage2_chat(req: SystemPromptRequest):
    """带 System Prompt 的调用，展示不同预设如何改变回答风格"""
    sp = PRESETS.get(req.preset, {}).get("prompt", req.custom_prompt or PRESETS["default"]["prompt"])
    messages = [
        {"role": "system", "content": sp},
        {"role": "user", "content": req.user_input},
    ]
    request_body = {"model": req.model or llm.default_model, "messages": messages}
    result = await llm.chat(messages, model=req.model)

    return {
        "steps": [
            {"id": "system_prompt", "label": "System Prompt", "data": sp},
            {"id": "user_input", "label": "用户输入", "data": req.user_input},
            {"id": "messages", "label": "组装后的 Messages", "data": request_body},
            {"id": "response", "label": "模型响应", "data": {
                "content": result["content"],
                "usage": result["usage"],
            }},
        ]
    }


# ================================================================
# Stage 3: 多轮对话
# ================================================================

@app.post("/api/stage3/chat", tags=["Stage 3"])
async def stage3_chat(req: MultiTurnRequest):
    """多轮对话: 展示完整 messages 数组和 token 增长"""
    messages = []
    if req.system_prompt:
        messages.append({"role": "system", "content": req.system_prompt})
    for m in req.history:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.user_input})

    request_body = {"model": req.model or llm.default_model, "messages": messages}
    result = await llm.chat(messages, model=req.model)

    return {
        "messages_sent": messages,
        "message_count": len(messages),
        "response": result["content"],
        "usage": result["usage"],
    }


# ================================================================
# Stage 4: 工具调用 (Function Calling)
# ================================================================

TOOL_DEFS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "搜索互联网获取实时信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名"}
                },
                "required": ["city"],
            },
        },
    },
]


async def execute_tool(name: str, args: dict) -> str:
    """实际执行工具"""
    if name == "web_search":
        result = await web.search(args.get("query", ""))
        return result
    elif name == "get_weather":
        # 使用博查搜索天气
        result = await web.search(f"{args.get('city', '')} 今天天气")
        return result
    return f"未知工具: {name}"


@app.post("/api/stage4/chat", tags=["Stage 4"])
async def stage4_chat(req: ChatRequest):
    """
    工具调用完整流程，返回每一步:
    1. 首次调用(含工具定义)
    2. 模型决策(tool_calls)
    3. 工具执行(真实结果)
    4. 二次调用(最终回答)
    """
    steps = []
    messages = [{"role": "user", "content": req.user_input}]

    # Step 1: 首次调用
    steps.append({
        "id": "first_call",
        "type": "request",
        "label": "① 首次调用（含工具定义）",
        "data": {
            "model": req.model or llm.default_model,
            "messages": messages,
            "tools": TOOL_DEFS,
        },
    })

    result = await llm.chat(messages, model=req.model, tools=TOOL_DEFS)

    if result.get("tool_calls"):
        tc = result["tool_calls"][0]
        func_name = tc["function"]["name"]
        func_args = json.loads(tc["function"]["arguments"])

        # Step 2: 模型决策
        steps.append({
            "id": "model_decision",
            "type": "decision",
            "label": f"② 模型决策 → 调用 {func_name}()",
            "data": {
                "tool_calls": result["tool_calls"],
                "explanation": f"模型分析后决定调用 {func_name}，参数: {json.dumps(func_args, ensure_ascii=False)}",
            },
        })

        # Step 3: 执行工具
        tool_result = await execute_tool(func_name, func_args)
        steps.append({
            "id": "tool_exec",
            "type": "tool",
            "label": f"③ 执行工具: {func_name}()",
            "data": {
                "function": func_name,
                "arguments": func_args,
                "result": tool_result[:2000],  # 截断过长结果
            },
        })

        # Step 4: 二次调用
        messages_r2 = messages + [
            {"role": "assistant", "content": None, "tool_calls": result["tool_calls"]},
            {"role": "tool", "tool_call_id": tc["id"], "content": tool_result[:2000]},
        ]
        final = await llm.chat(messages_r2, model=req.model)
        steps.append({
            "id": "final_answer",
            "type": "response",
            "label": "④ 基于工具结果生成最终回答",
            "data": {
                "messages_count": len(messages_r2),
                "content": final["content"],
                "usage": final["usage"],
            },
        })
    else:
        steps.append({
            "id": "direct_answer",
            "type": "response",
            "label": "② 模型直接回答（未调用工具）",
            "data": {"content": result["content"], "usage": result["usage"]},
        })

    return {"steps": steps}


# ================================================================
# Stage 5: RAG
# ================================================================

@app.post("/api/stage5/upload", tags=["Stage 5"])
async def stage5_upload(file: UploadFile = File(...)):
    """上传文档文件 (txt/md)"""
    content = (await file.read()).decode("utf-8", errors="ignore")
    return {"filename": file.filename, "content": content, "char_count": len(content)}


@app.post("/api/stage5/fetch_url", tags=["Stage 5"])
async def stage5_fetch_url(req: FetchURLRequest):
    """通过 URL 抓取网页内容"""
    content = await web.fetch(req.url)
    return {
        "url": req.url,
        "content": content[:req.max_length],
        "char_count": len(content),
        "truncated": len(content) > req.max_length,
    }


@app.post("/api/stage5/chunk", tags=["Stage 5"])
async def stage5_chunk(req: ChunkRequest):
    """Step 1: 文档切分，返回所有 chunk 及其元信息"""
    chunks = rag.chunk_text(req.content, req.chunk_size, req.chunk_overlap)
    return {
        "total_chunks": len(chunks),
        "chunk_size": req.chunk_size,
        "chunk_overlap": req.chunk_overlap,
        "chunks": [
            {"id": i, "text": c, "char_count": len(c), "token_estimate": len(c) // 2}
            for i, c in enumerate(chunks)
        ],
    }


@app.post("/api/stage5/embed", tags=["Stage 5"])
async def stage5_embed(req: EmbedRequest):
    """Step 2: 对 chunks 进行向量化，返回向量预览"""
    vectors = await emb.embed_batch(req.texts)
    return {
        "count": len(vectors),
        "dimensions": len(vectors[0]) if vectors else 0,
        "embeddings": [
            {"id": i, "preview": v[:16], "norm": round(sum(x * x for x in v) ** 0.5, 4)}
            for i, v in enumerate(vectors)
        ],
    }


@app.post("/api/stage5/index", tags=["Stage 5"])
async def stage5_index(req: IndexRequest):
    """完整的索引构建流程: 切分 → 向量化 → 存储"""
    result = await rag.index_document(req.content, req.chunk_size, req.chunk_overlap, req.doc_id)
    return result


@app.post("/api/stage5/search", tags=["Stage 5"])
async def stage5_search(req: SearchRequest):
    """向量检索，返回 top-k 结果及相似度分数"""
    results = await rag.search(req.query, req.top_k, req.doc_id)
    query_vec = await emb.embed(req.query)
    return {
        "query": req.query,
        "query_embedding_preview": query_vec[:16],
        "results": results,
    }


@app.post("/api/stage5/generate", tags=["Stage 5"])
async def stage5_generate(req: RAGGenerateRequest):
    """RAG 最终生成: 组装 prompt + 调用 LLM"""
    # 组装 prompt
    ctx_parts = [f"[{i + 1}] {r.text}" for i, r in enumerate(req.search_results)]
    ctx_str = "\n\n".join(ctx_parts)

    assembled = f"""请基于以下参考资料回答用户问题。如果资料中没有相关信息，请如实说明。

【参考资料】
{ctx_str}

【用户问题】
{req.query}"""

    messages = [{"role": "user", "content": assembled}]
    result = await llm.chat(messages, model=req.model)

    return {
        "assembled_prompt": assembled,
        "answer": result["content"],
        "usage": result["usage"],
    }


# ================================================================
# Stage 6: Agentic RAG
# ================================================================

@app.post("/api/stage6/run", tags=["Stage 6"])
async def stage6_agent_run(req: AgentRequest):
    """
    Agentic RAG: Agent 自主推理循环
    返回 SSE 流，前端逐步展示 Agent 轨迹
    """

    async def event_stream():
        # Step 1: 规划
        plan_prompt = f"""你是一个智能助手。用户提出了以下需求：

「{req.query}」

请分析这个需求，简洁地输出你的执行计划（3-5步）。每步说明要做什么、用什么方法。"""

        plan = await llm.chat([{"role": "user", "content": plan_prompt}], model=req.model)
        yield _sse({"type": "think", "label": "Agent 推理与规划", "content": plan["content"]})

        # Step 2: 判断是否需要搜索
        if req.enable_search:
            search_prompt = f"""基于用户需求「{req.query}」，生成一个最佳搜索查询关键词（只输出关键词，不要其他内容）。"""
            search_q = await llm.chat([{"role": "user", "content": search_prompt}], model=req.model)
            query_text = search_q["content"].strip().strip('"').strip("'")

            yield _sse({"type": "think", "label": "Agent 决策: 需要搜索", "content": f"生成搜索查询: {query_text}"})

            # 执行搜索
            search_result = await web.search(query_text)
            yield _sse({"type": "tool", "label": f"调用工具: web_search(\"{query_text}\")", "content": search_result[:3000]})
        else:
            search_result = ""

        # Step 3: 检查 RAG 知识库
        rag_results = await rag.search(req.query, top_k=3, doc_id=req.doc_id)
        if rag_results:
            rag_text = "\n".join([f"- [score={r['score']:.2f}] {r['text'][:150]}..." for r in rag_results])
            yield _sse({"type": "tool", "label": "调用工具: 知识库检索", "content": f"找到 {len(rag_results)} 条结果:\n{rag_text}"})

        # Step 4: 评估
        all_context = ""
        if search_result:
            all_context += f"【搜索结果】\n{search_result[:2000]}\n\n"
        if rag_results:
            all_context += f"【知识库结果】\n{chr(10).join(r['text'] for r in rag_results)}\n\n"

        eval_prompt = f"""评估以下信息是否足够回答用户问题「{req.query}」。简洁说明信息质量和充分性。

{all_context if all_context else '无检索结果'}"""

        eval_r = await llm.chat([{"role": "user", "content": eval_prompt}], model=req.model)
        yield _sse({"type": "think", "label": "Agent 评估信息充分性", "content": eval_r["content"]})

        # Step 5: 生成报告
        final_prompt = f"""基于以下信息，回答用户需求。

{all_context}

【用户需求】{req.query}

请给出完整、结构化的回答。"""

        final = await llm.chat([{"role": "user", "content": final_prompt}], model=req.model)
        yield _sse({"type": "result", "label": "生成最终回答", "content": final["content"]})

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


# ================================================================
# Utility
# ================================================================

@app.get("/api/models", tags=["Utility"])
async def list_models():
    return {"models": llm.available_models, "default": llm.default_model}


@app.get("/api/health")
async def health():
    return {"status": "ok", "ts": time.time()}
