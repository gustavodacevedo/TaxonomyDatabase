#!/usr/bin/env python3
import argparse
import csv
import json
import os
import sys
from core.taxonomy_db import TaxonomicDatabase

def parse_args():
    parser = argparse.ArgumentParser(description='Taxonomic Database CLI Tool')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Init command
    init_parser = subparsers.add_parser('init', help='Initialize database schema')
    init_parser.add_argument('--connection', help='Database connection string')
    
    # Import CSV command
    import_csv_parser = subparsers.add_parser('import-csv', help='Import taxonomic data from CSV')
    import_csv_parser.add_argument('file', help='CSV file to import')
    import_csv_parser.add_argument('--connection', help='Database connection string')
    import_csv_parser.add_argument('--delimiter', default=',', help='CSV delimiter')
    
    # Export CSV command
    export_csv_parser = subparsers.add_parser('export-csv', help='Export taxonomic data to CSV')
    export_csv_parser.add_argument('file', help='CSV file to export to')
    export_csv_parser.add_argument('--connection', help='Database connection string')
    
    # Import JSON command
    import_json_parser = subparsers.add_parser('import-json', help='Import taxonomic data from JSON')
    import_json_parser.add_argument('file', help='JSON file to import')
    import_json_parser.add_argument('--connection', help='Database connection string')
    
    # Export JSON command
    export_json_parser = subparsers.add_parser('export-json', help='Export taxonomic data to JSON')
    export_json_parser.add_argument('file', help='JSON file to export to')
    export_json_parser.add_argument('--connection', help='Database connection string')
    
    # Add species command
    add_species_parser = subparsers.add_parser('add-species', help='Add a single species')
    add_species_parser.add_argument('--connection', help='Database connection string')
    add_species_parser.add_argument('--domain', required=True, help='Domain name')
    add_species_parser.add_argument('--kingdom', required=True, help='Kingdom name')
    add_species_parser.add_argument('--phylum', required=True, help='Phylum name')
    add_species_parser.add_argument('--class', dest='class_name', required=True, help='Class name')
    add_species_parser.add_argument('--order', required=True, help='Order name')
    add_species_parser.add_argument('--family', required=True, help='Family name')
    add_species_parser.add_argument('--genus', required=True, help='Genus name')
    add_species_parser.add_argument('--species', required=True, help='Species name')
    add_species_parser.add_argument('--common-name', help='Common name')
    add_species_parser.add_argument('--description', help='Description')
    add_species_parser.add_argument('--tags', help='Comma-separated list of tags')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Search for species')
    search_parser.add_argument('--connection', help='Database connection string')
    search_parser.add_argument('--term', help='Search term')
    search_parser.add_argument('--tag', help='Tag to filter by')
    
    # Schema command
    schema_parser = subparsers.add_parser('schema', help='Generate SQL schema')
    schema_parser.add_argument('--file', help='File to write schema to')
    
    return parser.parse_args()

def init_database(args):
    db = TaxonomicDatabase(args.connection)
    db.connect()
    db.create_schema()
    db.disconnect()
    print("Database schema initialized successfully.")

def import_csv(args):
    db = TaxonomicDatabase(args.connection)
    db.connect()
    
    # Count successful imports
    success_count = 0
    error_count = 0
    
    with open(args.file, 'r', newline='') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=args.delimiter)
        
        for row in reader:
            try:
                # Create taxonomy data
                taxonomy_data = {
                    'domain': row.get('domain', '').strip(),
                    'kingdom': row.get('kingdom', '').strip(),
                    'phylum': row.get('phylum', '').strip(),
                    'class': row.get('class', '').strip(),
                    'order': row.get('order', '').strip(),
                    'family': row.get('family', '').strip(),
                    'genus': row.get('genus', '').strip()
                }
                
                # Create species data
                species_data = {
                    'name': row.get('species', '').strip(),
                    'common_name': row.get('common_name', '').strip(),
                    'description': row.get('description', '').strip(),
                    'image_url': row.get('image_url', '').strip(),
                    'distribution_map_url': row.get('distribution_map_url', '').strip(),
                    'discovery_year': row.get('discovery_year', '').strip(),
                    'conservation_status': row.get('conservation_status', '').strip(),
                    'habitat': row.get('habitat', '').strip(),
                    'geographic_distribution': row.get('geographic_distribution', '').strip()
                }
                
                # Parse tags
                tags = []
                if 'tags' in row and row['tags']:
                    tags = [tag.strip() for tag in row['tags'].split(',') if tag.strip()]
                
                # Add to database
                db.add_full_taxonomy(taxonomy_data, species_data, tags)
                success_count += 1
                
                print(f"Imported: {taxonomy_data['genus']} {species_data['name']}")
            except Exception as e:
                print(f"Error importing row {reader.line_num}: {e}")
                error_count += 1
    
    db.disconnect()
    print(f"Import completed. {success_count} species imported successfully, {error_count} errors.")

def export_csv(args):
    db = TaxonomicDatabase(args.connection)
    db.connect()
    
    # Query all species with full taxonomy
    query = """
    SELECT 
        s.id as species_id, s.name as species_name, s.common_name,
        s.description, s.image_url, s.distribution_map_url, s.discovery_year, 
        s.conservation_status, s.habitat, s.geographic_distribution,
        g.name as genus, f.name as family, o.name as "order",
        c.name as class, p.name as phylum, k.name as kingdom,
        d.name as domain,
        string_agg(t.name, ',') as tags
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
    GROUP BY s.id, g.name, f.name, o.name, c.name, p.name, k.name, d.name
    """
    
    results = db.execute_sql(query)
    
    # Write to CSV
    with open(args.file, 'w', newline='') as csvfile:
        fieldnames = [
            'domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus',
            'species', 'common_name', 'description', 'image_url', 'distribution_map_url',
            'discovery_year', 'conservation_status', 'habitat', 
            'geographic_distribution', 'tags'
        ]
        
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in results:
            writer.writerow({
                'domain': row['domain'],
                'kingdom': row['kingdom'],
                'phylum': row['phylum'],
                'class': row['class'],
                'order': row['order'],
                'family': row['family'],
                'genus': row['genus'],
                'species': row['species_name'],
                'common_name': row['common_name'],
                'description': row['description'],
                'image_url': row['image_url'],
                'distribution_map_url': row['distribution_map_url'],
                'discovery_year': row['discovery_year'],
                'conservation_status': row['conservation_status'],
                'habitat': row['habitat'],
                'geographic_distribution': row['geographic_distribution'],
                'tags': row['tags']
            })
    
    db.disconnect()
    print(f"Exported {len(results)} species to {args.file}")

def import_json(args):
    with open(args.file, 'r') as f:
        data = json.load(f)
    
    db = TaxonomicDatabase(args.connection)
    result = db.import_database(args.file)
    
    if result:
        print("Database imported successfully.")
    else:
        print("Error importing database.")

def export_json(args):
    db = TaxonomicDatabase(args.connection)
    db.connect()
    db.export_database(args.file)
    db.disconnect()
    print(f"Database exported to {args.file}")

def add_species(args):
    db = TaxonomicDatabase(args.connection)
    db.connect()
    
    # Create taxonomy data
    taxonomy_data = {
        'domain': args.domain,
        'kingdom': args.kingdom,
        'phylum': args.phylum,
        'class': args.class_name,
        'order': args.order,
        'family': args.family,
        'genus': args.genus
    }
    
    # Create species data
    species_data = {
        'name': args.species,
        'common_name': args.common_name,
        'description': args.description
    }
    
    # Parse tags
    tags = []
    if args.tags:
        tags = [tag.strip() for tag in args.tags.split(',') if tag.strip()]
    
    # Add to database
    result = db.add_full_taxonomy(taxonomy_data, species_data, tags)
    db.disconnect()
    
    print(f"Species added successfully with ID: {result['species_id']}")

def search_species(args):
    db = TaxonomicDatabase(args.connection)
    db.connect()
    
    if args.tag:
        results = db.get_species_by_tag(args.tag)
        print(f"Species with tag '{args.tag}':")
    elif args.term:
        results = db.search_species(search_term=args.term)
        print(f"Species matching '{args.term}':")
    else:
        results = db.execute_sql("SELECT * FROM species")
        print("All species:")
    
    for species in results:
        scientific_name = f"{species.get('genus_name', '')} {species.get('name', '')}"
        common_name = species.get('common_name', 'Unknown')
        print(f"- {scientific_name} ({common_name})")
    
    print(f"Total: {len(results)} species")
    db.disconnect()

def generate_schema(args):
    db = TaxonomicDatabase()
    schema_sql = db.generate_sql_script()
    
    if args.file:
        with open(args.file, 'w') as f:
            f.write(schema_sql)
        print(f"Schema written to {args.file}")
    else:
        print(schema_sql)

def main():
    args = parse_args()
    
    if args.command == 'init':
        init_database(args)
def backup_database(args):
    """Create a backup of the database."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = args.file or f"taxonomy_backup_{timestamp}.json"
    
    db = TaxonomicDatabase(args.connection)
    db.connect()
    db.export_database(backup_file)
    db.disconnect()
    
    print(f"Database backup created: {backup_file}")

def restore_database(args):
    """Restore database from a backup."""
    if not os.path.exists(args.file):
        print(f"Error: Backup file {args.file} not found")
        return
    
    db = TaxonomicDatabase(args.connection)
    db.connect()
    
    # Confirm with user before proceeding
    if not args.force:
        confirm = input("This will overwrite existing data. Continue? (y/n): ")
        if confirm.lower() != 'y':
            print("Operation cancelled.")
            db.disconnect()
            return
    
    result = db.import_database(args.file)
    db.disconnect()
    
    if result:
        print(f"Database restored from {args.file}")
    else:
        print(f"Error restoring database from {args.file}")

def run_cli():
    """Main CLI function with updated argument parser"""
    parser = argparse.ArgumentParser(description='Taxonomic Database CLI Tool')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Init command
    init_parser = subparsers.add_parser('init', help='Initialize database schema')
    init_parser.add_argument('--connection', help='Database connection string')
    
    # Import CSV command
    import_csv_parser = subparsers.add_parser('import-csv', help='Import taxonomic data from CSV')
    import_csv_parser.add_argument('file', help='CSV file to import')
    import_csv_parser.add_argument('--connection', help='Database connection string')
    import_csv_parser.add_argument('--delimiter', default=',', help='CSV delimiter')
    
    # Export CSV command
    export_csv_parser = subparsers.add_parser('export-csv', help='Export taxonomic data to CSV')
    export_csv_parser.add_argument('file', help='CSV file to export to')
    export_csv_parser.add_argument('--connection', help='Database connection string')
    
    # Import JSON command
    import_json_parser = subparsers.add_parser('import-json', help='Import taxonomic data from JSON')
    import_json_parser.add_argument('file', help='JSON file to import')
    import_json_parser.add_argument('--connection', help='Database connection string')
    
    # Export JSON command
    export_json_parser = subparsers.add_parser('export-json', help='Export taxonomic data to JSON')
    export_json_parser.add_argument('file', help='JSON file to export to')
    export_json_parser.add_argument('--connection', help='Database connection string')
    
    # Add species command
    add_species_parser = subparsers.add_parser('add-species', help='Add a single species')
    add_species_parser.add_argument('--connection', help='Database connection string')
    add_species_parser.add_argument('--domain', required=True, help='Domain name')
    add_species_parser.add_argument('--kingdom', required=True, help='Kingdom name')
    add_species_parser.add_argument('--phylum', required=True, help='Phylum name')
    add_species_parser.add_argument('--class', dest='class_name', required=True, help='Class name')
    add_species_parser.add_argument('--order', required=True, help='Order name')
    add_species_parser.add_argument('--family', required=True, help='Family name')
    add_species_parser.add_argument('--genus', required=True, help='Genus name')
    add_species_parser.add_argument('--species', required=True, help='Species name')
    add_species_parser.add_argument('--common-name', help='Common name')
    add_species_parser.add_argument('--description', help='Description')
    add_species_parser.add_argument('--tags', help='Comma-separated list of tags')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Search for species')
    search_parser.add_argument('--connection', help='Database connection string')
    search_parser.add_argument('--term', help='Search term')
    search_parser.add_argument('--tag', help='Tag to filter by')
    
    # Schema command
    schema_parser = subparsers.add_parser('schema', help='Generate SQL schema')
    schema_parser.add_argument('--file', help='File to write schema to')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Create database backup')
    backup_parser.add_argument('--file', help='Backup file name')
    backup_parser.add_argument('--connection', help='Database connection string')
    
    # Restore command
    restore_parser = subparsers.add_parser('restore', help='Restore database from backup')
    restore_parser.add_argument('file', help='Backup file to restore from')
    restore_parser.add_argument('--connection', help='Database connection string')
    restore_parser.add_argument('--force', action='store_true', help='Skip confirmation prompt')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Execute the appropriate command
    if args.command == 'init':
        init_database(args)
    elif args.command == 'import-csv':
        import_csv(args)
    elif args.command == 'export-csv':
        export_csv(args)
    elif args.command == 'import-json':
        import_json(args)
    elif args.command == 'export-json':
        export_json(args)
    elif args.command == 'add-species':
        add_species(args)
    elif args.command == 'search':
        search_species(args)
    elif args.command == 'schema':
        generate_schema(args)
    elif args.command == 'backup':
        backup_database(args)
    elif args.command == 'restore':
        restore_database(args)

if __name__ == '__main__':
    run_cli()