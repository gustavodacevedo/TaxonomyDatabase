#!/usr/bin/env python3
"""
Route definitions for the Taxonomic Database web application
"""
from flask import render_template, request, jsonify, send_file
import os
import json
from db_controller import DatabaseController

# Initialize database controller
db_controller = DatabaseController()

def register_routes(app):
    """Register all routes with the Flask app."""
    
    @app.route('/')
    def index():
        """Render the main application page."""
        return render_template('index.html')
    
    @app.route('/api/taxonomy')
    def get_taxonomy():
        """Get all taxonomic hierarchy data."""
        try:
            # Get all taxonomic data
            domains = db_controller.taxonomy.get_taxonomic_rank_items('domain')
            
            return jsonify({
                'domains': domains
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/taxonomic-rank/<rank>')
    def get_taxonomic_rank(rank):
        """Get items for a specific taxonomic rank, optionally filtered by parent."""
        try:
            parent_rank = request.args.get('parent_rank')
            parent_id = request.args.get('parent_id')
            
            rank_items = db_controller.taxonomy.get_taxonomic_rank_items(rank, parent_rank, parent_id)
            
            return jsonify(rank_items)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/species', methods=['GET'])
    def get_species():
        """Get all species, optionally filtered by search term or tag."""
        try:
            search_term = request.args.get('search', '')
            tag = request.args.get('tag', '')
            all_species = request.args.get('all', 'false')
            
            db_controller.db.connect()
            
            if tag:
                # Search by tag
                species_list = db_controller.tags.get_species_by_tag(tag)
            elif search_term:
                # Search by term
                species_list = db_controller.species.search_species(search_term=search_term)
            elif all_species.lower() == 'true':
                # Explicitly requesting all species
                species_list = db_controller.species.get_all_species()
            else:
                # Get all species as default behavior
                species_list = db_controller.species.get_all_species()
            
            db_controller.db.disconnect()
            
            return jsonify(species_list)
        except Exception as e:
            db_controller.db.disconnect()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/species/<species_id>', methods=['GET'])
    def get_species_details(species_id):
        """Get detailed information about a specific species."""
        try:
            species_data = db_controller.species.get_full_taxonomy(species_id)
            
            if not species_data:
                return jsonify({'error': 'Species not found'}), 404
            
            return jsonify(species_data)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/species', methods=['POST'])
    def add_species():
        """Add a new species with complete taxonomy."""
        try:
            data = request.json
            
            # Create taxonomy data structure
            taxonomy_data = {
                'domain': data.get('domain', ''),
                'kingdom': data.get('kingdom', ''),
                'phylum': data.get('phylum', ''),
                'class': data.get('class', ''),
                'order': data.get('order', ''),
                'family': data.get('family', ''),
                'genus': data.get('genus', '')
            }
            
            # Create species data structure
            species_data = {
                'name': data.get('species_name', ''),
                'common_name': data.get('common_name', ''),
                'description': data.get('description', ''),
                'image_url': data.get('image_url', ''),
                'distribution_map_url': data.get('distribution_map_url', ''),
                'discovery_year': data.get('discovery_year', None),
                'conservation_status': data.get('conservation_status', ''),
                'habitat': data.get('habitat', ''),
                'geographic_distribution': data.get('geographic_distribution', '')
            }
            
            # Extract tags
            tags = data.get('tags', [])
            
            # Add to database
            result = db_controller.add_complete_species(taxonomy_data, species_data, tags)
            
            return jsonify({
                'success': True,
                'species_id': result.get('species_id')
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/species-by-rank/<rank>/<rank_id>', methods=['GET'])
    def get_species_by_rank(rank, rank_id):
        """Get all species under a specific taxonomic rank."""
        try:
            species_list = db_controller.taxonomy.get_species_by_rank(rank, rank_id)
            return jsonify(species_list)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/tags', methods=['GET'])
    def get_tags():
        """Get all tags."""
        try:
            tags = db_controller.tags.get_all_tags()
            return jsonify(tags)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/export', methods=['GET'])
    def export_database():
        """Export the database to a JSON file."""
        try:
            export_file = 'taxonomy_export.json'
            db_controller.export_database(export_file)
            
            # Serve the file for download
            return send_file(export_file, as_attachment=True)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/import', methods=['POST'])
    def import_database():
        """Import database from a JSON file."""
        try:
            # Check if file was uploaded
            if 'file' not in request.files:
                return jsonify({'error': 'No file uploaded'}), 400
            
            file = request.files['file']
            
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Save the uploaded file
            upload_path = 'taxonomy_import.json'
            file.save(upload_path)
            
            success = db_controller.import_database(upload_path)
            
            if success:
                return jsonify({'success': True})
            else:
                return jsonify({'error': 'Failed to import database'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/schema', methods=['GET'])
    def get_schema():
        """Get the database schema as SQL."""
        try:
            schema_sql = db_controller.db.generate_sql_script()
            return jsonify({'schema': schema_sql})
        except Exception as e:
            return jsonify({'error': str(e)}), 500