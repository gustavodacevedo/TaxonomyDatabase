#!/usr/bin/env python3
import argparse
import requests
import json
import csv
import os
from taxonomy_db import TaxonomicDatabase

class TaxonomicDataImporter:
    def __init__(self, db_connection=None):
        self.db = TaxonomicDatabase(db_connection)
        self.db.connect()
    
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.disconnect()
    
    def import_from_gbif(self, taxon_key):
        """Import taxonomic data from GBIF API."""
        print(f"Fetching data from GBIF for taxon key: {taxon_key}")
        
        # Fetch basic taxon data
        taxon_url = f"https://api.gbif.org/v1/species/{taxon_key}"
        response = requests.get(taxon_url)
        
        if response.status_code != 200:
            print(f"Error: Failed to fetch data from GBIF API. Status code: {response.status_code}")
            return False
        
        taxon_data = response.json()
        
        # Map GBIF taxonomy to our database schema
        taxonomy_data = {}
        
        # Extract taxonomy information
        if 'kingdom' in taxon_data:
            taxonomy_data['domain'] = 'Eukarya'  # Typically organisms in GBIF are eukaryotes
            taxonomy_data['kingdom'] = taxon_data.get('kingdom', '')
            taxonomy_data['phylum'] = taxon_data.get('phylum', '')
            taxonomy_data['class'] = taxon_data.get('class', '')
            taxonomy_data['order'] = taxon_data.get('order', '')
            taxonomy_data['family'] = taxon_data.get('family', '')
            taxonomy_data['genus'] = taxon_data.get('genus', '')
        
        # Create species data
        species_data = {
            'name': taxon_data.get('specificEpithet', ''),
            'common_name': taxon_data.get('vernacularName', ''),
            'description': '',  # GBIF doesn't provide descriptions directly
        }
        
        # Fetch additional information if available
        if 'descriptions' in taxon_data and len(taxon_data['descriptions']) > 0:
            species_data['description'] = taxon_data['descriptions'][0].get('description', '')
        
        # Add to database
        result = self.db.add_full_taxonomy(taxonomy_data, species_data)
        
        if result and result.get('species_id'):
            print(f"Successfully imported {taxonomy_data.get('genus', '')} {species_data.get('name', '')} from GBIF")
            return True
        else:
            print("Failed to import taxon data")
            return False
    
    def import_from_itis(self, tsn):
        """Import taxonomic data from ITIS (Integrated Taxonomic Information System)."""
        print(f"Fetching data from ITIS for TSN: {tsn}")
        
        # Fetch basic taxon data
        taxon_url = f"https://services.itis.gov/?q=tsn:{tsn}&format=json"
        response = requests.get(taxon_url)
        
        if response.status_code != 200:
            print(f"Error: Failed to fetch data from ITIS API. Status code: {response.status_code}")
            return False
        
        try:
            itis_data = response.json()
            
            if 'scientificName' not in itis_data:
                print("Error: Invalid response from ITIS API")
                return False
            
            # Extract taxonomy hierarchy
            hierarchy_url = f"https://services.itis.gov/?q=hierarchy:{tsn}&format=json"
            hierarchy_response = requests.get(hierarchy_url)
            
            if hierarchy_response.status_code != 200:
                print(f"Error: Failed to fetch hierarchy data from ITIS API. Status code: {hierarchy_response.status_code}")
                return False
            
            hierarchy_data = hierarchy_response.json()
            taxonomy = {}
            
            # Map ITIS taxonomy ranks to our database schema
            for taxon in hierarchy_data.get('hierarchyList', []):
                rank = taxon.get('rank', '').lower()
                if rank in ['kingdom', 'phylum', 'class', 'order', 'family', 'genus']:
                    taxonomy[rank] = taxon.get('taxonName', '')
            
            # If it's a bacteria or archaea, set the domain accordingly
            if taxonomy.get('kingdom') == 'Bacteria':
                taxonomy['domain'] = 'Bacteria'
            elif taxonomy.get('kingdom') == 'Archaea':
                taxonomy['domain'] = 'Archaea'
            else:
                taxonomy['domain'] = 'Eukarya'  # Default to Eukarya for others
            
            # Extract species name
            scientific_name = itis_data.get('scientificName', '').split(' ')
            species_name = scientific_name[1] if len(scientific_name) > 1 else ''
            
            # Create species data
            species_data = {
                'name': species_name,
                'common_name': itis_data.get('commonNameList', {}).get('commonNames', [{'commonName': ''}])[0].get('commonName', ''),
                'description': ''  # ITIS doesn't provide descriptions directly
            }
            
            # Add to database
            result = self.db.add_full_taxonomy(taxonomy, species_data)
            
            if result and result.get('species_id'):
                print(f"Successfully imported {taxonomy.get('genus', '')} {species_data.get('name', '')} from ITIS")
                return True
            else:
                print("Failed to import taxon data")
                return False
        
        except Exception as e:
            print(f"Error processing ITIS data: {e}")
            return False
    
    def import_from_eol(self, eol_id):
        """Import taxonomic data from Encyclopedia of Life."""
        print(f"Fetching data from EOL for ID: {eol_id}")
        
        # Fetch basic page data
        page_url = f"https://eol.org/api/pages/1.0/{eol_id}.json?images=1&videos=0&sounds=0&maps=0&text=1&details=1"
        response = requests.get(page_url)
        
        if response.status_code != 200:
            print(f"Error: Failed to fetch data from EOL API. Status code: {response.status_code}")
            return False
        
        try:
            eol_data = response.json()
            
            # Extract taxonomy
            taxonomy = {
                'domain': '',
                'kingdom': '',
                'phylum': '',
                'class': '',
                'order': '',
                'family': '',
                'genus': ''
            }
            
            # Process taxonomy data
            for taxon in eol_data.get('taxonConcepts', []):
                for rank in taxon.get('taxonomicRanks', []):
                    rank_name = rank.get('name', '').lower()
                    if rank_name in taxonomy:
                        taxonomy[rank_name] = rank.get('value', '')
            
            # If kingdom is missing, try to get it from classification
            if not taxonomy['kingdom'] and 'classification' in eol_data:
                for classification in eol_data['classification']:
                    rank = classification.get('rank', '').lower()
                    if rank in taxonomy:
                        taxonomy[rank] = classification.get('name', '')
            
            # Extract species data
            scientific_name = eol_data.get('scientificName', '').split(' ')
            species_name = scientific_name[1] if len(scientific_name) > 1 else ''
            
            species_data = {
                'name': species_name,
                'common_name': eol_data.get('vernacularNames', [{'vernacularName': ''}])[0].get('vernacularName', ''),
                'description': '',
                'image_url': ''
            }
            
            # Extract description
            for text in eol_data.get('dataObjects', []):
                if text.get('type') == 'text/plain' or text.get('type') == 'text/html':
                    species_data['description'] = text.get('description', '')
                    break
            
            # Extract image
            for image in eol_data.get('dataObjects', []):
                if image.get('type') == 'image':
                    species_data['image_url'] = image.get('eolMediaURL', '')
                    break
            
            # Add to database
            result = self.db.add_full_taxonomy(taxonomy, species_data)
            
            if result and result.get('species_id'):
                print(f"Successfully imported {taxonomy.get('genus', '')} {species_data.get('name', '')} from EOL")
                return True
            else:
                print("Failed to import taxon data")
                return False
        
        except Exception as e:
            print(f"Error processing EOL data: {e}")
            return False
    
    def import_batch_from_csv(self, csv_file, delimiter=','):
        """Import a batch of taxonomic IDs from a CSV file."""
        success_count = 0
        error_count = 0
        
        try:
            with open(csv_file, 'r', newline='') as f:
                reader = csv.DictReader(f, delimiter=delimiter)
                
                for row in reader:
                    source = row.get('source', '').lower()
                    taxon_id = row.get('taxon_id', '')
                    
                    if not source or not taxon_id:
                        print(f"Error: Missing source or taxon_id in row: {row}")
                        error_count += 1
                        continue
                    
                    if source == 'gbif':
                        success = self.import_from_gbif(taxon_id)
                    elif source == 'itis':
                        success = self.import_from_itis(taxon_id)
                    elif source == 'eol':
                        success = self.import_from_eol(taxon_id)
                    else:
                        print(f"Error: Unknown source '{source}' in row: {row}")
                        error_count += 1
                        continue
                    
                    if success:
                        success_count += 1
                    else:
                        error_count += 1
            
            print(f"Batch import completed. {success_count} successful, {error_count} errors.")
            return success_count, error_count
        
        except Exception as e:
            print(f"Error processing CSV file: {e}")
            return 0, 0

def main():
    parser = argparse.ArgumentParser(description='Taxonomic Data Importer')
    parser.add_argument('--connection', help='Database connection string')
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Import from GBIF
    gbif_parser = subparsers.add_parser('gbif', help='Import from GBIF')
    gbif_parser.add_argument('taxon_key', help='GBIF taxon key')
    
    # Import from ITIS
    itis_parser = subparsers.add_parser('itis', help='Import from ITIS')
    itis_parser.add_argument('tsn', help='ITIS TSN (Taxonomic Serial Number)')
    
    # Import from EOL
    eol_parser = subparsers.add_parser('eol', help='Import from Encyclopedia of Life')
    eol_parser.add_argument('eol_id', help='EOL page ID')
    
    # Batch import from CSV
    batch_parser = subparsers.add_parser('batch', help='Batch import from CSV')
    batch_parser.add_argument('csv_file', help='CSV file with taxon IDs')
    batch_parser.add_argument('--delimiter', default=',', help='CSV delimiter')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    importer = TaxonomicDataImporter(args.connection)
    
    if args.command == 'gbif':
        importer.import_from_gbif(args.taxon_key)
    elif args.command == 'itis':
        importer.import_from_itis(args.tsn)
    elif args.command == 'eol':
        importer.import_from_eol(args.eol_id)
    elif args.command == 'batch':
        importer.import_batch_from_csv(args.csv_file, args.delimiter)

if __name__ == '__main__':
    main()