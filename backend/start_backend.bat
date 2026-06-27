@echo off
echo Starting ModelWise Backend...
cd /d "%~dp0"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
pause
