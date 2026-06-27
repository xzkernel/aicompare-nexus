@echo off
echo Starting ModelWise Backend...
echo.
echo Make sure you have:
echo 1. Python installed
echo 2. Dependencies installed (pip install -r requirements.txt)
echo 3. .env file configured with API keys
echo.
echo Starting server on http://localhost:8001
echo Press Ctrl+C to stop
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001

pause
