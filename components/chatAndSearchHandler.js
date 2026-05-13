/**
 * Chat Container and Search Bar Handler
 * Manages floating chat button toggle, search functionality, and filter chips
 */

let currentFilter = 'All';
let isInitialized = false;
let initTimeout;

function initializeHandlers() {
  if (isInitialized) return;
  isInitialized = true;
  
  clearTimeout(initTimeout);
  
  initFloatingChatButton();
  initSearchBar();
  initFilterChips();
  initChatBackdrop();
  addDataAttributesToItems();
  
  // Reset flag after a delay to allow reinitialization on page changes
  initTimeout = setTimeout(() => {
    isInitialized = false;
  }, 500);
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeHandlers);

// Watch for dynamic content changes (page navigation)
const observer = new MutationObserver(function(mutations) {
  const mainContent = document.getElementById('main-content');
  const hasFilterChips = document.querySelector('.filter-chips .chip');
  const hasSearchBar = document.querySelector('.search-bar input');
  
  if (mainContent && (hasFilterChips || hasSearchBar)) {
    isInitialized = false;
    initializeHandlers();
  }
});

const mainContent = document.getElementById('main-content');
if (mainContent) {
  observer.observe(mainContent, { childList: true });
}

function addDataAttributesToItems() {
  const section3s = document.querySelectorAll('.section3');
  
  section3s.forEach(section3 => {
    const titleElement = section3.querySelector('.section3-title');
    if (!titleElement) return;
    
    const categoryName = titleElement.textContent.trim();
    const items = section3.querySelectorAll('.section4');
    
    items.forEach(item => {
      item.setAttribute('data-category', categoryName);
    });
  });
}

function initChatBackdrop() {
  let backdrop = document.querySelector('.chat-backdrop');
  
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'chat-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) {
        hideChatContainer();
      }
    });
  }
}

function initFloatingChatButton() {
  let floatingBtn = document.querySelector('.floating-chat-btn');
  
  if (!floatingBtn) {
    floatingBtn = document.createElement('button');
    floatingBtn.className = 'floating-chat-btn';
    floatingBtn.innerHTML = '💬';
    floatingBtn.setAttribute('title', 'Toggle AI Chat');
    floatingBtn.setAttribute('aria-label', 'Toggle AI Chat');
    document.body.appendChild(floatingBtn);
    floatingBtn.addEventListener('click', toggleChatContainer);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideChatContainer();
    }
  });
}

function toggleChatContainer(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const chatContainer = document.querySelector('.chat-container');
  const floatingBtn = document.querySelector('.floating-chat-btn');
  const backdrop = document.querySelector('.chat-backdrop');
  
  if (chatContainer) {
    const isActive = chatContainer.classList.contains('active');
    
    if (!isActive) {
      chatContainer.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
      floatingBtn.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      hideChatContainer();
    }
  }
}

function hideChatContainer() {
  const chatContainer = document.querySelector('.chat-container');
  const floatingBtn = document.querySelector('.floating-chat-btn');
  const backdrop = document.querySelector('.chat-backdrop');
  
  if (chatContainer) {
    chatContainer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    if (floatingBtn) floatingBtn.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

function initSearchBar() {
  const searchInput = document.querySelector('.search-bar input');
  
  if (!searchInput) return;

  // Remove old listeners by replacing element
  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);
  
  newSearchInput.addEventListener('input', function(e) {
    performSearch(e.target.value, currentFilter);
  });
}

function initFilterChips() {
  const filterChips = document.querySelectorAll('.filter-chips .chip');
  
  if (!filterChips || filterChips.length === 0) return;

  filterChips.forEach((chip) => {
    // Clone to remove old listeners
    const newChip = chip.cloneNode(true);
    chip.parentNode.replaceChild(newChip, chip);
    
    newChip.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Get all chips after cloning
      const allChips = document.querySelectorAll('.filter-chips .chip');
      allChips.forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      
      const filterText = this.dataset.filter || this.textContent.trim();
      currentFilter = filterText;
      
      const searchInput = document.querySelector('.search-bar input');
      const searchTerm = searchInput ? searchInput.value : '';
      
      performSearch(searchTerm, filterText);
    });
  });
}

function performSearch(searchTerm, filterCategory) {
  const section3s = document.querySelectorAll('.section3');
  
  if (section3s.length === 0) return;

  const term = searchTerm.toLowerCase().trim();
  let totalVisibleCount = 0;

  section3s.forEach(section3 => {
    const sectionCategory = section3.dataset.category || '';
    
    // Step 1: Determine if this section should be visible based on filter
    const sectionMatchesFilter = filterCategory === 'All' || sectionCategory === filterCategory;
    
    if (!sectionMatchesFilter) {
      section3.style.display = 'none';
      return;
    }
    
    // Step 2: If section matches filter, now apply search term to items
    const items = section3.querySelectorAll('.section4');
    let sectionVisibleCount = 0;

    items.forEach(item => {
      let shouldShow = true;

      // Apply search term if provided
      if (term !== '') {
        const h3 = item.querySelector('h3');
        const p = item.querySelector('p');
        const itemText = (h3 ? h3.textContent : '') + ' ' + (p ? p.textContent : '');
        const itemTextLower = itemText.toLowerCase();
        shouldShow = itemTextLower.includes(term);
      }

      // Update item visibility
      if (shouldShow) {
        item.classList.remove('hidden');
        sectionVisibleCount++;
        totalVisibleCount++;
      } else {
        item.classList.add('hidden');
      }
    });

    // Show/hide section based on whether it has visible items
    section3.style.display = sectionVisibleCount > 0 ? 'block' : 'none';
  });

  if (totalVisibleCount === 0 && (term !== '' || (filterCategory && filterCategory !== 'All'))) {
    showNoResults();
  } else {
    hideNoResults();
  }
}

function showNoResults() {
  let noResultsMsg = document.querySelector('.no-results-message');
  
  if (!noResultsMsg) {
    noResultsMsg = document.createElement('div');
    noResultsMsg.className = 'no-results-message';
    noResultsMsg.style.textAlign = 'center';
    noResultsMsg.style.padding = '2rem';
    noResultsMsg.style.fontSize = '1.1rem';
    noResultsMsg.style.color = 'var(--on-surface-variant)';
    noResultsMsg.textContent = 'No results found. Try a different search term or filter.';
    
    const section2 = document.querySelector('.section2');
    if (section2) {
      section2.appendChild(noResultsMsg);
    }
  }
  
  noResultsMsg.style.display = 'block';
}

function hideNoResults() {
  const noResultsMsg = document.querySelector('.no-results-message');
  if (noResultsMsg) {
    noResultsMsg.style.display = 'none';
  }
}

function clearSearch() {
  const searchInput = document.querySelector('.search-bar input');
  if (searchInput) {
    searchInput.value = '';
    performSearch('', 'All');
  }
}

// Export functions
window.toggleChatContainer = toggleChatContainer;
window.hideChatContainer = hideChatContainer;
window.clearSearch = clearSearch;
