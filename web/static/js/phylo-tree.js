// Phylogenetic Tree functionality

class PhylogeneticTree {
    constructor() {
        this.currentPath = [];
        this.currentRank = 'domain';
        this.rankOrder = TaxonomyConfig.rankOrder;
        this.loadingCache = new Map();
        this.initialized = false;
    }

    // Initialize the phylogenetic tree
    initialize() {
        if (this.initialized) {
            TaxonomyUtils.log('Phylogenetic tree already initialized');
            return;
        }

        TaxonomyUtils.log('Initializing phylogenetic tree');
        
        // First, load the phylo tree content if it's not already there
        this.loadPhyloContent().then(() => {
            this.reset();
            this.setupEventListeners();
            this.loadRankOptions();
            this.initialized = true;
        }).catch(error => {
            TaxonomyUtils.error('Failed to initialize phylogenetic tree:', error);
        });
    }

    // Load phylogenetic tree content dynamically
    async loadPhyloContent() {
        const phyloContainer = document.getElementById('phylo-content');
        if (!phyloContainer) {
            TaxonomyUtils.error('Phylo content container not found');
            return;
        }

        // Check if content is already loaded
        if (phyloContainer.innerHTML.trim() !== '') {
            return;
        }

        // Create the phylogenetic tree HTML structure
        const phyloHTML = `
            <h3>Phylogenetic Tree Explorer</h3>
            <p class="mb-4">Navigate the tree of life by selecting taxonomic ranks. Click "Show Species" at any point to view all species within the selected classification.</p>

            <!-- Progress indicator -->
            <div class="phylo-level-indicator mb-4">
                <div class="level-item" id="level-domain">
                    <div class="level-marker">D</div>
                    <small>Domain</small>
                </div>
                <div class="level-item" id="level-kingdom">
                    <div class="level-marker">K</div>
                    <small>Kingdom</small>
                </div>
                <div class="level-item" id="level-phylum">
                    <div class="level-marker">P</div>
                    <small>Phylum</small>
                </div>
                <div class="level-item" id="level-class">
                    <div class="level-marker">C</div>
                    <small>Class</small>
                </div>
                <div class="level-item" id="level-order">
                    <div class="level-marker">O</div>
                    <small>Order</small>
                </div>
                <div class="level-item" id="level-family">
                    <div class="level-marker">F</div>
                    <small>Family</small>
                </div>
                <div class="level-item" id="level-genus">
                    <div class="level-marker">G</div>
                    <small>Genus</small>
                </div>
                <div class="level-item" id="level-species">
                    <div class="level-marker">S</div>
                    <small>Species</small>
                </div>
            </div>

            <div class="row">
                <div class="col-md-12 mb-4">
                    <div class="taxonomy-path card p-3 mb-3">
                        <h6>Current Selection:</h6>
                        <div id="current-path" class="d-flex flex-wrap align-items-center">
                            <span class="badge bg-secondary me-2 mb-2">All Life</span>
                        </div>
                    </div>
                    
                    <button id="show-species-btn" class="btn btn-success mb-3">Show Species</button>
                    <button id="reset-tree-btn" class="btn btn-outline-secondary mb-3 ms-2">Reset</button>
                    <button id="debug-tree-btn" class="btn btn-outline-danger mb-3 ms-2">Debug Tree</button>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span id="current-rank">Domain</span>
                            <div class="spinner-border spinner-border-sm text-primary d-none" id="rank-loading" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="rank-options" class="d-flex flex-wrap">
                                <!-- Rank options will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="phylo-species-container" class="row">
                <!-- Species cards will be loaded here when Show Species is clicked -->
            </div>
        `;

        phyloContainer.innerHTML = phyloHTML;
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

        // Clear the cache to force fresh loading
        this.loadingCache.clear();
        
        // Reload rank options for domain level
        this.loadRankOptions();
    }

    // Setup event listeners
    setupEventListeners() {
        // Show Species button
        const showSpeciesBtn = document.getElementById('show-species-btn');
        if (showSpeciesBtn) {
            showSpeciesBtn.onclick = () => this.showSpeciesForCurrentSelection();
        }

        // Reset Tree button
        const resetBtn = document.getElementById('reset-tree-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                TaxonomyUtils.log('Reset button clicked');
                this.reset();
            };
        }

        // Debug Tree button
        const debugBtn = document.getElementById('debug-tree-btn');
        if (debugBtn) {
            debugBtn.onclick = () => this.debugTree();
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

        TaxonomyUtils.log(`Loading rank options for: ${this.currentRank}, path length: ${this.currentPath.length}`);

        // Show loading state
        optionsContainer.innerHTML = '';
        if (loadingSpinner) {
            loadingSpinner.classList.remove('d-none');
        }

        try {
            let rankData = [];
            
            // Check cache first
            const cacheKey = this.getCacheKey();
            TaxonomyUtils.log(`Cache key: ${cacheKey}`);
            
            if (this.loadingCache.has(cacheKey)) {
                rankData = this.loadingCache.get(cacheKey);
                TaxonomyUtils.log('Using cached data');
            } else {
                TaxonomyUtils.log('Fetching fresh data from API');
                
                // Fetch from API
                if (this.currentPath.length > 0) {
                    const parentRankIndex = this.rankOrder.indexOf(this.currentRank) - 1;
                    if (parentRankIndex >= 0) {
                        const parentRank = this.rankOrder[parentRankIndex];
                        const parentId = this.currentPath[parentRankIndex].id;
                        TaxonomyUtils.log(`Fetching ${this.currentRank} with parent ${parentRank}:${parentId}`);
                        rankData = await taxonomyAPI.getTaxonomicRank(this.currentRank, parentRank, parentId);
                    }
                } else {
                    TaxonomyUtils.log(`Fetching ${this.currentRank} (root level)`);
                    rankData = await taxonomyAPI.getTaxonomicRank(this.currentRank);
                }

                // Use fallback data for domains if API returns empty
                if (this.currentRank === 'domain' && (!rankData || rankData.length === 0)) {
                    TaxonomyUtils.log('Using fallback domain data');
                    rankData = this.getFallbackDomainData();
                }

                // Cache the result only if we got valid data
                if (rankData && rankData.length > 0) {
                    this.loadingCache.set(cacheKey, rankData);
                    TaxonomyUtils.log(`Cached ${rankData.length} items for ${cacheKey}`);
                }
            }

            this.renderRankOptions(optionsContainer, rankData);

        } catch (error) {
            TaxonomyUtils.error('Error loading rank options:', error);
            
            // For domain level, always try fallback
            if (this.currentRank === 'domain') {
                TaxonomyUtils.log('API failed for domains, using fallback');
                const fallbackData = this.getFallbackDomainData();
                this.renderRankOptions(optionsContainer, fallbackData);
            } else {
                this.showRankError(optionsContainer);
            }
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
        
        button.onclick = () => {
            this.selectRankOption({
                id: item.id,
                name: item.name,
                description: item.description || ''
            });
        };
        
        return button;
    }

    // Handle selection of rank option
    selectRankOption(item) {
        // Show confirmation modal if available, otherwise proceed directly
        if (window.modalManager) {
            this.showSelectionModal(item);
        } else {
            this.confirmSelection(item);
        }
    }

    // Show selection confirmation modal
    showSelectionModal(item) {
        // Create a simple confirmation modal
        const modalHtml = `
            <div class="modal fade" id="phyloConfirmModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Confirm Selection</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h4>${item.name || "Unknown"}</h4>
                            <div class="mb-3">
                                <span class="badge bg-secondary">${TaxonomyUtils.capitalize(this.currentRank)}</span>
                            </div>
                            <div class="description-container">
                                <h6>Description:</h6>
                                <p>${item.description && item.description.trim() !== '' ? item.description : `No description available for this ${this.currentRank}.`}</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Back to Selection</button>
                            <button type="button" class="btn btn-primary" id="confirm-phylo-selection">Confirm Selection</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        const modal = modalContainer.querySelector('#phyloConfirmModal');
        const confirmBtn = modal.querySelector('#confirm-phylo-selection');

        // Setup event listeners
        confirmBtn.onclick = () => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
            this.confirmSelection(item);
        };

        modal.addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });

        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
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
            if (window.speciesManager) {
                const card = speciesManager.createSpeciesCard(speciesData);
                container.appendChild(card);
            } else {
                // Fallback rendering
                this.renderSpeciesCardFallback(container, speciesData);
            }
        });
    }

    // Fallback species card rendering
    renderSpeciesCardFallback(container, species) {
        const card = document.createElement('div');
        card.className = 'col-md-4';
        card.innerHTML = `
            <div class="species-card">
                ${species.image_url ? `<img src="${species.image_url}" alt="${species.common_name || ''}" class="img-fluid mb-2">` : ''}
                <h4>${species.common_name || 'Unknown'}</h4>
                <p class="scientific-name">${species.genus_name || ''} ${species.name || ''}</p>
                <p>${species.description ? species.description.substring(0, 100) + '...' : 'No description available.'}</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="if(window.speciesManager) speciesManager.viewSpeciesDetails('${species.id}')">
                    View Details
                </button>
            </div>
        `;
        container.appendChild(card);
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
        console.log('Initialized:', this.initialized);
        
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