"""
RAG Service - 文档切分、向量索引、相似度检索
内存存储，适合培训演示。
"""

from services.embedding_service import EmbeddingService


class RAGService:

    def __init__(self, embedding: EmbeddingService):
        self.emb = embedding
        self.store: dict[str, list[dict]] = {}  # doc_id → chunks with embeddings

    # ---- Chunking ----

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
        """递归字符切分，优先按段落/句子边界，再按标点切分"""
        chunk_size = max(chunk_size, 50)
        overlap = min(overlap, chunk_size - 1)
        overlap = max(overlap, 0)
        seps = ["\n\n", "\n", "。", "！", "？", "；", ". ", "! ", "? ", "; ", "，", ", ", " "]
        result = []
        self._split(text, chunk_size, overlap, seps, result)
        return result

    def _split(self, text, sz, overlap, seps, out):
        if len(text) <= sz:
            if text.strip():
                out.append(text.strip())
            return

        # Find first separator present in text
        sep_idx = -1
        for i, s in enumerate(seps):
            if s in text:
                sep_idx = i
                break

        # No separator found — hard cut with overlap
        if sep_idx == -1:
            step = max(sz - overlap, 1)
            i = 0
            while i < len(text):
                chunk = text[i:i + sz]
                if chunk.strip():
                    out.append(chunk.strip())
                i += step
            return

        sep = seps[sep_idx]
        remaining_seps = seps[sep_idx + 1:]
        parts = text.split(sep)

        # Merge small parts, recurse oversized ones
        cur = ""
        for p in parts:
            cand = cur + (sep if cur else "") + p
            if len(cand) <= sz:
                cur = cand
            else:
                if cur.strip():
                    out.append(cur.strip())
                if len(p) <= sz:
                    cur = p
                else:
                    self._split(p, sz, overlap, remaining_seps, out)
                    cur = ""
        if cur.strip():
            out.append(cur.strip())

    # ---- Indexing ----

    async def index_document(self, content: str, chunk_size=1000, overlap=200, doc_id="default") -> dict:
        chunks = self.chunk_text(content, chunk_size, overlap)
        vectors = await self.emb.embed_batch(chunks)
        entries = []
        for i, (txt, vec) in enumerate(zip(chunks, vectors)):
            entries.append({
                "chunk_id": i,
                "text": txt,
                "embedding": vec,
                "char_count": len(txt),
                "token_estimate": len(txt) // 2,
            })
        self.store[doc_id] = entries
        return {
            "doc_id": doc_id,
            "total_chunks": len(entries),
            "chunks": [
                {
                    "chunk_id": e["chunk_id"],
                    "text": e["text"],
                    "char_count": e["char_count"],
                    "token_estimate": e["token_estimate"],
                    "embedding_preview": e["embedding"][:12],
                }
                for e in entries
            ],
        }

    # ---- Search ----

    async def search(self, query: str, top_k=3, doc_id="default") -> list[dict]:
        if doc_id not in self.store or not self.store[doc_id]:
            return []
        qvec = await self.emb.embed(query)
        scored = []
        for e in self.store[doc_id]:
            s = self.emb.cosine_similarity(qvec, e["embedding"])
            scored.append({"chunk_id": e["chunk_id"], "text": e["text"], "score": round(s, 4)})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
