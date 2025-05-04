#!/usr/bin/env python3
"""
Schema Manager for Taxonomic Database
"""

class SchemaManager:
    def __init__(self, db_connection):
        """Initialize the schema manager with database connection."""
        self.db = db_connection
    
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
            distribution_map_url TEXT,
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
        self.db.execute_sql(schema_sql)
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
            distribution_map_url TEXT,
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
        
        return schema_sql