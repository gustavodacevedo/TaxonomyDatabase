// Image viewer functionality for fullscreen display

class ImageViewer {
    constructor() {
        this.currentOverlay = null;
        this.isOpen = false;
    }

    // Initialize image viewer
    initialize() {
        this.setupGlobalEventListeners();
        this.makeImagesClickable();
        TaxonomyUtils.log('Image viewer initialized');
        
        // Add global test function for debugging
        window.testImageViewer = () => this.test();
        console.log('Image viewer ready. Use testImageViewer() to test.');
    }

    // Setup global event listeners
   setupGlobalEventListeners() {
        document.addEventListener('click', (event) => {
            const img = event.target;
            
            // Only handle img tag clicks
            if (img.tagName !== 'IMG') return;
            
            // Check if it's a species card image (outside modals)
            const speciesCard = img.closest('.species-card');
            if (speciesCard && !img.closest('.modal')) {
                // This is a species card image - open details modal instead
                event.preventDefault();
                event.stopPropagation();
                
                // Find the "View Details" button and click it
                const detailsButton = speciesCard.querySelector('button[onclick*="viewSpeciesDetails"]');
                if (detailsButton) {
                    detailsButton.click();
                    console.log('Opening species details modal');
                } else {
                    // Fallback: try to extract species ID from button onclick
                    const buttons = speciesCard.querySelectorAll('button');
                    for (let button of buttons) {
                        const onclick = button.getAttribute('onclick');
                        if (onclick && onclick.includes('viewSpeciesDetails')) {
                            button.click();
                            console.log('Opening species details modal (fallback)');
                            return;
                        }
                    }
                    console.log('Could not find details button for species card');
                }
                return;
            }
            
            // Check if it's an image inside a modal (these should open fullscreen)
            if (img.closest('.modal') && img.classList.contains('clickable-image')) {
                event.preventDefault();
                event.stopPropagation();
                
                const imageUrl = img.src;
                const imageTitle = img.alt || img.title || 'Image';
                
                console.log('Modal image clicked - opening fullscreen:', imageUrl);
                this.openFullscreen(imageUrl, imageTitle);
                return;
            }
            
            // Handle other clickable images (if any)
            if (img.classList.contains('clickable-image') && !img.closest('.species-card')) {
                event.preventDefault();
                event.stopPropagation();
                
                const imageUrl = img.src;
                const imageTitle = img.alt || img.title || 'Image';
                
                console.log('Other clickable image clicked:', imageUrl);
                this.openFullscreen(imageUrl, imageTitle);
            }
        });

        // Global escape key handler for fullscreen images
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isOpen) {
                this.closeFullscreen();
            }
        });
    }

    // Make existing images clickable
  makeImagesClickable() {
        // Species card images - these open details modal
        const speciesCardImages = document.querySelectorAll('.species-card img');
        speciesCardImages.forEach(img => {
            img.style.cursor = 'pointer';
            img.title = 'Click to view details';
            // Don't add clickable-image class to species card images
        });
        
        // Modal images - these open fullscreen
        const modalImages = document.querySelectorAll('.modal img');
        modalImages.forEach(img => {
            if (!img.classList.contains('clickable-image')) {
                img.classList.add('clickable-image');
                img.style.cursor = 'pointer';
                img.title = 'Click to view fullscreen';
            }
        });
        
        console.log(`Made ${speciesCardImages.length} species card images clickable for details, ${modalImages.length} modal images clickable for fullscreen`);
    }

    // Open image in fullscreen
    openFullscreen(imageUrl, imageTitle = 'Image') {
        TaxonomyUtils.log('Opening fullscreen image:', imageUrl);
        
        // Close any existing overlay
        this.closeFullscreen();
        
        // Create fullscreen overlay
        this.currentOverlay = this.createOverlay(imageUrl, imageTitle);
        
        // Add to document
        document.body.appendChild(this.currentOverlay);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        
        // Fade in
        requestAnimationFrame(() => {
            this.currentOverlay.style.opacity = '1';
        });
        
        this.isOpen = true;
    }

    // Create overlay element
    createOverlay(imageUrl, imageTitle) {
        const overlay = document.createElement('div');
        overlay.className = 'image-fullscreen-overlay';
        
        // Overlay styles
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999999',
            cursor: 'pointer',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            backdropFilter: 'blur(2px)'
        });

        // Create content container
        const container = this.createImageContainer(imageUrl, imageTitle);
        overlay.appendChild(container);

        // Add click handler to close
        overlay.addEventListener('click', (event) => {
            // Only close if clicking on the overlay itself, not the image
            if (event.target === overlay || event.target === container) {
                this.closeFullscreen();
            }
        });

        return overlay;
    }

    // Create image container
    createImageContainer(imageUrl, imageTitle) {
        const container = document.createElement('div');
        
        Object.assign(container.style, {
            maxWidth: '95vw',
            maxHeight: '95vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            boxSizing: 'border-box'
        });

        // Create image element
        const image = this.createImage(imageUrl, imageTitle);
        container.appendChild(image);

        // Create title
        if (imageTitle && imageTitle !== 'Image') {
            const title = this.createTitle(imageTitle);
            container.appendChild(title);
        }

        // Create close instruction
        const instruction = this.createCloseInstruction();
        container.appendChild(instruction);

        // Create loading indicator
        const loader = this.createLoader();
        container.appendChild(loader);

        // Handle image loading
        image.addEventListener('load', () => {
            loader.style.display = 'none';
            image.style.opacity = '1';
        });

        image.addEventListener('error', () => {
            loader.style.display = 'none';
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'color: white; text-align: center; font-size: 18px;';
            errorMsg.textContent = 'Failed to load image';
            container.appendChild(errorMsg);
        });

        return container;
    }

    // Create image element
    createImage(imageUrl, imageTitle) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = imageTitle;
        
        Object.assign(image.style, {
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
            transition: 'opacity 0.3s ease',
            opacity: '0'
        });

        return image;
    }

    // Create title element
    createTitle(imageTitle) {
        const title = document.createElement('div');
        title.textContent = imageTitle;
        
        Object.assign(title.style, {
            color: 'white',
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: '500',
            maxWidth: '80vw',
            lineHeight: '1.4'
        });

        return title;
    }

    // Create close instruction
    createCloseInstruction() {
        const instruction = document.createElement('div');
        instruction.innerHTML = `
            <div style="color: rgba(255, 255, 255, 0.8); margin-top: 15px; text-align: center; font-size: 14px;">
                Click anywhere to close or press ESC
            </div>
        `;

        return instruction;
    }

    // Create loading indicator
    createLoader() {
        const loader = document.createElement('div');
        loader.innerHTML = `
            <div style="
                color: white; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                margin-top: 20px;
                font-size: 16px;
            ">
                <div class="spinner-border spinner-border-sm text-light me-2" role="status"></div>
                Loading image...
            </div>
        `;

        return loader;
    }

    // Close fullscreen overlay
    closeFullscreen() {
        if (!this.currentOverlay || !this.isOpen) {
            return;
        }

        TaxonomyUtils.log('Closing fullscreen image');

        // Fade out
        this.currentOverlay.style.opacity = '0';

        // Restore body scrolling
        document.body.style.overflow = '';

        // Remove after transition
        setTimeout(() => {
            if (this.currentOverlay && this.currentOverlay.parentNode) {
                this.currentOverlay.parentNode.removeChild(this.currentOverlay);
            }
            this.currentOverlay = null;
            this.isOpen = false;
        }, 300);
    }

    // Force close all overlays (cleanup utility)
    forceClose() {
        const overlays = document.querySelectorAll('.image-fullscreen-overlay');
        overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
        
        document.body.style.overflow = '';
        this.currentOverlay = null;
        this.isOpen = false;
        
        TaxonomyUtils.log('Force closed all image overlays');
    }

    // Check if viewer is currently open
    isViewerOpen() {
        return this.isOpen;
    }

    // Update clickable images when new content is added
    updateClickableImages() {
        this.makeImagesClickable();
    }

    // Test function for development
    test() {
        const testImageUrl = 'https://via.placeholder.com/800x600/0066cc/ffffff?text=Test+Image';
        TaxonomyUtils.log('Testing image viewer with placeholder image');
        this.openFullscreen(testImageUrl, 'Test Image - Image Viewer Test');
    }
}

// Global functions for backward compatibility
function openImageFullscreen(imageUrl, imageTitle) {
    if (window.imageViewer) {
        imageViewer.openFullscreen(imageUrl, imageTitle);
    } else {
        TaxonomyUtils.error('Image viewer not initialized');
    }
}

function closeImageFullscreen() {
    if (window.imageViewer) {
        imageViewer.closeFullscreen();
    }
}

// Create global image viewer instance
window.imageViewer = new ImageViewer();