mapboxgl.accessToken = 'pk.eyJ1IjoibGFjNTg0NyIsImEiOiJjbWg5ZDV4azYwbmxoMmlweWszMXk5aTR6In0.geUP0I8Zg03UcZmMwuSbkA';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/lac5847/cmim85lbq008t01qt3ch3h1o0',
  center: [-122.27, 37.87],
  zoom: 9
});

let allFeatures = [];
const listingEl = document.getElementById("feature-listing");
const activeFilters = { Community: null, BusinessHours: null, BusinessDays: null, ToursandTasting: null };

// Load GeoJSON and initialize
fetch("https://raw.githubusercontent.com/Lac5847/Wineries-Web-Map/refs/heads/main/data/map.geojson")
  .then(res => res.json())
  .then(geojson => {
    allFeatures = geojson.features;

    map.on('load', () => {
      map.addSource('points-data', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'points-layer',
        type: 'circle',
        source: 'points-data',
        paint: { 'circle-color': '#5B2071', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#000000' }
      });

      setupToggles();
      renderListings(allFeatures);
    });

    // Map popups on click
    map.on('click', 'points-layer', (e) => {
      const f = e.features[0];
      const coords = f.geometry.coordinates.slice();
      new mapboxgl.Popup()
        .setLngLat(coords)
        .setHTML(`
          <h3>${f.properties.Name}</h3>
          <p><strong>Community:</strong> ${f.properties.Community}</p>
          <p><strong>Business Hours:</strong> ${f.properties.BusinessHours}</p>
          <p><strong>Business Days:</strong> ${f.properties.BusinessDays}</p>
          <p><strong>Tours & Tasting:</strong> ${f.properties.ToursandTasting}</p>
        `)
        .addTo(map);
    });

    map.on('mouseenter', 'points-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'points-layer', () => map.getCanvas().style.cursor = '');
  });

// Render listings
function renderListings(features) {
  listingEl.innerHTML = "";
  if (!features.length) { listingEl.innerHTML = "<p>No results found.</p>"; return; }

  features.forEach(f => {
    const div = document.createElement("div");
    div.textContent = `${f.properties.Name} — ${f.properties.Community}`;
    div.style.cursor = "pointer";

    div.addEventListener("click", () => {
      map.flyTo({ center: f.geometry.coordinates, zoom: 14, speed: 0.8 });
      new mapboxgl.Popup()
        .setLngLat(f.geometry.coordinates)
        .setHTML(`
          <h3>${f.properties.Name}</h3>
          <p><strong>Community:</strong> ${f.properties.Community}</p>
          <p><strong>Business Hours:</strong> ${f.properties.BusinessHours}</p>
          <p><strong>Business Days:</strong> ${f.properties.BusinessDays}</p>
          <p><strong>Tours & Tasting:</strong> ${f.properties.ToursandTasting}</p>
        `)
        .addTo(map);
    });

    listingEl.appendChild(div);
  });
}

// Setup toggle buttons
function setupToggles() {
  const filterCategories = [
    { prop: "Community", containerId: "community-toggles" },
    { prop: "BusinessHours", containerId: "hours-toggles" },
    { prop: "BusinessDays", containerId: "days-toggles" },
    { prop: "ToursandTasting", containerId: "tours-toggles" }
  ];

  filterCategories.forEach(cat => {
    const container = document.getElementById(cat.containerId);
    const uniqueValues = [...new Set(allFeatures.map(f => f.properties[cat.prop]))];

    uniqueValues.forEach(val => {
      const btn = document.createElement("button");
      btn.textContent = val;
      btn.className = "toggle-btn";

      btn.addEventListener("click", () => {
        if (activeFilters[cat.prop] === val) {
          activeFilters[cat.prop] = null;
          btn.classList.remove("active-toggle");
        } else {
          activeFilters[cat.prop] = val;
          container.querySelectorAll("button").forEach(b => b.classList.remove("active-toggle"));
          btn.classList.add("active-toggle");
        }
        applyFilters();
      });

      container.appendChild(btn);
    });
  });

  // Make filter categories collapsible
  document.querySelectorAll(".filter-header").forEach(header => {
    header.addEventListener("click", () => {
      const body = header.nextElementSibling;
      body.classList.toggle("collapsed");
    });
  });
}

// Apply active filters
function applyFilters() {
  let filtered = allFeatures;

  Object.keys(activeFilters).forEach(key => {
    if (activeFilters[key]) {
      filtered = filtered.filter(f => f.properties[key] === activeFilters[key]);
    }
  });

  renderListings(filtered);

  if (filtered.length) {
    map.setFilter("points-layer", ["in", ["get", "Name"], ["literal", filtered.map(f => f.properties.Name)]]);
  } else {
    map.setFilter("points-layer", ["in", ["get", "Name"], ["literal", []]]);
  }
}
