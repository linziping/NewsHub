from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from routers import news

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
async def root():
    return {"message": "Hello World"}

#挂载路由
app.include_router(news.router)
