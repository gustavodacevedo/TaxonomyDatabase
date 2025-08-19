// Species management functionality

class SpeciesManager {
    constructor() {
        this.currentSpecies = [];
        this.searchCache = new Map();
        this.loadingStates = new Set();
        this.currentTaxonomyFilter = null; // Track active taxonomy filter
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

            // Clear any taxonomy filter indicator if we're doing a regular search
            if (!this.currentTaxonomyFilter && (searchTerm || tagName)) {
                this.hideFilterIndicator();
            }

            // If we're loading all species (no search term or tag), also clear filter
            if (!searchTerm && !tagName) {
                this.currentTaxonomyFilter = null;
                this.hideFilterIndicator();
            }

        } catch (error) {
            TaxonomyUtils.error('Error loading species:', error);
            this.showErrorState(container, 'Failed to load species. Please try again.');
        } finally {
            this.loadingStates.delete(cacheKey);
        }
    }

    // Load species by taxonomy rank
    async loadSpeciesByTaxonomy(rank, rankId, rankName) {
        const containerId = 'species-container';
        const container = document.getElementById(containerId);
        
        if (!container) {
            TaxonomyUtils.error('Species container not found');
            return;
        }

        // Set taxonomy filter
        this.currentTaxonomyFilter = {
            rank: rank,
            id: rankId,
            name: rankName
        };

        // Show filter indicator
        this.showFilterIndicator(rank, rankName);

        this.showLoadingState(container);

        try {
            const species = await taxonomyAPI.getSpeciesByRank(rank, rankId);
            this.currentSpecies = species;
            this.renderSpeciesCards(container, species);

            // Update clickable images for the image viewer
            if (window.imageViewer) {
                imageViewer.updateClickableImages();
            }

        } catch (error) {
            TaxonomyUtils.error('Error loading species by taxonomy:', error);
            this.showErrorState(container, 'Failed to load species for this taxonomic group. Please try again.');
        }
    }

    // Apply taxonomy filter from clickable links
    async applyTaxonomyFilter(rank, name, id) {
        TaxonomyUtils.log(`Applying taxonomy filter: ${rank} = ${name} (ID: ${id})`);
        
        // Close any open modals first
        this.closeAllModals();
        
        // Switch to explorer tab if not already there
        const explorerTab = document.getElementById('explorer-tab');
        if (explorerTab && !explorerTab.classList.contains('active')) {
            const tab = new bootstrap.Tab(explorerTab);
            tab.show();
        }

        // Clear search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }

        // Reset tag filters
        this.resetTagFilters();

        // Load species with taxonomy filter
        await this.loadSpeciesByTaxonomy(rank, id, name);
    }

    // Clear taxonomy filter
    async clearTaxonomyFilter() {
        TaxonomyUtils.log('Clearing taxonomy filter');
        
        this.currentTaxonomyFilter = null;
        this.hideFilterIndicator();
        
        // Clear search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }

        // Reset tag filters
        this.resetTagFilters();
        
        // Reload all species
        await this.loadSpecies();
    }

    // Close all open modals
    closeAllModals() {
        // Close Bootstrap modals
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });

        // Clean up any remaining modal backdrops
        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            
            // Reset body styles
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
        }, 300);
    }

    // Show filter indicator
    showFilterIndicator(rank, name) {
        // Create filter indicator if it doesn't exist
        let filterIndicator = document.getElementById('taxonomy-filter-indicator');
        if (!filterIndicator) {
            filterIndicator = document.createElement('div');
            filterIndicator.id = 'taxonomy-filter-indicator';
            filterIndicator.className = 'alert alert-info alert-dismissible d-flex align-items-center mb-3';
            filterIndicator.innerHTML = `
                <i class="bi bi-funnel-fill me-2"></i>
                <span id="filter-text"></span>
                <button type="button" class="btn btn-sm btn-outline-info ms-auto" onclick="speciesManager.clearTaxonomyFilter()">
                    <i class="bi bi-x"></i> Clear Filter
                </button>
            `;
            
            const container = document.getElementById('species-container');
            if (container && container.parentNode) {
                container.parentNode.insertBefore(filterIndicator, container);
            }
        }

        // Update filter text
        const filterText = document.getElementById('filter-text');
        if (filterText) {
            filterText.textContent = `Showing species in ${TaxonomyUtils.capitalize(rank)}: ${name}`;
        }

        filterIndicator.style.display = 'flex';
    }

    // Hide filter indicator
    hideFilterIndicator() {
        const filterIndicator = document.getElementById('taxonomy-filter-indicator');
        if (filterIndicator) {
            filterIndicator.style.display = 'none';
            
            // Clear the text content to prevent stale text from showing
            const filterText = document.getElementById('filter-text');
            if (filterText) {
                filterText.textContent = '';
            }
        }
    }

    // Reset tag filters visual state
    resetTagFilters() {
        if (window.tagManager) {
            tagManager.resetButtonStates();
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

    // View detailed species information with clickable taxonomy
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

    // Show species details in modal with clickable taxonomy
    showSpeciesModal(species) {
        const modal = this.createSpeciesModal(species);
        document.body.appendChild(modal);

        const modalInstance = new bootstrap.Modal(modal, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        modalInstance.show();

        // Clean up when modal is hidden
        modal.addEventListener('hidden.bs.modal', function() {
            modal.remove();
        });
    }

    // Create species details modal with clickable taxonomy
    createSpeciesModal(species) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-labelledby', 'speciesModalLabel');
        modal.setAttribute('aria-hidden', 'true');

        const scientificName = TaxonomyUtils.formatScientificName(
            species.genus_name || '', 
            species.species_name || species.name || ''
        );

        const tagsHtml = this.renderTags(species.tags);
        const distributionMapSection = this.createDistributionMapSection(species);
        const taxonomyTable = this.createClickableTaxonomyTable(species);
        const additionalInfoTable = this.createAdditionalInfoTable(species);
        const imageSection = this.createModalImageSection(species);

        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="speciesModalLabel">${species.common_name || 'Unknown'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <h6 class="scientific-name">${scientificName}</h6>
                        
                        <div class="row">
                            <div class="col-md-6">
                                ${imageSection}
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
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
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

    // Create clickable taxonomy table
    createClickableTaxonomyTable(species) {
        if (!species.domain_name) return '';

        const taxonomyRows = [
            { label: 'Domain', value: species.domain_name, id: species.domain_id },
            { label: 'Kingdom', value: species.kingdom_name, id: species.kingdom_id },
            { label: 'Phylum', value: species.phylum_name, id: species.phylum_id },
            { label: 'Class', value: species.class_name, id: species.class_id },
            { label: 'Order', value: species.order_name, id: species.order_id },
            { label: 'Family', value: species.family_name, id: species.family_id },
            { label: 'Genus', value: species.genus_name, id: species.genus_id },
            { label: 'Species', value: species.species_name || species.name, id: null }
        ].filter(row => row.value)
         .map(row => {
             if (row.id && row.label.toLowerCase() !== 'species') {
                 // Make it clickable for all ranks except species
                 const escapedValue = row.value.replace(/'/g, "\\'");
                 return `<tr>
                     <th>${row.label}</th>
                     <td>
                         <span class="taxonomy-link" 
                               onclick="speciesManager.applyTaxonomyFilter('${row.label.toLowerCase()}', '${escapedValue}', '${row.id}')"
                               title="Click to filter by ${row.label}">
                             ${row.value}
                         </span>
                     </td>
                 </tr>`;
             } else {
                 // Non-clickable for species
                 return `<tr><th>${row.label}</th><td>${row.value}</td></tr>`;
             }
         })
         .join('');

        return `
            <h6>Taxonomic Classification</h6>
            <div class="mb-2">
                <small class="text-muted">
                    <i class="bi bi-info-circle"></i> 
                    Click on any taxonomic rank to filter species
                </small>
            </div>
            <table class="table table-bordered table-sm">
                ${taxonomyRows}
            </table>
        `;
    }

    // Create modal image section with fullscreen capability
    createModalImageSection(species) {
        if (!species.image_url) return '';
        
        const altText = species.common_name || species.name || 'Species image';
        return `
            <div class="mb-3">
                <img src="${species.image_url}" 
                     alt="${altText}" 
                     class="img-fluid rounded shadow-sm clickable-image"
                     style="width: 100%; height: auto; max-height: 400px; object-fit: cover;"
                     title="Click to view fullscreen">
                <small class="text-muted d-block mt-1">
                    <i class="bi bi-zoom-in"></i> Click image to enlarge
                </small>
            </div>
        `;
    }

    // Create distribution map section
    createDistributionMapSection(species) {
        return species.distribution_map_url 
            ? `<div class="mt-3">
                 <h6>Distribution Map</h6>
                 <img src="${species.distribution_map_url}" 
                      alt="Distribution map for ${species.common_name || ''}" 
                      class="img-fluid border rounded clickable-image"
                      title="Click to view fullscreen">
               </div>`
            : '';
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
            <table class="table table-bordered table-sm">
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
        const message = this.currentTaxonomyFilter 
            ? `No species found in ${this.currentTaxonomyFilter.rank}: ${this.currentTaxonomyFilter.name}`
            : 'No species found';
            
        container.innerHTML = `
            <div class="col-12 no-species">
                <i class="bi bi-search"></i>
                <h5>${message}</h5>
                <p>Try adjusting your search or filter criteria.</p>
                ${this.currentTaxonomyFilter ? 
                    '<button class="btn btn-outline-primary" onclick="speciesManager.clearTaxonomyFilter()">Clear Filter</button>' 
                    : ''}
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

    // Get current filter state
    getCurrentFilter() {
        return this.currentTaxonomyFilter;
    }
}

// Create global species manager instance
window.speciesManager = new SpeciesManager();