mapboxgl.accessToken = 'pk.eyJ1IjoibGFjNTg0NyIsImEiOiJjbWg5ZDV4azYwbmxoMmlweWszMXk5aTR6In0.geUP0I8Zg03UcZmMwuSbkA';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/lac5847/cmim85lbq008t01qt3ch3h1o0',
  center: [-122.27, 37.87],
  zoom: 10
});

const AreaColors = {
  "American Canyon": "#DB968A",
  "Angwin": "#97A305",
  "Calistoga": "#e41a1c",
  "Deer Park": "#38177A",
  "Napa": "#a65628",
  "Oakville": "#ff7f00",
  "Pope Valley": "#7A1725",
  "Rutherford": "#4daf4a",
  "St. Helena": "#377eb8",
  "Yountville": "#984ea3",
  "Zinfandel": "#305361"
};
// Panels & DOM
let allFeatures = [];
const activeFilters = { Area: new Set(), BusinessHours: new Set(), BusinessDays: new Set(), ToursandTasting: new Set() };
const listingEl = document.getElementById('feature-listing');
const sidebar = document.getElementById('sidebar');

const categories = [
  { prop: 'Area', containerId: 'Area-filters' },
  { prop: 'BusinessHours', containerId: 'hours-filters' },
  { prop: 'BusinessDays', containerId: 'days-filters' },
  { prop: 'ToursandTasting', containerId: 'tours-filters' }
];

const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true });
const showSidebarBtn = document.getElementById('show-sidebar-btn');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');

fetch('https://raw.githubusercontent.com/Lac5847/Wineries-Web-Map/refs/heads/main/data/map.geojson')
  .then(r => r.json()).then(geojson => {
    allFeatures = geojson.features;

    map.on('load', () => {
      map.addSource('points-data', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'points-layer',
        type: 'circle',
        source: 'points-data',
        paint: {
          'circle-color': [
            'match',
            ['get', 'Area'],

            // Dynamically insert all your communities + colors

            "American Canyon", "#DB968A",
            "Angwin", "#97A305",
            "Calistoga", "#e41a1c",
            "Deer Park", "#38177A",
            "Napa", "#a65628",
            "Oakville", "#ff7f00",
            "Pope Valley", "#7A1725",
            "Rutherford", "#4daf4a",
            "St. Helena", "#377eb8",
            "Yountville", "#984ea3",
            "Zinfandel", "#305361",
            "#5B2071"
          ],
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000'
        }


      });

      buildFilterUI();
      updateListing(allFeatures);

      map.on('click', 'points-layer', (e) => {
        const f = e.features[0];
        popup.setLngLat(f.geometry.coordinates).setHTML(makePopupHtml(f.properties)).addTo(map);
      });
      map.on('mouseenter', 'points-layer', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'points-layer', () => map.getCanvas().style.cursor = '');
      buildLegend();
    });
  });

function buildLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = "<strong>Area</strong><br>";

  Object.entries(AreaColors).forEach(([Area, color]) => {
    const item = document.createElement('div');
    item.className = "legend-item";

    const swatch = document.createElement('span');
    swatch.className = "swatch";
    swatch.style.background = color;

    const label = document.createElement('span');
    label.textContent = Area;

    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  });
}

// Filter UI
function buildFilterUI() {
  categories.forEach(cat => {
    const container = document.getElementById(cat.containerId);
    if (!container) return;
    const unique = Array.from(new Set(allFeatures.map(f => (f.properties[cat.prop] ?? '').trim()).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    unique.forEach(val => {
      const id = `${cat.prop}__${slugify(val)}`;
      const wrapper = document.createElement('label');
      wrapper.className = 'filter-checkbox'; wrapper.htmlFor = id;
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id;
      cb.dataset.prop = cat.prop; cb.dataset.value = val;
      cb.addEventListener('change', onFilterChange);
      const span = document.createElement('span'); span.textContent = val;
      wrapper.appendChild(cb); wrapper.appendChild(span);
      container.appendChild(wrapper);
    });
  });

  document.querySelectorAll('.filter-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      body.classList.toggle('collapsed');
      const chev = header.querySelector('.chev');
      if (chev) chev.textContent = body.classList.contains('collapsed') ? '▸' : '▾';
    });
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    Object.keys(activeFilters).forEach(k => activeFilters[k].clear());
    document.querySelectorAll('#filters input[type="checkbox"]').forEach(cb => cb.checked = false);
    applyFilters();
  });

  // Sidebar collapse toggle
  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    showSidebarBtn.style.display = sidebar.classList.contains('collapsed') ? 'block' : 'none';
    setTimeout(() => map.resize(), 300);
  });

  showSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    showSidebarBtn.style.display = 'none';
    map.resize();
  });
}

function onFilterChange(e) {
  const cb = e.target;
  const prop = cb.dataset.prop;
  const val = cb.dataset.value;
  if (!prop) return;
  if (cb.checked) activeFilters[prop].add(val);
  else activeFilters[prop].delete(val);
  applyFilters();
}

function applyFilters() {
  const filtered = allFeatures.filter(f => {
    for (const cat of categories) {
      const set = activeFilters[cat.prop];
      if (set.size > 0 && !set.has((f.properties[cat.prop] ?? '').trim())) return false;
    }
    return true;
  });
  updateListing(filtered);
  const names = filtered.map(f => f.properties.Name).filter(Boolean);
  map.setFilter('points-layer', ['in', ['get', 'Name'], ['literal', names.length ? names : []]]);
}

function updateListing(features) {
  listingEl.innerHTML = '';
  if (!features.length) { listingEl.innerHTML = '<p>No results found.</p>'; return; }
  features.sort((a, b) => (a.properties.Name || '').localeCompare(b.properties.Name || ''));
  features.forEach(f => {
    const div = document.createElement('div');
    div.className = 'listing-item';
    div.innerHTML = `<strong>${f.properties.Name}</strong><div style="font-size:12px;color:#666">${f.properties.Area || ''}</div>`;
    div.addEventListener('click', () => { map.flyTo({ center: f.geometry.coordinates, zoom: 14, speed: 0.8 }); popup.setLngLat(f.geometry.coordinates).setHTML(makePopupHtml(f.properties)).addTo(map); });
    listingEl.appendChild(div);
  });
}

function makePopupHtml(props) {
  return `<div style="font-family:Inter, Arial">
    <h3 style="margin:0 0 6px 0">${props.Name || 'Winery'}</h3>
    ${props.Address ? `<div><strong>Address:</strong> ${props.Address}</div>` : ''}
    ${props.Area ? `<div><strong>Area:</strong> ${props.Area}</div>` : ''}
    ${props.BusinessHours ? `<div><strong>Hours:</strong> ${props.BusinessHours}</div>` : ''}
    ${props.BusinessDays ? `<div><strong>Days:</strong> ${props.BusinessDays}</div>` : ''}
    ${props.ToursandTasting ? `<div><strong>Tours & Tasting:</strong> ${props.ToursandTasting}</div>` : ''}
    ${props.Link ? `<div style="margin-top:6px"><a href="${props.Link}" target="_blank" rel="noopener">Website</a></div>` : ''}
  </div>`;
}

function slugify(text) { return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, ''); }