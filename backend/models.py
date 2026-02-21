from typing import Optional
from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    user_input: str
    model: Optional[str] = None


class SystemPromptRequest(BaseModel):
    user_input: str
    preset: str = "default"
    custom_prompt: Optional[str] = None
    model: Optional[str] = None


class MultiTurnRequest(BaseModel):
    user_input: str
    history: list[Message] = []
    system_prompt: Optional[str] = None
    model: Optional[str] = None


class FetchURLRequest(BaseModel):
    url: str


class ChunkRequest(BaseModel):
    content: str
    chunk_size: int = 300
    chunk_overlap: int = 50


class EmbedRequest(BaseModel):
    texts: list[str]


class IndexRequest(BaseModel):
    content: str
    chunk_size: int = 300
    chunk_overlap: int = 50
    doc_id: str = "default"


class SearchRequest(BaseModel):
    query: str
    top_k: int = 3
    doc_id: str = "default"


class SearchResultItem(BaseModel):
    text: str
    score: float = 0.0


class RAGGenerateRequest(BaseModel):
    query: str
    search_results: list[SearchResultItem]
    model: Optional[str] = None


class AgentRequest(BaseModel):
    query: str
    doc_id: str = "default"
    model: Optional[str] = None
