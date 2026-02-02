"""
LLM Service - DashScope (阿里云百炼)
参考用户已有的 UnifiedLLM 接口风格，使用 httpx 直连 DashScope OpenAI 兼容接口。
"""

import os
import json
import httpx
from typing import Optional


DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"


class LLMService:

    def __init__(self):
        self.api_key = os.getenv("DASHSCOPE_API_KEY", "")
        self.base_url = os.getenv("LLM_BASE_URL", DASHSCOPE_BASE)
        self.default_model = os.getenv("LLM_DEFAULT_MODEL", "qwen-plus")
        self.available_models = [
            {"id": "qwen-plus", "name": "Qwen Plus"},
            {"id": "qwen-max", "name": "Qwen Max"},
            {"id": "qwen-turbo", "name": "Qwen Turbo"},
            {"id": "qwen3-coder-plus", "name": "Qwen3 Coder Plus"},
        ]
        if not self.api_key:
            print("⚠️  DASHSCOPE_API_KEY 未设置")

    async def chat(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        tools: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> dict:
        model = model or self.default_model
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = tools

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
            if resp.status_code != 200:
                raise Exception(f"LLM API error ({resp.status_code}): {resp.text[:500]}")
            data = resp.json()

        choice = data["choices"][0]["message"]
        return {
            "content": choice.get("content", ""),
            "tool_calls": choice.get("tool_calls"),
            "usage": data.get("usage", {}),
        }

    async def chat_stream(self, messages: list[dict], model: Optional[str] = None):
        """SSE 流式输出"""
        model = model or self.default_model
        payload = {"model": model, "messages": messages, "stream": True}
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{self.base_url}/chat/completions", json=payload, headers=headers) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        d = line[6:]
                        if d.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(d)
                            delta = chunk["choices"][0].get("delta", {})
                            if delta.get("content"):
                                yield delta["content"]
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
