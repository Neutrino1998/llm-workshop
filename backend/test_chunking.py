"""测试分块逻辑：用 Anthropic Constitution 真实内容验证 chunk_size 约束"""

import sys
sys.path.insert(0, '.')

from services.embedding_service import EmbeddingService
from services.rag_service import RAGService

with open('/tmp/constitution_content.txt', 'r') as f:
    content = f.read()

emb = EmbeddingService()
rag = RAGService(emb)

print(f"原文总长度: {len(content)} chars\n")

# ---- 测试1: 严格约束检查 ----
for chunk_size in [200, 400, 800]:
    chunks = rag.chunk_text(content, chunk_size=chunk_size, overlap=50)
    oversized = [(i, len(c)) for i, c in enumerate(chunks) if len(c) > chunk_size]
    sizes = [len(c) for c in chunks]

    status = "PASS" if not oversized else "FAIL"
    print(f"[{status}] chunk_size={chunk_size}: {len(chunks)} 块, "
          f"范围 {min(sizes)}~{max(sizes)} chars, "
          f"均值 {sum(sizes)/len(sizes):.0f}, "
          f"超长 {len(oversized)} 块")
    if oversized:
        for idx, size in oversized[:3]:
            print(f"  chunk_{idx}: {size} chars")

print()

# ---- 测试2: 边界情况 ----
print("--- 边界测试 ---")

# 短文本
r = rag.chunk_text("hello world", chunk_size=400)
assert r == ["hello world"], f"短文本: {r}"
print("[PASS] 短文本不切分")

# 空文本
r = rag.chunk_text("", chunk_size=400)
assert r == [], f"空文本: {r}"
print("[PASS] 空文本返回空")

# 无标点长文本（硬切）
r = rag.chunk_text("a" * 1000, chunk_size=400, overlap=50)
assert all(len(c) <= 400 for c in r), f"硬切超长: {[len(c) for c in r]}"
assert len(r) >= 3, f"硬切块数不足: {len(r)}"
print(f"[PASS] 无标点硬切: {len(r)} 块, 长度 {[len(c) for c in r]}")

# 中文标点切分
r = rag.chunk_text("这是第一句。这是第二句。这是第三句。" * 20, chunk_size=100)
assert all(len(c) <= 100 for c in r), f"中文标点超长: {[len(c) for c in r]}"
print(f"[PASS] 中文标点切分: {len(r)} 块, 最大 {max(len(c) for c in r)} chars")

print()

# ---- 测试3: chunk_size=400 切分质量预览 ----
chunks = rag.chunk_text(content, chunk_size=400, overlap=50)
print(f"--- chunk_size=400 切分质量 (共{len(chunks)}块, 取样展示) ---\n")
for i in [0, 5, 10, 50, 100, 150, 200, len(chunks)-1]:
    if i < len(chunks):
        c = chunks[i]
        print(f"chunk_{i} ({len(c)} chars):")
        preview = c[:150].replace('\n', '\\n')
        print(f"  {preview}...")
        print()
