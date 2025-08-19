// API module for handling all HTTP requests to the taxonomic database

class TaxonomyAPI {
    constructor() {
        this.baseUrl = TaxonomyConfig.api.base;
    }

    // Generic fetch wrapper with error handling
    async fetchData(url, options = {}) {
        try {
            TaxonomyUtils.log(`API Request: ${url}`, options);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            TaxonomyUtils.log(`API Response: ${url}`, data);
            
            return data;
        } catch (error) {
            TaxonomyUtils.error(`API Error for ${url}:`, error);
            throw error;
        }
    }

    // Species API methods
    async getAllSpecies() {
        return this.fetchData(`${TaxonomyConfig.api.species}?all=true`);
    }

    async getSpeciesById(speciesId) {
        return this.fetchData(`${TaxonomyConfig.api.species}/${speciesId}`);
    }

    async searchSpecies(searchTerm) {
        const encodedTerm = encodeURIComponent(searchTerm);
        return this.fetchData(`${TaxonomyConfig.api.species}?search=${encodedTerm}`);
    }

    async getSpeciesByTag(tagName) {
        const encodedTag = encodeURIComponent(tagName);
        return this.fetchData(`${TaxonomyConfig.api.species}?tag=${encodedTag}`);
    }

    async getSpeciesByRank(rank, rankId) {
        return this.fetchData(`${TaxonomyConfig.api.speciesByRank}/${rank}/${rankId}`);
    }

    async addSpecies(speciesData) {
        return this.fetchData(TaxonomyConfig.api.species, {
            method: 'POST',
            body: JSON.stringify(speciesData)
        });
    }

    // Taxonomic rank API methods
    async getTaxonomicRank(rank, parentRank = null, parentId = null) {
        let url = `${TaxonomyConfig.api.taxonomicRank}/${rank}`;
        
        if (parentRank && parentId) {
            url += `?parent_rank=${parentRank}&parent_id=${parentId}`;
        }
        
        return this.fetchData(url);
    }

    async getAllTaxonomy() {
        return this.fetchData(TaxonomyConfig.api.taxonomy);
    }

    // Tags API methods
    async getAllTags() {
        return this.fetchData(TaxonomyConfig.api.tags);
    }

    // Import/Export API methods
    async exportDatabase() {
        return this.fetchData(TaxonomyConfig.api.export);
    }

    async importDatabase(formData) {
        try {
            const response = await fetch(TaxonomyConfig.api.import, {
                method: 'POST',
                body: formData // FormData for file upload
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            TaxonomyUtils.error('Import API Error:', error);
            throw error;
        }
    }

    async getSchema() {
        return this.fetchData(TaxonomyConfig.api.schema);
    }

    // Utility methods for fallback behavior
    async fallbackSpeciesSearch(searchTerm) {
        try {
            return await this.searchSpecies(searchTerm);
        } catch (error) {
            TaxonomyUtils.error('Fallback species search failed:', error);
            return [];
        }
    }

    // Batch operations
    async batchGetSpecies(speciesIds) {
        const promises = speciesIds.map(id => this.getSpeciesById(id));
        try {
            return await Promise.all(promises);
        } catch (error) {
            TaxonomyUtils.error('Batch species fetch failed:', error);
            // Return partial results
            const results = await Promise.allSettled(promises);
            return results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
        }
    }

    // Health check
    async healthCheck() {
        try {
            await this.fetchData(`${this.baseUrl}/health`);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create global API instance
window.taxonomyAPI = new TaxonomyAPI();