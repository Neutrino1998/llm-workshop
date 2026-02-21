"""
Embedding Service - DashScope text-embedding-v3
"""

import os
import httpx

DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"


class EmbeddingService:

    def __init__(self):
        self.api_key = os.getenv("DASHSCOPE_API_KEY", "")
        self.base_url = os.getenv("LLM_BASE_URL", DASHSCOPE_BASE)
        self.model = os.getenv("EMBEDDING_MODEL", "text-embedding-v3")

    async def embed(self, text: str) -> list[float]:
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "input": text}
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{self.base_url}/embeddings", json=payload, headers=headers)
            if r.status_code != 200:
                raise Exception(f"Embedding API error ({r.status_code}): {r.text[:300]}")
            return r.json()["data"][0]["embedding"]

    async def embed_batch(self, texts: list[str], batch_size: int = 10) -> list[list[float]]:
        if not texts:
            return []
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        all_embeddings: list[list[float]] = []
        async with httpx.AsyncClient(timeout=60) as c:
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                payload = {"model": self.model, "input": batch}
                r = await c.post(f"{self.base_url}/embeddings", json=payload, headers=headers)
                if r.status_code != 200:
                    raise Exception(f"Embedding API error ({r.status_code}): {r.text[:300]}")
                data = sorted(r.json()["data"], key=lambda x: x["index"])
                all_embeddings.extend(d["embedding"] for d in data)
        return all_embeddings

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5
        nb = sum(x * x for x in b) ** 0.5
        return dot / (na * nb) if na and nb else 0.0
