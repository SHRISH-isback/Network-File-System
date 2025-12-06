#!/bin/bash

# NFS Web Application Startup Script

echo "========================================="
echo " NFS Web Application Startup"
echo "========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if requirements are installed
echo "Checking dependencies..."
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Installing dependencies..."
    pip3 install -r requirements.txt
fi

# Get configuration
NM_HOST=${NM_HOST:-127.0.0.1}
NM_PORT=${NM_PORT:-8080}
WEB_PORT=${WEB_PORT:-5000}

echo ""
echo "Configuration:"
echo "  Name Server: $NM_HOST:$NM_PORT"
echo "  Web Interface: http://0.0.0.0:$WEB_PORT"
echo ""

# Check if Name Server is reachable
echo "Checking Name Server connectivity..."
if timeout 2 bash -c "echo >/dev/tcp/$NM_HOST/$NM_PORT" 2>/dev/null; then
    echo "✓ Name Server is reachable"
else
    echo "⚠ Warning: Cannot reach Name Server at $NM_HOST:$NM_PORT"
    echo "  Make sure the NFS backend is running!"
fi

echo ""
echo "Starting Flask application..."
echo "Press Ctrl+C to stop"
echo ""

# Start the Flask app
export NM_HOST
export NM_PORT
python3 app.py
