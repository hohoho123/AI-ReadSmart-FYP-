from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#Create FastAPI app instance
app = FastAPI(
    title="AI-ReadSmart API",
    description="Backend for AI-ReadSmart mobile application",
    version="1.0.0"
)

#Enable CORS (so your frontend can talk to backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Test endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to AI-ReadSmart API!",
        "status": "Server is running"
    }

#Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}