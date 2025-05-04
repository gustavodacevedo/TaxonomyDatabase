#!/usr/bin/env python3
"""
Tag management functionality for the Taxonomic Database
"""
from psycopg2 import sql

class TagManager:
    def __init__(self, db):
        """Initialize with a database connection."""
        self.db = db
    
    def get_or_create_tag(self, tag_name, description=None):
        """Get an existing tag or create a new one."""
        # Check if tag exists
        query = "SELECT id FROM tags WHERE name = %s"
        result = self.db.execute_sql(query, [tag_name], commit=False)
        
        if result and result[0]['id']:
            return result[0]['id']
        
        # Create new tag
        query = "INSERT INTO tags (name, description) VALUES (%s, %s) RETURNING id"
        result = self.db.execute_sql(query, [tag_name, description])
        return result[0]['id'] if result else None
    
    def get_all_tags(self):
        """Get all tags in the database."""
        query = "SELECT * FROM tags ORDER BY name"
        return self.db.execute_sql(query)
    
    def associate_tag_with_species(self, species_id, tag_id):
        """Associate a tag with a species."""
        query = """
        INSERT INTO species_tags (species_id, tag_id) 
        VALUES (%s, %s) 
        ON CONFLICT DO NOTHING
        RETURNING species_id
        """
        result = self.db.execute_sql(query, [species_id, tag_id])
        return bool(result)
    
    def add_tags_to_species(self, species_id, tag_names):
        """Add multiple tags to a species."""
        if not tag_names:
            return []
        
        tag_ids = []
        for tag_name in tag_names:
            tag_id = self.get_or_create_tag(tag_name)
            if tag_id:
                self.associate_tag_with_species(species_id, tag_id)
                tag_ids.append(tag_id)
        
        return tag_ids
    
    def get_tags_for_species(self, species_id):
        """Get all tags for a species."""
        query = """
        SELECT t.* 
        FROM tags t
        JOIN species_tags st ON t.id = st.tag_id
        WHERE st.species_id = %s
        ORDER BY t.name
        """
        return self.db.execute_sql(query, [species_id])
    
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
        
        return self.db.execute_sql(query, [tag_name])
    
    def remove_tag_from_species(self, species_id, tag_id):
        """Remove a tag from a species."""
        query = "DELETE FROM species_tags WHERE species_id = %s AND tag_id = %s RETURNING species_id"
        result = self.db.execute_sql(query, [species_id, tag_id])
        return bool(result)
    
    def remove_all_tags_from_species(self, species_id):
        """Remove all tags from a species."""
        query = "DELETE FROM species_tags WHERE species_id = %s RETURNING species_id"
        result = self.db.execute_sql(query, [species_id])
        return bool(result)
    
    def update_tags_for_species(self, species_id, tag_names):
        """Replace all tags for a species with a new set of tags."""
        # Remove existing tags
        self.remove_all_tags_from_species(species_id)
        
        # Add new tags
        return self.add_tags_to_species(species_id, tag_names)
    
    def delete_tag(self, tag_id):
        """Delete a tag from the database."""
        query = "DELETE FROM tags WHERE id = %s RETURNING id"
        result = self.db.execute_sql(query, [tag_id])
        return bool(result)
    
    def merge_tags(self, source_tag_id, target_tag_id):
        """Merge one tag into another, reassigning all associations."""
        # Begin transaction
        self.db.execute_sql("BEGIN", commit=False)
        
        try:
            # Update species_tags to use the target tag
            query = """
            INSERT INTO species_tags (species_id, tag_id)
            SELECT species_id, %s
            FROM species_tags
            WHERE tag_id = %s
            ON CONFLICT DO NOTHING
            """
            self.db.execute_sql(query, [target_tag_id, source_tag_id], commit=False)
            
            # Delete the original tag
            self.delete_tag(source_tag_id)
            
            # Commit transaction
            self.db.execute_sql("COMMIT")
            return True
        except Exception as e:
            # Rollback in case of error
            self.db.execute_sql("ROLLBACK")
            print(f"Error merging tags: {e}")
            return False