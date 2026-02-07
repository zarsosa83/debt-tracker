#!/usr/bin/env python3
"""Run the Lending Tracker API server."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "backend.api:app",
        host="0.0.0.0",
        port=8765,
        reload=True
    )
