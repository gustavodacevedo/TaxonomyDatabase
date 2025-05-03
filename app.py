#!/usr/bin/env python3
"""
Main application file for the Taxonomic Database
"""

from flask import Flask
from routes import register_routes

def create_app():
    """Create and configure the Flask app"""
    app = Flask(__name__, template_folder='templates')
    
    # Register all routes with the app
    register_routes(app)
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)