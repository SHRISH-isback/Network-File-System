#!/usr/bin/env python3
"""
Simple startup script for NFS Web Application
"""
import os
import sys
import subprocess

def main():
    print("="*45)
    print(" NFS Web Application Startup")
    print("="*45)
    print()
    
    # Check dependencies
    print("Checking dependencies...")
    try:
        import flask
        import flask_socketio
        print("✓ All dependencies installed")
    except ImportError:
        print("Installing dependencies...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Configuration
    nm_host = os.environ.get('NM_HOST', '127.0.0.1')
    nm_port = os.environ.get('NM_PORT', '8080')
    
    print()
    print("Configuration:")
    print(f"  Name Server: {nm_host}:{nm_port}")
    print(f"  Web Interface: http://localhost:5000")
    print()
    print("Starting Flask application...")
    print("Press Ctrl+C to stop")
    print()
    
    # Run the app
    subprocess.run([sys.executable, "app.py"])

if __name__ == "__main__":
    main()
