# Taxonomic Database

A modular Python application for managing taxonomic data.

## Project Structure

The project has been restructured into a modular architecture to improve maintainability and separation of concerns:

```
taxonomic-database/
├── app.py                  # Main Flask application entry point
├── routes.py               # API route definitions
├── db_controller.py        # High-level database controller
├── taxonomy_db.py          # Core database functionality
├── species_manager.py      # Species-specific operations
├── tag_manager.py          # Tag-specific operations
├── taxonomy_manager.py     # Taxonomy classification operations
├── data_importer.py        # Data import utilities
├── cli.py                  # Command-line interface
├── setup.py                # Project setup utilities
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables
├── templates/              # HTML templates
│   └── index.html          # Main application interface
└── static/                 # Static assets
```

## Component Descriptions

### Core Components

- **taxonomy_db.py**: The core database connection manager that handles low-level operations with PostgreSQL.
- **species_manager.py**: Manages species-specific operations like adding, updating, and querying species.
- **tag_manager.py**: Handles tag-related operations, including associating tags with species.
- **taxonomy_manager.py**: Manages taxonomic hierarchy like domains, kingdoms, phyla, etc.
- **db_controller.py**: Provides a high-level interface for database operations, integrating all the managers.

### Interface Components

- **app.py**: The main Flask application entry point.
- **routes.py**: Defines API routes for the web application.
- **cli.py**: Provides a command-line interface for database operations.
- **setup.py**: Utilities for setting up the project, including Docker configuration.
- **data_importer.py**: Tools for importing taxonomic data from external sources.

## Installation and Setup

### Prerequisites

- Python 3.10 or higher
- PostgreSQL 14 or higher
- Docker (optional, for containerized deployment)

### Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/your-username/taxonomic-database.git
   cd taxonomic-database
   ```

2. Set up the project:
   ```
   python setup.py setup
   ```

3. Start the application:
   ```
   python setup.py start
   ```

4. Initialize the database:
   ```
   python setup.py init-db
   ```

### Using Docker

You can also run the application using Docker:

```
docker-compose up -d
```

## API Documentation

The application provides a RESTful API for interacting with the taxonomic database:

- `GET /api/taxonomy` - Get all taxonomic hierarchy data
- `GET /api/taxonomic-rank/{rank}` - Get items for a specific taxonomic rank
- `GET /api/species` - Get all species, optionally filtered by search term or tag
- `GET /api/species/{species_id}` - Get detailed information about a specific species
- `POST /api/species` - Add a new species with complete taxonomy
- `GET /api/species-by-rank/{rank}/{rank_id}` - Get all species under a specific taxonomic rank
- `GET /api/tags` - Get all tags
- `GET /api/export` - Export the database to a JSON file
- `POST /api/import` - Import database from a JSON file
- `GET /api/schema` - Get the database schema as SQL

## Command-line Interface

The CLI provides various commands for managing the database:

```
python cli.py init                    # Initialize database schema
python cli.py import-csv FILE         # Import taxonomic data from CSV
python cli.py export-csv FILE         # Export taxonomic data to CSV
python cli.py import-json FILE        # Import taxonomic data from JSON
python cli.py export-json FILE        # Export taxonomic data to JSON
python cli.py add-species OPTIONS     # Add a single species
python cli.py search --term TERM      # Search for species
python cli.py schema --file FILE      # Generate SQL schema
```

## Data Import/Export

The system supports importing taxonomic data from external sources:

```
python data_importer.py gbif TAXON_KEY     # Import from GBIF
python data_importer.py itis TSN           # Import from ITIS
python data_importer.py eol EOL_ID         # Import from Encyclopedia of Life
python data_importer.py batch CSV_FILE     # Batch import from CSV
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.