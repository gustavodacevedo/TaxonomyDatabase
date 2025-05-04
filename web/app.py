#!/usr/bin/env python3
"""
Main application file for the Taxonomic Database
"""
import sys
import os
# Add the parent directory to Python's module search path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from web.routes import register_routes  # Updated import path

def create_app():
    """Create and configure the Flask app"""
    app = Flask(__name__, template_folder='templates')
    
    # Register all routes with the app
    register_routes(app)
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)