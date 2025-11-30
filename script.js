mapboxgl.accessToken = 'pk.eyJ1IjoibGFjNTg0NyIsImEiOiJjbWg5ZDV4azYwbmxoMmlweWszMXk5aTR6In0.geUP0I8Zg03UcZmMwuSbkA';
const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/lac5847/cmim85lbq008t01qt3ch3h1o0', //Your Style URL goes here
  center: [-122.27, 37.87], // starting position [lng, lat]. Note that lat must be set between -90 and 90
  zoom: 9 // starting zoom
});
map.on('load', function () {
  map.addSource('points-data', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/Lac5847/Wineries-Web-Map/refs/heads/main/data/map.geojson'
  });
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
  map.on('click', 'points-layer', (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const properties = e.features[0].properties;

    const popupContent = `
            <div>
                <h3>${properties.Name}</h3>
                <p><strong>Address:</strong> ${properties.Address}</p>
                <p><strong>Business Hours:</strong> ${properties.BusinessHours}</p>
                <p><strong>Business Days:</strong> ${properties.BusinessDays}</p>
            </div>
        `;
    new mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(map);
  });
  map.on('mouseenter', 'points-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'points-layer', () => {
    map.getCanvas().style.cursor = '';
