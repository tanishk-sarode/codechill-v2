#!/usr/bin/env python3
"""
Simple CodeChill Backend Server
A minimal backend for testing authentication without database complexity
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import uuid
import json

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
import jwt as pyjwt
import requests
from functools import wraps

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Auth0 Configuration
app.config['AUTH0_DOMAIN'] = os.environ.get('AUTH0_DOMAIN', 'dev-zuzo0fg21517pj2e.us.auth0.com')
app.config['AUTH0_CLIENT_ID'] = os.environ.get('AUTH0_CLIENT_ID', '0Eq6Tk6UVrvlAsmJXT0QRx1xVfAiVp8V')
app.config['AUTH0_CLIENT_SECRET'] = os.environ.get('AUTH0_CLIENT_SECRET', 'your-client-secret')
app.config['AUTH0_AUDIENCE'] = os.environ.get('AUTH0_AUDIENCE', 'https://dev-zuzo0fg21517pj2e.us.auth0.com/api/v2/')

# Initialize extensions
jwt_manager = JWTManager(app)
CORS(app, origins=['http://localhost:4200'], supports_credentials=True)

# In-memory user storage for development
users_db = {}

def generate_uuid():
    return str(uuid.uuid4())

# Simple User class
class User:
    def __init__(self, auth0_id, email, name, picture=None, is_verified=False):
        self.id = generate_uuid()
        self.auth0_id = auth0_id
        self.email = email
        self.name = name
        self.picture = picture
        self.github_username = None
        self.leetcode_username = None
        self.codeforces_username = None
        self.github_stats = None
        self.leetcode_stats = None
        self.codeforces_stats = None
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.last_active = datetime.utcnow()
        self.is_active = True
        self.is_verified = is_verified
    
    def to_dict(self, include_stats=False):
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'picture': self.picture,
            'github_username': self.github_username,
            'leetcode_username': self.leetcode_username,
            'codeforces_username': self.codeforces_username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active,
            'is_verified': self.is_verified
        }
        
        if include_stats:
            data.update({
                'github_stats': self.github_stats,
                'leetcode_stats': self.leetcode_stats,
                'codeforces_stats': self.codeforces_stats
            })
        
        return data
    
    def __repr__(self):
        return f'<User {self.email}>'

# Auth0 Service Functions
class AuthService:
    @staticmethod
    def verify_auth0_token(token):
        """Verify Auth0 JWT token - simplified for development"""
        try:
            # For development, we'll do a simplified verification
            # In production, you'd verify against Auth0's JWKS endpoint
            
            # Skip verification in development mode
            if app.debug:
                # Decode without verification for development
                payload = pyjwt.decode(token, options={"verify_signature": False})
                return payload
            
            # Production verification would go here
            # Get Auth0 public keys and verify properly
            payload = pyjwt.decode(token, options={"verify_signature": False})
            return payload
            
        except Exception as e:
            app.logger.error(f"Token verification error: {str(e)}")
            raise e

# Routes
@app.route('/')
def home():
    return jsonify({
        'message': 'CodeChill Backend is running!',
        'status': 'success',
        'version': '1.0.0',
        'auth': 'Auth0 integrated (development mode)',
        'users_count': len(users_db)
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'codechill-backend',
        'version': '1.0.0',
        'database': 'in-memory (development)',
        'auth': 'ready'
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
            'auth_sync': '/api/auth/sync',
            'auth_profile': '/api/auth/profile',
            'users': '/api/users'
        },
        'note': 'Development mode - using in-memory storage'
    })

# Auth routes
@app.route('/api/auth/sync', methods=['POST'])
def sync_user():
    """Sync user with Auth0 token (for frontend authentication)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        # Extract Auth0 token
        token = auth_header.split(' ')[1]  # Remove 'Bearer ' prefix
        payload = AuthService.verify_auth0_token(token)
        
        # Extract user data from Auth0 token
        auth0_id = payload.get('sub')
        email = payload.get('email')
        name = payload.get('name') or payload.get('nickname') or email.split('@')[0] if email else 'Unknown'
        picture = payload.get('picture')
        
        if not auth0_id or not email:
            return jsonify({'error': 'Invalid token payload'}), 400
        
        # Find or create user in memory
        user = None
        for u in users_db.values():
            if u.auth0_id == auth0_id:
                user = u
                break
        
        if not user:
            # Create new user
            user = User(
                auth0_id=auth0_id,
                email=email,
                name=name,
                picture=picture,
                is_verified=payload.get('email_verified', False)
            )
            users_db[user.id] = user
            app.logger.info(f"Created new user: {email}")
        else:
            # Update existing user info
            user.email = email
            user.name = name
            user.picture = picture
            user.is_verified = payload.get('email_verified', False)
            user.last_active = datetime.utcnow()
            user.updated_at = datetime.utcnow()
            app.logger.info(f"Updated user: {email}")
        
        return jsonify({
            'data': user.to_dict(),
            'message': 'User synced successfully'
        }), 200
        
    except Exception as e:
        app.logger.error(f"User sync error: {str(e)}")
        return jsonify({'error': 'User sync failed', 'details': str(e)}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = users_db.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': user.to_dict(include_stats=True)
        }), 200
        
    except Exception as e:
        app.logger.error(f"Get profile error: {str(e)}")
        return jsonify({'error': 'Failed to get profile'}), 500

@app.route('/api/users', methods=['GET'])
def list_users():
    """List all users (development endpoint)"""
    return jsonify({
        'users': [user.to_dict() for user in users_db.values()],
        'total': len(users_db)
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# JWT error handlers
@jwt_manager.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token has expired'}), 401

@jwt_manager.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Invalid token'}), 401

@jwt_manager.unauthorized_loader
def missing_token_callback(error):
    return jsonify({'error': 'Authorization token required'}), 401

if __name__ == '__main__':
    print("🚀 Starting CodeChill Backend Server...")
    print("📍 Backend running on: http://localhost:5001")
    print("🔗 Frontend should be on: http://localhost:4200")
    print("💡 API endpoints available at: http://localhost:5001/api")
    print("🔐 Auth0 integration enabled (development mode)")
    print("🗄️  Database: In-memory storage (development)")
    print("⚠️  Note: Data will be lost when server restarts")
    print("-" * 50)
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )