// Modal management functionality

class ModalManager {
    constructor() {
        this.activeModals = new Set();
    }

    // Initialize modal management
    initialize() {
        this.loadModalTemplates();
        this.setupGlobalModalHandlers();
    }

    // Load modal templates into the page
    loadModalTemplates() {
        const modalsContainer = document.getElementById('modals-container');
        if (!modalsContainer) {
            TaxonomyUtils.error('Modals container not found');
            return;
        }

        // Add taxonomy description modal
        const taxonomyModal = this.createTaxonomyDescriptionModal();
        modalsContainer.appendChild(taxonomyModal);
    }

    // Create taxonomy description modal
    createTaxonomyDescriptionModal() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="taxonomyDescriptionModal" tabindex="-1" aria-labelledby="taxonomyDescriptionModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="taxonomyDescriptionModalLabel">Confirm Selection</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <h4 id="taxonomy-item-name" class="mb-3"></h4>
                            <div class="taxonomy-rank-badge mb-3">
                                <span id="taxonomy-rank" class="badge bg-secondary"></span>
                            </div>
                            <div class="description-container">
                                <h6>Description:</h6>
                                <p id="taxonomy-item-description">No description available.</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Back to Selection</button>
                            <button type="button" class="btn btn-primary" id="confirm-taxonomy-selection">Confirm Selection</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return modal.firstElementChild;
    }

    // Setup global modal event handlers
    setupGlobalModalHandlers() {
        // Handle modal cleanup
        document.addEventListener('hidden.bs.modal', (event) => {
            this.cleanupModal(event.target);
        });

        // Handle escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeTopModal();
            }
        });

        // Prevent multiple modals from stacking
        document.addEventListener('show.bs.modal', (event) => {
            this.handleModalShow(event.target);
        });
    }

    // Handle modal show event
    handleModalShow(modal) {
        this.activeModals.add(modal);
        
        // Update z-index for stacking
        const zIndex = 1050 + (this.activeModals.size * 10);
        modal.style.zIndex = zIndex;
        
        // Update backdrop z-index
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop:last-child');
            if (backdrop) {
                backdrop.style.zIndex = zIndex - 1;
            }
        }, 100);
    }

    // Clean up modal after hiding
    cleanupModal(modal) {
        this.activeModals.delete(modal);
        
        // Remove any stuck backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > this.activeModals.size) {
            const excessBackdrops = Array.from(backdrops).slice(this.activeModals.size);
            excessBackdrops.forEach(backdrop => backdrop.remove());
        }

        // Reset body styles if no modals are open
        if (this.activeModals.size === 0) {
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
        }
    }

    // Close the top-most modal
    closeTopModal() {
        if (this.activeModals.size === 0) return;

        const modals = Array.from(this.activeModals);
        const topModal = modals[modals.length - 1];
        
        const modalInstance = bootstrap.Modal.getInstance(topModal);
        if (modalInstance) {
            modalInstance.hide();
        }
    }

    // Create and show a confirmation modal
    showConfirmationModal(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmClass = 'btn-primary',
            onConfirm = () => {},
            onCancel = () => {}
        } = options;

        return new Promise((resolve) => {
            const modalId = 'confirmModal_' + Date.now();
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>${message}</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>
                                <button type="button" class="btn ${confirmClass}" id="${modalId}_confirm">${confirmText}</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to page
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer);

            const modal = modalContainer.querySelector(`#${modalId}`);
            const confirmBtn = modal.querySelector(`#${modalId}_confirm`);

            // Setup event listeners
            confirmBtn.addEventListener('click', () => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                modalInstance.hide();
                onConfirm();
                resolve(true);
            });

            modal.addEventListener('hidden.bs.modal', () => {
                modalContainer.remove();
                onCancel();
                resolve(false);
            });

            // Show modal
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
        });
    }

    // Create and show an alert modal
    showAlertModal(options = {}) {
        const {
            title = 'Alert',
            message = '',
            type = 'info', // info, success, warning, danger
            buttonText = 'OK',
            onClose = () => {}
        } = options;

        const iconMap = {
            info: 'bi-info-circle text-info',
            success: 'bi-check-circle text-success',
            warning: 'bi-exclamation-triangle text-warning',
            danger: 'bi-exclamation-triangle text-danger'
        };

        const modalId = 'alertModal_' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi ${iconMap[type]} me-2"></i>
                                ${title}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">${buttonText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        const modal = modalContainer.querySelector(`#${modalId}`);

        // Setup cleanup
        modal.addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
            onClose();
        });

        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        return modalInstance;
    }

    // Create and show a loading modal
    showLoadingModal(message = 'Loading...') {
        const modalId = 'loadingModal_' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-body text-center p-4">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mb-0">${message}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        const modal = modalContainer.querySelector(`#${modalId}`);

        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        // Return object with hide method
        return {
            hide: () => {
                modalInstance.hide();
                setTimeout(() => {
                    modalContainer.remove();
                }, 300);
            }
        };
    }

    // Force cleanup all modals
    forceCleanup() {
        // Remove all modal backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Hide all open modals
        this.activeModals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
        
        // Clear active modals set
        this.activeModals.clear();
        
        // Reset body classes and styles
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        
        TaxonomyUtils.log('Force cleaned up all modals');
    }

    // Check if any modals are currently open
    hasOpenModals() {
        return this.activeModals.size > 0;
    }

    // Get count of open modals
    getOpenModalCount() {
        return this.activeModals.size;
    }
}

// Create global modal manager instance
window.modalManager = new ModalManager();