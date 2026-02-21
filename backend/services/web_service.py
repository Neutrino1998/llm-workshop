"""
Web Service - 博查 AI 搜索 + 简易网页抓取
参考用户已有的 WebSearchTool 接口风格。
"""

import os
import aiohttp
import asyncio
from typing import Optional


BOCHA_API_KEY = os.getenv("BOCHA_API_KEY", "")
BOCHA_API_URL = "https://api.bochaai.com/v1/web-search"
JINA_API_KEY = os.getenv("JINA_API_KEY", "")


class WebService:

    def __init__(self):
        if not BOCHA_API_KEY:
            print("⚠️  BOCHA_API_KEY 未设置，web_search 将不可用")

    async def search(self, query: str, count: int = 5, freshness: str = "noLimit") -> str:
        """
        博查 AI 搜索，返回格式化的文本结果（便于塞入 LLM 上下文）。
        """
        if not BOCHA_API_KEY:
            return "[搜索不可用: BOCHA_API_KEY 未配置]"
        if not query:
            return "[搜索失败: 查询为空]"

        headers = {
            "Authorization": f"Bearer {BOCHA_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "query": query,
            "freshness": freshness,
            "summary": True,
            "count": min(count, 20),
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    BOCHA_API_URL, headers=headers, json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status != 200:
                        return f"[搜索失败: HTTP {resp.status}]"
                    data = await resp.json()
                    if data.get("code") != 200:
                        return f"[搜索失败: {data.get('message', 'Unknown')}]"

                    return self._format_results(data.get("data", {}))

        except asyncio.TimeoutError:
            return "[搜索超时]"
        except Exception as e:
            return f"[搜索异常: {str(e)}]"

    def _format_results(self, data: dict) -> str:
        results = data.get("webPages", {}).get("value", [])
        if not results:
            return "未找到相关结果。"

        parts = []
        for i, r in enumerate(results):
            title = r.get("name", "")
            snippet = r.get("snippet", "")
            summary = r.get("summary", "")
            url = r.get("url", "")
            text = summary or snippet
            parts.append(f"[{i + 1}] {title}\n{text}\n来源: {url}")

        return "\n\n".join(parts)

    async def fetch(self, url: str, max_length: int = 80000) -> str:
        """
        网页抓取：优先使用 Jina Reader（返回 Markdown），无 key 时回退到简易爬虫。
        """
        if JINA_API_KEY:
            return await self._fetch_jina(url, max_length)
        return await self._fetch_simple(url, max_length)

    async def _fetch_jina(self, url: str, max_length: int = 80000) -> str:
        """通过 Jina Reader API 抓取，直接返回 Markdown 格式文本。"""
        headers = {
            "Authorization": f"Bearer {JINA_API_KEY}",
            "Accept": "text/plain",
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"https://r.jina.ai/{url}",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status != 200:
                        # Jina 失败时回退到简易爬虫
                        return await self._fetch_simple(url, max_length)
                    text = await resp.text()
                    if len(text) > max_length:
                        text = text[:max_length] + "\n\n[内容已截断...]"
                    return text
        except Exception:
            return await self._fetch_simple(url, max_length)

    async def _fetch_simple(self, url: str, max_length: int = 80000) -> str:
        """简易网页抓取（纯文本提取），作为降级方案。"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                    if resp.status != 200:
                        return f"[抓取失败: HTTP {resp.status}]"
                    html = await resp.text()
                    text = self._html_to_text(html)
                    if len(text) > max_length:
                        text = text[:max_length] + "\n\n[内容已截断...]"
                    return text
        except Exception as e:
            return f"[抓取失败: {str(e)}]"

    @staticmethod
    def _html_to_text(html: str) -> str:
        """极简 HTML 转文本"""
        import re
        # 移除 script/style
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.S | re.I)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.S | re.I)
        # 块级标签转换行
        text = re.sub(r'<(br|p|div|h\d|li|tr)[^>]*>', '\n', text, flags=re.I)
        # 移除所有标签
        text = re.sub(r'<[^>]+>', '', text)
        # 清理空白
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        return text.strip()
