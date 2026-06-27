@echo off
echo Starting AI Proxy API...
echo.
echo Make sure you have:
echo 1. Created a .env file with your API keys
echo 2. Installed dependencies: pip install -r requirements.txt
echo.
echo Starting server on port 9000...
echo.

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 9000

pause


