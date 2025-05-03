import os
import json
import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import uuid

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
    
    def connect(self):
        """Establish database connection."""
        try:
            self.connection = psycopg2.connect(self.conn_string)
            self.cursor = self.connection.cursor(cursor_factory=RealDictCursor)
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
            self.connection.rollback()
            print(f"Error executing SQL: {e}")
            print(f"Query: {sql_query}")
            if params:
                print(f"Params: {params}")
            raise
    
    def create_schema(self):
        """Create the complete taxonomic database schema."""
        schema_sql = """
        -- Create extension for UUID generation
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Create tables for each taxonomic rank
        CREATE TABLE IF NOT EXISTS domains (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kingdoms (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(domain_id, name)
        );

        CREATE TABLE IF NOT EXISTS phyla (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          kingdom_id UUID REFERENCES kingdoms(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(kingdom_id, name)
        );

        CREATE TABLE IF NOT EXISTS classes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          phylum_id UUID REFERENCES phyla(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(phylum_id, name)
        );

        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(class_id, name)
        );

        CREATE TABLE IF NOT EXISTS families (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(order_id, name)
        );

        CREATE TABLE IF NOT EXISTS genera (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          family_id UUID REFERENCES families(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(family_id, name)
        );

        -- Species table with additional fields
        CREATE TABLE IF NOT EXISTS species (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          genus_id UUID REFERENCES genera(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          common_name TEXT,
          description TEXT,
          image_url TEXT,
          discovery_year INTEGER,
          conservation_status TEXT,
          habitat TEXT,
          geographic_distribution TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(genus_id, name)
        );

        -- Tags table
        CREATE TABLE IF NOT EXISTS tags (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Junction table for species and tags (many-to-many)
        CREATE TABLE IF NOT EXISTS species_tags (
          species_id UUID REFERENCES species(id) ON DELETE CASCADE,
          tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (species_id, tag_id)
        );
        
        -- Create indices for better performance
        CREATE INDEX IF NOT EXISTS idx_kingdoms_domain_id ON kingdoms(domain_id);
        CREATE INDEX IF NOT EXISTS idx_phyla_kingdom_id ON phyla(kingdom_id);
        CREATE INDEX IF NOT EXISTS idx_classes_phylum_id ON classes(phylum_id);
        CREATE INDEX IF NOT EXISTS idx_orders_class_id ON orders(class_id);
        CREATE INDEX IF NOT EXISTS idx_families_order_id ON families(order_id);
        CREATE INDEX IF NOT EXISTS idx_genera_family_id ON genera(family_id);
        CREATE INDEX IF NOT EXISTS idx_species_genus_id ON species(genus_id);
        CREATE INDEX IF NOT EXISTS idx_species_tags_species_id ON species_tags(species_id);
        CREATE INDEX IF NOT EXISTS idx_species_tags_tag_id ON species_tags(tag_id);
        """
        
        print("Creating database schema...")
        self.execute_sql(schema_sql)
        print("Schema created successfully.")
    
    def generate_sql_script(self):
        """Generate SQL script for creating the database schema."""
        schema_sql = """
        -- Create extension for UUID generation
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Create tables for each taxonomic rank
        CREATE TABLE IF NOT EXISTS domains (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kingdoms (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(domain_id, name)
        );

        -- ... (remaining table definitions) ...

        -- Create indices for better performance
        CREATE INDEX IF NOT EXISTS idx_kingdoms_domain_id ON kingdoms(domain_id);
        CREATE INDEX IF NOT EXISTS idx_phyla_kingdom_id ON phyla(kingdom_id);
        -- ... (remaining index definitions) ...
        """
        
        # Save to file
        with open('taxonomy_schema.sql', 'w') as f:
            f.write(schema_sql)
        
        print("SQL script generated and saved to 'taxonomy_schema.sql'")
        return schema_sql
    
    # ===== Taxonomy Management Methods =====
    
    def get_or_create_taxonomic_rank(self, table, name, parent_id=None, parent_column=None, description=None):
        """Get or create a taxonomic rank entry."""
        # Check if entry exists
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
        # Process each taxonomic rank
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
        
        species_id = None
        if species_data:
            # Add species entry
            query = """
            INSERT INTO species (
                genus_id, name, common_name, description, 
                image_url, discovery_year, conservation_status, 
                habitat, geographic_distribution
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """
            params = [
                genus_id,
                species_data.get('name', 'Unknown'),
                species_data.get('common_name'),
                species_data.get('description'),
                species_data.get('image_url'),
                species_data.get('discovery_year'),
                species_data.get('conservation_status'),
                species_data.get('habitat'),
                species_data.get('geographic_distribution')
            ]
            
            result = self.execute_sql(query, params)
            species_id = result[0]['id']
            
            # Add tags if provided
            if tags and species_id:
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
        
        return {
            'domain_id': domain_id,
            'kingdom_id': kingdom_id,
            'phylum_id': phylum_id,
            'class_id': class_id,
            'order_id': order_id,
            'family_id': family_id,
            'genus_id': genus_id,
            'species_id': species_id
        }
    
    def get_species_by_tag(self, tag_name):
        """Get all species with a specific tag."""
        query = """
        SELECT s.*, g.name as genus_name, 
               array_agg(DISTINCT t.name) as tags
        FROM species s
        JOIN genera g ON s.genus_id = g.id
        JOIN species_tags st ON s.id = st.species_id
        JOIN tags t ON st.tag_id = t.id
        WHERE t.name = %s
        GROUP BY s.id, g.name
        """
        
        return self.execute_sql(query, [tag_name])
    
    def get_full_taxonomy(self, species_id):
        """Get complete taxonomic classification for a species."""
        query = """
        SELECT 
            s.id as species_id, s.name as species_name, s.common_name,
            g.id as genus_id, g.name as genus_name,
            f.id as family_id, f.name as family_name,
            o.id as order_id, o.name as order_name,
            c.id as class_id, c.name as class_name,
            p.id as phylum_id, p.name as phylum_name,
            k.id as kingdom_id, k.name as kingdom_name,
            d.id as domain_id, d.name as domain_name,
            array_agg(DISTINCT t.name) as tags
        FROM species s
        JOIN genera g ON s.genus_id = g.id
        JOIN families f ON g.family_id = f.id
        JOIN orders o ON f.order_id = o.id
        JOIN classes c ON o.class_id = c.id
        JOIN phyla p ON c.phylum_id = p.id
        JOIN kingdoms k ON p.kingdom_id = k.id
        JOIN domains d ON k.domain_id = d.id
        LEFT JOIN species_tags st ON s.id = st.species_id
        LEFT JOIN tags t ON st.tag_id = t.id
        WHERE s.id = %s
        GROUP BY s.id, g.id, f.id, o.id, c.id, p.id, k.id, d.id
        """
        
        result = self.execute_sql(query, [species_id])
        if result:
            return result[0]
        return None
    
    def search_species(self, search_term=None, tag_names=None):
        """Search for species based on search term and/or tags."""
        query_parts = []
        params = []
        
        base_query = """
        SELECT DISTINCT s.*, g.name as genus_name
        FROM species s
        JOIN genera g ON s.genus_id = g.id
        """
        
        if tag_names:
            base_query += """
            JOIN species_tags st ON s.id = st.species_id
            JOIN tags t ON st.tag_id = t.id
            """
            tag_conditions = []
            for tag in tag_names:
                tag_conditions.append("t.name = %s")
                params.append(tag)
            
            query_parts.append("(" + " OR ".join(tag_conditions) + ")")
        
        if search_term:
            search_condition = """
            (
                s.name ILIKE %s OR
                s.common_name ILIKE %s OR
                s.description ILIKE %s OR
                g.name ILIKE %s
            )
            """
            query_parts.append(search_condition)
            search_param = f"%{search_term}%"
            params.extend([search_param, search_param, search_param, search_param])
        
        if query_parts:
            final_query = base_query + " WHERE " + " AND ".join(query_parts)
        else:
            final_query = base_query
        
        return self.execute_sql(final_query, params)
    
    # ===== Data Import/Export Methods =====
    
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


# ===== Helper Functions and CLI Interface =====

def init_db():
    """Initialize the database connection and schema."""
    db = TaxonomicDatabase()
    db.connect()
    db.create_schema()
    db.disconnect()
    return db

def populate_sample_data(db):
    """Populate database with sample taxonomic data."""
    # Example: Add bacteria taxonomy
    bacteria_taxonomy = {
        'domain': 'Bacteria',
        'domain_description': 'Single-celled prokaryotic microorganisms',
        'kingdom': 'Eubacteria',
        'kingdom_description': 'True bacteria',
        'phylum': 'Proteobacteria',
        'phylum_description': 'Gram-negative bacteria',
        'class': 'Gammaproteobacteria',
        'class_description': 'Class of proteobacteria',
        'order': 'Enterobacterales',
        'order_description': 'Order of gram-negative bacteria',
        'family': 'Enterobacteriaceae',
        'family_description': 'Family of gram-negative bacteria',
        'genus': 'Escherichia',
        'genus_description': 'Genus of gram-negative bacteria'
    }
    
    # E. coli species data
    ecoli_data = {
        'name': 'coli',
        'common_name': 'E. coli',
        'description': 'Common gut bacteria, some strains can cause illness',
        'discovery_year': 1885,
        'conservation_status': 'Not Applicable',
        'habitat': 'Intestinal tract of warm-blooded organisms',
        'geographic_distribution': 'Worldwide'
    }
    
    # Tags for E. coli
    ecoli_tags = ['gram-negative', 'facultative anaerobe', 'pathogenic', 'rod-shaped']
    
    db.connect()
    result = db.add_full_taxonomy(bacteria_taxonomy, ecoli_data, ecoli_tags)
    db.disconnect()
    
    print(f"Sample data added with species ID: {result['species_id']}")
    return result

def export_schema_to_sql_file(db, filename='taxonomy_schema.sql'):
    """Export the database schema to an SQL file."""
    schema_sql = db.generate_sql_script()
    with open(filename, 'w') as f:
        f.write(schema_sql)
    print(f"Schema exported to {filename}")

def main():
    """Main CLI interface."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Taxonomic Database Manager')
    parser.add_argument('--init', action='store_true', help='Initialize database schema')
    parser.add_argument('--sample', action='store_true', help='Add sample data')
    parser.add_argument('--export', action='store_true', help='Export database to JSON')
    parser.add_argument('--import', dest='import_file', help='Import database from JSON file')
    parser.add_argument('--schema', action='store_true', help='Export schema to SQL file')
    parser.add_argument('--connection', help='Database connection string')
    
    args = parser.parse_args()
    
    # Initialize database
    db = TaxonomicDatabase(connection_string=args.connection if args.connection else None)
    
    if args.init:
        db.connect()
        db.create_schema()
        db.disconnect()
        print("Database initialized.")
    
    if args.sample:
        populate_sample_data(db)
    
    if args.export:
        db.connect()
        db.export_database()
        db.disconnect()
    
    if args.import_file:
        db.connect()
        db.import_database(args.import_file)
        db.disconnect()
    
    if args.schema:
        export_schema_to_sql_file(db)

if __name__ == '__main__':
    main()