#!/usr/bin/env python3
"""
Setup script for the Taxonomic Database
"""
import os
import argparse
import subprocess
import shutil
import json

def create_docker_compose():
    """Create docker-compose.yml file"""
    docker_compose = """
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: taxonomy
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always

  web:
    build: .
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/taxonomy
      FLASK_ENV: production
    ports:
      - "8000:5000"
    restart: always

volumes:
  postgres_data:
"""
    with open('docker-compose.yml', 'w') as f:
        f.write(docker_compose)
    
    print("Created docker-compose.yml")

def create_dockerfile():
    """Create Dockerfile"""
    dockerfile = """
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
"""
    with open('Dockerfile', 'w') as f:
        f.write(dockerfile)
    
    print("Created Dockerfile")

def create_requirements():
    """Create requirements.txt"""
    requirements = """
Flask==2.3.2
psycopg2-binary==2.9.5
gunicorn==20.1.0
python-dotenv==1.0.0
requests==2.31.0
"""
    with open('requirements.txt', 'w') as f:
        f.write(requirements)
    
    print("Created requirements.txt")

def create_dotenv():
    """Create .env file"""
    dotenv = """
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taxonomy
FLASK_ENV=development
"""
    with open('.env', 'w') as f:
        f.write(dotenv)
    
    print("Created .env file")

def setup_project(args):
    """Set up the project"""
    # Create directories
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    os.makedirs('data', exist_ok=True)
    
    # Create docker files
    create_docker_compose()
    create_dockerfile()
    create_requirements()
    create_dotenv()
    
    # Copy files from current directory
    if args.source and os.path.exists(args.source):
        files_to_copy = [
            'app.py',
            'taxonomy_db.py'
        ]
        
        for file in files_to_copy:
            source_file = os.path.join(args.source, file)
            if os.path.exists(source_file):
                shutil.copy2(source_file, '.')
                print(f"Copied {file}")
    
    print("Project setup complete. You can now run `docker-compose up` to start the application.")

def start_project(args):
    """Start the project with Docker Compose"""
    try:
        subprocess.run(['docker-compose', 'up', '-d'], check=True)
        print("Application started. You can access it at http://localhost:8000")
    except subprocess.CalledProcessError as e:
        print(f"Error starting application: {e}")
    except FileNotFoundError:
        print("Error: docker-compose not found. Please install Docker and Docker Compose.")

def stop_project(args):
    """Stop the project with Docker Compose"""
    try:
        subprocess.run(['docker-compose', 'down'], check=True)
        print("Application stopped.")
    except subprocess.CalledProcessError as e:
        print(f"Error stopping application: {e}")
    except FileNotFoundError:
        print("Error: docker-compose not found. Please install Docker and Docker Compose.")

def init_database(args):
    """Initialize the database"""
    # Check if we're in docker or local
    if args.docker:
        cmd = ['docker-compose', 'exec', 'web', 'python', '-c', 
               "from taxonomy_db import TaxonomicDatabase; db = TaxonomicDatabase(); db.connect(); db.create_schema(); db.disconnect(); print('Database initialized.')"]
    else:
        cmd = ['python', '-c', 
               "from taxonomy_db import TaxonomicDatabase; db = TaxonomicDatabase(); db.connect(); db.create_schema(); db.disconnect(); print('Database initialized.')"]
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error initializing database: {e}")
    except FileNotFoundError:
        print("Error: Command not found. Make sure you have the necessary tools installed.")

def main():
    parser = argparse.ArgumentParser(description='Taxonomic Database Setup')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Setup command
    setup_parser = subparsers.add_parser('setup', help='Set up the project')
    setup_parser.add_argument('--source', help='Source directory for files')
    
    # Start command
    start_parser = subparsers.add_parser('start', help='Start the application')
    
    # Stop command
    stop_parser = subparsers.add_parser('stop', help='Stop the application')
    
    # Init database command
    init_parser = subparsers.add_parser('init-db', help='Initialize the database')
    init_parser.add_argument('--docker', action='store_true', help='Run in Docker container')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == 'setup':
        setup_project(args)
    elif args.command == 'start':
        start_project(args)
    elif args.command == 'stop':
        stop_project(args)
    elif args.command == 'init-db':
        init_database(args)

if __name__ == '__main__':
    main()