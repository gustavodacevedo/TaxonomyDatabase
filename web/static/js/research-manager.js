// Research Manager functionality for the Taxonomic Database

class ResearchManager {
    constructor() {
        this.initialized = false;
        this.statsCache = null;
        this.reportHistory = [];
        this.currentVisualization = null;
        this.comparisonData = new Map();
    }

    // Initialize research manager
    initialize() {
        if (this.initialized) {
            TaxonomyUtils.log('Research manager already initialized');
            return;
        }

        TaxonomyUtils.log('Initializing research manager');
        
        this.setupEventListeners();
        this.loadInitialData();
        this.initialized = true;
    }

    // Setup event listeners for research tools
    setupEventListeners() {
        // Conservation filter
        const conservationFilter = document.getElementById('conservation-filter');
        if (conservationFilter) {
            conservationFilter.addEventListener('change', () => {
                this.updateStatsWithFilter();
            });
        }

        // Report type change
        const reportType = document.getElementById('report-type');
        if (reportType) {
            reportType.addEventListener('change', () => {
                this.updateReportFilters();
            });
        }

        // Relationship rank change
        const relationshipRank = document.getElementById('relationship-rank');
        if (relationshipRank) {
            relationshipRank.addEventListener('change', () => {
                this.loadRelationshipGroups();
            });
        }

        // Species selects for comparison
        this.setupSpeciesSelects();
    }

    // Load initial research data
    async loadInitialData() {
        try {
            await this.refreshStats();
            await this.loadSpeciesSelects();
            await this.loadRelationshipGroups();
            await this.generateDefaultCharts();
        } catch (error) {
            TaxonomyUtils.error('Error loading initial research data:', error);
        }
    }

    // Refresh database statistics
    async refreshStats() {
        try {
            TaxonomyUtils.log('Refreshing database statistics');
            
            // Show loading state
            this.showStatsLoading();

            // Fetch data from API
            const [species, tags] = await Promise.all([
                taxonomyAPI.getAllSpecies(),
                taxonomyAPI.getAllTags()
            ]);

            // Calculate statistics
            const stats = this.calculateDatabaseStats(species, tags);
            
            // Update UI
            this.updateStatsDisplay(stats);
            
            // Cache the stats
            this.statsCache = stats;
            
            TaxonomyUtils.log('Statistics refreshed:', stats);

        } catch (error) {
            TaxonomyUtils.error('Error refreshing stats:', error);
            this.showStatsError();
        }
    }

    // Calculate database statistics from species and tags data
    calculateDatabaseStats(species, tags) {
        const stats = {
            totalSpecies: species.length,
            totalTags: tags.length,
            totalGenera: new Set(),
            totalFamilies: new Set(),
            conservationStatus: {},
            discoveryYears: {},
            habitats: {},
            domains: new Set(),
            kingdoms: new Set()
        };

        // Process species data
        species.forEach(spec => {
            // Count unique genera and families
            if (spec.genus_name) stats.totalGenera.add(spec.genus_name);
            if (spec.family_name) stats.totalFamilies.add(spec.family_name);
            if (spec.domain_name) stats.domains.add(spec.domain_name);
            if (spec.kingdom_name) stats.kingdoms.add(spec.kingdom_name);
            
            // Count conservation statuses
            const status = spec.conservation_status || 'Not Specified';
            stats.conservationStatus[status] = (stats.conservationStatus[status] || 0) + 1;
            
            // Count discovery years
            if (spec.discovery_year) {
                const decade = Math.floor(spec.discovery_year / 10) * 10;
                stats.discoveryYears[decade] = (stats.discoveryYears[decade] || 0) + 1;
            }
            
            // Count habitats
            if (spec.habitat) {
                stats.habitats[spec.habitat] = (stats.habitats[spec.habitat] || 0) + 1;
            }
        });

        // Convert sets to counts
        stats.totalGenera = stats.totalGenera.size;
        stats.totalFamilies = stats.totalFamilies.size;

        return stats;
    }

    // Update statistics display
    updateStatsDisplay(stats) {
        const elements = {
            'total-species': stats.totalSpecies,
            'total-genera': stats.totalGenera,
            'total-families': stats.totalFamilies,
            'total-tags': stats.totalTags
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toLocaleString();
            }
        });
    }

    // Show loading state for stats
    showStatsLoading() {
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(el => {
            el.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
        });
    }

    // Show error state for stats
    showStatsError() {
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(el => {
            el.textContent = '!';
            el.classList.add('text-danger');
        });
    }

    // Setup species selection dropdowns
    async setupSpeciesSelects() {
        try {
            const species = await taxonomyAPI.getAllSpecies();
            
            const selects = ['species-select-1', 'species-select-2'];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    this.populateSpeciesSelect(select, species);
                }
            });
        } catch (error) {
            TaxonomyUtils.error('Error setting up species selects:', error);
        }
    }

    // Populate a species select dropdown
    populateSpeciesSelect(select, species) {
        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Add species options
        species.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec.id;
            const scientificName = TaxonomyUtils.formatScientificName(spec.genus_name, spec.name);
            option.textContent = `${spec.common_name || 'Unknown'} (${scientificName})`;
            select.appendChild(option);
        });
    }

    // Load species selects specifically
    async loadSpeciesSelects() {
        await this.setupSpeciesSelects();
    }

    // Apply advanced filters
    async applyAdvancedFilters() {
        try {
            const conservationStatus = document.getElementById('conservation-filter').value;
            const yearFrom = document.getElementById('year-from').value;
            const yearTo = document.getElementById('year-to').value;

            // Build filter criteria
            const filters = {};
            if (conservationStatus) filters.conservation_status = conservationStatus;
            if (yearFrom) filters.year_from = parseInt(yearFrom);
            if (yearTo) filters.year_to = parseInt(yearTo);

            TaxonomyUtils.log('Applying advanced filters:', filters);

            // Get all species and apply filters
            const allSpecies = await taxonomyAPI.getAllSpecies();
            const filteredSpecies = this.filterSpecies(allSpecies, filters);

            // Show filtered results in Explorer tab
            this.showFilteredResults(filteredSpecies, filters);

        } catch (error) {
            TaxonomyUtils.error('Error applying advanced filters:', error);
            this.showNotification('Error applying filters. Please try again.', 'danger');
        }
    }

    // Filter species based on criteria
    filterSpecies(species, filters) {
        return species.filter(spec => {
            if (filters.conservation_status && spec.conservation_status !== filters.conservation_status) {
                return false;
            }
            if (filters.year_from && (!spec.discovery_year || spec.discovery_year < filters.year_from)) {
                return false;
            }
            if (filters.year_to && (!spec.discovery_year || spec.discovery_year > filters.year_to)) {
                return false;
            }
            return true;
        });
    }

    // Show filtered results
    showFilteredResults(filteredSpecies, filters) {
        // Switch to Explorer tab
        const explorerTab = document.getElementById('explorer-tab');
        if (explorerTab) {
            const tab = new bootstrap.Tab(explorerTab);
            tab.show();
        }

        // Update species manager with filtered results
        if (window.speciesManager) {
            speciesManager.currentSpecies = filteredSpecies;
            
            const container = document.getElementById('species-container');
            if (container) {
                speciesManager.renderSpeciesCards(container, filteredSpecies);
            }

            // Show filter indicator
            this.showFilterIndicator(filters, filteredSpecies.length);
        }
    }

    // Show filter indicator in Explorer tab
    showFilterIndicator(filters, resultCount) {
        let filterText = 'Research filters applied: ';
        const filterDescriptions = [];
        
        if (filters.conservation_status) {
            filterDescriptions.push(`Conservation Status: ${filters.conservation_status}`);
        }
        if (filters.year_from || filters.year_to) {
            const yearRange = filters.year_from && filters.year_to 
                ? `${filters.year_from}-${filters.year_to}`
                : filters.year_from 
                    ? `${filters.year_from}+`
                    : `up to ${filters.year_to}`;
            filterDescriptions.push(`Discovery Years: ${yearRange}`);
        }
        
        filterText += filterDescriptions.join(', ');
        filterText += ` (${resultCount} results)`;

        // Create or update filter indicator
        let indicator = document.getElementById('research-filter-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'research-filter-indicator';
            indicator.className = 'alert alert-info alert-dismissible d-flex align-items-center mb-3';
            
            const container = document.getElementById('species-container');
            if (container && container.parentNode) {
                container.parentNode.insertBefore(indicator, container);
            }
        }

        indicator.innerHTML = `
            <i class="bi bi-funnel-fill me-2"></i>
            <span>${filterText}</span>
            <button type="button" class="btn btn-sm btn-outline-info ms-auto" onclick="researchManager.clearAdvancedFilters()">
                <i class="bi bi-x"></i> Clear Research Filters
            </button>
        `;
        indicator.style.display = 'flex';
    }

    // Clear advanced filters
    async clearAdvancedFilters() {
        // Reset filter controls
        document.getElementById('conservation-filter').value = '';
        document.getElementById('year-from').value = '';
        document.getElementById('year-to').value = '';

        // Hide filter indicator
        const indicator = document.getElementById('research-filter-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }

        // Reload all species in Explorer
        if (window.speciesManager) {
            await speciesManager.loadSpecies();
        }

        this.showNotification('Research filters cleared', 'info');
    }

    // Compare two species
    async compareSpecies() {
        try {
            const species1Id = document.getElementById('species-select-1').value;
            const species2Id = document.getElementById('species-select-2').value;

            if (!species1Id || !species2Id) {
                this.showNotification('Please select two species to compare', 'warning');
                return;
            }

            if (species1Id === species2Id) {
                this.showNotification('Please select two different species to compare', 'warning');
                return;
            }

            // Show loading state
            const resultsContainer = document.getElementById('comparison-results');
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2">Loading species comparison...</p>
                </div>
            `;

            // Fetch species details
            const [species1, species2] = await Promise.all([
                taxonomyAPI.getSpeciesById(species1Id),
                taxonomyAPI.getSpeciesById(species2Id)
            ]);

            // Generate comparison
            this.renderSpeciesComparison(species1, species2, resultsContainer);

        } catch (error) {
            TaxonomyUtils.error('Error comparing species:', error);
            this.showNotification('Error loading species comparison', 'danger');
        }
    }

    // Render species comparison results
    renderSpeciesComparison(species1, species2, container) {
        const comparison = this.generateComparisonData(species1, species2);
        
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0">${species1.common_name || 'Species 1'}</h6>
                            <small class="scientific-name">${TaxonomyUtils.formatScientificName(species1.genus_name, species1.name)}</small>
                        </div>
                        <div class="card-body">
                            ${species1.image_url ? `<img src="${species1.image_url}" class="img-fluid mb-3 rounded" alt="${species1.common_name}">` : ''}
                            <p><strong>Description:</strong> ${species1.description || 'No description available'}</p>
                            <p><strong>Conservation Status:</strong> ${species1.conservation_status || 'Unknown'}</p>
                            <p><strong>Habitat:</strong> ${species1.habitat || 'Unknown'}</p>
                            <p><strong>Discovery Year:</strong> ${species1.discovery_year || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0">${species2.common_name || 'Species 2'}</h6>
                            <small class="scientific-name">${TaxonomyUtils.formatScientificName(species2.genus_name, species2.name)}</small>
                        </div>
                        <div class="card-body">
                            ${species2.image_url ? `<img src="${species2.image_url}" class="img-fluid mb-3 rounded" alt="${species2.common_name}">` : ''}
                            <p><strong>Description:</strong> ${species2.description || 'No description available'}</p>
                            <p><strong>Conservation Status:</strong> ${species2.conservation_status || 'Unknown'}</p>
                            <p><strong>Habitat:</strong> ${species2.habitat || 'Unknown'}</p>
                            <p><strong>Discovery Year:</strong> ${species2.discovery_year || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-diagram-2"></i> Taxonomic Comparison
                        </div>
                        <div class="card-body">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>${species1.common_name || 'Species 1'}</th>
                                        <th>${species2.common_name || 'Species 2'}</th>
                                        <th>Match</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderTaxonomicComparisonRows(comparison)}
                                </tbody>
                            </table>
                            <div class="mt-3">
                                <h6>Relationship Analysis:</h6>
                                <p class="mb-0">${this.generateRelationshipAnalysis(comparison)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate comparison data structure
    generateComparisonData(species1, species2) {
        const ranks = ['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus'];
        const comparison = {};
        
        ranks.forEach(rank => {
            const field1 = species1[`${rank}_name`];
            const field2 = species2[`${rank}_name`];
            comparison[rank] = {
                species1: field1 || 'Unknown',
                species2: field2 || 'Unknown',
                match: field1 === field2 && field1 && field2
            };
        });
        
        return comparison;
    }

    // Render taxonomic comparison rows
    renderTaxonomicComparisonRows(comparison) {
        const ranks = ['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus'];
        
        return ranks.map(rank => {
            const data = comparison[rank];
            const matchIcon = data.match 
                ? '<i class="bi bi-check-circle text-success"></i>' 
                : '<i class="bi bi-x-circle text-danger"></i>';
            
            return `
                <tr>
                    <td><strong>${TaxonomyUtils.capitalize(rank)}</strong></td>
                    <td>${data.species1}</td>
                    <td>${data.species2}</td>
                    <td class="text-center">${matchIcon}</td>
                </tr>
            `;
        }).join('');
    }

    // Generate relationship analysis text
    generateRelationshipAnalysis(comparison) {
        const ranks = ['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus'];
        let lastCommonRank = null;
        
        for (const rank of ranks) {
            if (comparison[rank].match) {
                lastCommonRank = rank;
            } else {
                break;
            }
        }
        
        if (!lastCommonRank) {
            return "These species share no common taxonomic classification in the available data.";
        }
        
        const commonName = comparison[lastCommonRank].species1;
        const nextRankIndex = ranks.indexOf(lastCommonRank) + 1;
        
        if (nextRankIndex >= ranks.length) {
            return `These species are in the same genus (${commonName}) and are very closely related.`;
        }
        
        const nextRank = ranks[nextRankIndex];
        return `These species share a common ${lastCommonRank} (${commonName}) but diverge at the ${nextRank} level, indicating they are ${this.getRelationshipDistance(lastCommonRank)} related.`;
    }

    // Get relationship distance description
    getRelationshipDistance(lastCommonRank) {
        const distances = {
            'genus': 'very closely',
            'family': 'closely',
            'order': 'moderately',
            'class': 'distantly',
            'phylum': 'very distantly',
            'kingdom': 'extremely distantly',
            'domain': 'fundamentally differently'
        };
        
        return distances[lastCommonRank] || 'distantly';
    }

    // Load relationship groups for analysis
    async loadRelationshipGroups() {
        try {
            const rank = document.getElementById('relationship-rank').value;
            const groupSelect = document.getElementById('relationship-group');
            
            if (!rank || !groupSelect) return;
            
            // Clear existing options
            groupSelect.innerHTML = '<option value="">Choose a group...</option>';
            
            // Fetch taxonomic rank data
            const groups = await taxonomyAPI.getTaxonomicRank(rank);
            
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            });
            
        } catch (error) {
            TaxonomyUtils.error('Error loading relationship groups:', error);
        }
    }

    // Analyze taxonomic relationships
    async analyzeRelationships() {
        try {
            const rank = document.getElementById('relationship-rank').value;
            const groupId = document.getElementById('relationship-group').value;
            const resultsContainer = document.getElementById('relationship-results');
            
            if (!rank || !groupId) {
                this.showNotification('Please select both rank and group', 'warning');
                return;
            }
            
            // Show loading
            resultsContainer.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border spinner-border-sm" role="status"></div>
                    <p class="mt-2 small">Analyzing relationships...</p>
                </div>
            `;
            
            // Fetch species for the selected group
            const species = await taxonomyAPI.getSpeciesByRank(rank, groupId);
            
            // Generate relationship analysis
            this.renderRelationshipAnalysis(species, rank, resultsContainer);
            
        } catch (error) {
            TaxonomyUtils.error('Error analyzing relationships:', error);
            resultsContainer.innerHTML = '<div class="alert alert-danger small">Error analyzing relationships</div>';
        }
    }

    // Render relationship analysis results
    renderRelationshipAnalysis(species, rank, container) {
        const analysis = this.generateRelationshipStats(species, rank);
        
        container.innerHTML = `
            <div class="card mt-3">
                <div class="card-body">
                    <h6>Analysis Results</h6>
                    <p class="small"><strong>Total Species:</strong> ${analysis.totalSpecies}</p>
                    <p class="small"><strong>Unique Genera:</strong> ${analysis.uniqueGenera}</p>
                    <p class="small"><strong>Conservation Statuses:</strong></p>
                    <ul class="small">
                        ${Object.entries(analysis.conservationBreakdown)
                            .map(([status, count]) => `<li>${status}: ${count}</li>`)
                            .join('')}
                    </ul>
                    ${analysis.recommendations ? `<div class="alert alert-info small mt-2">${analysis.recommendations}</div>` : ''}
                </div>
            </div>
        `;
    }

    // Generate relationship statistics
    generateRelationshipStats(species, rank) {
        const stats = {
            totalSpecies: species.length,
            uniqueGenera: new Set(species.map(s => s.genus_name).filter(Boolean)).size,
            conservationBreakdown: {}
        };
        
        // Count conservation statuses
        species.forEach(spec => {
            const status = spec.conservation_status || 'Unknown';
            stats.conservationBreakdown[status] = (stats.conservationBreakdown[status] || 0) + 1;
        });
        
        // Generate recommendations
        if (stats.totalSpecies > 50) {
            stats.recommendations = `This ${rank} contains a large number of species (${stats.totalSpecies}), indicating high biodiversity.`;
        } else if (stats.totalSpecies < 5) {
            stats.recommendations = `This ${rank} contains relatively few species (${stats.totalSpecies}), which may indicate specialized ecological niches.`;
        }
        
        return stats;
    }

    // Generate custom report
    async generateReport() {
        try {
            const reportType = document.getElementById('report-type').value;
            const reportScope = document.getElementById('report-scope').value;
            const formatInputs = document.querySelectorAll('input[name="report-format"]');
            const format = Array.from(formatInputs).find(input => input.checked)?.value || 'html';
            
            TaxonomyUtils.log('Generating report:', { reportType, reportScope, format });
            
            // Show loading state
            const previewContainer = document.getElementById('report-preview');
            previewContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2">Generating ${reportType} report...</p>
                </div>
            `;
            
            // Fetch data based on scope
            const data = await this.fetchReportData(reportScope);
            
            // Generate report content
            const reportContent = await this.createReportContent(reportType, data, reportScope);
            
            // Display report
            if (format === 'html') {
                this.displayHtmlReport(reportContent, previewContainer);
            } else {
                this.downloadJsonReport(reportContent, reportType);
                previewContainer.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-download"></i>
                        Report downloaded as JSON file
                    </div>
                `;
            }
            
            // Add to recent reports
            this.addToRecentReports(reportType, reportScope, format);
            
        } catch (error) {
            TaxonomyUtils.error('Error generating report:', error);
            this.showNotification('Error generating report. Please try again.', 'danger');
        }
    }

    // Fetch data for report generation
    async fetchReportData(scope) {
        const data = {
            species: await taxonomyAPI.getAllSpecies(),
            tags: await taxonomyAPI.getAllTags()
        };
        
        if (scope !== 'all') {
            // Filter data based on scope
            // Implementation would depend on specific scope requirements
        }
        
        return data;
    }

    // Create report content based on type
    async createReportContent(reportType, data, scope) {
        const { species, tags } = data;
        
        const reportMethods = {
            'taxonomic-summary': () => this.generateTaxonomicSummary(species),
            'conservation-report': () => this.generateConservationReport(species),
            'discovery-trends': () => this.generateDiscoveryTrends(species),
            'habitat-analysis': () => this.generateHabitatAnalysis(species),
            'comprehensive': () => this.generateComprehensiveReport(species, tags)
        };
        
        const method = reportMethods[reportType];
        if (!method) {
            throw new Error(`Unknown report type: ${reportType}`);
        }
        
        return method();
    }

    // Generate taxonomic summary report
    generateTaxonomicSummary(species) {
        const summary = {
            title: 'Taxonomic Summary Report',
            generated: new Date().toLocaleString(),
            totalSpecies: species.length,
            taxonomicBreakdown: {}
        };
        
        // Count by taxonomic ranks
        const ranks = ['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus'];
        ranks.forEach(rank => {
            const unique = new Set(species.map(s => s[`${rank}_name`]).filter(Boolean));
            summary.taxonomicBreakdown[rank] = unique.size;
        });
        
        return summary;
    }

    // Generate conservation report
    generateConservationReport(species) {
        const report = {
            title: 'Conservation Status Report',
            generated: new Date().toLocaleString(),
            totalSpecies: species.length,
            conservationBreakdown: {},
            criticalSpecies: []
        };
        
        // Count conservation statuses
        species.forEach(spec => {
            const status = spec.conservation_status || 'Not Specified';
            report.conservationBreakdown[status] = (report.conservationBreakdown[status] || 0) + 1;
            
            // Identify critical species
            if (['Critically Endangered', 'Endangered', 'Vulnerable'].includes(status)) {
                report.criticalSpecies.push({
                    name: TaxonomyUtils.formatScientificName(spec.genus_name, spec.name),
                    commonName: spec.common_name,
                    status: status
                });
            }
        });
        
        return report;
    }

    // Generate discovery trends report
    generateDiscoveryTrends(species) {
        const report = {
            title: 'Species Discovery Trends',
            generated: new Date().toLocaleString(),
            totalSpecies: species.length,
            discoveryTrends: {},
            recentDiscoveries: []
        };
        
        // Group by decades
        species.forEach(spec => {
            if (spec.discovery_year) {
                const decade = Math.floor(spec.discovery_year / 10) * 10;
                report.discoveryTrends[decade] = (report.discoveryTrends[decade] || 0) + 1;
                
                // Recent discoveries (last 50 years)
                if (spec.discovery_year >= 1970) {
                    report.recentDiscoveries.push({
                        name: TaxonomyUtils.formatScientificName(spec.genus_name, spec.name),
                        commonName: spec.common_name,
                        year: spec.discovery_year
                    });
                }
            }
        });
        
        return report;
    }

    // Generate habitat analysis report
    generateHabitatAnalysis(species) {
        const report = {
            title: 'Habitat Distribution Analysis',
            generated: new Date().toLocaleString(),
            totalSpecies: species.length,
            habitatBreakdown: {},
            diversityIndex: 0
        };
        
        // Count habitats
        species.forEach(spec => {
            if (spec.habitat) {
                report.habitatBreakdown[spec.habitat] = (report.habitatBreakdown[spec.habitat] || 0) + 1;
            }
        });
        
        // Calculate diversity (number of different habitats)
        report.diversityIndex = Object.keys(report.habitatBreakdown).length;
        
        return report;
    }

    // Generate comprehensive report
    generateComprehensiveReport(species, tags) {
        return {
            title: 'Comprehensive Database Report',
            generated: new Date().toLocaleString(),
            summary: {
                totalSpecies: species.length,
                totalTags: tags.length,
                dataCompleteness: this.calculateDataCompleteness(species)
            },
            taxonomicSummary: this.generateTaxonomicSummary(species),
            conservationSummary: this.generateConservationReport(species),
            discoveryTrends: this.generateDiscoveryTrends(species),
            habitatAnalysis: this.generateHabitatAnalysis(species)
        };
    }

    // Calculate data completeness percentage
    calculateDataCompleteness(species) {
        const fields = ['common_name', 'description', 'conservation_status', 'habitat', 'discovery_year'];
        let totalFields = species.length * fields.length;
        let completedFields = 0;
        
        species.forEach(spec => {
            fields.forEach(field => {
                if (spec[field] && spec[field].toString().trim() !== '') {
                    completedFields++;
                }
            });
        });
        
        return Math.round((completedFields / totalFields) * 100);
    }

    // Display HTML report in preview container
    displayHtmlReport(reportContent, container) {
        const htmlContent = this.formatReportAsHtml(reportContent);
        container.innerHTML = htmlContent;
    }

    // Format report content as HTML
    formatReportAsHtml(report) {
        return `
            <div class="report-content">
                <div class="report-header mb-4">
                    <h4>${report.title}</h4>
                    <p class="text-muted">Generated: ${report.generated}</p>
                </div>
                
                <div class="report-body">
                    ${this.formatReportSections(report)}
                </div>
                
                <div class="report-footer mt-4 pt-3 border-top">
                    <small class="text-muted">Report generated by Taxonomic Database Research Tools</small>
                </div>
            </div>
        `;
    }

    // Format report sections based on content
    formatReportSections(report) {
        let sections = '';
        
        // Handle different report types
        if (report.totalSpecies !== undefined) {
            sections += `<div class="mb-3"><strong>Total Species:</strong> ${report.totalSpecies}</div>`;
        }
        
        if (report.taxonomicBreakdown) {
            sections += `
                <div class="mb-4">
                    <h6>Taxonomic Breakdown</h6>
                    <ul>
                        ${Object.entries(report.taxonomicBreakdown)
                            .map(([rank, count]) => `<li>${TaxonomyUtils.capitalize(rank)}: ${count}</li>`)
                            .join('')}
                    </ul>
                </div>
            `;
        }
        
        if (report.conservationBreakdown) {
            sections += `
                <div class="mb-4">
                    <h6>Conservation Status</h6>
                    <ul>
                        ${Object.entries(report.conservationBreakdown)
                            .map(([status, count]) => `<li>${status}: ${count}</li>`)
                            .join('')}
                    </ul>
                </div>
            `;
        }
        
        if (report.criticalSpecies && report.criticalSpecies.length > 0) {
            sections += `
                <div class="mb-4">
                    <h6>Critical Conservation Status Species</h6>
                    <ul>
                        ${report.criticalSpecies
                            .map(spec => `<li><em>${spec.name}</em> (${spec.commonName || 'Unknown'}) - ${spec.status}</li>`)
                            .join('')}
                    </ul>
                </div>
            `;
        }
        
        return sections;
    }

    // Download JSON report
    downloadJsonReport(reportContent, reportType) {
        const dataStr = JSON.stringify(reportContent, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Add report to recent reports list
    addToRecentReports(reportType, scope, format) {
        const report = {
            type: reportType,
            scope: scope,
            format: format,
            generated: new Date().toLocaleString()
        };
        
        this.reportHistory.unshift(report);
        if (this.reportHistory.length > 5) {
            this.reportHistory.pop();
        }
        
        this.updateRecentReportsDisplay();
    }

    // Update recent reports display
    updateRecentReportsDisplay() {
        const container = document.getElementById('recent-reports');
        if (!container) return;
        
        if (this.reportHistory.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent reports generated.</p>';
            return;
        }
        
        container.innerHTML = this.reportHistory
            .map(report => `
                <div class="border-bottom pb-2 mb-2">
                    <strong>${report.type.replace('-', ' ')}</strong><br>
                    <small class="text-muted">
                        Scope: ${report.scope} | Format: ${report.format.toUpperCase()}<br>
                        Generated: ${report.generated}
                    </small>
                </div>
            `)
            .join('');
    }

    // Update report filters based on report type
    updateReportFilters() {
        // This could be expanded to show/hide relevant filters based on report type
        TaxonomyUtils.log('Report type changed, updating filters if needed');
    }

    // Generate visualization
    async generateVisualization() {
        try {
            const chartType = document.getElementById('chart-type').value;
            const scope = document.getElementById('viz-scope').value;
            const colorScheme = document.getElementById('color-scheme').value;
            const container = document.getElementById('visualization-container');
            
            TaxonomyUtils.log('Generating visualization:', { chartType, scope, colorScheme });
            
            // Show loading state
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-3">Generating ${chartType} visualization...</p>
                </div>
            `;
            
            // Fetch data
            const data = await this.fetchVisualizationData(scope);
            
            // Generate chart based on type
            await this.createVisualization(chartType, data, container, colorScheme);
            
        } catch (error) {
            TaxonomyUtils.error('Error generating visualization:', error);
            this.showVisualizationError(container);
        }
    }

    // Fetch data for visualization
    async fetchVisualizationData(scope) {
        const species = await taxonomyAPI.getAllSpecies();
        
        // Filter based on scope if needed
        if (scope !== 'all') {
            // Implementation would filter species based on scope
        }
        
        return species;
    }

    // Create visualization based on chart type
    async createVisualization(chartType, data, container, colorScheme) {
        const chartMethods = {
            'taxonomic-tree': () => this.createTaxonomicTreeChart(data, container),
            'species-distribution': () => this.createSpeciesDistributionChart(data, container),
            'conservation-pie': () => this.createConservationPieChart(data, container),
            'discovery-timeline': () => this.createDiscoveryTimelineChart(data, container),
            'habitat-bar': () => this.createHabitatBarChart(data, container)
        };
        
        const method = chartMethods[chartType];
        if (method) {
            await method();
        } else {
            throw new Error(`Unknown chart type: ${chartType}`);
        }
    }

    // Create basic charts (simplified implementations)
    createConservationPieChart(data, container) {
        const conservationCounts = {};
        data.forEach(species => {
            const status = species.conservation_status || 'Unknown';
            conservationCounts[status] = (conservationCounts[status] || 0) + 1;
        });
        
        container.innerHTML = `
            <div class="chart-placeholder">
                <h5 class="text-center mb-4">Conservation Status Distribution</h5>
                <div class="row">
                    ${Object.entries(conservationCounts)
                        .map(([status, count]) => `
                            <div class="col-md-6 mb-3">
                                <div class="d-flex justify-content-between align-items-center p-2 border rounded">
                                    <span>${status}</span>
                                    <span class="badge bg-primary">${count}</span>
                                </div>
                            </div>
                        `).join('')}
                </div>
                <p class="text-muted text-center mt-3">
                    <i class="bi bi-info-circle"></i>
                    Interactive charts require additional charting libraries
                </p>
            </div>
        `;
    }

    createDiscoveryTimelineChart(data, container) {
        const discoveries = {};
        data.forEach(species => {
            if (species.discovery_year) {
                const decade = Math.floor(species.discovery_year / 10) * 10;
                discoveries[decade] = (discoveries[decade] || 0) + 1;
            }
        });
        
        const sortedDecades = Object.keys(discoveries).sort();
        
        container.innerHTML = `
            <div class="chart-placeholder">
                <h5 class="text-center mb-4">Species Discovery Timeline</h5>
                <div class="timeline-chart">
                    ${sortedDecades.map(decade => {
                        const count = discoveries[decade];
                        const height = Math.max(20, (count / Math.max(...Object.values(discoveries))) * 200);
                        return `
                            <div class="timeline-bar" style="display: inline-block; margin: 2px; width: 40px; vertical-align: bottom;">
                                <div style="height: ${height}px; background: #0d6efd; margin-bottom: 5px; border-radius: 2px;"></div>
                                <small style="font-size: 10px;">${decade}s</small><br>
                                <small style="font-size: 10px;">${count}</small>
                            </div>
                        `;
                    }).join('')}
                </div>
                <p class="text-muted text-center mt-3">
                    <i class="bi bi-info-circle"></i>
                    Basic timeline visualization. Interactive charts require additional libraries.
                </p>
            </div>
        `;
    }

    createTaxonomicTreeChart(data, container) {
        container.innerHTML = `
            <div class="chart-placeholder text-center py-5">
                <i class="bi bi-diagram-3" style="font-size: 4rem; opacity: 0.3;"></i>
                <h5 class="mt-3">Taxonomic Tree Visualization</h5>
                <p class="text-muted">
                    Advanced tree visualizations require specialized charting libraries.<br>
                    Consider using the Phylogenetic Tree tab for hierarchical navigation.
                </p>
            </div>
        `;
    }

    createSpeciesDistributionChart(data, container) {
        const kingdoms = {};
        data.forEach(species => {
            const kingdom = species.kingdom_name || 'Unknown';
            kingdoms[kingdom] = (kingdoms[kingdom] || 0) + 1;
        });
        
        container.innerHTML = `
            <div class="chart-placeholder">
                <h5 class="text-center mb-4">Species Distribution by Kingdom</h5>
                <div class="row">
                    ${Object.entries(kingdoms)
                        .map(([kingdom, count]) => {
                            const percentage = Math.round((count / data.length) * 100);
                            return `
                                <div class="col-md-4 mb-3">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <h6>${kingdom}</h6>
                                            <div class="progress mb-2">
                                                <div class="progress-bar" style="width: ${percentage}%"></div>
                                            </div>
                                            <span class="badge bg-primary">${count} species (${percentage}%)</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>
        `;
    }

    createHabitatBarChart(data, container) {
        const habitats = {};
        data.forEach(species => {
            if (species.habitat) {
                habitats[species.habitat] = (habitats[species.habitat] || 0) + 1;
            }
        });
        
        const sortedHabitats = Object.entries(habitats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10); // Top 10 habitats
        
        container.innerHTML = `
            <div class="chart-placeholder">
                <h5 class="text-center mb-4">Top 10 Habitat Types</h5>
                <div class="habitat-bars">
                    ${sortedHabitats.map(([habitat, count]) => {
                        const maxCount = Math.max(...Object.values(habitats));
                        const width = (count / maxCount) * 100;
                        return `
                            <div class="mb-3">
                                <div class="d-flex justify-content-between mb-1">
                                    <span class="small">${habitat}</span>
                                    <span class="small">${count} species</span>
                                </div>
                                <div class="progress">
                                    <div class="progress-bar bg-success" style="width: ${width}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Show visualization error
    showVisualizationError(container) {
        container.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="bi bi-exclamation-triangle"></i>
                Error generating visualization. Please try again.
            </div>
        `;
    }

    // Download visualization (placeholder implementation)
    downloadVisualization(format) {
        this.showNotification(`Visualization download in ${format.toUpperCase()} format requires additional charting libraries`, 'info');
    }

    // Fullscreen visualization (placeholder implementation)
    fullscreenVisualization() {
        this.showNotification('Fullscreen visualization requires additional charting libraries', 'info');
    }

    // Generate default charts when research tab loads
    async generateDefaultCharts() {
        try {
            // Generate discovery timeline chart
            const timelineContainer = document.getElementById('discovery-timeline-chart');
            if (timelineContainer) {
                const species = await taxonomyAPI.getAllSpecies();
                this.createDiscoveryTimelineChart(species, timelineContainer);
            }

            // Generate tag distribution chart
            const tagContainer = document.getElementById('tag-distribution-chart');
            if (tagContainer) {
                const tags = await taxonomyAPI.getAllTags();
                this.createTagDistributionChart(tags, tagContainer);
            }

        } catch (error) {
            TaxonomyUtils.error('Error generating default charts:', error);
        }
    }

    // Create tag distribution chart
    createTagDistributionChart(tags, container) {
        if (!tags || tags.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-tags"></i>
                    <p class="mt-2">No tags available</p>
                </div>
            `;
            return;
        }

        // For a basic implementation, show tag count
        container.innerHTML = `
            <div class="chart-placeholder">
                <div class="row text-center">
                    <div class="col-12">
                        <h2 class="text-primary">${tags.length}</h2>
                        <p class="text-muted">Total Tags</p>
                    </div>
                </div>
                <div class="mt-3">
                    <h6>Recent Tags:</h6>
                    <div class="d-flex flex-wrap">
                        ${tags.slice(0, 8).map(tag => 
                            `<span class="badge bg-secondary me-2 mb-2">${tag.name}</span>`
                        ).join('')}
                        ${tags.length > 8 ? `<span class="badge bg-light text-dark">+${tags.length - 8} more</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Update stats with filter applied
    async updateStatsWithFilter() {
        const conservationFilter = document.getElementById('conservation-filter').value;
        
        if (!conservationFilter) {
            // If no filter, show all stats
            if (this.statsCache) {
                this.updateStatsDisplay(this.statsCache);
            }
            return;
        }

        try {
            // Get all species and filter
            const allSpecies = await taxonomyAPI.getAllSpecies();
            const filteredSpecies = allSpecies.filter(spec => 
                spec.conservation_status === conservationFilter
            );

            // Calculate filtered stats
            const tags = await taxonomyAPI.getAllTags();
            const filteredStats = this.calculateDatabaseStats(filteredSpecies, tags);
            
            // Update display
            this.updateStatsDisplay(filteredStats);

        } catch (error) {
            TaxonomyUtils.error('Error updating filtered stats:', error);
        }
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

    // Get research manager state for debugging
    getState() {
        return {
            initialized: this.initialized,
            statsCache: this.statsCache,
            reportHistoryCount: this.reportHistory.length,
            comparisonDataSize: this.comparisonData.size,
            currentVisualization: this.currentVisualization
        };
    }

    // Clear all research data caches
    clearCaches() {
        this.statsCache = null;
        this.comparisonData.clear();
        this.reportHistory = [];
        TaxonomyUtils.log('Research manager caches cleared');
    }
}

// Create global research manager instance
window.researchManager = new ResearchManager();