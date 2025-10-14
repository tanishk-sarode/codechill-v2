#!/usr/bin/env python3
"""
Simple test to check basic imports
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    print("✅ Testing basic Flask import...")
    from flask import Flask
    print("✅ Flask imported successfully")
    
    print("✅ Testing SQLAlchemy import...")
    from flask_sqlalchemy import SQLAlchemy
    print("✅ SQLAlchemy imported successfully")
    
    print("✅ Testing config import...")
    from config import get_config
    print("✅ Config imported successfully")
    
    print("✅ Testing models import...")
    from models import db
    print("✅ Models imported successfully")
    
    print("✅ All basic imports working!")
    
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()