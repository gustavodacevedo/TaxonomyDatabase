// Main application initialization and coordination

class TaxonomyApp {
    constructor() {
        this.initialized = false;
        this.currentTab = 'explorer';
        this.tabContentLoaded = {
            phylo: false,
            add: false,
            'import-export': false
        };
    }

    // Initialize the application
    async initialize() {
        if (this.initialized) {
            TaxonomyUtils.log('Application already initialized');
            return;
        }

        try {
            TaxonomyUtils.log('Initializing Taxonomic Database Application');

            // Initialize core components
            this.initializeModalManager();
            this.initializeEventListeners();
            this.initializeFormHandlers();
            this.initializeTabHandlers();
            
            // Load initial data
            await this.loadInitialData();
            
            this.initialized = true;
            TaxonomyUtils.log('Application initialized successfully');

        } catch (error) {
            TaxonomyUtils.error('Failed to initialize application:', error);
            this.showInitializationError();
        }
    }

    // Initialize modal manager
    initializeModalManager() {
        if (window.modalManager) {
            modalManager.initialize();
        }
    }

    // Initialize main event listeners
    initializeEventListeners() {
        // Search functionality
        this.setupSearchHandlers();
        
        // Import/Export functionality
        if (window.importExportManager) {
            importExportManager.initialize();
        }
    }

    // Setup search handlers
    setupSearchHandlers() {
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');

        if (searchInput && searchButton) {
            // Debounced search on input
            const debouncedSearch = TaxonomyUtils.debounce((term) => {
                if (term.length >= 2 || term.length === 0) {
                    speciesManager.loadSpecies(term);
                }
            }, 300);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });

            // Search on button click
            searchButton.addEventListener('click', () => {
                const searchTerm = searchInput.value;
                speciesManager.loadSpecies(searchTerm);
            });

            // Search on Enter key
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const searchTerm = searchInput.value;
                    speciesManager.loadSpecies(searchTerm);
                }
            });
        }
    }

    // Initialize form handlers
    initializeFormHandlers() {
        // Form handlers will be set up when the add tab is loaded
    }

    // Initialize tab handlers
    initializeTabHandlers() {
        // Get all tab buttons
        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (e) => {
                const targetTab = e.target.getAttribute('data-bs-target').replace('#', '');
                this.handleTabChange(targetTab);
            });
        });
    }

    // Handle tab changes and load content dynamically
    async handleTabChange(tabName) {
        this.currentTab = tabName;
        TaxonomyUtils.log(`Switched to tab: ${tabName}`);

        switch (tabName) {
            case 'explorer':
                // Ensure species and tags are loaded
                if (!speciesManager.currentSpecies.length) {
                    await speciesManager.loadSpecies();
                }
                break;

            case 'phylo':
                await this.loadPhyloTab();
                break;

            case 'add':
                await this.loadAddTab();
                break;

            case 'import-export':
                await this.loadImportExportTab();
                break;
        }
    }

    // Load phylogenetic tree tab content
    async loadPhyloTab() {
        if (this.tabContentLoaded.phylo) {
            // Already loaded, just initialize if needed
            if (window.phylogeneticTree && !phylogeneticTree.initialized) {
                phylogeneticTree.initialize();
            }
            return;
        }

        const phyloContent = document.getElementById('phylo-content');
        if (!phyloContent) {
            TaxonomyUtils.error('Phylo content container not found');
            return;
        }

        try {
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

            phyloContent.innerHTML = phyloHTML;
            this.tabContentLoaded.phylo = true;

            // Initialize phylogenetic tree
            if (window.phylogeneticTree) {
                setTimeout(() => {
                    phylogeneticTree.initialize();
                }, 100);
            }

        } catch (error) {
            TaxonomyUtils.error('Error loading phylo tab:', error);
            phyloContent.innerHTML = '<div class="alert alert-danger">Error loading phylogenetic tree. Please refresh the page.</div>';
        }
    }

    // Load add species tab content
    async loadAddTab() {
        if (this.tabContentLoaded.add) {
            return;
        }

        const addContent = document.getElementById('add-species-content');
        if (!addContent) {
            TaxonomyUtils.error('Add species content container not found');
            return;
        }

        try {
            const addHTML = `
                <h3>Add New Species</h3>
                <form id="add-species-form">
                    <div class="row">
                        <div class="col-md-6">
                            <h4>Taxonomy</h4>
                            <div class="mb-3">
                                <label for="domain" class="form-label">Domain <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="domain" name="domain" required>
                                <div class="form-text">e.g., Eukarya, Bacteria, Archaea</div>
                            </div>
                            <div class="mb-3">
                                <label for="kingdom" class="form-label">Kingdom <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="kingdom" name="kingdom" required>
                                <div class="form-text">e.g., Animalia, Plantae, Fungi</div>
                            </div>
                            <div class="mb-3">
                                <label for="phylum" class="form-label">Phylum <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="phylum" name="phylum" required>
                                <div class="form-text">e.g., Chordata, Arthropoda</div>
                            </div>
                            <div class="mb-3">
                                <label for="class" class="form-label">Class <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="class" name="class" required>
                                <div class="form-text">e.g., Mammalia, Insecta</div>
                            </div>
                            <div class="mb-3">
                                <label for="order" class="form-label">Order <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="order" name="order" required>
                                <div class="form-text">e.g., Primates, Carnivora</div>
                            </div>
                            <div class="mb-3">
                                <label for="family" class="form-label">Family <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="family" name="family" required>
                                <div class="form-text">e.g., Felidae, Canidae</div>
                            </div>
                            <div class="mb-3">
                                <label for="genus" class="form-label">Genus <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="genus" name="genus" required>
                                <div class="form-text">e.g., Panthera, Canis</div>
                            </div>
                            <div class="mb-3">
                                <label for="species-name" class="form-label">Species <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="species-name" name="species_name" required>
                                <div class="form-text">e.g., leo, lupus</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h4>Species Details</h4>
                            <div class="mb-3">
                                <label for="common-name" class="form-label">Common Name</label>
                                <input type="text" class="form-control" id="common-name" name="common_name">
                                <div class="form-text">e.g., Lion, Gray Wolf</div>
                            </div>
                            <div class="mb-3">
                                <label for="description" class="form-label">Description</label>
                                <textarea class="form-control" id="description" name="description" rows="3"></textarea>
                                <div class="form-text">Brief description of the species</div>
                            </div>
                            <div class="mb-3">
                                <label for="image-url" class="form-label">Image URL</label>
                                <input type="url" class="form-control" id="image-url" name="image_url">
                                <div class="form-text">URL to an image of the species</div>
                            </div>
                            <div class="mb-3">
                                <label for="distribution-map-url" class="form-label">Distribution Map URL</label>
                                <input type="url" class="form-control" id="distribution-map-url" name="distribution_map_url">
                                <div class="form-text">URL to a distribution map</div>
                            </div>
                            <div class="mb-3">
                                <label for="discovery-year" class="form-label">Discovery Year</label>
                                <input type="number" class="form-control" id="discovery-year" name="discovery_year" min="1700" max="2024">
                                <div class="form-text">Year the species was first described</div>
                            </div>
                            <div class="mb-3">
                                <label for="conservation-status" class="form-label">Conservation Status</label>
                                <select class="form-control" id="conservation-status" name="conservation_status">
                                    <option value="">-- Select Status --</option>
                                    <option value="Not Evaluated">Not Evaluated</option>
                                    <option value="Data Deficient">Data Deficient</option>
                                    <option value="Least Concern">Least Concern</option>
                                    <option value="Near Threatened">Near Threatened</option>
                                    <option value="Vulnerable">Vulnerable</option>
                                    <option value="Endangered">Endangered</option>
                                    <option value="Critically Endangered">Critically Endangered</option>
                                    <option value="Extinct in the Wild">Extinct in the Wild</option>
                                    <option value="Extinct">Extinct</option>
                                </select>
                                <div class="form-text">IUCN conservation status</div>
                            </div>
                            <div class="mb-3">
                                <label for="habitat" class="form-label">Habitat</label>
                                <input type="text" class="form-control" id="habitat" name="habitat">
                                <div class="form-text">Primary habitat of the species</div>
                            </div>
                            <div class="mb-3">
                                <label for="tags" class="form-label">Tags</label>
                                <input type="text" class="form-control" id="tags" name="tags">
                                <div class="form-text">Comma-separated tags for categorization</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="d-flex justify-content-between">
                                <small class="text-muted"><span class="text-danger">*</span> Required fields</small>
                                <div>
                                    <button type="button" class="btn btn-outline-secondary me-2" onclick="document.getElementById('add-species-form').reset()">
                                        Clear Form
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-plus-circle"></i>
                                        Add Species
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            `;

            addContent.innerHTML = addHTML;
            this.tabContentLoaded.add = true;

            // Setup form handler
            this.setupAddSpeciesForm();

        } catch (error) {
            TaxonomyUtils.error('Error loading add tab:', error);
            addContent.innerHTML = '<div class="alert alert-danger">Error loading add species form. Please refresh the page.</div>';
        }
    }

    // Load import/export tab content
    async loadImportExportTab() {
        if (this.tabContentLoaded['import-export']) {
            return;
        }

        const importExportContent = document.getElementById('import-export-content');
        if (!importExportContent) {
            TaxonomyUtils.error('Import/export content container not found');
            return;
        }

        try {
            const importExportHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header">
                                <i class="bi bi-download"></i>
                                Export Database
                            </div>
                            <div class="card-body">
                                <p>Download the entire database as a JSON file for backup or transfer purposes.</p>
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i>
                                    The export will include all species, taxonomic classifications, and tags.
                                </div>
                                <button id="export-button" class="btn btn-primary">
                                    <i class="bi bi-download"></i>
                                    Export Database
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header">
                                <i class="bi bi-upload"></i>
                                Import Database
                            </div>
                            <div class="card-body">
                                <p>Import database from a JSON file. This will replace all existing data.</p>
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle"></i>
                                    <strong>Warning:</strong> This operation will overwrite all existing data and cannot be undone.
                                </div>
                                <form id="import-form">
                                    <div class="mb-3">
                                        <label for="import-file" class="form-label">Select JSON file</label>
                                        <input type="file" class="form-control" id="import-file" accept=".json" required>
                                        <div class="form-text">Choose a JSON file exported from this application</div>
                                    </div>
                                    <button type="submit" class="btn btn-warning">
                                        <i class="bi bi-upload"></i>
                                        Import Database
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <i class="bi bi-file-earmark-code"></i>
                        SQL Schema
                    </div>
                    <div class="card-body">
                        <p>Generate and download the SQL schema for the taxonomic database.</p>
                        <div class="alert alert-secondary">
                            <i class="bi bi-database"></i>
                            This will generate the complete database schema including all tables, relationships, and indexes.
                        </div>
                        <button id="schema-button" class="btn btn-outline-primary">
                            <i class="bi bi-file-earmark-code"></i>
                            Generate Schema
                        </button>
                        <div class="mt-3">
                            <pre id="schema-content" class="bg-light p-3 border rounded" style="display: none; max-height: 400px; overflow-y: auto;"></pre>
                        </div>
                    </div>
                </div>
            `;

            importExportContent.innerHTML = importExportHTML;
            this.tabContentLoaded['import-export'] = true;

            // Initialize import/export functionality
            if (window.importExportManager) {
                importExportManager.initialize();
            }

        } catch (error) {
            TaxonomyUtils.error('Error loading import/export tab:', error);
            importExportContent.innerHTML = '<div class="alert alert-danger">Error loading import/export functionality. Please refresh the page.</div>';
        }
    }

    // Setup add species form
    setupAddSpeciesForm() {
        const addSpeciesForm = document.getElementById('add-species-form');
        if (addSpeciesForm) {
            addSpeciesForm.addEventListener('submit', (e) => this.handleAddSpecies(e));
        }
    }

    // Load initial data for the application
    async loadInitialData() {
        try {
            // Load species for explorer tab
            await speciesManager.loadSpecies();
            
            // Load tags for filtering
            await tagManager.loadTags();

        } catch (error) {
            TaxonomyUtils.error('Error loading initial data:', error);
            // Don't throw here - app can still function with limited features
        }
    }

    // Handle add species form submission
    async handleAddSpecies(event) {
        event.preventDefault();

        const form = event.target;
        const formData = this.extractFormData(form);

        // Validate form data
        const validation = this.validateSpeciesForm(formData);
        if (!validation.valid) {
            this.showValidationErrors(validation.errors);
            return;
        }

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Adding Species...';
        submitButton.disabled = true;

        try {
            // Add species via species manager
            const result = await speciesManager.addSpecies(formData);
            
            if (result.success) {
                // Reset form
                form.reset();
                
                // Switch to explorer tab and refresh
                document.getElementById('explorer-tab').click();
                await speciesManager.loadSpecies();
                await tagManager.refreshTags();
                
                // Show success message
                speciesManager.showSuccessMessage('Species added successfully!');
            }

        } catch (error) {
            TaxonomyUtils.error('Error adding species:', error);
            if (window.modalManager) {
                modalManager.showAlertModal({
                    title: 'Error',
                    message: 'Failed to add species. Please check your data and try again.',
                    type: 'danger'
                });
            } else {
                alert('Failed to add species. Please check your data and try again.');
            }
        } finally {
            // Restore button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    // Extract form data
    extractFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        // Extract all form fields
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Handle tags specially
        const tagsInput = form.querySelector('#tags');
        if (tagsInput && window.tagManager) {
            data.tags = tagManager.parseTagsFromInput(tagsInput.value);
        }

        // Convert empty strings to null for optional fields
        const optionalFields = ['common_name', 'description', 'image_url', 'distribution_map_url', 
                              'discovery_year', 'conservation_status', 'habitat'];
        
        optionalFields.forEach(field => {
            if (data[field] === '') {
                data[field] = null;
            }
        });

        return data;
    }

    // Validate species form data
    validateSpeciesForm(data) {
        const errors = [];

        // Required taxonomy fields
        const requiredFields = ['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species_name'];
        
        requiredFields.forEach(field => {
            if (!data[field] || data[field].trim() === '') {
                errors.push(`${TaxonomyUtils.capitalize(field.replace('_', ' '))} is required`);
            }
        });

        // Validate discovery year if provided
        if (data.discovery_year && data.discovery_year !== '') {
            const year = parseInt(data.discovery_year);
            const currentYear = new Date().getFullYear();
            
            if (isNaN(year) || year < 1700 || year > currentYear) {
                errors.push('Discovery year must be between 1700 and current year');
            }
        }

        // Validate URLs if provided
        if (data.image_url && data.image_url !== '') {
            if (!this.isValidUrl(data.image_url)) {
                errors.push('Image URL must be a valid URL');
            }
        }

        if (data.distribution_map_url && data.distribution_map_url !== '') {
            if (!this.isValidUrl(data.distribution_map_url)) {
                errors.push('Distribution map URL must be a valid URL');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Show validation errors
    showValidationErrors(errors) {
        const errorMessage = 'Please fix the following errors:\n\n' + errors.join('\n');
        
        if (window.modalManager) {
            modalManager.showAlertModal({
                title: 'Validation Error',
                message: errorMessage.replace(/\n/g, '<br>'),
                type: 'warning'
            });
        } else {
            alert(errorMessage);
        }
    }

    // Utility function to validate URLs
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Show initialization error
    showInitializationError() {
        const errorHtml = `
            <div class="alert alert-danger m-4" role="alert">
                <h4 class="alert-heading">Initialization Error</h4>
                <p>Failed to initialize the Taxonomic Database application. Please refresh the page and try again.</p>
                <hr>
                <p class="mb-0">If the problem persists, please check the browser console for more details.</p>
            </div>
        `;

        document.body.innerHTML = errorHtml;
    }

    // Get current application state
    getState() {
        return {
            initialized: this.initialized,
            currentTab: this.currentTab,
            hasOpenModals: modalManager ? modalManager.hasOpenModals() : false,
            speciesCount: speciesManager ? speciesManager.currentSpecies.length : 0,
            tagCount: tagManager ? tagManager.tags.length : 0,
            tabContentLoaded: this.tabContentLoaded
        };
    }
}

// Global function for taxonomy filtering (accessible from onclick attributes)
window.applyTaxonomyFilter = function(rank, name, id) {
    if (window.speciesManager) {
        speciesManager.applyTaxonomyFilter(rank, name, id);
    } else {
        console.error('Species manager not available');
    }
};

// Global function to clear taxonomy filter
window.clearTaxonomyFilter = function() {
    if (window.speciesManager) {
        speciesManager.clearTaxonomyFilter();
    } else {
        console.error('Species manager not available');
    }
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Create global app instance
    window.taxonomyApp = new TaxonomyApp();
    
    // Initialize the application
    taxonomyApp.initialize().catch(error => {
        TaxonomyUtils.error('Critical initialization error:', error);
    });
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && window.taxonomyApp) {
        TaxonomyUtils.log('Page became visible, checking for updates');
        // Could implement data refresh logic here
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
    if (window.taxonomyApp) {
        // Could implement tab state restoration here
        TaxonomyUtils.log('Browser navigation detected');
    }
});

// Global error handler
window.addEventListener('error', function(event) {
    TaxonomyUtils.error('Global error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    TaxonomyUtils.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent default browser behavior
});

// Create global instance and auto-initialize
if (window.imageViewer) {
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            imageViewer.initialize();
        });
    } else {
        // DOM is already ready
        imageViewer.initialize();
    }
}