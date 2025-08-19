// Tag management functionality

class TagManager {
    constructor() {
        this.tags = [];
        this.tagCache = null;
    }

    // Load and display tags
    async loadTags() {
        const container = document.getElementById('tag-filters');
        if (!container) {
            TaxonomyUtils.error('Tag filters container not found');
            return;
        }

        try {
            // Use cached data if available
            if (this.tagCache) {
                this.tags = this.tagCache;
            } else {
                this.tags = await taxonomyAPI.getAllTags();
                this.tagCache = this.tags;
            }

            this.renderTagFilters(container);

        } catch (error) {
            TaxonomyUtils.error('Error loading tags:', error);
            this.showTagError(container);
        }
    }

    // Render tag filter buttons
    renderTagFilters(container) {
        container.innerHTML = '<span class="me-2 fw-semibold">Filter by tag:</span>';

        if (!this.tags || this.tags.length === 0) {
            const noTagsSpan = document.createElement('span');
            noTagsSpan.className = 'text-muted';
            noTagsSpan.textContent = 'No tags available';
            container.appendChild(noTagsSpan);
            return;
        }

        this.tags.forEach(tag => {
            const tagButton = this.createTagButton(tag);
            container.appendChild(tagButton);
        });

        // Add "All" button to clear filters
        const allButton = this.createAllButton();
        container.insertBefore(allButton, container.children[1]);
    }

    // Create individual tag button
    createTagButton(tag) {
        const button = document.createElement('button');
        button.className = 'btn btn-sm btn-outline-secondary me-1 mb-1';
        button.textContent = tag.name;
        button.title = tag.description || `Filter by ${tag.name}`;
        
        button.addEventListener('click', () => {
            this.selectTag(tag.name, button);
        });

        return button;
    }

    // Create "All" button to clear filters
    createAllButton() {
        const button = document.createElement('button');
        button.className = 'btn btn-sm btn-primary me-2 mb-1';
        button.textContent = 'All';
        button.title = 'Show all species';
        
        button.addEventListener('click', () => {
            this.clearTagSelection();
        });

        return button;
    }

    // Handle tag selection
    async selectTag(tagName, buttonElement) {
        try {
            // Update button states
            this.updateButtonStates(buttonElement);

            // Load species with selected tag
            await speciesManager.loadSpecies('', tagName);

            TaxonomyUtils.log('Selected tag:', tagName);

        } catch (error) {
            TaxonomyUtils.error('Error selecting tag:', error);
            this.showTagSelectionError();
        }
    }

    // Clear tag selection
    async clearTagSelection() {
        try {
            // Reset button states
            this.resetButtonStates();

            // Load all species
            await speciesManager.loadSpecies();

            TaxonomyUtils.log('Cleared tag selection');

        } catch (error) {
            TaxonomyUtils.error('Error clearing tag selection:', error);
        }
    }

    // Update button states for selection
    updateButtonStates(selectedButton) {
        const container = document.getElementById('tag-filters');
        if (!container) return;

        // Reset all buttons
        const buttons = container.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.classList.remove('btn-primary', 'btn-secondary');
            if (btn.textContent === 'All') {
                btn.classList.add('btn-outline-primary');
            } else {
                btn.classList.add('btn-outline-secondary');
            }
        });

        // Highlight selected button
        if (selectedButton) {
            selectedButton.classList.remove('btn-outline-secondary');
            selectedButton.classList.add('btn-secondary');
        }
    }

    // Reset button states
    resetButtonStates() {
        const container = document.getElementById('tag-filters');
        if (!container) return;

        const buttons = container.querySelectorAll('.btn');
        buttons.forEach(btn => {
            if (btn.textContent === 'All') {
                btn.classList.remove('btn-outline-primary');
                btn.classList.add('btn-primary');
            } else {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-outline-secondary');
            }
        });
    }

    // Show error state for tags
    showTagError(container) {
        container.innerHTML = `
            <span class="text-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Error loading tags
            </span>
        `;
    }

    // Show tag selection error
    showTagSelectionError() {
        const alert = document.createElement('div');
        alert.className = 'alert alert-warning alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
        alert.innerHTML = `
            <i class="bi bi-exclamation-triangle"></i>
            Error filtering by tag. Please try again.
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

    // Get tag by name
    getTagByName(tagName) {
        return this.tags.find(tag => tag.name === tagName);
    }

    // Add new tag (for form usage)
    addTag(tagName, description = '') {
        const newTag = {
            id: TaxonomyUtils.generateId(),
            name: tagName,
            description: description
        };

        this.tags.push(newTag);
        this.tagCache = null; // Clear cache to force reload
        
        return newTag;
    }

    // Validate tag name
    validateTagName(tagName) {
        if (!tagName || typeof tagName !== 'string') {
            return { valid: false, message: 'Tag name is required' };
        }

        const trimmedName = tagName.trim();
        if (trimmedName.length === 0) {
            return { valid: false, message: 'Tag name cannot be empty' };
        }

        if (trimmedName.length > 50) {
            return { valid: false, message: 'Tag name must be 50 characters or less' };
        }

        // Check for duplicate names
        const exists = this.tags.some(tag => 
            tag.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (exists) {
            return { valid: false, message: 'Tag name already exists' };
        }

        return { valid: true, name: trimmedName };
    }

    // Parse tags from input string
    parseTagsFromInput(tagsInput) {
        if (!tagsInput) return [];

        return tagsInput
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates
    }

    // Clear cache
    clearCache() {
        this.tagCache = null;
        TaxonomyUtils.log('Tag cache cleared');
    }

    // Refresh tags from server
    async refreshTags() {
        this.clearCache();
        await this.loadTags();
    }
}

// Create global tag manager instance
window.tagManager = new TagManager();