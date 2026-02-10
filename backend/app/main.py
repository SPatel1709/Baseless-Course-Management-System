from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

# Import database functions
from app.database import init_db_pool, close_db_pool

# Import routers
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.student import router as student_router
from app.routers.instructor import router as instructor_router
from app.routers.analyst import router as analyst_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    print("Starting up application...")
    init_db_pool()
    yield
    # Shutdown
    print("Shutting down application...")
    close_db_pool()

# Create FastAPI application
app = FastAPI(
    title="Online Course Management Platform",
    description="A comprehensive web-based system for managing online courses, instructors, students, and analytics",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(student_router)
app.include_router(instructor_router)
app.include_router(analyst_router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "Online Course Management Platform API",
        "version": "1.0.0",
        "status": "running"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Main entry point
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload during development
        log_level="info"
    )
