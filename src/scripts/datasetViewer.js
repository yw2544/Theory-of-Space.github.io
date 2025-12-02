// Dataset Viewer JavaScript functionality for Theory of Space Dataset
class DatasetViewer {
  constructor() {
    this.allData = [];
    this.filteredData = [];
    this.currentIndex = 0;
    
    // Filter states
    this.currentLayout = '';
    
    // Available filter options
    this.availableLayouts = [];
    
    this.init();
  }

  async init() {
    try {
      await this.loadData();
      this.populateFilterOptions();
      // Filter with default selection (first layout)
      this.filterData();
      this.setupEventListeners();
      this.updateFilterUI();
      this.updateUI();
    } catch (error) {
      console.error('Failed to initialize dataset viewer:', error);
      this.showError('Failed to load dataset');
    }
  }

  async loadData() {
    try {
      const response = await fetch('/data_viewer/QA/enact_ordering.jsonl');
      const text = await response.text();
      
      // Parse JSONL
      this.allData = text
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      
      console.log(`Loaded ${this.allData.length} layouts`);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  populateFilterOptions() {
    // Extract unique layout types
    const layouts = new Set();
    this.allData.forEach(item => {
      if (item.layout_type) {
        layouts.add(item.layout_type);
      }
    });
    
    this.availableLayouts = Array.from(layouts).sort();
    
    // Set default layout if not set
    if (this.availableLayouts.length > 0 && !this.currentLayout) {
      this.currentLayout = this.availableLayouts[0];
    }
    
    this.updateFilterSelectors();
  }

  updateFilterSelectors() {
    const layoutSelect = document.getElementById('layout-select');
    if (layoutSelect) {
      layoutSelect.innerHTML = '';
      this.availableLayouts.forEach(layout => {
        const option = document.createElement('option');
        option.value = layout;
        option.textContent = this.formatLayoutName(layout);
        layoutSelect.appendChild(option);
      });
      layoutSelect.value = this.currentLayout;
    }
  }

  formatLayoutName(name) {
    // "3room" -> "3 Room", "4room_loop" -> "4 Room Loop"
    return name
      .replace(/(\d+)/g, '$1 ') // Add space after numbers
      .split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  filterData() {
    if (!this.currentLayout) {
      this.filteredData = [];
      return;
    }
    
    // In our new data structure, each layout type has exactly one entry with all images
    this.filteredData = this.allData.filter(item => item.layout_type === this.currentLayout);
    
    // Reset index (though usually there's only 1 item per layout now)
    this.currentIndex = 0;
  }

  setupEventListeners() {
    // Layout selector
    const layoutSelect = document.getElementById('layout-select');
    if (layoutSelect) {
      layoutSelect.addEventListener('change', (e) => {
        this.currentLayout = e.target.value;
        this.filterData();
        this.updateUI();
      });
    }

    // Navigation buttons (Switch between layouts)
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.navigateLayout(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.navigateLayout(1);
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      
      if (e.key === 'ArrowLeft') {
        this.navigateLayout(-1);
      } else if (e.key === 'ArrowRight') {
        this.navigateLayout(1);
      }
    });
  }

  navigateLayout(direction) {
    const currentIndex = this.availableLayouts.indexOf(this.currentLayout);
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;
    
    // Wrap around logic
    if (newIndex < 0) newIndex = this.availableLayouts.length - 1;
    if (newIndex >= this.availableLayouts.length) newIndex = 0;

    this.currentLayout = this.availableLayouts[newIndex];
    this.updateFilterUI();
    this.filterData();
    this.updateUI();
  }

  updateFilterUI() {
    const layoutSelect = document.getElementById('layout-select');
    if (layoutSelect) {
      layoutSelect.value = this.currentLayout;
    }
  }

  updateUI() {
    const dataDisplay = document.getElementById('data-display');
    
    if (!dataDisplay) return;
    
    if (this.filteredData.length === 0) {
      dataDisplay.innerHTML = this.getNoDataHTML();
      dataDisplay.classList.add('loaded');
      return;
    }

    // We display the first matching entry (usually the only one for this layout)
    const currentData = this.filteredData[0];
    if (currentData) {
      dataDisplay.innerHTML = this.getSampleHTML(currentData);
      dataDisplay.classList.add('loaded');
    }
  }

  getSampleHTML(data) {
    const images = data.images || [];
    const numImages = images.length;
    
    // Adaptive grid: simpler logic for just displaying images
    // If many images, use smaller grid cells
    let gridClass = 'images-grid-4col'; 
    if (numImages <= 2) gridClass = 'images-grid-2col';
    else if (numImages === 3) gridClass = 'images-grid-3col';
    
    return `
      <div class="sample-container">
        <!-- Main Content Area -->
        <div class="sample-content">
          <!-- Images Section Only -->
          <div class="content-card images-card" style="width: 100%;">
            <div class="card-header">
              <svg class="card-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <h3 class="card-title">${this.formatLayoutName(data.layout_type)} Images</h3>
            </div>
            <div class="card-content">
              <div class="images-grid ${gridClass}">
                ${images.map((img, index) => `
                  <div class="image-item">
                    <img src="/data_viewer/${img}" 
                         alt="Layout Image ${index + 1}" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'image-error\\'>Image not found</div>'"
                         loading="lazy">
                    <!-- Label removed as requested -->
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getNoDataHTML() {
    return `
      <div style="text-align: center; padding: 3rem; color: #64748b;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
        <h3 style="margin-bottom: 0.5rem; color: #334155;">No data found</h3>
        <p>No images found for this layout type.</p>
      </div>
    `;
  }

  showError(message) {
    const dataDisplay = document.getElementById('data-display');
    dataDisplay.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #ef4444;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3 style="margin-bottom: 0.5rem;">Error Loading Dataset</h3>
        <p>${message}</p>
      </div>
    `;
  }
}

// Initialize dataset viewer
export function initDatasetViewer() {
  new DatasetViewer();
}

// Auto-initialize if this script is loaded directly
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDatasetViewer);
} 
