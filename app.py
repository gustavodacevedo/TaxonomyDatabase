from flask import Flask, request, jsonify, render_template
from taxonomy_db import TaxonomicDatabase

app = Flask(__name__, template_folder='templates')
db = TaxonomicDatabase()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/taxonomy', methods=['GET'])
def get_taxonomy():
    """Get all taxonomic levels."""
    db.connect()
    
    domains = db.execute_sql("SELECT * FROM domains")
    kingdoms = db.execute_sql("SELECT * FROM kingdoms")
    phyla = db.execute_sql("SELECT * FROM phyla")
    classes = db.execute_sql("SELECT * FROM classes")
    orders = db.execute_sql("SELECT * FROM orders")
    families = db.execute_sql("SELECT * FROM families")
    genera = db.execute_sql("SELECT * FROM genera")
    
    db.disconnect()
    
    return jsonify({
        'domains': domains,
        'kingdoms': kingdoms,
        'phyla': phyla,
        'classes': classes,
        'orders': orders,
        'families': families,
        'genera': genera
    })

@app.route('/api/species', methods=['GET'])
def get_species():
    """Get species with optional filtering."""
    search = request.args.get('search', '')
    tag = request.args.get('tag', '')
    
    db.connect()
    
    if tag:
        species = db.get_species_by_tag(tag)
    elif search:
        species = db.search_species(search_term=search)
    else:
        species = db.execute_sql("SELECT * FROM species")
    
    db.disconnect()
    
    return jsonify(species)

@app.route('/api/species/<species_id>', methods=['GET'])
def get_species_details(species_id):
    """Get detailed information about a species."""
    db.connect()
    taxonomy = db.get_full_taxonomy(species_id)
    db.disconnect()
    
    if taxonomy:
        return jsonify(taxonomy)
    return jsonify({'error': 'Species not found'}), 404

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Get all tags."""
    db.connect()
    tags = db.execute_sql("SELECT * FROM tags")
    db.disconnect()
    
    return jsonify(tags)

@app.route('/api/species', methods=['POST'])
def add_species():
    """Add a new species with full taxonomy."""
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
    
    db.connect()
    result = db.add_full_taxonomy(taxonomy_data, species_data, tags)
    db.disconnect()
    
    return jsonify(result)

@app.route('/api/export', methods=['GET'])
def export_data():
    """Export the database to a JSON file."""
    db.connect()
    result = db.export_database()
    db.disconnect()
    
    return jsonify({'message': 'Database exported successfully'})

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
        
        db.connect()
        result = db.import_database(file_path)
        db.disconnect()
        
        if result:
            return jsonify({'message': 'Database imported successfully'})
        return jsonify({'error': 'Error importing database'}), 500

@app.route('/api/schema', methods=['GET'])
def get_schema():
    """Get SQL schema."""
    db_instance = TaxonomicDatabase()
    schema = db_instance.generate_sql_script()
    
    return jsonify({'schema': schema})

if __name__ == '__main__':
    app.run(debug=True)