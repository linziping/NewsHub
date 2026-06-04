"""
通义千问 AI 配置
使用 DashScope OpenAI 兼容接口

API KEY 获取方式：
1. 访问 https://dashscope.console.aliyun.com/
2. 创建 API Key
3. 填入下方的 DASHSCOPE_API_KEY
"""

import os

# ============================================================
# ★ 在这里填写你的 DashScope API Key
#    格式: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ============================================================
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "sk-1d3126406d25419584b988e97abf689c")

# DashScope OpenAI 兼容接口地址
DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

# 模型选择 (推荐 qwen-plus，性价比最优)
# 可选: qwen-turbo, qwen-plus, qwen-max, qwen-max-longcontext
AI_MODEL = "qwen-plus"

# 系统提示词 — 定义 AI 助手的角色和行为
SYSTEM_PROMPT = """你是一个专业的新闻助手 AI，你的职责包括：
1. 根据用户问题，提供相关新闻资讯和信息解读
2. 对新闻内容进行摘要、分析和观点提炼
3. 回答用户关于时事、科技、财经、文化等各类新闻话题的问题
4. 用简洁清晰的中文回答，适当使用 Markdown 格式

要求：
- 回答准确、客观，避免主观偏见
- 如果问题超出新闻范畴，礼貌引导回新闻相关话题
- 回答长度适中，重点突出"""

# 请求超时设置 (秒)
REQUEST_TIMEOUT = 60

# 上下文最大 token 数
MAX_TOKENS = 2000

# 温度参数 (0-2，越低越确定，越高越随机)
TEMPERATURE = 0.7
