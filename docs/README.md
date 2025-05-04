# Taxonomic Database

A modular Python application for managing taxonomic data with a web interface and database backend.

## Project Structure

The project uses a modular architecture to improve maintainability and separation of concerns:

```
taxonomic-database/
├── core/                     # Core functionality
│   ├── taxonomy_db.py        # Database connection and core operations
│   ├── db_controller.py      # High-level database controller
│   └── __init__.py
├── managers/                 # Specialized component managers
│   ├── species_manager.py    # Species-specific operations
│   ├── tag_manager.py        # Tag-specific operations
│   ├── taxonomy_manager.py   # Taxonomy classification operations
│   ├── schema_manager.py     # Database schema operations
│   └── __init__.py
├── web/                      # Web application components
│   ├── app.py                # Flask application entry point
│   ├── routes.py             # API route definitions
│   ├── templates/            # HTML templates
│   │   └── index.html        # Main application interface
│   └── __init__.py
├── utils/                    # Utility scripts
│   ├── data_importer.py      # Tools for importing taxonomic data
│   ├── cli.py                # Command-line interface
│   ├── setup.py              # Project setup utilities
│   ├── setup_enhanced.py     # Enhanced setup script
│   └── __init__.py
├── static/                   # Static web assets
│   ├── css/
│   ├── js/
│   └── images/
├── data/                     # Data files (CSV, JSON)
└── __init__.py               # Root package file
```

## Features

- **Taxonomic Classification**: Manage and explore the complete taxonomic tree of life
- **Species Management**: Add, edit, and query species information
- **Tagging System**: Categorize species with custom tags
- **Web Interface**: Browse the taxonomic hierarchy and species data
- **Data Import/Export**: Import from various taxonomic databases (GBIF, ITIS, EOL)
- **Command-line Interface**: Perform operations without the web interface
- **Docker Support**: Run the application in containers

## Installation

### Prerequisites

- Python 3.10 or higher
- PostgreSQL 14 or higher
- Flask web framework
- psycopg2 PostgreSQL adapter
- Docker (optional, for containerized deployment)

### Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/your-username/taxonomic-database.git
   cd taxonomic-database
   ```

2. Install required packages:
   ```
   pip install -r requirements.txt
   ```

3. Set up the project:
   ```
   cd utils
   python setup.py setup
   ```

4. Start the application:
   ```
   python utils/setup.py start
   ```

5. Initialize the database:
   ```
   python utils/setup.py init-db
   ```

### Using Docker

You can also run the application using Docker:

```
docker-compose up -d
```

## Usage

### Web Interface

Access the web interface at http://localhost:8000 after starting the application.

The web application provides:
- Taxonomic explorer to browse the tree of life
- Species search and filtering
- Detailed species information with images and distribution maps
- Import/export functionality

### API Endpoints

The application provides a RESTful API:

- `GET /api/taxonomy` - Get all taxonomic hierarchy data
- `GET /api/taxonomic-rank/{rank}` - Get items for a specific taxonomic rank
- `GET /api/species` - Get all species, optionally filtered
- `GET /api/species/{species_id}` - Get detailed information about a species
- `POST /api/species` - Add a new species with complete taxonomy
- `GET /api/species-by-rank/{rank}/{rank_id}` - Get species under a taxonomic rank
- `GET /api/tags` - Get all tags
- `GET /api/export` - Export the database to JSON
- `POST /api/import` - Import database from JSON
- `GET /api/schema` - Get the database schema as SQL

### Command-line Interface

```
python utils/cli.py init                     # Initialize database schema
python utils/cli.py import-csv FILE          # Import taxonomic data from CSV
python utils/cli.py export-csv FILE          # Export taxonomic data to CSV
python utils/cli.py add-species OPTIONS      # Add a single species
python utils/cli.py search --term TERM       # Search for species
python utils/cli.py schema --file FILE       # Generate SQL schema
```

### Data Import/Export

```
python utils/data_importer.py gbif TAXON_KEY   # Import from GBIF
python utils/data_importer.py itis TSN         # Import from ITIS
python utils/data_importer.py eol EOL_ID       # Import from Encyclopedia of Life
python utils/data_importer.py batch CSV_FILE   # Batch import from CSV
```

## Database Schema

The database follows a hierarchical structure matching taxonomic ranks:

- domains
- kingdoms
- phyla
- classes
- orders
- families
- genera
- species

Each species includes detailed information such as common name, description, conservation status, habitat, and geographic distribution. Species can also be tagged for easier categorization and filtering.

## Development

### Adding a New Feature

1. Determine which module the feature belongs in
2. Add the necessary functionality to the appropriate manager
3. Expose the functionality via the DatabaseController if needed
4. Add API routes in routes.py if it needs web access
5. Add CLI commands in cli.py if it needs command-line access

### Running Tests

```
# Run all tests
python -m unittest discover tests

# Run specific test file
python -m unittest tests/test_species_manager.py
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [GBIF](https://www.gbif.org/) - Global Biodiversity Information Facility
- [ITIS](https://www.itis.gov/) - Integrated Taxonomic Information System
- [EOL](https://eol.org/) - Encyclopedia of Life