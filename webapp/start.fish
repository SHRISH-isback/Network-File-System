#!/usr/bin/env fish

# NFS Web Application Startup Script (Fish Shell)

echo "========================================="
echo " NFS Web Application Startup"
echo "========================================="
echo ""

# Check if Python is installed
if not command -v python3 &> /dev/null
    echo "Error: Python 3 is not installed"
    exit 1
end

# Check if requirements are installed
echo "Checking dependencies..."
if not python3 -c "import flask" 2>/dev/null
    echo "Installing dependencies..."
    pip3 install -r requirements.txt
end

# Get configuration
set -x NM_HOST (test -n "$NM_HOST"; and echo $NM_HOST; or echo "127.0.0.1")
set -x NM_PORT (test -n "$NM_PORT"; and echo $NM_PORT; or echo "8080")
set WEB_PORT (test -n "$WEB_PORT"; and echo $WEB_PORT; or echo "5000")

echo ""
echo "Configuration:"
echo "  Name Server: $NM_HOST:$NM_PORT"
echo "  Web Interface: http://0.0.0.0:$WEB_PORT"
echo ""

# Check if Name Server is reachable
echo "Checking Name Server connectivity..."
if timeout 2s bash -c "echo >/dev/tcp/$NM_HOST/$NM_PORT" 2>/dev/null
    echo "✓ Name Server is reachable"
else
    echo "⚠ Warning: Cannot reach Name Server at $NM_HOST:$NM_PORT"
    echo "  Make sure the NFS backend is running!"
end

echo ""
echo "Starting Flask application..."
echo "Press Ctrl+C to stop"
echo ""

# Start the Flask app
python3 app.py
