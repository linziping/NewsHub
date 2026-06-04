"""AI 问答相关 Schema"""

from pydantic import BaseModel, Field


class AIQuestionRequest(BaseModel):
    """AI 提问请求"""
    question: str = Field(..., min_length=1, max_length=2000, description="用户问题")
    # 可选的对话历史，让 AI 有上下文记忆
    history: list[dict[str, str]] = Field(
        default_factory=list,
        description="对话历史 [{\"role\":\"user/assistant\",\"content\":\"...\"}]"
    )


class AIAnswerResponse(BaseModel):
    """AI 回答响应"""
    answer: str = Field(..., description="AI 的回答内容")
    model: str = Field(..., description="使用的模型")
