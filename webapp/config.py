#!/usr/bin/env python3
"""
Configuration loader for NFS Web Application
Loads settings from .env file or environment variables
"""
import os
from pathlib import Path

# Load .env file if it exists
def load_env():
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        print(f"Loading configuration from {env_file}")
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    if key and not os.environ.get(key):
                        os.environ[key] = value
    else:
        print("No .env file found, using environment variables or defaults")

class Config:
    """Application configuration"""
    
    def __init__(self):
        load_env()
        
        # Name Server configuration
        self.NM_HOST = os.environ.get('NM_HOST', '127.0.0.1')
        self.NM_PORT = int(os.environ.get('NM_PORT', 8080))
        
        # Web app configuration
        self.WEB_HOST = os.environ.get('WEB_HOST', '0.0.0.0')
        self.WEB_PORT = int(os.environ.get('WEB_PORT', 5000))
        
        # Flask configuration
        self.SECRET_KEY = os.environ.get('SECRET_KEY', os.urandom(24))
        self.DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    def display(self):
        """Display current configuration"""
        print("\n" + "="*50)
        print(" NFS Web Application Configuration")
        print("="*50)
        print(f"  Name Server: {self.NM_HOST}:{self.NM_PORT}")
        print(f"  Web Interface: http://{self.WEB_HOST}:{self.WEB_PORT}")
        print(f"  Debug Mode: {self.DEBUG}")
        print("="*50 + "\n")

# Global config instance
config = Config()
