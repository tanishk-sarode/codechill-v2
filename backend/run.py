#!/usr/bin/env python3
"""
CodeChill Backend Server
Run this script to start the Flask application with Socket.IO support
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from app import app, socketio
    
    if __name__ == '__main__':
        # Set environment variables if not set
        os.environ.setdefault('FLASK_ENV', 'development')
        os.environ.setdefault('SECRET_KEY', 'dev-secret-key-change-in-production')
        
        # Default configuration for development
        if not os.environ.get('MYSQL_HOST'):
            print("Warning: No MySQL configuration found. Using default values.")
            print("Please set the following environment variables for production:")
            print("- MYSQL_HOST")
            print("- MYSQL_USERNAME") 
            print("- MYSQL_PASSWORD")
            print("- MYSQL_DATABASE")
            print("- AUTH0_DOMAIN")
            print("- AUTH0_CLIENT_ID")
            print("- AUTH0_CLIENT_SECRET")
            print("- AUTH0_AUDIENCE")
            print("- JUDGE0_API_KEY")
            print()
        
        print("Starting CodeChill Backend Server...")
        print("Frontend should be running on: http://localhost:4200")
        print("Backend will be running on: http://localhost:5000")
        print("Socket.IO endpoint: ws://localhost:5000/socket.io")
        print()
        print("Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Run the application
        socketio.run(
            app,
            debug=True,
            host='0.0.0.0',
            port=5000,
            use_reloader=True,
            log_output=True
        )
        
except ImportError as e:
    print(f"Import Error: {e}")
    print("\nMake sure you have installed all dependencies:")
    print("pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"Error starting server: {e}")
    sys.exit(1)