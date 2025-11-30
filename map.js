
const svg = d3.select("#myMap")
const mapGroup = svg.append("g");
const colorScale = d3.scaleOrdinal(d3.schemeSet3);
const margin = 20;
const geoJsonFile = "./data/countries.json"
let zoom;
let allFeatures = [];
let currentSelection;
let currentAthleteData;
let currentScoreCol;

function initMap() {
  console.log("Initializing map with country");

  // Zoom Behavior
  zoom = d3.zoom()
  .scaleExtent([.1, 10])
  .on("zoom", (event) => {
    mapGroup.attr("transform", event.transform);
  });
  svg.call(zoom);

  window.addEventListener("resize", () => {
    // Re-run updateMap whenever the window size changes
    updateMap(currentSelection, currentAthleteData, currentScoreCol);
  });

  d3.json(geoJsonFile).then(function(geoData) {
    // ---FIXES geoJsonFile otherwise it trys to draw into the wrong direction? ---
    geoData.features.forEach(function(feature) {
      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates.forEach(ring => ring.reverse());
      }
      else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => ring.reverse());
        });
      }
    });
    allFeatures = geoData.features;
  }).catch(error => console.error(error));
}



/**
 * Update the map visuals based on the selected country and athlete data.
 * @param {string} selectedCountry - The country to zoom/filter map to.
 * @param {Array} athleteData - (Optional) Array of athlete objects (winners per state).
 * @param {string} scoreCol - (Optional) The specific CSV column key for the score (e.g., "Best3SquatKg").
 */
function updateMap(selectedCountry, athleteData = [], scoreCol = "TotalKg") {
  currentSelection = selectedCountry;
  currentAthleteData = athleteData;
  currentScoreCol = scoreCol;
  const container = document.getElementById("map-container");

  // 1. Create a Lookup Map for Athlete Data (State Name -> Athlete Object)
  // We normalize keys to ensure matching (e.g., trimming spaces)
  const athleteMap = new Map();
  if (athleteData && athleteData.length > 0) {
    athleteData.forEach(d => {
      if (d.State) athleteMap.set(d.State.trim(), d);
    });
  }

  // 2. Responsive Sizing
  svg
  .attr("width", container.clientWidth - margin)
  .attr("height", container.clientHeight - margin);

  // 3. Filter GeoJSON features by selected Country
  const filteredFeatures = allFeatures.filter(d => d.properties.admin === selectedCountry);

  // Create temporary FeatureCollection for fitting bounds
  const collection = { type: "FeatureCollection", features: filteredFeatures };

  // 4. Projection Setup
  let projection = d3.geoMercator();
  if (selectedCountry === "United States of America") {
    projection = d3.geoAlbersUsa();
  }
  // Fit map to container
  projection.fitSize([container.clientWidth - margin, container.clientHeight - margin], collection);

  const pathGenerator = d3.geoPath().projection(projection);

  // Reset Zoom
  svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
  );

  let delCounter = 0;
  let missingCountries = new Map(athleteMap);

  // 5. Draw Paths (State/Province shapes)
  mapGroup.selectAll("path")
  .data(filteredFeatures, d => d.properties.name_en) // Key function ensures consistent DOM mapping
  .join("path")
  .attr("d", pathGenerator)
  .attr("stroke", "#fff")
  .attr("stroke-width", 0.5)

  // Dynamic Fill: Color if we have data, Grey if we don't
  .attr("fill", d => {
    const stateName = d.properties.postal;
    return athleteMap.has(stateName) ? colorScale(stateName) : "#000000";
  })

  // 6. Tooltip (Basic Browser Tooltip)
  // We remove existing titles first to ensure clean updates
  .each(function(d) {
    const stateName = d.properties.name_en;
    const stateShort = d.properties.postal;
    const athlete = athleteMap.get(stateShort);

    // Select the current path element
    const el = d3.select(this);
    el.select("title").remove(); // Remove old tooltip

    const titleText = el.append("title");

    if (athlete) {
      // Show rich info if data exists
      titleText.text(`${stateName}\nWinner: ${athlete.Name}\nScore: ${athlete[scoreCol]} kg`);
      delCounter++;
      missingCountries.delete(stateShort)
    } else {
      // Show just state name if no data
      titleText.text(`${stateName}\n(No data)`);
    }
  });
  console.log("is " + delCounter + " should " + athleteMap.size);
  console.log(missingCountries);
}