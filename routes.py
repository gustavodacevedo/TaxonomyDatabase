from flask import request, jsonify, render_template
from taxonomy_db import TaxonomicDatabase

def register_routes(app):
    """Register all routes with the Flask app."""
    
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/taxonomy', methods=['GET'])
    def get_taxonomy():
        """Get all taxonomic levels."""
        db = TaxonomicDatabase()  # Create new instance
        db.connect()
        
        try:
            domains = db.execute_sql("SELECT * FROM domains")
            kingdoms = db.execute_sql("SELECT * FROM kingdoms")
            phyla = db.execute_sql("SELECT * FROM phyla")
            classes = db.execute_sql("SELECT * FROM classes")
            orders = db.execute_sql("SELECT * FROM orders")
            families = db.execute_sql("SELECT * FROM families")
            genera = db.execute_sql("SELECT * FROM genera")
            
            result = {
                'domains': domains,
                'kingdoms': kingdoms,
                'phyla': phyla,
                'classes': classes,
                'orders': orders,
                'families': families,
                'genera': genera
            }
            return jsonify(result)
        finally:
            db.disconnect()  # Always disconnect

    @app.route('/api/species', methods=['GET'])
    def get_species():
        """Get species with optional filtering."""
        db = TaxonomicDatabase()  # Create new instance
        db.connect()
        
        try:
            search = request.args.get('search', '')
            tag = request.args.get('tag', '')
            
            if tag:
                species = db.get_species_by_tag(tag)
            elif search:
                species = db.search_species(search_term=search)
            else:
                species = db.execute_sql("SELECT * FROM species")
            
            return jsonify(species)
        finally:
            db.disconnect()

    @app.route('/api/species/<species_id>', methods=['GET'])
    def get_species_details(species_id):
        """Get detailed information about a species."""
        db = TaxonomicDatabase()
        db.connect()
        
        try:
            taxonomy = db.get_full_taxonomy(species_id)
            
            if taxonomy:
                return jsonify(taxonomy)
            return jsonify({'error': 'Species not found'}), 404
        finally:
            db.disconnect()
            
    @app.route('/api/tags', methods=['GET'])
    def get_tags():
        """Get all tags."""
        db = TaxonomicDatabase()  # Create new instance
        db.connect()
        
        try:
            tags = db.execute_sql("SELECT * FROM tags")
            return jsonify(tags)
        finally:
            db.disconnect()

    @app.route('/api/species', methods=['POST'])
    def add_species():
        """Add a new species with full taxonomy."""
        db = TaxonomicDatabase()  # Create new instance
        db.connect()
        
        try:
            data = request.json
            
            taxonomy_data = {
                'domain': data.get('domain'),
                'kingdom': data.get('kingdom'),
                'phylum': data.get('phylum'),
                'class': data.get('class'),
                'order': data.get('order'),
                'family': data.get('family'),
                'genus': data.get('genus')
            }
            
            species_data = {
                'name': data.get('species_name'),
                'common_name': data.get('common_name'),
                'description': data.get('description'),
                'image_url': data.get('image_url'),
                'discovery_year': data.get('discovery_year'),
                'conservation_status': data.get('conservation_status'),
                'habitat': data.get('habitat'),
                'geographic_distribution': data.get('geographic_distribution')
            }
            
            tags = data.get('tags', [])
            
            result = db.add_full_taxonomy(taxonomy_data, species_data, tags)
            return jsonify(result)
        finally:
            db.disconnect()

    @app.route('/api/export', methods=['GET'])
    def export_data():
        """Export the database to a JSON file."""
        db = TaxonomicDatabase()  # Create new instance
        db.connect()
        
        try:
            result = db.export_database()
            return jsonify({'message': 'Database exported successfully'})
        finally:
            db.disconnect()

    @app.route('/api/import', methods=['POST'])
    def import_data():
        """Import the database from a JSON file."""
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if file:
            file_path = f"temp_{file.filename}"
            file.save(file_path)
            
            db = TaxonomicDatabase()  # Create new instance
            db.connect()
            
            try:
                result = db.import_database(file_path)
                
                if result:
                    return jsonify({'message': 'Database imported successfully'})
                return jsonify({'error': 'Error importing database'}), 500
            finally:
                db.disconnect()

    @app.route('/api/schema', methods=['GET'])
    def get_schema():
        """Get SQL schema."""
        db_instance = TaxonomicDatabase()
        schema = db_instance.generate_sql_script()
        
        return jsonify({'schema': schema})
    
    @app.route('/api/taxonomic-rank/<rank>', methods=['GET'])
    def get_taxonomic_rank(rank):
        """Get items for a specific taxonomic rank."""
        db = TaxonomicDatabase()  # Create new instance
        db.connect()
        
        try:
            parent_rank = request.args.get('parent_rank')
            parent_id = request.args.get('parent_id')
            
            items = db.get_taxonomic_rank_items(rank, parent_rank, parent_id)
            return jsonify(items)
        finally:
            db.disconnect()

    @app.route('/api/species-by-rank/<rank>/<rank_id>', methods=['GET'])
    def get_species_by_rank(rank, rank_id):
        """Get species that belong to a specific taxonomic rank item."""
        db = TaxonomicDatabase()  # Create new instance
        db.connect()
        
        try:
            # Build query based on the rank
            if rank == 'domain':
                query = """
                SELECT s.*, g.name as genus_name
                FROM species s
                JOIN genera g ON s.genus_id = g.id
                JOIN families f ON g.family_id = f.id
                JOIN orders o ON f.order_id = o.id
                JOIN classes c ON o.class_id = c.id
                JOIN phyla p ON c.phylum_id = p.id
                JOIN kingdoms k ON p.kingdom_id = k.id
                JOIN domains d ON k.domain_id = d.id
                WHERE d.id = %s
                """
            elif rank == 'kingdom':
                query = """
                SELECT s.*, g.name as genus_name
                FROM species s
                JOIN genera g ON s.genus_id = g.id
                JOIN families f ON g.family_id = f.id
                JOIN orders o ON f.order_id = o.id
                JOIN classes c ON o.class_id = c.id
                JOIN phyla p ON c.phylum_id = p.id
                JOIN kingdoms k ON p.kingdom_id = k.id
                WHERE k.id = %s
                """
            elif rank == 'phylum':
                query = """
                SELECT s.*, g.name as genus_name
                FROM species s
                JOIN genera g ON s.genus_id = g.id
                JOIN families f ON g.family_id = f.id
                JOIN orders o ON f.order_id = o.id
                JOIN classes c ON o.class_id = c.id
                JOIN phyla p ON c.phylum_id = p.id
                WHERE p.id = %s
                """
            elif rank == 'class':
                query = """
                SELECT s.*, g.name as genus_name
                FROM species s
                JOIN genera g ON s.genus_id = g.id
                JOIN families f ON g.family_id = f.id
                JOIN orders o ON f.order_id = o.id
                JOIN classes c ON o.class_id = c.id
                WHERE c.id = %s
                """
            elif rank == 'order':
                query = """
                SELECT s.*, g.name as genus_name
                FROM species s
                JOIN genera g ON s.genus_id = g.id
                JOIN families f ON g.family_id = f.id
                JOIN orders o ON f.order_id = o.id
                WHERE o.id = %s
                """
            elif rank == 'family':
                query = """
                SELECT s.*, g.name as genus_name
                FROM species s
                JOIN genera g ON s.genus_id = g.id
                JOIN families f ON g.family_id = f.id
                WHERE f.id = %s
                """
            elif rank == 'genus':
                query = """
                SELECT s.*, g.name as genus_name
                FROM species s
                JOIN genera g ON s.genus_id = g.id
                WHERE g.id = %s
                """
            elif rank == 'species':
                query = """
                SELECT s.*, g.name as genus_name
                FROM species s
                JOIN genera g ON s.genus_id = g.id
                WHERE s.id = %s
                """
            else:
                return jsonify([])
            
            species = db.execute_sql(query, [rank_id])
            return jsonify(species)
        finally:
            db.disconnect()

    return app