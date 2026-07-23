/**
 * Search Handler
 * Manages search input, filter chips, and result visibility across pages.
 */

let currentFilter = 'All';
let isInitialized = false;
let initTimeout;

function initializeSearchHandlers() {
  if (isInitialized) return;
  isInitialized = true;

  clearTimeout(initTimeout);

  initSearchBar();
  initFilterChips();
  addDataAttributesToItems();

  // Reset flag after a delay to allow reinitialization on page changes
  initTimeout = setTimeout(() => {
    isInitialized = false;
  }, 500);
}

document.addEventListener('DOMContentLoaded', initializeSearchHandlers);

const searchObserver = new MutationObserver(function(mutations) {
  const mainContent = document.getElementById('main-content');
  const hasFilterChips = document.querySelector('.filter-chips .chip');
  const hasSearchBar = document.querySelector('.search-bar input');

  if (mainContent && (hasFilterChips || hasSearchBar)) {
    isInitialized = false;
    initializeSearchHandlers();
  }
});

const mainContent = document.getElementById('main-content');
if (mainContent) {
  searchObserver.observe(mainContent, { childList: true });
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

function initSearchBar() {
  const searchInput = document.querySelector('.search-bar input');
  if (!searchInput) return;

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
    const newChip = chip.cloneNode(true);
    chip.parentNode.replaceChild(newChip, chip);

    newChip.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

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
    const sectionMatchesFilter = filterCategory === 'All' || sectionCategory === filterCategory;

    if (!sectionMatchesFilter) {
      section3.style.display = 'none';
      return;
    }

    const items = section3.querySelectorAll('.section4');
    let sectionVisibleCount = 0;

    items.forEach(item => {
      let shouldShow = true;
      if (term !== '') {
        const h3 = item.querySelector('h3');
        const p = item.querySelector('p');
        const itemText = (h3 ? h3.textContent : '') + ' ' + (p ? p.textContent : '');
        shouldShow = itemText.toLowerCase().includes(term);
      }

      if (shouldShow) {
        item.classList.remove('hidden');
        sectionVisibleCount++;
        totalVisibleCount++;
      } else {
        item.classList.add('hidden');
      }
    });

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

window.clearSearch = clearSearch;

