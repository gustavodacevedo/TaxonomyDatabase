#!/usr/bin/env python3
"""
Main controller for the Taxonomic Database
This file serves as the entry point for all database operations,
using the modular components for each specific functionality.
"""
import os
from taxonomy_db import TaxonomicDatabase
from species_manager import SpeciesManager
from tag_manager import TagManager
from taxonomy_manager import TaxonomyManager

class DatabaseController:
    def __init__(self, connection_string=None):
        """Initialize the database controller."""
        self.db = TaxonomicDatabase(connection_string)
        self.db.connect()
        
        # Access to managers through properties
        self._species_manager = self.db.species_manager
        self._tag_manager = self.db.tag_manager
        self._taxonomy_manager = self.db.taxonomy_manager
    
    def __del__(self):
        """Ensure database connection is closed when controller is deleted."""
        if hasattr(self, 'db'):
            self.db.disconnect()
    
    @property
    def species(self):
        """Access to species management functions."""
        return self._species_manager
    
    @property
    def tags(self):
        """Access to tag management functions."""
        return self._tag_manager
    
    @property
    def taxonomy(self):
        """Access to taxonomy management functions."""
        return self._taxonomy_manager
    
    # High-level operations
    
    def add_complete_species(self, taxonomy_data, species_data, tags=None):
        """Add a complete species with taxonomy and optional tags."""
        return self.db.add_full_taxonomy(taxonomy_data, species_data, tags)
    
    def search_species(self, search_term=None, tag_names=None):
        """Search for species by term or tags."""
        return self.species.search_species(search_term, tag_names)
    
    def get_species_full_info(self, species_id):
        """Get complete information about a species including taxonomy and tags."""
        return self.species.get_full_taxonomy(species_id)
    
    def export_database(self, filename='taxonomy_export.json'):
        """Export the entire database to a JSON file."""
        return self.db.export_database(filename)
    
    def import_database(self, filename):
        """Import database from a JSON file."""
        return self.db.import_database(filename)
    
    def initialize_database(self):
        """Initialize the database schema."""
        return self.db.create_schema()

# Utility functions for standalone use
def init_db(connection_string=None):
    """Initialize the database."""
    controller = DatabaseController(connection_string)
    controller.initialize_database()
    print("Database initialized successfully.")
    return controller

def populate_sample_data(connection_string=None):
    """Add sample data to the database."""
    controller = DatabaseController(connection_string)
    controller.add_sample_data()
    print("Sample data added successfully.")

if __name__ == '__main__':
    # Example of using the controller
    import argparse
    
    parser = argparse.ArgumentParser(description='Taxonomic Database Controller')
    parser.add_argument('--init', action='store_true', help='Initialize database')
    parser.add_argument('--sample', action='store_true', help='Add sample data')
    parser.add_argument('--connection', help='Database connection string')
    
    args = parser.parse_args()
    
    if args.init:
        init_db(args.connection)
    
    if args.sample:
        populate_sample_data(args.connection)