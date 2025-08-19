// Import/Export functionality

class ImportExportManager {
    constructor() {
        this.isProcessing = false;
    }

    // Initialize import/export functionality
    initialize() {
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Export button
        const exportButton = document.getElementById('export-button');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportDatabase());
        }

        // Import form
        const importForm = document.getElementById('import-form');
        if (importForm) {
            importForm.addEventListener('submit', (e) => this.importDatabase(e));
        }

        // Schema button
        const schemaButton = document.getElementById('schema-button');
        if (schemaButton) {
            schemaButton.addEventListener('click', () => this.getSchema());
        }
    }

    // Export database to JSON
    async exportDatabase() {
        if (this.isProcessing) {
            TaxonomyUtils.log('Export already in progress');
            return;
        }

        const button = document.getElementById('export-button');
        const originalText = button ? button.textContent : '';
        
        try {
            this.isProcessing = true;
            this.updateButtonState(button, 'Exporting...', true);

            const result = await taxonomyAPI.exportDatabase();
            
            if (result) {
                // Trigger download
                window.location.href = '/taxonomy_export.json';
                this.showSuccessMessage('Database exported successfully!');
            } else {
                throw new Error('Export failed');
            }

        } catch (error) {
            TaxonomyUtils.error('Error exporting database:', error);
            this.showErrorMessage('Error exporting database. Please try again.');
        } finally {
            this.isProcessing = false;
            this.updateButtonState(button, originalText, false);
        }
    }

    // Import database from JSON file
    async importDatabase(event) {
        event.preventDefault();

        if (this.isProcessing) {
            TaxonomyUtils.log('Import already in progress');
            return;
        }

        const fileInput = document.getElementById('import-file');
        const file = fileInput ? fileInput.files[0] : null;

        if (!file) {
            this.showWarningMessage('Please select a file to import.');
            return;
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.json')) {
            this.showWarningMessage('Please select a JSON file.');
            return;
        }

        // Confirm import
        const confirmed = await this.confirmImport();
        if (!confirmed) {
            return;
        }

        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton ? submitButton.textContent : '';

        try {
            this.isProcessing = true;
            this.updateButtonState(submitButton, 'Importing...', true);

            // Create FormData
            const formData = new FormData();
            formData.append('file', file);

            const result = await taxonomyAPI.importDatabase(formData);

            if (result && !result.error) {
                this.showSuccessMessage('Database imported successfully!');
                
                // Clear caches and reload
                this.clearAllCaches();
                
                // Reload page after short delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                throw new Error(result?.error || 'Import failed');
            }

        } catch (error) {
            TaxonomyUtils.error('Error importing database:', error);
            this.showErrorMessage(`Error importing database: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.updateButtonState(submitButton, originalText, false);
            
            // Clear file input
            if (fileInput) {
                fileInput.value = '';
            }
        }
    }

    // Get and display database schema
    async getSchema() {
        const button = document.getElementById('schema-button');
        const contentElement = document.getElementById('schema-content');
        const originalText = button ? button.textContent : '';

        try {
            this.updateButtonState(button, 'Generating...', true);

            const result = await taxonomyAPI.getSchema();
            
            if (result && result.schema) {
                // Display schema
                if (contentElement) {
                    contentElement.textContent = result.schema;
                    contentElement.style.display = 'block';
                }

                // Create/update download link
                this.createSchemaDownloadLink(result.schema, contentElement);
                
                this.showSuccessMessage('Schema generated successfully!');
            } else {
                throw new Error('Schema generation failed');
            }

        } catch (error) {
            TaxonomyUtils.error('Error getting schema:', error);
            this.showErrorMessage('Error getting schema. Please try again.');
        } finally {
            this.updateButtonState(button, originalText, false);
        }
    }

    // Create download link for schema
    createSchemaDownloadLink(schema, contentElement) {
        if (!contentElement) return;

        const parentElement = contentElement.parentElement;
        if (!parentElement) return;

        // Remove existing download link
        const existingLink = parentElement.querySelector('.schema-download-link');
        if (existingLink) {
            existingLink.remove();
        }

        // Create new download link
        const downloadLink = document.createElement('a');
        downloadLink.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(schema);
        downloadLink.download = 'taxonomy_schema.sql';
        downloadLink.className = 'btn btn-outline-primary mt-2 schema-download-link';
        downloadLink.innerHTML = '<i class="bi bi-download"></i> Download SQL Schema';
        
        parentElement.appendChild(downloadLink);
    }

    // Confirm import operation
    async confirmImport() {
        return new Promise((resolve) => {
            const modalHtml = `
                <div class="modal fade" id="confirmImportModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Confirm Import</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle"></i>
                                    <strong>Warning:</strong> This will overwrite all existing data in the database.
                                    This action cannot be undone.
                                </div>
                                <p>Are you sure you want to proceed with the import?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmImportBtn">Import Database</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to page
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer);

            const modal = modalContainer.querySelector('#confirmImportModal');
            const confirmBtn = modal.querySelector('#confirmImportBtn');

            // Setup event listeners
            confirmBtn.addEventListener('click', () => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                modalInstance.hide();
                resolve(true);
            });

            modal.addEventListener('hidden.bs.modal', () => {
                modalContainer.remove();
                resolve(false);
            });

            // Show modal
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
        });
    }

    // Update button state
    updateButtonState(button, text, disabled) {
        if (!button) return;

        button.textContent = text;
        button.disabled = disabled;

        if (disabled) {
            button.classList.add('disabled');
        } else {
            button.classList.remove('disabled');
        }
    }

    // Show success message
    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    // Show error message
    showErrorMessage(message) {
        this.showNotification(message, 'danger');
    }

    // Show warning message
    showWarningMessage(message) {
        this.showNotification(message, 'warning');
    }

    // Show notification
    showNotification(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        
        const iconMap = {
            success: 'bi-check-circle',
            danger: 'bi-exclamation-triangle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        };

        alert.innerHTML = `
            <i class="bi ${iconMap[type] || iconMap.info}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // Clear all caches
    clearAllCaches() {
        if (window.speciesManager) {
            speciesManager.clearCache();
        }
        
        if (window.tagManager) {
            tagManager.clearCache();
        }
        
        if (window.phylogeneticTree) {
            phylogeneticTree.loadingCache.clear();
        }
        
        TaxonomyUtils.log('All caches cleared');
    }

    // Validate file before upload
    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!file) {
            return { valid: false, message: 'No file selected' };
        }

        if (!file.name.toLowerCase().endsWith('.json')) {
            return { valid: false, message: 'File must be a JSON file' };
        }

        if (file.size > maxSize) {
            return { valid: false, message: 'File size must be less than 10MB' };
        }

        return { valid: true };
    }
}

// Create global import/export manager instance
window.importExportManager = new ImportExportManager();