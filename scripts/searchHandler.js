/**
 * Search Handler
 * Manages search input, filter chips, and result visibility across pages.
 */

let currentFilter = 'All';

function initializeSearchHandlers() {
  initSearchBar();
  initFilterChips();
  addDataAttributesToItems();

  // Ensure the UI reflects the current filter on initialization.
  try {
    // mark the matching chip active (if present)
    const allChips = document.querySelectorAll('.filter-chips .chip');
    allChips.forEach(c => {
      const rawFilter = c.dataset.filter || c.textContent || '';
      if (String(rawFilter).trim().toLowerCase() === String(currentFilter).trim().toLowerCase()) {
        c.classList.add('active');
        c.setAttribute('aria-selected', 'true');
      } else {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      }
    });

    // apply filter so sections (including Maps) are shown/hidden appropriately
    performSearch('', currentFilter);
  } catch (err) {
    // ignore initialization errors
    console.warn('searchhandler init: ', err);
  }

}

function handleFilterChipClick(event) {
  const chip = event.target.closest('.filter-chips .chip');
  if (!chip) return;

  event.preventDefault();
  event.stopPropagation();

  activateFilterChip(chip);
}

function setSectionVisibility(section, visible) {
  section.hidden = !visible;
  section.style.display = visible ? 'block' : 'none';
}

function activateFilterChip(chip) {
  if (!chip) return;

  const filterRail = chip.closest('.filter-chips');
  if (!filterRail) return;

  filterRail.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('active');
    c.setAttribute('aria-selected', 'false');
  });
  chip.classList.add('active');
  chip.setAttribute('aria-selected', 'true');

  currentFilter = String(chip.dataset.filter || chip.textContent || '').trim();
  const searchInput = document.querySelector('.search-bar input');
  performSearch(searchInput ? searchInput.value : '', currentFilter);
}

window.showNavigationMap = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const chip = document.querySelector('.filter-chips .chip[data-filter="Maps"]');
  if (chip) activateFilterChip(chip);
  const mapSection = document.querySelector('.section3[data-category="Maps"]');
  if (mapSection) setSectionVisibility(mapSection, true);
  return false;
};

document.addEventListener('click', handleFilterChipClick, true);

document.addEventListener('DOMContentLoaded', initializeSearchHandlers);

const searchObserver = new MutationObserver(function(mutations) {
  const mainContent = document.getElementById('main-content');
  const hasFilterChips = document.querySelector('.filter-chips .chip');
  const hasSearchBar = document.querySelector('.search-bar input');

  if (mainContent && (hasFilterChips || hasSearchBar)) {
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
    const items = section3.querySelectorAll('.pro-card, .section4');

    items.forEach(item => {
      item.setAttribute('data-category', categoryName);
    });
  });
}

function initSearchBar() {
  const searchInput = document.querySelector('.search-bar input');
  if (!searchInput) return;
  if (searchInput.dataset.searchHandlerAttached === 'true') return;

  searchInput.dataset.searchHandlerAttached = 'true';
  searchInput.addEventListener('input', function(e) {
    performSearch(e.target.value, currentFilter);
  });
}

function initFilterChips() {
  const filterRail = document.querySelector('.filter-chips');
  if (!filterRail) return;

  filterRail.querySelectorAll('.chip').forEach(chip => {
    if (!chip.hasAttribute('role')) chip.setAttribute('role', 'tab');
    if (!chip.hasAttribute('aria-selected')) chip.setAttribute('aria-selected', 'false');
  });
}

function performSearch(searchTerm, filterCategory) {
  const section3s = document.querySelectorAll('.section3');
  if (section3s.length === 0) return;

  const term = searchTerm.toLowerCase().trim();
  let totalVisibleCount = 0;

  section3s.forEach(section3 => {

    const sectionCategory = (section3.dataset.category || '').toString().trim();
    const sectionCategoryNorm = sectionCategory.toLowerCase();
    const filterNorm = (filterCategory || 'All').toString().trim().toLowerCase();

    // Special-case: hide the interactive Maps section when the global "All" filter is selected.
    // Only show the Maps section when the 'Maps' chip is explicitly chosen.
    let sectionMatchesFilter = false;
    if (filterNorm === 'all') {
      sectionMatchesFilter = sectionCategoryNorm !== 'maps';
    } else {
      sectionMatchesFilter = sectionCategoryNorm === filterNorm;
    }

    if (!sectionMatchesFilter) {
      setSectionVisibility(section3, false);
      return;
    }

    const items = section3.querySelectorAll('.pro-card, .section4');
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

    // If the section has no .section4 items (common for an interactive map section),
    // show the section when its category matches the filter so the map remains visible.
    if (items.length === 0) {
      setSectionVisibility(section3, true);
      totalVisibleCount++;
    } else {
      setSectionVisibility(section3, sectionVisibleCount > 0);
    }
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