import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database Configuration
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT') or 3306)
    MYSQL_USERNAME = os.environ.get('MYSQL_USERNAME') or 'codechill'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or 'password'
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE') or 'codechill'
    
    # Use SQLite fallback if no MySQL configured or if SQLALCHEMY_DATABASE_URI is explicitly set
    if os.environ.get('SQLALCHEMY_DATABASE_URI'):
        SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI')
    elif os.environ.get('MYSQL_HOST'):
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{MYSQL_USERNAME}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    else:
        # Fallback to SQLite for development
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(os.path.dirname(__file__), '..', 'codechill_dev.db')}"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_size': 10,
        'max_overflow': 20
    }
    
    # Auth0 Configuration
    AUTH0_DOMAIN = os.environ.get('AUTH0_DOMAIN')
    AUTH0_CLIENT_ID = os.environ.get('AUTH0_CLIENT_ID')
    AUTH0_CLIENT_SECRET = os.environ.get('AUTH0_CLIENT_SECRET')
    AUTH0_AUDIENCE = os.environ.get('AUTH0_AUDIENCE')
    AUTH0_ALGORITHMS = ['RS256']
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Socket.IO Configuration
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get('SOCKETIO_CORS_ALLOWED_ORIGINS', '*').split(',')
    SOCKETIO_ASYNC_MODE = 'threading'
    SOCKETIO_LOGGER = True
    SOCKETIO_ENGINEIO_LOGGER = True
    
    # Judge0 API Configuration
    JUDGE0_API_URL = os.environ.get('JUDGE0_API_URL') or 'https://judge0-ce.p.rapidapi.com'
    JUDGE0_API_KEY = os.environ.get('JUDGE0_API_KEY')
    JUDGE0_API_HOST = os.environ.get('JUDGE0_API_HOST') or 'judge0-ce.p.rapidapi.com'
    
    # External API Configuration
    GITHUB_API_URL = 'https://api.github.com'
    LEETCODE_API_URL = 'https://leetcode.com/graphql'
    CODEFORCES_API_URL = 'https://codeforces.com/api'
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL') or 'memory://'
    RATELIMIT_DEFAULT = '100 per hour'
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:4200').split(',')
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file upload
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
    ALLOWED_EXTENSIONS = {'txt', 'py', 'js', 'cpp', 'java', 'c', 'cs', 'php', 'rb', 'go', 'rs'}
    
    # Cache Configuration
    CACHE_TYPE = os.environ.get('CACHE_TYPE') or 'simple'
    CACHE_DEFAULT_TIMEOUT = 300
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    LOG_FILE = os.environ.get('LOG_FILE') or 'codechill.log'
    
    # Application Settings
    ROOM_INACTIVITY_TIMEOUT = 3600  # 1 hour in seconds
    MAX_ROOMS_PER_USER = 5
    MAX_MESSAGE_LENGTH = 1000
    MAX_CODE_LENGTH = 100000  # 100KB
    
    @staticmethod
    def init_app(app):
        """Initialize application with config"""
        pass

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
    # Override for development
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_size': 5,
        'max_overflow': 10
    }
    
    # Disable CORS for development
    CORS_ORIGINS = ['http://localhost:4200', 'http://127.0.0.1:4200']
    
    # More verbose logging
    SOCKETIO_LOGGER = True
    SOCKETIO_ENGINEIO_LOGGER = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    # Production database settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_size': 20,
        'max_overflow': 40
    }
    
    # Strict CORS in production
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get('SOCKETIO_CORS_ALLOWED_ORIGINS', '').split(',')
    
    # Disable debug logging
    SOCKETIO_LOGGER = False
    SOCKETIO_ENGINEIO_LOGGER = False
    
    @staticmethod
    def init_app(app):
        Config.init_app(app)
        
        # Production-specific initialization
        import logging
        from logging.handlers import RotatingFileHandler
        
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

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    
    # Use in-memory SQLite for tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False
    
    # Shorter token expiration for tests
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)

# Configuration mapping
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(config_name=None):
    """Get configuration class by name"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    return config_map.get(config_name, DevelopmentConfig)

# Language mappings for Judge0
JUDGE0_LANGUAGE_MAP = {
    'javascript': 63,  # Node.js
    'python': 71,      # Python 3
    'java': 62,        # Java
    'cpp': 54,         # C++ (GCC 9.2.0)
    'c': 50,           # C (GCC 9.2.0)
    'csharp': 51,      # C# (Mono 6.6.0.161)
    'php': 68,         # PHP
    'ruby': 72,        # Ruby
    'go': 60,          # Go
    'rust': 73,        # Rust
    'kotlin': 78,      # Kotlin
    'swift': 83,       # Swift
    'typescript': 74,  # TypeScript
}

# Supported programming languages
SUPPORTED_LANGUAGES = list(JUDGE0_LANGUAGE_MAP.keys())

# Default code templates
DEFAULT_CODE_TEMPLATES = {
    'javascript': '''// Welcome to CodeChill!
console.log("Hello, World!");

// Your code here
''',
    'python': '''# Welcome to CodeChill!
print("Hello, World!")

# Your code here
''',
    'java': '''// Welcome to CodeChill!
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Your code here
    }
}''',
    'cpp': '''// Welcome to CodeChill!
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    
    // Your code here
    return 0;
}''',
    'c': '''// Welcome to CodeChill!
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    
    // Your code here
    return 0;
}''',
    'csharp': '''// Welcome to CodeChill!
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
        
        // Your code here
    }
}''',
    'python': '''# Welcome to CodeChill!
print("Hello, World!")

# Your code here
''',
}