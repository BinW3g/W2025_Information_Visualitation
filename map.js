const svg = d3.select("#myMap")
// 1. We create the mapGroup for the map features (this gets zoomed)
const mapGroup = svg.append("g");

// 2. We create a separate group for the Legend (this stays static)
const legendGroup = svg.append("g").attr("class", "legend");

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
  .scaleExtent([.5, 2])
  .on("zoom", (event) => {
    // Only apply transform to the mapGroup, not the legendGroup
    mapGroup.attr("transform", event.transform);
  });
  svg.call(zoom);

  window.addEventListener("resize", () => {
    updateMap(currentSelection, currentAthleteData, currentScoreCol);
  });

  d3.json(geoJsonFile).then(function(geoData) {
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
 */
function updateMap(selectedCountry, athleteData = [], scoreCol = "TotalKg") {
  currentSelection = selectedCountry;
  currentAthleteData = athleteData;
  currentScoreCol = scoreCol;
  const container = document.getElementById("map-container");
  const unit = scoreCol.includes("Kg") ? "kg" : "";

  // 1. Create Lookup & Calc Min/Max
  const athleteMap = new Map();
  let maxScore = 0;
  let minScore = Infinity;

  if (athleteData && athleteData.length > 0) {
    athleteData.forEach(d => {
      if (d.State) {
        athleteMap.set(d.State.trim(), d);
        const val = parseFloat(d[scoreCol]);
        if (!isNaN(val)) {
          if (val > maxScore) maxScore = val;
          if (val < minScore) minScore = val;
        }
      }
    });
  } else {
    // Handle empty data case safely
    minScore = 0;
    maxScore = 0;
  }

  // --- COLOR SCALE ---
  // Define the range array explicitly so we can use it for the legend later
  const colorRange = d3.schemeOranges[9].slice(3);

  const colorScale = d3.scaleQuantize()
  .domain([minScore, maxScore])
  .range(colorRange);

  // 2. Responsive Sizing
  const width = container.clientWidth - margin;
  const height = container.clientHeight - margin;

  svg
  .attr("width", width)
  .attr("height", height);

  // 3. Filter GeoJSON
  const filteredFeatures = allFeatures.filter(d => d.properties.admin === selectedCountry);
  const collection = { type: "FeatureCollection", features: filteredFeatures };

  // 4. Projection
  let projection = d3.geoMercator();
  if (selectedCountry === "United States of America") {
    projection = d3.geoAlbersUsa();
  }
  projection.fitSize([width, height], collection);
  const pathGenerator = d3.geoPath().projection(projection);

  // Reset Zoom
  svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
  );

  // 5. Draw Paths
  mapGroup.selectAll("path")
  .data(filteredFeatures, d => d.properties.name_en)
  .join("path")
  .attr("d", pathGenerator)
  .attr("stroke", "#666")
  .attr("stroke-width", 0.5)
  .attr("fill", d => {
    const stateName = d.properties.postal;
    const athlete = athleteMap.get(stateName);
    if (athlete) {
      const val = parseFloat(athlete[scoreCol]);
      return colorScale(val);
    } else {
      return "#999";
    }
  })
  .each(function(d) {
    const stateName = d.properties.name_en;
    const stateShort = d.properties.postal;
    const athlete = athleteMap.get(stateShort);
    const el = d3.select(this);
    el.select("title").remove();
    const titleText = el.append("title");
    if (athlete) {
      const val = parseFloat(athlete[scoreCol]).toFixed(2);
      titleText.text(`${stateName}\nWinner: ${athlete.Name}\n`
          + `Sex: ${athlete.Sex}\nAge: ${athlete.Age}`
          + `\nWeight: ${athlete.BodyweightKg} kg\nScore: ${val} ${unit}`);
    } else {
      titleText.text(`${stateName}\n(No data)`);
    }
  });

  // ----------------------------------------------------
  // 6. DRAW LEGEND (Top Right)
  // ----------------------------------------------------

  // Clear existing legend items
  legendGroup.selectAll("*").remove();

  if (athleteData.length > 0) {
    const legendWidth = 120;
    const itemHeight = 18;
    const padding = 10;

    // Position the legend group in the top-right corner
    // (width - legendWidth - small_margin, top_margin)
    legendGroup.attr("transform", `translate(${width - legendWidth - margin}, 20)`);

    // Add a semi-transparent background box for readability
    legendGroup.append("rect")
    .attr("width", legendWidth + padding * 2)
    .attr("height", (colorRange.length * itemHeight) + padding * 2 + 20) // +20 for title
    .attr("fill", "white")
    .attr("opacity", 0.8)
    .attr("stroke", "#ccc")
    .attr("rx", 5);

    // Add Title
    legendGroup.append("text")
    .attr("x", padding)
    .attr("y", padding + 10)
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text("Score Range");

    // Create a group for the list items
    const listGroup = legendGroup.append("g")
    .attr("transform", `translate(${padding}, ${padding + 25})`);

    // Iterate through the colors to draw boxes and text
    colorRange.forEach((color, i) => {
      // Invert extent returns [min, max] for a specific color bucket
      const extent = colorScale.invertExtent(color);

      // Safety check in case extent is missing
      if(!extent[0]) return;

      const rangeText = `${Math.round(extent[0])} ${unit} - ${Math.round(extent[1])} ${unit}`;

      const item = listGroup.append("g")
      .attr("transform", `translate(0, ${i * itemHeight})`);

      // Color Box
      item.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 0.5);

      // Text Label
      item.append("text")
      .attr("x", 20)
      .attr("y", 10) // vertically center in the box
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .text(rangeText);
    });
  }
}