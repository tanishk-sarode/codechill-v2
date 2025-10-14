from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import logging
from logging.handlers import RotatingFileHandler

from config import get_config
from models import db
from routes.auth import auth_bp
from routes.room import room_bp
from routes.execution import execution_bp
from routes.chat import chat_bp
from routes.users import users_bp
from sockets import create_socket_handlers

def create_app(config_name=None):
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    
    # JWT
    jwt = JWTManager(app)
    
    # CORS
    CORS(app, 
         origins=app.config['CORS_ORIGINS'],
         supports_credentials=True)
    
    # Rate limiting
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["1000 per hour"]
    )
    
    # Socket.IO
    socketio = SocketIO(
        app,
        cors_allowed_origins=app.config['SOCKETIO_CORS_ALLOWED_ORIGINS'],
        async_mode=app.config['SOCKETIO_ASYNC_MODE'],
        logger=app.config['SOCKETIO_LOGGER'],
        engineio_logger=app.config['SOCKETIO_ENGINEIO_LOGGER']
    )
    
    # Register Socket.IO handlers
    create_socket_handlers(socketio)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(room_bp)
    app.register_blueprint(execution_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(users_bp)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({'error': 'Rate limit exceeded'}), 429
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token required'}), 401
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'version': '1.0.0',
            'environment': app.config.get('FLASK_ENV', 'development')
        })
    
    # API info endpoint
    @app.route('/api')
    def api_info():
        return jsonify({
            'name': 'CodeChill API',
            'version': '1.0.0',
            'description': 'Real-time collaborative coding platform API',
            'endpoints': {
                'authentication': '/api/auth',
                'rooms': '/api/rooms',
                'users': '/api/users',
                'chat': '/api/chat',
                'execution': '/api/execution',
                'websocket': '/socket.io'
            },
            'features': [
                'Real-time collaborative editing',
                'Code execution with Judge0',
                'Room-based chat messaging',
                'User profile management',
                'Auth0 authentication',
                'Social platform integration'
            ]
        })
    
    # Database initialization
    with app.app_context():
        """Create database tables on app startup"""
        db.create_all()
    
    # Logging setup
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = RotatingFileHandler(
            'logs/codechill.log',
            maxBytes=10240000,
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('CodeChill startup')
    
    # Store socketio instance for external access
    # app.socketio = socketio  # Not needed for this implementation
    
    return app, socketio

# Create app instance
app, socketio = create_app()

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)