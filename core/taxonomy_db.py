#!/usr/bin/env python3
#!/usr/bin/env python3
"""
Core Taxonomic Database functionality
"""
import sys
import os
# Add the parent directory to Python's module search path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import os
import json
import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import uuid

# Import managers with updated import paths
from managers.species_manager import SpeciesManager
from managers.tag_manager import TagManager
from managers.taxonomy_manager import TaxonomyManager
from managers.schema_manager import SchemaManager

# Load environment variables from .env file
load_dotenv()

class TaxonomicDatabase:
    def __init__(self, connection_string=None):
        """Initialize the database connection."""
        if connection_string:
            self.conn_string = connection_string
        else:
            # Use environment variables or default to local Supabase
            self.conn_string = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:54322/postgres')
        
        self.connection = None
        self.cursor = None
        
        # Initialize managers once connected
        self.species_manager = None
        self.tag_manager = None
        self.taxonomy_manager = None
        self.schema_manager = None  # Add schema manager
    
    def connect(self):
        """Establish database connection."""
        try:
            self.connection = psycopg2.connect(self.conn_string)
            self.cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            
            # Initialize managers
            self.species_manager = SpeciesManager(self)
            self.tag_manager = TagManager(self)
            self.taxonomy_manager = TaxonomyManager(self)
            self.schema_manager = SchemaManager(self)  # Initialize schema manager
            
            print("Database connection established.")
        except Exception as e:
            print(f"Error connecting to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
            print("Database connection closed.")
    
    def execute_sql(self, sql_query, params=None, commit=True):
        """Execute SQL query and optionally commit changes."""
        try:
            if not self.connection or self.connection.closed:
                self.connect()
            
            if params:
                self.cursor.execute(sql_query, params)
            else:
                self.cursor.execute(sql_query)
            
            if commit:
                self.connection.commit()
            
            # Try to fetch results if applicable
            try:
                result = self.cursor.fetchall()
                return result
            except psycopg2.ProgrammingError:
                # No results to fetch (e.g., for INSERT/UPDATE/DELETE)
                return None
        except Exception as e:
            if self.connection and not self.connection.closed:
                self.connection.rollback()
            print(f"Error executing SQL: {e}")
            print(f"Query: {sql_query}")
            if params:
                print(f"Params: {params}")
            raise
    
    def create_schema(self):
        """Create the database schema using the SchemaManager."""
        if self.schema_manager:
            self.schema_manager.create_schema()
        else:
            print("SchemaManager not initialized. Connecting to database...")
            self.connect()
            self.schema_manager.create_schema()
    
    def generate_sql_script(self):
        """Generate SQL script using the SchemaManager."""
        if self.schema_manager:
            return self.schema_manager.generate_sql_script()
        else:
            # Create a temporary SchemaManager
            schema_manager = SchemaManager(self)
            return schema_manager.generate_sql_script()
    
    def get_taxonomic_rank_items(self, rank, parent_rank=None, parent_id=None):
        """Get items for a specific taxonomic rank, optionally filtered by parent."""
        if self.taxonomy_manager:
            return self.taxonomy_manager.get_taxonomic_rank_items(rank, parent_rank, parent_id)
        
        # Fallback implementation if manager not initialized
        RANK_TO_TABLE = {
            'domain': 'domains',
            'kingdom': 'kingdoms',
            'phylum': 'phyla',
            'class': 'classes',
            'order': 'orders',
            'family': 'families',
            'genus': 'genera',
            'species': 'species'
        }
        
        if rank not in RANK_TO_TABLE:
            return []
        
        table_name = RANK_TO_TABLE[rank]
        
        if parent_rank and parent_id:
            query = f"SELECT * FROM {table_name} WHERE {parent_rank}_id = %s"
            return self.execute_sql(query, [parent_id])
        else:
            query = f"SELECT * FROM {table_name}"
            return self.execute_sql(query)
    
    # Taxonomy Management Methods
    def get_or_create_taxonomic_rank(self, table, name, parent_id=None, parent_column=None, description=None):
        """Get or create a taxonomic rank entry."""
        if self.taxonomy_manager:
            return self.taxonomy_manager.get_or_create_taxonomic_rank(table, name, parent_id, parent_column, description)
            
        # Fallback implementation if manager not initialized
        query = f"SELECT id FROM {table} WHERE name = %s"
        params = [name]
        
        if parent_id and parent_column:
            query += f" AND {parent_column} = %s"
            params.append(parent_id)
        
        result = self.execute_sql(query, params, commit=False)
        
        if result and result[0]['id']:
            return result[0]['id']
        
        # Create new entry
        if parent_id and parent_column:
            query = f"INSERT INTO {table} (name, {parent_column}, description) VALUES (%s, %s, %s) RETURNING id"
            params = [name, parent_id, description]
        else:
            query = f"INSERT INTO {table} (name, description) VALUES (%s, %s) RETURNING id"
            params = [name, description]
        
        result = self.execute_sql(query, params)
        return result[0]['id']
    
    def add_full_taxonomy(self, taxonomy_data, species_data=None, tags=None):
        """Add a complete taxonomic classification with optional species data and tags."""
        # Use the taxonomy manager to add the taxonomy hierarchy
        if self.taxonomy_manager:
            taxonomy_ids = self.taxonomy_manager.add_full_taxonomy(taxonomy_data)
            genus_id = taxonomy_ids['genus_id']
            
            # Store all IDs for return value
            result = taxonomy_ids.copy()
        else:
            # Fallback to direct implementation
            domain_id = self.get_or_create_taxonomic_rank('domains', 
                                                        taxonomy_data.get('domain', 'Unknown'),
                                                        description=taxonomy_data.get('domain_description'))
            
            kingdom_id = self.get_or_create_taxonomic_rank('kingdoms', 
                                                        taxonomy_data.get('kingdom', 'Unknown'),
                                                        domain_id, 'domain_id',
                                                        taxonomy_data.get('kingdom_description'))
            
            phylum_id = self.get_or_create_taxonomic_rank('phyla', 
                                                        taxonomy_data.get('phylum', 'Unknown'),
                                                        kingdom_id, 'kingdom_id',
                                                        taxonomy_data.get('phylum_description'))
            
            class_id = self.get_or_create_taxonomic_rank('classes', 
                                                        taxonomy_data.get('class', 'Unknown'),
                                                        phylum_id, 'phylum_id',
                                                        taxonomy_data.get('class_description'))
            
            order_id = self.get_or_create_taxonomic_rank('orders', 
                                                        taxonomy_data.get('order', 'Unknown'),
                                                        class_id, 'class_id',
                                                        taxonomy_data.get('order_description'))
            
            family_id = self.get_or_create_taxonomic_rank('families', 
                                                        taxonomy_data.get('family', 'Unknown'),
                                                        order_id, 'order_id',
                                                        taxonomy_data.get('family_description'))
            
            genus_id = self.get_or_create_taxonomic_rank('genera', 
                                                        taxonomy_data.get('genus', 'Unknown'),
                                                        family_id, 'family_id',
                                                        taxonomy_data.get('genus_description'))
            
            # Store all IDs for return value
            result = {
                'domain_id': domain_id,
                'kingdom_id': kingdom_id,
                'phylum_id': phylum_id,
                'class_id': class_id,
                'order_id': order_id,
                'family_id': family_id,
                'genus_id': genus_id
            }
            
        # Add species if species data is provided
        species_id = None
        if species_data and genus_id:
            if self.species_manager:
                # Add species using the species manager
                species_id = self.species_manager.add_species(genus_id, species_data)
            else:
                # Fallback implementation
                query = """
                INSERT INTO species (
                    genus_id, name, common_name, description, 
                    image_url, distribution_map_url, discovery_year, conservation_status, 
                    habitat, geographic_distribution
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """
                params = [
                    genus_id,
                    species_data.get('name', 'Unknown'),
                    species_data.get('common_name'),
                    species_data.get('description'),
                    species_data.get('image_url'),
                    species_data.get('distribution_map_url'),
                    species_data.get('discovery_year'),
                    species_data.get('conservation_status'),
                    species_data.get('habitat'),
                    species_data.get('geographic_distribution')
                ]
                
                result_species = self.execute_sql(query, params)
                if result_species:
                    species_id = result_species[0]['id']
            
            # Add tags if provided
            if tags and species_id:
                if self.tag_manager:
                    # Add tags using the tag manager
                    self.tag_manager.add_tags_to_species(species_id, tags)
                else:
                    # Fallback implementation
                    for tag_name in tags:
                        # Get or create tag
                        tag_query = "SELECT id FROM tags WHERE name = %s"
                        tag_result = self.execute_sql(tag_query, [tag_name], commit=False)
                        
                        if tag_result and tag_result[0]['id']:
                            tag_id = tag_result[0]['id']
                        else:
                            tag_create_query = "INSERT INTO tags (name) VALUES (%s) RETURNING id"
                            tag_create_result = self.execute_sql(tag_create_query, [tag_name])
                            tag_id = tag_create_result[0]['id']
                        
                        # Create species-tag association
                        self.execute_sql(
                            "INSERT INTO species_tags (species_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            [species_id, tag_id]
                        )
        
        # Add species_id to result
        result['species_id'] = species_id
        return result
    
    # Data Import/Export Methods
    def export_database(self, filename='taxonomy_export.json'):
        """Export the entire database to a JSON file."""
        export_data = {}
        
        # Export all tables
        tables = [
            'domains', 'kingdoms', 'phyla', 'classes', 
            'orders', 'families', 'genera', 'species',
            'tags', 'species_tags'
        ]
        
        for table in tables:
            export_data[table] = self.execute_sql(f"SELECT * FROM {table}")
        
        # Save to file
        with open(filename, 'w') as f:
            json.dump(export_data, f, default=str, indent=2)
        
        print(f"Database exported to {filename}")
        return export_data
    
    def import_database(self, filename='taxonomy_export.json'):
        """Import database from a JSON file."""
        try:
            with open(filename, 'r') as f:
                import_data = json.load(f)
            
            # Clear existing data (optional)
            self.execute_sql("BEGIN;")
            
            # Import in the correct order to respect foreign keys
            tables = [
                'domains', 'kingdoms', 'phyla', 'classes', 
                'orders', 'families', 'genera', 'species',
                'tags', 'species_tags'
            ]
            
            for table in tables:
                if table in import_data and import_data[table]:
                    # Delete existing data
                    self.execute_sql(f"DELETE FROM {table}", commit=False)
                    
                    for record in import_data[table]:
                        # Extract columns and values
                        columns = list(record.keys())
                        values = [record[col] for col in columns]
                        
                        # Build the INSERT query
                        columns_str = ", ".join(columns)
                        placeholders = ", ".join(["%s"] * len(columns))
                        
                        query = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"
                        self.execute_sql(query, values, commit=False)
            
            self.execute_sql("COMMIT;")
            print(f"Database imported from {filename}")
            return True
        except Exception as e:
            self.execute_sql("ROLLBACK;")
            print(f"Error importing database: {e}")
            return False


# Helper Functions
def init_db():
    """Initialize the database connection and schema."""
    db = TaxonomicDatabase()
    db.connect()
    db.create_schema()
    db.disconnect()
    return db