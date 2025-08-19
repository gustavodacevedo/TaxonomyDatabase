// Species management functionality

class SpeciesManager {
    constructor() {
        this.currentSpecies = [];
        this.searchCache = new Map();
        this.loadingStates = new Set();
    }

    // Load and display species
    async loadSpecies(searchTerm = '', tagName = '') {
        const containerId = 'species-container';
        const container = document.getElementById(containerId);
        
        if (!container) {
            TaxonomyUtils.error('Species container not found');
            return;
        }

        // Prevent duplicate loading
        const cacheKey = `${searchTerm}-${tagName}`;
        if (this.loadingStates.has(cacheKey)) {
            return;
        }

        this.loadingStates.add(cacheKey);
        this.showLoadingState(container);

        try {
            let species = [];

            // Check cache first
            if (this.searchCache.has(cacheKey)) {
                species = this.searchCache.get(cacheKey);
            } else {
                // Fetch from API
                if (tagName) {
                    species = await taxonomyAPI.getSpeciesByTag(tagName);
                } else if (searchTerm) {
                    species = await taxonomyAPI.searchSpecies(searchTerm);
                } else {
                    species = await taxonomyAPI.getAllSpecies();
                }

                // Cache the result
                this.searchCache.set(cacheKey, species);
            }

            this.currentSpecies = species;
            this.renderSpeciesCards(container, species);

            // Update clickable images for the image viewer
            if (window.imageViewer) {
                imageViewer.updateClickableImages();
            }

        } catch (error) {
            TaxonomyUtils.error('Error loading species:', error);
            this.showErrorState(container, 'Failed to load species. Please try again.');
        } finally {
            this.loadingStates.delete(cacheKey);
        }
    }

    // Render species cards
    renderSpeciesCards(container, species) {
        container.innerHTML = '';

        if (!species || species.length === 0) {
            this.showEmptyState(container);
            return;
        }

        // Validate that we have species data, not tags
        if (species[0] && !species[0].hasOwnProperty('name') && !species[0].hasOwnProperty('common_name')) {
            TaxonomyUtils.error('Received incorrect data type - expected species');
            this.loadSpecies(' '); // Force reload
            return;
        }

        species.forEach(speciesData => {
            const card = this.createSpeciesCard(speciesData);
            container.appendChild(card);
        });
    }

    // Create individual species card
    createSpeciesCard(species) {
        const card = document.createElement('div');
        card.className = 'col-md-4';

        const scientificName = TaxonomyUtils.formatScientificName(
            species.genus_name || '', 
            species.name || ''
        );

        const tagsHtml = this.renderTags(species.tags);
        const mapBadge = this.createMapBadge(species);
        const imageHtml = this.createImageHtml(species);

        card.innerHTML = `
            <div class="species-card position-relative">
                ${mapBadge}
                ${imageHtml}
                <h4>${species.common_name || 'Unknown'}</h4>
                <p class="scientific-name">${scientificName}</p>
                <p>${TaxonomyUtils.truncateText(species.description)}</p>
                <div class="tags">${tagsHtml}</div>
                <button class="btn btn-sm btn-outline-primary mt-2" 
                        onclick="speciesManager.viewSpeciesDetails('${species.id}')">
                    View Details
                </button>
            </div>
        `;

        return card;
    }

    // Render tags for a species
    renderTags(tags) {
        const parsedTags = TaxonomyUtils.parseTags(tags);
        return parsedTags.map(tag => `<span class="tag">${tag}</span>`).join('');
    }

    // Create map badge if distribution map available
    createMapBadge(species) {
        return species.distribution_map_url 
            ? '<span class="badge bg-info text-white position-absolute top-0 end-0 m-2" title="Distribution map available"><i class="bi bi-map"></i> Map</span>'
            : '';
    }

    // Create image HTML with fullscreen capability
    createImageHtml(species) {
        if (!species.image_url) return '';
        
        const altText = species.common_name || species.name || 'Species image';
        return `<img src="${species.image_url}" 
                     alt="${altText}" 
                     class="img-fluid mb-2 clickable-image" 
                     loading="lazy"
                     title="Click to view fullscreen">`;
    }

    // View detailed species information
    async viewSpeciesDetails(speciesId) {
        try {
            const species = await taxonomyAPI.getSpeciesById(speciesId);
            
            if (!species) {
                alert('Species not found');
                return;
            }

            this.showSpeciesModal(species);

        } catch (error) {
            TaxonomyUtils.error('Error loading species details:', error);
            alert('Failed to load species details. Please try again.');
        }
    }

    // Show species details in modal
    showSpeciesModal(species) {
        const modal = this.createSpeciesModal(species);
        document.body.appendChild(modal);

        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        // Clean up when modal is hidden
        modal.addEventListener('hidden.bs.modal', function() {
            modal.remove();
        });
    }

    // Create species details modal
    createSpeciesModal(species) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');

        const scientificName = TaxonomyUtils.formatScientificName(
            species.genus_name || '', 
            species.species_name || species.name || ''
        );

        const tagsHtml = this.renderTags(species.tags);
        const distributionMapSection = this.createDistributionMapSection(species);
        const taxonomyTable = this.createTaxonomyTable(species);
        const additionalInfoTable = this.createAdditionalInfoTable(species);

        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${species.common_name || 'Unknown'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <h6 class="scientific-name">${scientificName}</h6>
                        
                        <div class="row">
                            <div class="col-md-6">
                                ${species.image_url ? `<img src="${species.image_url}" 
                                     alt="${species.common_name || ''}" 
                                     class="img-fluid mb-3 clickable-image"
                                     title="Click to view fullscreen">` : ''}
                                <p>${species.description || 'No description available.'}</p>
                                <div class="tags mb-3">${tagsHtml}</div>
                                ${distributionMapSection}
                            </div>
                            <div class="col-md-6">
                                ${taxonomyTable}
                                ${additionalInfoTable}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update clickable images after modal is shown
        modal.addEventListener('shown.bs.modal', () => {
            if (window.imageViewer) {
                imageViewer.updateClickableImages();
            }
        });

        return modal;
    }

    // Create distribution map section
    createDistributionMapSection(species) {
        return species.distribution_map_url 
            ? `<div class="mt-3">
                 <h6>Distribution Map</h6>
                 <img src="${species.distribution_map_url}" alt="Distribution map for ${species.common_name || ''}" class="img-fluid border rounded">
               </div>`
            : '';
    }

    // Create taxonomy table
    createTaxonomyTable(species) {
        if (!species.domain_name) return '';

        const taxonomyRows = [
            { label: 'Domain', value: species.domain_name },
            { label: 'Kingdom', value: species.kingdom_name },
            { label: 'Phylum', value: species.phylum_name },
            { label: 'Class', value: species.class_name },
            { label: 'Order', value: species.order_name },
            { label: 'Family', value: species.family_name },
            { label: 'Genus', value: species.genus_name },
            { label: 'Species', value: species.species_name || species.name }
        ].filter(row => row.value)
         .map(row => `<tr><th>${row.label}</th><td>${row.value}</td></tr>`)
         .join('');

        return `
            <h6>Taxonomic Classification</h6>
            <table class="table table-bordered">
                ${taxonomyRows}
            </table>
        `;
    }

    // Create additional info table
    createAdditionalInfoTable(species) {
        const infoRows = [
            { label: 'Discovery Year', value: species.discovery_year },
            { label: 'Conservation Status', value: species.conservation_status },
            { label: 'Habitat', value: species.habitat },
            { label: 'Geographic Distribution', value: species.geographic_distribution }
        ].filter(row => row.value)
         .map(row => `<tr><th>${row.label}</th><td>${row.value}</td></tr>`)
         .join('');

        return infoRows ? `
            <h6>Additional Information</h6>
            <table class="table table-bordered">
                ${infoRows}
            </table>
        ` : '';
    }

    // Show loading state
    showLoadingState(container) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading species...</p>
            </div>
        `;
    }

    // Show empty state
    showEmptyState(container) {
        container.innerHTML = `
            <div class="col-12 no-species">
                <i class="bi bi-search"></i>
                <h5>No species found</h5>
                <p>Try adjusting your search or filter criteria.</p>
            </div>
        `;
    }

    // Show error state
    showErrorState(container, message) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle"></i>
                    ${message}
                </div>
            </div>
        `;
    }

    // Add new species
    async addSpecies(formData) {
        try {
            const result = await taxonomyAPI.addSpecies(formData);
            
            if (result.success) {
                // Clear cache
                this.searchCache.clear();
                
                // Show success message
                this.showSuccessMessage('Species added successfully!');
                
                return result;
            } else {
                throw new Error('Failed to add species');
            }
        } catch (error) {
            TaxonomyUtils.error('Error adding species:', error);
            throw error;
        }
    }

    // Show success message
    showSuccessMessage(message) {
        // Create temporary success alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 3000);
    }

    // Clear cache
    clearCache() {
        this.searchCache.clear();
        TaxonomyUtils.log('Species cache cleared');
    }
}

// Create global species manager instance
window.speciesManager = new SpeciesManager();