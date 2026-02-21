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
        result = []
        async for _batch_idx, _total, batch_vecs in self.embed_batch_iter(texts, batch_size):
            result.extend(batch_vecs)
        return result

    async def embed_batch_iter(self, texts: list[str], batch_size: int = 10):
        """逐批向量化，每批 yield (batch_index, total_batches, embeddings)"""
        if not texts:
            return
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        import math
        total_batches = math.ceil(len(texts) / batch_size)
        async with httpx.AsyncClient(timeout=60) as c:
            for batch_idx, i in enumerate(range(0, len(texts), batch_size)):
                batch = texts[i:i + batch_size]
                payload = {"model": self.model, "input": batch}
                r = await c.post(f"{self.base_url}/embeddings", json=payload, headers=headers)
                if r.status_code != 200:
                    raise Exception(f"Embedding API error ({r.status_code}): {r.text[:300]}")
                data = sorted(r.json()["data"], key=lambda x: x["index"])
                batch_vecs = [d["embedding"] for d in data]
                yield batch_idx, total_batches, batch_vecs

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5
        nb = sum(x * x for x in b) ** 0.5
        return dot / (na * nb) if na and nb else 0.0
