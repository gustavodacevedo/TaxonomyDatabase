// Main application initialization and coordination

class TaxonomyApp {
    constructor() {
        this.initialized = false;
        this.currentTab = 'explorer';
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
        const addSpeciesForm = document.getElementById('add-species-form');
        if (addSpeciesForm) {
            addSpeciesForm.addEventListener('submit', (e) => this.handleAddSpecies(e));
        }
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

        // Initialize phylo tab handler specifically
        const phyloTab = document.getElementById('phylo-tab');
        if (phyloTab) {
            phyloTab.addEventListener('click', () => {
                setTimeout(() => {
                    if (window.phylogeneticTree && !phylogeneticTree.initialized) {
                        phylogeneticTree.initialize();
                    }
                }, 100);
            });
        }
    }

    // Handle tab changes
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
                // Initialize phylogenetic tree if not already done
                if (window.phylogeneticTree) {
                    phylogeneticTree.initialize();
                }
                break;

            case 'add':
                // Setup form autocomplete or validation if needed
                this.setupAddSpeciesForm();
                break;

            case 'import-export':
                // Import/export tab is handled by importExportManager
                break;
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
            modalManager.showAlertModal({
                title: 'Error',
                message: 'Failed to add species. Please check your data and try again.',
                type: 'danger'
            });
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
        if (tagsInput) {
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
        
        modalManager.showAlertModal({
            title: 'Validation Error',
            message: errorMessage.replace(/\n/g, '<br>'),
            type: 'warning'
        });
    }

    // Setup add species form enhancements
    setupAddSpeciesForm() {
        // Add conservation status options
        this.populateConservationStatusSelect();
        
        // Add form field enhancements
        this.enhanceFormFields();
    }

    // Populate conservation status select
    populateConservationStatusSelect() {
        const select = document.getElementById('conservation-status');
        if (!select) return;

        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Add conservation status options
        TaxonomyConfig.conservationStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            select.appendChild(option);
        });
    }

    // Enhance form fields with additional functionality
    enhanceFormFields() {
        // Add placeholder text and help text
        const fieldHelp = {
            'domain': 'e.g., Eukarya, Bacteria, Archaea',
            'kingdom': 'e.g., Animalia, Plantae, Fungi',
            'phylum': 'e.g., Chordata, Arthropoda',
            'class': 'e.g., Mammalia, Insecta',
            'order': 'e.g., Primates, Carnivora',
            'family': 'e.g., Felidae, Canidae',
            'genus': 'e.g., Panthera, Canis',
            'species_name': 'e.g., leo, lupus'
        };

        Object.entries(fieldHelp).forEach(([fieldId, helpText]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.setAttribute('placeholder', helpText);
                field.setAttribute('title', helpText);
            }
        });
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
            tagCount: tagManager ? tagManager.tags.length : 0
        };
    }
}

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
window.imageViewer = new ImageViewer();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        imageViewer.initialize();
    });
} else {
    // DOM is already ready
    imageViewer.initialize();
}