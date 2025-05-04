#!/usr/bin/env python3
"""
Taxonomy management functionality for the Taxonomic Database
"""
from psycopg2 import sql

class TaxonomyManager:
    def __init__(self, db):
        """Initialize with a database connection."""
        self.db = db
    
    def get_taxonomic_rank_items(self, rank, parent_rank=None, parent_id=None):
        """Get items for a specific taxonomic rank, optionally filtered by parent."""
        # Dictionary mapping ranks to their table names
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
            return self.db.execute_sql(query, [parent_id])
        else:
            query = f"SELECT * FROM {table_name}"
            return self.db.execute_sql(query)
    
    def get_or_create_taxonomic_rank(self, table, name, parent_id=None, parent_column=None, description=None):
        """Get or create a taxonomic rank entry."""
        # Check if entry exists
        query = f"SELECT id FROM {table} WHERE name = %s"
        params = [name]
        
        if parent_id and parent_column:
            query += f" AND {parent_column} = %s"
            params.append(parent_id)
        
        result = self.db.execute_sql(query, params, commit=False)
        
        if result and result[0]['id']:
            return result[0]['id']
        
        # Create new entry
        if parent_id and parent_column:
            query = f"INSERT INTO {table} (name, {parent_column}, description) VALUES (%s, %s, %s) RETURNING id"
            params = [name, parent_id, description]
        else:
            query = f"INSERT INTO {table} (name, description) VALUES (%s, %s) RETURNING id"
            params = [name, description]
        
        result = self.db.execute_sql(query, params)
        return result[0]['id']
    
    def add_full_taxonomy(self, taxonomy_data):
        """Add a complete taxonomic classification (without species data)."""
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
        
        return {
            'domain_id': domain_id,
            'kingdom_id': kingdom_id,
            'phylum_id': phylum_id,
            'class_id': class_id,
            'order_id': order_id,
            'family_id': family_id,
            'genus_id': genus_id
        }
    
    def get_taxonomy_by_species(self, species_id):
        """Get the complete taxonomic hierarchy for a species."""
        query = """
        SELECT 
            d.id as domain_id, d.name as domain_name, d.description as domain_description,
            k.id as kingdom_id, k.name as kingdom_name, k.description as kingdom_description,
            p.id as phylum_id, p.name as phylum_name, p.description as phylum_description,
            c.id as class_id, c.name as class_name, c.description as class_description,
            o.id as order_id, o.name as order_name, o.description as order_description,
            f.id as family_id, f.name as family_name, f.description as family_description,
            g.id as genus_id, g.name as genus_name, g.description as genus_description
        FROM species s
        JOIN genera g ON s.genus_id = g.id
        JOIN families f ON g.family_id = f.id
        JOIN orders o ON f.order_id = o.id
        JOIN classes c ON o.class_id = c.id
        JOIN phyla p ON c.phylum_id = p.id
        JOIN kingdoms k ON p.kingdom_id = k.id
        JOIN domains d ON k.domain_id = d.id
        WHERE s.id = %s
        """
        
        result = self.db.execute_sql(query, [species_id])
        return result[0] if result else None
    
    def get_species_by_rank(self, rank, rank_id):
        """Get all species that belong to a specific taxonomic rank."""
        # Create a dictionary mapping rank names to their table and relation to species
        rank_map = {
            'domain': ('domains', 'k.domain_id'),
            'kingdom': ('kingdoms', 'k.id'),
            'phylum': ('phyla', 'p.id'),
            'class': ('classes', 'c.id'),
            'order': ('orders', 'o.id'),
            'family': ('families', 'f.id'),
            'genus': ('genera', 'g.id')
        }
        
        if rank not in rank_map:
            return []
        
        table, relation = rank_map[rank]
        
        query = f"""
        SELECT 
            s.*, g.name as genus_name
        FROM species s
        JOIN genera g ON s.genus_id = g.id
        JOIN families f ON g.family_id = f.id
        JOIN orders o ON f.order_id = o.id
        JOIN classes c ON o.class_id = c.id
        JOIN phyla p ON c.phylum_id = p.id
        JOIN kingdoms k ON p.kingdom_id = k.id
        WHERE {relation} = %s
        """
        
        return self.db.execute_sql(query, [rank_id])
    
    def update_taxonomic_rank(self, table, rank_id, data):
        """Update a taxonomic rank entry."""
        # Build the SET clause for the query
        set_parts = []
        params = []
        
        for field, value in data.items():
            if field not in ['id', 'created_at']:
                set_parts.append(f"{field} = %s")
                params.append(value)
        
        if not set_parts:
            return False
        
        # Add updated_at timestamp
        set_parts.append("updated_at = NOW()")
        
        # Add the ID to the parameters
        params.append(rank_id)
        
        # Build and execute the query
        query = f"""
        UPDATE {table}
        SET {', '.join(set_parts)}
        WHERE id = %s
        RETURNING id
        """
        
        result = self.db.execute_sql(query, params)
        return bool(result)
    
    def delete_taxonomic_rank(self, table, rank_id):
        """Delete a taxonomic rank entry."""
        query = f"DELETE FROM {table} WHERE id = %s RETURNING id"
        result = self.db.execute_sql(query, [rank_id])
        return bool(result)