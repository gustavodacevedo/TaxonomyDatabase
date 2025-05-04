#!/usr/bin/env python3
"""
Species management functionality for the Taxonomic Database
"""
from psycopg2 import sql

class SpeciesManager:
    def __init__(self, db):
        """Initialize with a database connection."""
        self.db = db
    
    def add_species(self, genus_id, species_data):
        """Add a species to the database."""
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
        
        result = self.db.execute_sql(query, params)
        return result[0]['id'] if result else None
    
    def get_species(self, species_id):
        """Get a single species by ID."""
        query = "SELECT * FROM species WHERE id = %s"
        result = self.db.execute_sql(query, [species_id])
        return result[0] if result else None
    
    def get_all_species(self):
        """Get all species."""
        query = "SELECT * FROM species"
        return self.db.execute_sql(query)
    
    def get_species_by_genus(self, genus_id):
        """Get all species in a genus."""
        query = "SELECT * FROM species WHERE genus_id = %s"
        return self.db.execute_sql(query, [genus_id])
    
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
        
        return self.db.execute_sql(final_query, params)
    
    def get_full_taxonomy(self, species_id):
        """Get complete taxonomic classification for a species."""
        query = """
        SELECT 
            s.id as species_id, s.name as species_name, s.common_name,
            s.description, s.image_url, s.distribution_map_url, s.discovery_year, s.conservation_status,
            s.habitat, s.geographic_distribution,
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
        
        result = self.db.execute_sql(query, [species_id])
        return result[0] if result else None
    
    def get_species_by_rank(self, rank, rank_id):
        """Get all species under a specific taxonomic rank."""
        # Map of rank names to their table and relation to species
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
            s.*, g.name as genus_name,
            array_agg(DISTINCT t.name) as tags
        FROM species s
        JOIN genera g ON s.genus_id = g.id
        JOIN families f ON g.family_id = f.id
        JOIN orders o ON f.order_id = o.id
        JOIN classes c ON o.class_id = c.id
        JOIN phyla p ON c.phylum_id = p.id
        JOIN kingdoms k ON p.kingdom_id = k.id
        LEFT JOIN species_tags st ON s.id = st.species_id
        LEFT JOIN tags t ON st.tag_id = t.id
        WHERE {relation} = %s
        GROUP BY s.id, g.name
        """
        
        return self.db.execute_sql(query, [rank_id])
    
    def update_species(self, species_id, species_data):
        """Update species information."""
        # Build dynamic update query
        update_fields = []
        params = []
        
        for field in ['name', 'common_name', 'description', 'image_url', 
                      'distribution_map_url', 'discovery_year', 'conservation_status', 
                      'habitat', 'geographic_distribution']:
            if field in species_data:
                update_fields.append(f"{field} = %s")
                params.append(species_data[field])
        
        if not update_fields:
            return False
        
        # Always update the updated_at timestamp
        update_fields.append("updated_at = NOW()")
        
        query = f"""
        UPDATE species 
        SET {', '.join(update_fields)}
        WHERE id = %s
        RETURNING id
        """
        params.append(species_id)
        
        result = self.db.execute_sql(query, params)
        return bool(result)
    
    def delete_species(self, species_id):
        """Delete a species from the database."""
        query = "DELETE FROM species WHERE id = %s RETURNING id"
        result = self.db.execute_sql(query, [species_id])
        return bool(result)