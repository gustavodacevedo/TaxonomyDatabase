// Configuration and constants for the Taxonomic Database

const TaxonomyConfig = {
    // API endpoints
    api: {
        base: '/api',
        species: '/api/species',
        taxonomy: '/api/taxonomy',
        taxonomicRank: '/api/taxonomic-rank',
        speciesByRank: '/api/species-by-rank',
        tags: '/api/tags',
        export: '/api/export',
        import: '/api/import',
        schema: '/api/schema'
    },
    
    // Taxonomic ranks in order
    rankOrder: ['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'],
    
    // Main taxonomic domains
    mainDomains: ['Archaea', 'Bacteria', 'Eukarya'],
    
    // Main kingdoms (for highlighting)
    mainKingdoms: ['Monera', 'Protista', 'Fungi', 'Plantae', 'Animalia'],
    
    // Conservation status options
    conservationStatuses: [
        'Not Evaluated',
        'Data Deficient', 
        'Least Concern',
        'Near Threatened',
        'Vulnerable',
        'Endangered',
        'Critically Endangered',
        'Extinct in the Wild',
        'Extinct'
    ],
    
    // UI settings
    ui: {
        maxDescriptionLength: 100,
        defaultImagePlaceholder: '/static/images/species-placeholder.png',
        loadingDelay: 200,
        animationDuration: 300
    },
    
    // Debug mode
    debug: false
};

// Utility functions
const TaxonomyUtils = {
    // Log debug messages
    log: function(message, data = null) {
        if (TaxonomyConfig.debug) {
            console.log(`[Taxonomy] ${message}`, data || '');
        }
    },
    
    // Log errors
    error: function(message, error = null) {
        console.error(`[Taxonomy Error] ${message}`, error || '');
    },
    
    // Generate unique ID
    generateId: function() {
        return 'taxonomy_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Capitalize first letter
    capitalize: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    // Truncate text
    truncateText: function(text, maxLength = TaxonomyConfig.ui.maxDescriptionLength) {
        if (!text) return 'No description available.';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },
    
    // Parse tags from string or array
    parseTags: function(tags) {
        if (!tags) return [];
        
        if (Array.isArray(tags)) {
            return tags;
        }
        
        if (typeof tags === 'string') {
            return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
        
        return [];
    },
    
    // Format scientific name
    formatScientificName: function(genus, species) {
        const genusName = genus || '';
        const speciesName = species || '';
        return `${genusName} ${speciesName}`.trim();
    },
    
    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Make config globally available
window.TaxonomyConfig = TaxonomyConfig;
window.TaxonomyUtils = TaxonomyUtils;