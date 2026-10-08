#!/bin/bash
set -e

# Base directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  ApexAttend: Smart College Attendance Management System"
echo "=========================================================="

# Check virtual environment
if [ ! -d ".venv" ]; then
    echo "[!] Virtual environment (.venv) not found. Setting up..."
    python3 -m venv .venv
    ./.venv/bin/pip install -r backend/requirements.txt
fi

# Run database seed if attendance.db does not exist
if [ ! -f "attendance.db" ]; then
    echo "[*] Initializing and seeding database..."
    PYTHONPATH=. ./.venv/bin/python -m backend.app.seed_data
else
    echo "[*] Database found (attendance.db)."
fi

# Start Backend Server
echo "[*] Starting FastAPI Backend on http://0.0.0.0:8000 ..."
PYTHONPATH=. ./.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start Frontend Dev Server
echo "[*] Starting Vite Frontend on http://localhost:5173 ..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo "=========================================================="
echo "  System Live!"
echo "  Frontend URL : http://localhost:5173"
echo "  Backend API  : http://localhost:8000/api"
echo "  Swagger Docs : http://localhost:8000/docs"
echo "=========================================================="
echo "  Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
