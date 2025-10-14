#!/usr/bin/env python3
"""
CodeChill Backend Development Server
Single entry point for running the full Flask application with all features
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path for absolute imports
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def setup_environment():
    """Setup development environment variables"""
    # Set default environment variables if not set
    os.environ.setdefault('FLASK_ENV', 'development')
    os.environ.setdefault('SECRET_KEY', 'dev-secret-key-change-in-production')
    os.environ.setdefault('JWT_SECRET_KEY', 'jwt-dev-secret-key')
    
    # Database fallback (for development without MySQL)
    if not os.environ.get('MYSQL_HOST'):
        print("⚠️  Warning: No MySQL configuration found.")
        print("📝 Using SQLite fallback for development.")
        print("🔧 To use MySQL, set these environment variables:")
        print("   - MYSQL_HOST, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE")
        print("   - AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET")
        print()
        
        # Fallback to SQLite for development
        os.environ.setdefault('SQLALCHEMY_DATABASE_URI', 'sqlite:///codechill_dev.db')

def main():
    """Main application entry point"""
    try:
        # Setup environment
        setup_environment()
        
        # Import the app factory
        from app import create_app
        
        # Create app with development config
        app, socketio = create_app('development')
        
        print("🚀 Starting CodeChill Backend Server...")
        print("📍 Backend running on: http://localhost:5001")
        print("🔗 Frontend should be on: http://localhost:4200")
        print("🌐 API endpoints: http://localhost:5001/api")
        print("🔌 Socket.IO: ws://localhost:5001/socket.io")
        print("💾 Database: " + app.config.get('SQLALCHEMY_DATABASE_URI', 'Not configured'))
        print("-" * 60)
        
        # Create database tables
        with app.app_context():
            try:
                from models import db
                db.create_all()
                print("✅ Database tables created successfully")
            except Exception as e:
                print(f"⚠️  Database setup warning: {e}")
                print("💡 Application will continue with limited functionality")
        
        print("🎯 Press Ctrl+C to stop the server")
        print("-" * 60)
        
        # Run the application
        socketio.run(
            app,
            debug=True,
            host='0.0.0.0',
            port=5001,
            use_reloader=True,
            log_output=True
        )
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure you're in the backend directory")
        print("2. Activate virtual environment: source .venv/bin/activate")
        print("3. Install dependencies: pip install -r requirements.txt")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        print("\n🔧 Check your configuration and try again")
        sys.exit(1)

if __name__ == '__main__':
    main()