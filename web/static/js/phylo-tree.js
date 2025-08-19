// Phylogenetic Tree functionality

class PhylogeneticTree {
    constructor() {
        this.currentPath = [];
        this.currentRank = 'domain';
        this.rankOrder = TaxonomyConfig.rankOrder;
        this.loadingCache = new Map();
    }

    // Initialize the phylogenetic tree
    initialize() {
        TaxonomyUtils.log('Initializing phylogenetic tree');
        
        this.reset();
        this.setupEventListeners();
        this.loadRankOptions();
    }

    // Reset the tree to initial state
    reset() {
        this.currentPath = [];
        this.currentRank = 'domain';
        
        this.updateCurrentPathDisplay();
        this.clearSpeciesDisplay();
        this.updateProgressIndicator();
        
        // Enable show species button
        const showSpeciesBtn = document.getElementById('show-species-btn');
        if (showSpeciesBtn) {
            showSpeciesBtn.disabled = false;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Show Species button
        const showSpeciesBtn = document.getElementById('show-species-btn');
        if (showSpeciesBtn) {
            showSpeciesBtn.addEventListener('click', () => this.showSpeciesForCurrentSelection());
        }

        // Reset Tree button
        const resetBtn = document.getElementById('reset-tree-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // Debug Tree button
        const debugBtn = document.getElementById('debug-tree-btn');
        if (debugBtn) {
            debugBtn.addEventListener('click', () => this.debugTree());
        }
    }

    // Load options for current rank
    async loadRankOptions() {
        const optionsContainer = document.getElementById('rank-options');
        const loadingSpinner = document.getElementById('rank-loading');
        
        if (!optionsContainer) {
            TaxonomyUtils.error('Rank options container not found');
            return;
        }

        // Show loading state
        optionsContainer.innerHTML = '';
        if (loadingSpinner) {
            loadingSpinner.classList.remove('d-none');
        }

        try {
            let rankData = [];
            
            // Check cache first
            const cacheKey = this.getCacheKey();
            if (this.loadingCache.has(cacheKey)) {
                rankData = this.loadingCache.get(cacheKey);
            } else {
                // Fetch from API
                if (this.currentPath.length > 0) {
                    const parentRankIndex = this.rankOrder.indexOf(this.currentRank) - 1;
                    if (parentRankIndex >= 0) {
                        const parentRank = this.rankOrder[parentRankIndex];
                        const parentId = this.currentPath[parentRankIndex].id;
                        rankData = await taxonomyAPI.getTaxonomicRank(this.currentRank, parentRank, parentId);
                    }
                } else {
                    rankData = await taxonomyAPI.getTaxonomicRank(this.currentRank);
                }

                // Use fallback data for domains if API returns empty
                if (this.currentRank === 'domain' && (!rankData || rankData.length === 0)) {
                    rankData = this.getFallbackDomainData();
                }

                // Cache the result
                this.loadingCache.set(cacheKey, rankData);
            }

            this.renderRankOptions(optionsContainer, rankData);

        } catch (error) {
            TaxonomyUtils.error('Error loading rank options:', error);
            this.showRankError(optionsContainer);
        } finally {
            if (loadingSpinner) {
                loadingSpinner.classList.add('d-none');
            }
        }
    }

    // Render rank options
    renderRankOptions(container, rankData) {
        container.innerHTML = '';

        if (!rankData || rankData.length === 0) {
            container.innerHTML = '<p class="text-muted">No options available at this level.</p>';
            return;
        }

        if (this.currentRank === 'domain') {
            this.renderDomainOptions(container, rankData);
        } else if (this.currentRank === 'kingdom') {
            this.renderKingdomOptions(container, rankData);
        } else {
            this.renderStandardOptions(container, rankData);
        }
    }

    // Render domain options with main domains highlighted
    renderDomainOptions(container, domains) {
        // First show main domains
        TaxonomyConfig.mainDomains.forEach(domainName => {
            const domain = domains.find(d => d.name && d.name.toLowerCase() === domainName.toLowerCase());
            if (domain) {
                container.appendChild(this.createOptionButton(domain, true));
            }
        });

        // Then show other domains
        domains.forEach(domain => {
            if (domain.name && !TaxonomyConfig.mainDomains.find(m => m.toLowerCase() === domain.name.toLowerCase())) {
                container.appendChild(this.createOptionButton(domain, false));
            }
        });
    }

    // Render kingdom options with main kingdoms highlighted
    renderKingdomOptions(container, kingdoms) {
        // First show main kingdoms
        TaxonomyConfig.mainKingdoms.forEach(kingdomName => {
            const kingdom = kingdoms.find(k => k.name && k.name.toLowerCase() === kingdomName.toLowerCase());
            if (kingdom) {
                container.appendChild(this.createOptionButton(kingdom, true));
            }
        });

        // Then show other kingdoms
        kingdoms.forEach(kingdom => {
            if (kingdom.name && !TaxonomyConfig.mainKingdoms.find(m => m.toLowerCase() === kingdom.name.toLowerCase())) {
                container.appendChild(this.createOptionButton(kingdom, false));
            }
        });
    }

    // Render standard options
    renderStandardOptions(container, rankData) {
        rankData.forEach(item => {
            container.appendChild(this.createOptionButton(item, true));
        });
    }

    // Create option button
    createOptionButton(item, isPrimary = true) {
        const button = document.createElement('button');
        button.className = isPrimary ? 
            'btn btn-outline-primary me-2 mb-2' : 
            'btn btn-outline-secondary me-2 mb-2';
        button.textContent = item.name;
        button.dataset.id = item.id;
        
        if (item.description) {
            button.dataset.description = item.description;
        }
        
        button.addEventListener('click', () => {
            this.selectRankOption({
                id: item.id,
                name: item.name,
                description: item.description || ''
            });
        });
        
        return button;
    }

    // Handle selection of rank option
    selectRankOption(item) {
        // Show confirmation modal
        this.showSelectionModal(item);
    }

    // Show selection confirmation modal
    showSelectionModal(item) {
        const modal = document.getElementById('taxonomyDescriptionModal');
        if (!modal) {
            TaxonomyUtils.error('Taxonomy description modal not found');
            return;
        }

        // Set modal content
        const nameElement = document.getElementById('taxonomy-item-name');
        const rankElement = document.getElementById('taxonomy-rank');
        const descriptionElement = document.getElementById('taxonomy-item-description');

        if (nameElement) nameElement.textContent = item.name || "Unknown";
        if (rankElement) rankElement.textContent = TaxonomyUtils.capitalize(this.currentRank);
        
        if (descriptionElement) {
            descriptionElement.textContent = item.description && item.description.trim() !== '' 
                ? item.description 
                : `No description available for this ${this.currentRank}.`;
        }

        // Store item data
        modal.dataset.itemId = item.id;
        modal.dataset.itemName = item.name || "Unknown";

        // Setup confirm button
        this.setupModalConfirmButton(modal, item);

        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }

    // Setup modal confirm button
    setupModalConfirmButton(modal, item) {
        const confirmButton = document.getElementById('confirm-taxonomy-selection');
        if (!confirmButton) return;

        // Remove existing event listeners
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

        // Add new event listener
        newConfirmButton.addEventListener('click', () => {
            this.confirmSelection(item);
            
            // Hide modal
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }

    // Confirm selection and update path
    confirmSelection(item) {
        const currentRankIndex = this.rankOrder.indexOf(this.currentRank);
        
        // Truncate path to current rank
        this.currentPath = this.currentPath.slice(0, currentRankIndex);
        
        // Add new selection
        this.currentPath.push({
            rank: this.currentRank,
            id: item.id,
            name: item.name
        });

        TaxonomyUtils.log('Updated path:', this.currentPath);

        // Move to next rank if available
        if (currentRankIndex < this.rankOrder.length - 1) {
            this.currentRank = this.rankOrder[currentRankIndex + 1];
        }

        // Update UI
        this.updateCurrentPathDisplay();
        this.updateProgressIndicator();
        this.loadRankOptions();

        // Enable show species button
        const showSpeciesBtn = document.getElementById('show-species-btn');
        if (showSpeciesBtn) {
            showSpeciesBtn.disabled = false;
        }

        // Clear cache for new selections
        this.clearCacheForPath();
    }

    // Update current path display
    updateCurrentPathDisplay() {
        const pathContainer = document.getElementById('current-path');
        if (!pathContainer) return;

        pathContainer.innerHTML = '';

        // Always show "All Life" badge
        const allLifeBadge = document.createElement('span');
        allLifeBadge.className = 'badge bg-secondary me-2 mb-2';
        allLifeBadge.textContent = 'All Life';
        pathContainer.appendChild(allLifeBadge);

        // Add each item in current path
        this.currentPath.forEach((item, index) => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary me-2 mb-2';
            badge.textContent = `${this.rankOrder[index]}: ${item.name}`;
            pathContainer.appendChild(badge);
        });

        // Update current rank display
        const currentRankElement = document.getElementById('current-rank');
        if (currentRankElement) {
            currentRankElement.textContent = TaxonomyUtils.capitalize(this.currentRank);
        }
    }

    // Update progress indicator
    updateProgressIndicator() {
        // Reset all items
        this.rankOrder.forEach(rank => {
            const item = document.getElementById(`level-${rank}`);
            if (item) {
                item.classList.remove('active', 'completed');
            }
        });

        // Mark completed items
        this.currentPath.forEach((item, index) => {
            const rank = this.rankOrder[index];
            const element = document.getElementById(`level-${rank}`);
            if (element) {
                element.classList.add('completed');
            }
        });

        // Mark active item
        const currentItem = document.getElementById(`level-${this.currentRank}`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    }

    // Show species for current selection
    async showSpeciesForCurrentSelection() {
        const container = document.getElementById('phylo-species-container');
        if (!container) {
            TaxonomyUtils.error('Phylo species container not found');
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading species...</p>
            </div>
        `;

        try {
            let species = [];

            if (this.currentPath.length === 0) {
                // Show all species if no selection
                species = await taxonomyAPI.getAllSpecies();
            } else {
                // Get species for most specific rank
                const lastSelection = this.currentPath[this.currentPath.length - 1];
                const rank = lastSelection.rank;
                const rankId = lastSelection.id;

                try {
                    species = await taxonomyAPI.getSpeciesByRank(rank, rankId);
                } catch (error) {
                    // Fallback to search
                    TaxonomyUtils.log('Species by rank failed, trying fallback search');
                    species = await taxonomyAPI.fallbackSpeciesSearch(lastSelection.name);
                }
            }

            this.renderSpeciesList(container, species);

        } catch (error) {
            TaxonomyUtils.error('Error loading species for selection:', error);
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger" role="alert">
                        Error loading species. Please try again.
                    </div>
                </div>
            `;
        }
    }

    // Render species list
    renderSpeciesList(container, species) {
        container.innerHTML = '';

        if (!species || species.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">No species found for the current selection.</p>
                </div>
            `;
            return;
        }

        // Display count
        const countRow = document.createElement('div');
        countRow.className = 'col-12';
        countRow.innerHTML = `<p class="mb-3 fw-bold">Found ${species.length} species</p>`;
        container.appendChild(countRow);

        // Display species using species manager
        species.forEach(speciesData => {
            const card = speciesManager.createSpeciesCard(speciesData);
            container.appendChild(card);
        });
    }

    // Clear species display
    clearSpeciesDisplay() {
        const container = document.getElementById('phylo-species-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    // Show error state for rank options
    showRankError(container) {
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle"></i>
                Error loading options. Please try again.
            </div>
        `;
    }

    // Debug tree state
    debugTree() {
        console.log('=== Phylogenetic Tree Debug ===');
        console.log('Current path:', this.currentPath);
        console.log('Current rank:', this.currentRank);
        console.log('Cache size:', this.loadingCache.size);
        
        // Test API
        taxonomyAPI.getTaxonomicRank('domain')
            .then(data => {
                console.log('Domain API test result:', data);
                if (!data || data.length === 0) {
                    alert('API returned no domain data. Check server logs.');
                } else {
                    alert(`API returned ${data.length} domains. Check console for details.`);
                }
            })
            .catch(error => {
                console.error('API test error:', error);
                alert('API test failed - check console');
            });
    }

    // Get cache key for current state
    getCacheKey() {
        if (this.currentPath.length === 0) {
            return this.currentRank;
        }
        
        const parentIndex = this.rankOrder.indexOf(this.currentRank) - 1;
        const parentId = this.currentPath[parentIndex]?.id || '';
        return `${this.currentRank}-${parentId}`;
    }

    // Clear cache for current path
    clearCacheForPath() {
        // Clear cache entries that might be affected by the new selection
        const keysToDelete = [];
        for (let key of this.loadingCache.keys()) {
            if (key.includes(this.currentRank)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.loadingCache.delete(key));
    }

    // Get fallback domain data
    getFallbackDomainData() {
        return [
            { 
                id: "domain-bacteria", 
                name: "Bacteria", 
                description: "Single-celled prokaryotic microorganisms" 
            },
            { 
                id: "domain-archaea", 
                name: "Archaea", 
                description: "Single-celled microorganisms similar to bacteria but with different cell structure" 
            },
            { 
                id: "domain-eukarya", 
                name: "Eukarya", 
                description: "Organisms whose cells have a nucleus enclosed within a nuclear envelope" 
            }
        ];
    }
}

// Create global phylogenetic tree instance
window.phylogeneticTree = new PhylogeneticTree();