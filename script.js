// ===== Mapbox token & map init =====
mapboxgl.accessToken = 'pk.eyJ1IjoibGFjNTg0NyIsImEiOiJjbWg5ZDV4azYwbmxoMmlweWszMXk5aTR6In0.geUP0I8Zg03UcZmMwuSbkA';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/lac5847/cmim85lbq008t01qt3ch3h1o0',
  center: [-122.27, 37.87],
  zoom: 10
});

// ===== Global state =====
let allFeatures = []; // original geojson features
const activeFilters = { Community: new Set(), BusinessHours: new Set(), BusinessDays: new Set(), ToursandTasting: new Set() };
const listingEl = document.getElementById('feature-listing');
const sidebar = document.getElementById('sidebar');

// IDs of filter containers and property names mapping
const categories = [
  { prop: 'Community', containerId: 'community-filters' },
  { prop: 'BusinessHours', containerId: 'hours-filters' },
  { prop: 'BusinessDays', containerId: 'days-filters' },
  { prop: 'ToursandTasting', containerId: 'tours-filters' }
];

// Popup instance reuse
const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true });

// ===== Load GeoJSON and initialize map layer + UI =====
fetch('https://raw.githubusercontent.com/Lac5847/Wineries-Web-Map/refs/heads/main/data/map.geojson')
  .then(r => r.json())
  .then(geojson => {
    allFeatures = geojson.features;

    map.on('load', () => {
      // add source + layer
      if (!map.getSource('points-data')) {
        map.addSource('points-data', { type: 'geojson', data: geojson });
      } else {
        map.getSource('points-data').setData(geojson);
      }

      if (!map.getLayer('points-layer')) {
        map.addLayer({
          id: 'points-layer',
          type: 'circle',
          source: 'points-data',
          paint: {
            'circle-color': '#5B2071',
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#000000'
          }
        });
      }

      // Build filters UI (checkboxes)
      buildFilterUI();

      // initial listing
      updateListing(allFeatures);

      // map interactions
      map.on('click', 'points-layer', (e) => {
        const f = e.features[0];
        const coords = f.geometry.coordinates.slice();
        popup.setLngLat(coords)
          .setHTML(makePopupHtml(f.properties))
          .addTo(map);
      });
      map.on('mouseenter', 'points-layer', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'points-layer', () => map.getCanvas().style.cursor = '');
    });
  })
  .catch(err => {
    console.error('Error loading GeoJSON:', err);
    listingEl.innerHTML = '<p>Error loading data.</p>';
  });

// ===== Build filter UI: unique values per category -> checkboxes =====
function buildFilterUI() {
  categories.forEach(cat => {
    const container = document.getElementById(cat.containerId);
    if (!container) return;

    // Get unique, non-empty values and sort
    const unique = Array.from(new Set(allFeatures.map(f => (f.properties[cat.prop] ?? '').trim()).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    // For each unique value create a checkbox row
    unique.forEach(val => {
      const id = `${cat.prop}__${slugify(val)}`;

      const wrapper = document.createElement('label');
      wrapper.className = 'filter-checkbox';
      wrapper.htmlFor = id;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.dataset.prop = cat.prop;
      cb.dataset.value = val;
      cb.addEventListener('change', onFilterChange);

      const span = document.createElement('span');
      span.textContent = val;

      wrapper.appendChild(cb);
      wrapper.appendChild(span);
      container.appendChild(wrapper);
    });
  });

  // collapsible category headers
  document.querySelectorAll('.filter-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      body.classList.toggle('collapsed');
      // rotate chevron optionally
      const chev = header.querySelector('.chev');
      if (chev) chev.textContent = body.classList.contains('collapsed') ? '▸' : '▾';
    });
  });

  // Clear filters button
  document.getElementById('clear-filters').addEventListener('click', () => {
    // clear sets
    Object.keys(activeFilters).forEach(k => activeFilters[k].clear());
    // uncheck all boxes
    document.querySelectorAll('#filters input[type="checkbox"]').forEach(cb => cb.checked = false);
    // apply
    applyFilters();
  });

  // Sidebar collapse/expand (responsive)
  document.getElementById('toggle-sidebar').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    // change arrow direction
    const btn = document.getElementById('toggle-sidebar');
    btn.textContent = sidebar.classList.contains('collapsed') ? '⟩' : '⟨';
    // trigger map resize for proper rendering
    setTimeout(() => map.resize(), 300);
  });
}

// ===== When a checkbox changes =====
function onFilterChange(e) {
  const cb = e.target;
  const prop = cb.dataset.prop;
  const val = cb.dataset.value;

  if (!prop) return;

  if (cb.checked) activeFilters[prop].add(val);
  else activeFilters[prop].delete(val);

  applyFilters();
}

// ===== Build popup HTML helper =====
function makePopupHtml(props) {
  return `
    <div style="font-family:Inter, Arial">
      <h3 style="margin:0 0 6px 0">${props.Name || 'Winery'}</h3>
      ${props.Address ? `<div><strong>Address:</strong> ${props.Address}</div>` : ''}
      ${props.Community ? `<div><strong>Community:</strong> ${props.Community}</div>` : ''}
      ${props.BusinessHours ? `<div><strong>Hours:</strong> ${props.BusinessHours}</div>` : ''}
      ${props.BusinessDays ? `<div><strong>Days:</strong> ${props.BusinessDays}</div>` : ''}
      ${props.ToursandTasting ? `<div><strong>Tours & Tasting:</strong> ${props.ToursandTasting}</div>` : ''}
      ${props.link ? `<div style="margin-top:6px"><a href="${props.link}" target="_blank" rel="noopener">Website</a></div>` : ''}
    </div>
  `;
}

// ===== Apply filters: AND across categories, OR within each category =====
function applyFilters() {
  // Build filtered list by iterating features and checking category sets
  const filtered = allFeatures.filter(f => {
    // for each category, if the active set is non-empty, the feature must match at least one item in the set
    for (const cat of categories) {
      const set = activeFilters[cat.prop];
      if (set && set.size > 0) {
        const val = (f.properties[cat.prop] ?? '').trim();
        if (!set.has(val)) return false; // fail this feature
      }
    }
    return true;
  });

  // Update listing
  updateListing(filtered);

  // Update map filter: use 'in' on Name property (strings)
  const names = filtered.map(f => f.properties.Name).filter(Boolean);
  if (names.length) {
    map.setFilter('points-layer', ['in', ['get', 'Name'], ['literal', names]]);
  } else {
    // show none
    map.setFilter('points-layer', ['in', ['get', 'Name'], ['literal', []]]);
  }
}

// ===== Update listing DOM =====
function updateListing(features) {
  listingEl.innerHTML = '';
  if (!features.length) {
    listingEl.innerHTML = '<p>No results found.</p>';
    return;
  }

  // Optionally sort results (by Name)
  features.sort((a, b) => (a.properties.Name || '').localeCompare(b.properties.Name || ''));

  features.forEach(f => {
    const div = document.createElement('div');
    div.className = 'listing-item';
    div.innerHTML = `<strong>${f.properties.Name}</strong><div style="font-size:12px;color:#666">${f.properties.Community || ''}</div>`;

    div.addEventListener('click', () => {
      // fly to and popup
      map.flyTo({ center: f.geometry.coordinates, zoom: 14, speed: 0.8 });
      popup.setLngLat(f.geometry.coordinates).setHTML(makePopupHtml(f.properties)).addTo(map);
    });

    listingEl.appendChild(div);
  });
}

// ===== small helper: slugify for element ids =====
function slugify(text) {
  return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}
