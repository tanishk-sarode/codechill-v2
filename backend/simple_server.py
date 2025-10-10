#!/usr/bin/env python3
"""
Simple Flask Backend Startup Script
This script creates a minimal working Flask backend for CodeChill
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from flask import Flask, jsonify
from flask_cors import CORS

def create_simple_app():
    """Create a simple Flask app for testing"""
    app = Flask(__name__)
    
    # Basic configuration
    app.config['SECRET_KEY'] = 'dev-secret-key'
    app.config['DEBUG'] = True
    
    # Enable CORS
    CORS(app, origins=['http://localhost:4200'])
    
    @app.route('/')
    def home():
        return jsonify({
            'message': 'CodeChill Backend is running!',
            'status': 'success',
            'version': '1.0.0'
        })
    
    @app.route('/health')
    def health():
        return jsonify({
            'status': 'healthy',
            'service': 'codechill-backend',
            'version': '1.0.0'
        })
    
    @app.route('/api')
    def api_info():
        return jsonify({
            'name': 'CodeChill API',
            'version': '1.0.0',
            'description': 'Real-time collaborative coding platform API',
            'endpoints': {
                'health': '/health',
                'api_info': '/api',
                'auth': '/api/auth (coming soon)',
                'rooms': '/api/rooms (coming soon)'
            }
        })
    
    return app

if __name__ == '__main__':
    print("🚀 Starting CodeChill Backend Server...")
    print("📍 Backend running on: http://localhost:5001")
    print("🔗 Frontend should be on: http://localhost:4200")
    print("💡 API endpoints available at: http://localhost:5001/api")
    print("-" * 50)
    
    app = create_simple_app()
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )