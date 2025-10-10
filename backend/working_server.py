#!/usr/bin/env python3
"""
Working CodeChill Backend Server
This server includes authentication and handles the relative import issues
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import uuid

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from sqlalchemy.dialects.mysql import JSON
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

# Database configuration (SQLite for development)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///codechill.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Auth0 Configuration
app.config['AUTH0_DOMAIN'] = os.environ.get('AUTH0_DOMAIN', 'your-auth0-domain.auth0.com')
app.config['AUTH0_CLIENT_ID'] = os.environ.get('AUTH0_CLIENT_ID', 'your-client-id')
app.config['AUTH0_CLIENT_SECRET'] = os.environ.get('AUTH0_CLIENT_SECRET', 'your-client-secret')
app.config['AUTH0_AUDIENCE'] = os.environ.get('AUTH0_AUDIENCE', 'your-api-audience')

# Initialize extensions
db = SQLAlchemy(app)
jwt_manager = JWTManager(app)
CORS(app, origins=['http://localhost:4200'], supports_credentials=True)

def generate_uuid():
    return str(uuid.uuid4())

# User Model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    auth0_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    picture = db.Column(db.String(500))
    
    # Social Profile Links
    github_username = db.Column(db.String(100))
    leetcode_username = db.Column(db.String(100))
    codeforces_username = db.Column(db.String(100))
    
    # Profile Stats (cached from external APIs)
    github_stats = db.Column(JSON)
    leetcode_stats = db.Column(JSON)
    codeforces_stats = db.Column(JSON)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    
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
        """Verify Auth0 JWT token"""
        try:
            # Get Auth0 public keys
            jwks_url = f"https://{app.config['AUTH0_DOMAIN']}/.well-known/jwks.json"
            response = requests.get(jwks_url)
            jwks = response.json()
            
            # Decode token header to get key ID
            unverified_header = pyjwt.get_unverified_header(token)
            key_id = unverified_header['kid']
            
            # Find the correct key
            key = None
            for jwk in jwks['keys']:
                if jwk['kid'] == key_id:
                    key = jwk
                    break
            
            if not key:
                raise Exception('Unable to find appropriate key')
            
            # Convert JWK to PEM format
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import serialization
            import base64
            
            # Decode the key components
            n = base64.urlsafe_b64decode(key['n'] + '==')
            e = base64.urlsafe_b64decode(key['e'] + '==')
            
            # Create RSA public key
            public_numbers = rsa.RSAPublicNumbers(
                int.from_bytes(e, 'big'),
                int.from_bytes(n, 'big')
            )
            public_key = public_numbers.public_key()
            
            # Serialize to PEM
            pem = public_key.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            # Verify token
            payload = pyjwt.decode(
                token,
                pem,
                algorithms=['RS256'],
                audience=app.config['AUTH0_AUDIENCE'],
                issuer=f"https://{app.config['AUTH0_DOMAIN']}/"
            )
            
            return payload
            
        except Exception as e:
            app.logger.error(f"Token verification error: {str(e)}")
            raise e

# Auth decorator
def verify_auth0_token(f):
    """Decorator to verify Auth0 JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        try:
            token = auth_header.split(' ')[1]  # Remove 'Bearer ' prefix
            payload = AuthService.verify_auth0_token(token)
            g.user_info = payload
            return f(*args, **kwargs)
        except Exception as e:
            app.logger.error(f"Token verification failed: {str(e)}")
            return jsonify({'error': 'Invalid token'}), 401
    
    return decorated_function

# Routes
@app.route('/')
def home():
    return jsonify({
        'message': 'CodeChill Backend is running!',
        'status': 'success',
        'version': '1.0.0',
        'auth': 'Auth0 integrated'
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'codechill-backend',
        'version': '1.0.0',
        'database': 'connected'
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
            'auth_login': '/api/auth/login',
            'auth_profile': '/api/auth/profile'
        }
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
        name = payload.get('name') or payload.get('nickname') or email.split('@')[0]
        picture = payload.get('picture')
        
        if not auth0_id or not email:
            return jsonify({'error': 'Invalid token payload'}), 400
        
        # Find or create user
        user = User.query.filter_by(auth0_id=auth0_id).first()
        
        if not user:
            # Create new user
            user = User(
                auth0_id=auth0_id,
                email=email,
                name=name,
                picture=picture,
                is_verified=payload.get('email_verified', False)
            )
            db.session.add(user)
        else:
            # Update existing user info
            user.email = email
            user.name = name
            user.picture = picture
            user.is_verified = payload.get('email_verified', False)
            user.last_active = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'data': user.to_dict()
        }), 200
        
    except Exception as e:
        app.logger.error(f"User sync error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'User sync failed', 'details': str(e)}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': user.to_dict(include_stats=True)
        }), 200
        
    except Exception as e:
        app.logger.error(f"Get profile error: {str(e)}")
        return jsonify({'error': 'Failed to get profile'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
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

# Initialize database
with app.app_context():
    db.create_all()
    print("✅ Database tables created successfully!")

if __name__ == '__main__':
    print("🚀 Starting CodeChill Backend Server...")
    print("📍 Backend running on: http://localhost:5001")
    print("🔗 Frontend should be on: http://localhost:4200")
    print("💡 API endpoints available at: http://localhost:5001/api")
    print("🔐 Auth0 integration enabled")
    print("🗄️  Database: SQLite (development)")
    print("-" * 50)
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )