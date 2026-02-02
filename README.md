# LLM 系统工程 · 渐进式交互培训

面向部门内部不熟悉大模型技术的同事，通过可视化的方式直观理解围绕大模型的系统工程主要在做什么。

6 个递进阶段，以 RAG 为核心 example，从最基础的 API 调用开始，逐步添加系统提示词、多轮对话、工具调用、RAG、Agentic RAG。**每一步都是真实的 API 调用，不是 mock 数据。**

## 快速启动

### 方式一：本地开发（推荐调试）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 DASHSCOPE_API_KEY 和 BOCHA_API_KEY

# 2. 启动后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API 文档: http://localhost:8000/docs

# 3. 启动前端 (新终端)
cd frontend
npm install
npm run dev
# 打开: http://localhost:5173
```

### 方式二：Docker 一键部署

```bash
cp .env.example .env
# 编辑 .env 填入 API Keys

docker compose up -d
# 打开: http://localhost:5173
```

## 6 个阶段

| 阶段 | 做什么 | 关键认知 |
|------|--------|---------|
| **01 基础调用** | 输入问题 → 看到请求体 → 看到响应 | LLM = HTTP API，无状态 |
| **02 System Prompt** | 切换 4 种角色预设，对比回答差异 | 同一问题 + 不同指令 = 不同结果 |
| **03 多轮对话** | 逐轮发消息，看 messages 数组增长 | 模型没有记忆，是我们手动传历史 |
| **04 工具调用** | 问需要搜索的问题，看到博查 API 被调用 | 模型不执行工具，只决定调什么 |
| **05 RAG** | 上传文档/抓取 URL → 切分 → 向量化 → 检索 → 生成 | 每一步数据可视化 |
| **06 Agentic RAG** | Agent 规划 → 搜索/检索 → 评估 → 生成 | Agent = 推理 + 决策 + 工具的编排 |

> 注：Stage 6 为简化版 Agentic 流程演示，展示 Agent 的基本编排模式，非完整的 ReAct 循环实现。

## 技术栈

- **后端**: Python 3.12 + FastAPI + httpx (异步 HTTP)
- **前端**: React 18 + Vite + Tailwind CSS
- **LLM**: DashScope (阿里云百炼) qwen-plus / text-embedding-v3
- **搜索**: 博查 AI web-search API

## 项目结构

```
llm-workshop/
├── backend/
│   ├── main.py                      # FastAPI 路由，6 个阶段的 API 端点
│   ├── models.py                    # Pydantic 请求/响应模型定义
│   ├── requirements.txt             # Python 依赖
│   ├── Dockerfile                   # 后端容器构建
│   └── services/
│       ├── __init__.py
│       ├── llm_service.py           # DashScope LLM 调用（chat + stream）
│       ├── embedding_service.py     # DashScope 文本向量化
│       ├── rag_service.py           # 文档切分 + 内存向量索引 + 相似度检索
│       └── web_service.py           # 博查搜索 API + 简易网页抓取
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # 主组件，包含 6 个阶段的 UI 实现
│   │   ├── api.js                   # 后端 API 调用封装层
│   │   ├── main.jsx                 # React 入口
│   │   └── index.css                # Tailwind 样式入口
│   ├── index.html                   # HTML 模板
│   ├── vite.config.js               # Vite 配置，含 /api 代理
│   ├── tailwind.config.js           # Tailwind CSS 配置
│   ├── postcss.config.js            # PostCSS 配置
│   ├── package.json                 # 前端依赖
│   ├── nginx.conf                   # 生产环境 Nginx 配置（反向代理 + SPA）
│   └── Dockerfile                   # 前端容器构建（Node 构建 + Nginx 运行）
│
├── docker-compose.yml               # 容器编排，定义 backend + frontend 服务
├── .env.example                     # 环境变量模板
├── README.md                        # 本文件
└── CLAUDE.md                        # Claude Code 开发指南
```

## 文件说明

### 后端核心文件

| 文件 | 作用 |
|------|------|
| `main.py` | FastAPI 应用入口，定义 6 个阶段的 API 端点，每个端点返回完整的中间过程数据供前端可视化 |
| `models.py` | Pydantic 数据模型，定义所有 API 的请求体和响应体结构 |
| `services/llm_service.py` | 封装 DashScope OpenAI 兼容接口，支持普通 chat 和 tool calling |
| `services/embedding_service.py` | 文本向量化服务，支持单条和批量 embedding，含余弦相似度计算 |
| `services/rag_service.py` | RAG 核心逻辑：递归字符切分、内存向量存储、相似度检索 |
| `services/web_service.py` | 博查 AI 搜索 API 封装 + 简易 HTML 转文本的网页抓取 |

### 前端核心文件

| 文件 | 作用 |
|------|------|
| `src/App.jsx` | 主组件，包含 Stage1-Stage6 六个阶段组件和共享 UI 组件（Code、Card、Btn 等） |
| `src/api.js` | API 调用层，封装所有后端请求，Stage 6 使用 SSE 流式处理 |
| `vite.config.js` | 开发服务器配置，`/api` 代理到 `localhost:8000` |
| `nginx.conf` | 生产部署配置，反向代理 `/api/` 到后端，SSE 支持（关闭缓冲） |

## 环境变量

```bash
# 必填
DASHSCOPE_API_KEY=sk-xxx    # 阿里云百炼 API Key
BOCHA_API_KEY=xxx           # 博查 AI 搜索 API Key

# 可选
LLM_DEFAULT_MODEL=qwen-plus        # 默认 LLM 模型
EMBEDDING_MODEL=text-embedding-v3  # 默认 Embedding 模型
```

## 已知限制

- RAG 使用内存存储，服务重启后索引数据丢失（培训演示场景可接受）
- 网页抓取为简易实现，部分 JS 渲染页面可能抓取不完整
- Stage 6 Agentic RAG 为固定流程演示，非真正的 Agent 循环决策
