"""AI 问答路由 — 调用通义千问 (Qwen) 模型"""

import logging

import httpx
from fastapi import APIRouter, HTTPException

from config.ai_conf import (
    AI_MODEL,
    DASHSCOPE_API_KEY,
    DASHSCOPE_BASE_URL,
    MAX_TOKENS,
    REQUEST_TIMEOUT,
    SYSTEM_PROMPT,
    TEMPERATURE,
)
from schemas.ai import AIQuestionRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI问答"])


@router.post("/chat")
async def ai_chat(req: AIQuestionRequest):
    """AI 问答接口 — 调用通义千问模型"""
    if DASHSCOPE_API_KEY == "sk-your-api-key-here":
        raise HTTPException(
            status_code=503,
            detail="AI 服务未配置：请在 config/ai_conf.py 中填入 DASHSCOPE_API_KEY"
        )

    # 构建消息列表
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    # 追加历史对话（最多保留最近 10 轮，避免 token 超限）
    if req.history:
        messages.extend(req.history[-20:])  # 10轮 = 20条消息
    # 追加当前问题
    messages.append({"role": "user", "content": req.question})

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        try:
            response = await client.post(
                f"{DASHSCOPE_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": AI_MODEL,
                    "messages": messages,
                    "max_tokens": MAX_TOKENS,
                    "temperature": TEMPERATURE,
                },
            )
            response.raise_for_status()
            result = response.json()
        except httpx.TimeoutException:
            logger.error("AI 请求超时")
            raise HTTPException(status_code=504, detail="AI 服务响应超时，请稍后重试")
        except httpx.HTTPStatusError as e:
            logger.error(f"AI API 错误: {e.response.status_code} — {e.response.text}")
            if e.response.status_code == 401:
                raise HTTPException(status_code=500, detail="AI API Key 无效，请检查配置")
            raise HTTPException(
                status_code=500,
                detail=f"AI 服务异常 ({e.response.status_code})，请稍后重试"
            )
        except Exception as e:
            logger.error(f"AI 请求异常: {str(e)}")
            raise HTTPException(status_code=500, detail="AI 服务连接失败，请检查网络")

    # 提取回答
    choices = result.get("choices", [])
    if not choices:
        raise HTTPException(status_code=500, detail="AI 未返回有效回答")

    answer = choices[0].get("message", {}).get("content", "")
    if not answer:
        raise HTTPException(status_code=500, detail="AI 返回了空回答")

    return {
        "code": 200,
        "message": "AI 回答成功",
        "data": {
            "answer": answer,
            "model": AI_MODEL
        }
    }
