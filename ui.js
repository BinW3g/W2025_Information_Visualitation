// --- Data Configurations ---

// We will populate these dynamically where possible, or keep static defaults for labels
const dropdownData = {
  countries: ["Argentina", "Australia", "Brazil", "Canada", "China", "Germany",
    "India", "Mexico", "Netherlands", "New Zealand",
    "South Africa", "United States of America"], // "United Kingdom" TODO think about a solution
  scores: [
    "Dots", "Goodlift", "Wilks", "Glossbrenner",
    "Squat in Kg", "Bench in kg", "Deadlift in kg", "Total in kg"
  ],
  functions: [
      "Max", "Min",
      // "Mean", "Average" TODO implement these
  ],
  gender: [
    "M", "F", "Mx"
  ],
  equipment: [
    { label: "Raw (Bare knees/sleeves)", value: "Raw" },
    { label: "Wraps (Knee wraps allowed)", value: "Wraps" },
    { label: "Single-ply (Equipped)", value: "Single-ply" },
    { label: "Multi-ply (Equipped/Double)", value: "Multi-ply" },
    { label: "Unlimited (Rubberized gear)", value: "Unlimited" },
    { label: "Straps (Deadlift straps)", value: "Straps" }
  ],
  events: [
    { label: "SBD (Full Power)", value: "SBD" },
    { label: "BD (Ironman/Push-Pull)", value: "BD" },
    { label: "SD (Squat-Deadlift)", value: "SD" },
    { label: "SB (Squat-Bench)", value: "SB" },
    { label: "S (Squat-only)", value: "S" },
    { label: "B (Bench-only)", value: "B" },
    { label: "D (Deadlift-only)", value: "D" }
  ]
};

const fileName = "./data/openpowerlifting_filtered.csv";
// const fileName = "./data/small.csv";

// --- DOM Elements ---
const elements = {
  themeToggle: document.getElementById('themeToggle'),
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  desktopSidebarToggle: document.getElementById('desktopSidebarToggle'),
  reopenSidebar: document.getElementById('reopenSidebar'),

  // Filter
  countrySelect: document.getElementById('countrySelect'),
  scoreSelect: document.getElementById('scoreSelect'),
  functionSelect: document.getElementById('functionSelect'),
  genderSelect: document.getElementById('genderSelect'),
  equipmentSelect: document.getElementById('equipmentSelect'),
  eventSelect: document.getElementById('eventSelect'),
  testedCheckbox: document.getElementById('tested-checkbox'),
  resetBtn: document.getElementById('resetBtn'),
  applyBtn: document.getElementById('applyBtn'),

  // Filter Sliders
  ageMin: document.getElementById('ageMin'),
  ageMax: document.getElementById('ageMax'),
  ageLabel: document.getElementById('ageLabel'),
  ageTrack: document.getElementById('ageTrack'),
  weightMin: document.getElementById('weightMin'),
  weightMax: document.getElementById('weightMax'),
  weightLabel: document.getElementById('weightLabel'),
  weightTrack: document.getElementById('weightTrack'),

  // Date Slider
  dateMin: document.getElementById('dateMin'),
  dateMax: document.getElementById('dateMax'),
  dateLabel: document.getElementById('dateLabel'),
  dateTrack: document.getElementById('dateTrack'),
  playBtn: document.getElementById('playBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
};

// --- Global State ---
let animationInterval = null;
let globalData = []; // Store parsed CSV data
let dataBounds = {
  age: { min: 0, max: 100 },
  weight: { min: 0, max: 200 },
  year: { min: 1980, max: new Date().getFullYear() }
};

// --- Initialization ---

function init() {
  populateDropdowns();
  initTheme();
  setupEventListeners();

  // Show loading state or console log
  console.log("Loading data...");

  // Load CSV Data using D3
  // Assuming file is at root or accessible via this path

  d3.csv(fileName).then(data => {

    console.log("Data loaded:", data.length, "rows");

    // 1. Process Data & Convert Types
    globalData = data.map(d => {
      const dateObj = new Date(d.Date);
      return {
        ...d,
        Age: d.Age === "" ? null : +d.Age,
        BodyweightKg: d.BodyweightKg === "" ? null : +d.BodyweightKg,
        DateObj: dateObj,
        Year: isNaN(dateObj) ? null : dateObj.getFullYear(),
        Tested: d.Tested === "Yes"
      };
    });

    // console.log("Data loaded:", data, "rows");

    // 2. Calculate Min/Max values
    calculateDataBounds();

    // 3. Update UI Sliders with real data bounds
    configureSliders();

    // 4. Initial Map
    initMap();

    // 5. Initial Filter Application
    applyFilters();

  }).catch(err => {
    console.error("Error loading CSV:", err);
    // Fallback to default visuals if data fails
    updateSliderVisuals(elements.ageMin, elements.ageMax, elements.ageTrack, elements.ageLabel);
    updateSliderVisuals(elements.weightMin, elements.weightMax, elements.weightTrack, elements.weightLabel);
    updateSliderVisuals(elements.dateMin, elements.dateMax, elements.dateTrack, elements.dateLabel);
  });
}

// --- Functions ---

/**
 * Scan globalData to find min/max for Age, Weight, and Year
 */
function calculateDataBounds() {
  // Use d3.extent to find [min, max] efficiently, ignoring nulls
  const ageExtent = d3.extent(globalData, d => d.Age);
  const weightExtent = d3.extent(globalData, d => d.BodyweightKg);
  const yearExtent = d3.extent(globalData, d => d.Year);

  // Update bounds state (with fallbacks just in case)
  dataBounds.age.min = Math.floor(ageExtent[0]) || 5;
  dataBounds.age.max = Math.ceil(ageExtent[1]) || 90;

  dataBounds.weight.min = Math.floor(weightExtent[0]) || 30;
  dataBounds.weight.max = Math.ceil(weightExtent[1]) || 200;

  dataBounds.year.min = yearExtent[0] || 1980;
  dataBounds.year.max = yearExtent[1] || new Date().getFullYear();

  console.log("Calculated Bounds:", dataBounds);
}

/**
 * Apply calculated bounds to DOM elements
 */
function configureSliders() {
  // Age
  elements.ageMin.min = dataBounds.age.min;
  elements.ageMin.max = dataBounds.age.max;
  elements.ageMax.min = dataBounds.age.min;
  elements.ageMax.max = dataBounds.age.max;
  // Set default selection (e.g., roughly middle 50% or full range)
  elements.ageMin.value = Math.floor(dataBounds.age.min + (dataBounds.age.max - dataBounds.age.min) * 0.2);
  elements.ageMax.value = Math.floor(dataBounds.age.max - (dataBounds.age.max - dataBounds.age.min) * 0.2);
  updateSliderVisuals(elements.ageMin, elements.ageMax, elements.ageTrack, elements.ageLabel);

  // Weight
  elements.weightMin.min = dataBounds.weight.min;
  elements.weightMin.max = dataBounds.weight.max;
  elements.weightMax.min = dataBounds.weight.min;
  elements.weightMax.max = dataBounds.weight.max;
  elements.weightMin.value = Math.floor(dataBounds.weight.min + (dataBounds.weight.max - dataBounds.weight.min) * 0.2);
  elements.weightMax.value = Math.floor(dataBounds.weight.max - (dataBounds.weight.max - dataBounds.weight.min) * 0.2);
  updateSliderVisuals(elements.weightMin, elements.weightMax, elements.weightTrack, elements.weightLabel);

  // Date
  elements.dateMin.min = dataBounds.year.min;
  elements.dateMin.max = dataBounds.year.max;
  elements.dateMax.min = dataBounds.year.min;
  elements.dateMax.max = dataBounds.year.max;
  // Default to full range or last few years
  elements.dateMin.value = dataBounds.year.min;
  elements.dateMax.value = dataBounds.year.max;
  updateSliderVisuals(elements.dateMin, elements.dateMax, elements.dateTrack, elements.dateLabel);
}

/**
 * Populates all select elements
 */
function populateDropdowns() {
  const createOption = (text, value) => {
    const opt = document.createElement('option');
    opt.value = value || text;
    opt.textContent = text;
    return opt;
  };

  const addAllOption = (selectElement) => {
    const allOpt = createOption("All", "all");
    allOpt.selected = true;
    selectElement.appendChild(allOpt);
  };

  // 1. Countries (No "All" option)
  dropdownData.countries.forEach(c => elements.countrySelect.appendChild(createOption(c)));
  elements.countrySelect.addEventListener("change", e => {
    onCountryChange(e.target.value);
  })

  // 2. Scores (No "All" option)
  dropdownData.scores.forEach(s => elements.scoreSelect.appendChild(createOption(s)));

  // 3. Functions (No "All" option)
  dropdownData.functions.forEach(f => elements.functionSelect.appendChild(createOption(f)));

  // 4. Gender
  addAllOption(elements.genderSelect);
  dropdownData.gender.forEach(g => elements.genderSelect.appendChild(createOption(g)));

  // 5. Equipment (Using objects for labels)
  addAllOption(elements.equipmentSelect);
  dropdownData.equipment.forEach(item => elements.equipmentSelect.appendChild(createOption(item.label, item.value)));

  // 6. Events
  addAllOption(elements.eventSelect);
  dropdownData.events.forEach(item => elements.eventSelect.appendChild(createOption(item.label, item.value)));
}

function initTheme() {
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.theme = 'light';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.theme = 'dark';
  }
}

function toggleSidebar() {
  const isMobile = window.innerWidth < 768;
  if (!isMobile) {
    if (elements.sidebar.classList.contains('w-0')) {
      elements.sidebar.classList.remove('w-0', 'p-0', 'overflow-hidden', 'border-none');
      elements.sidebar.classList.add('w-80', 'border-r');
      elements.reopenSidebar.classList.add('hidden');
    } else {
      elements.sidebar.classList.add('w-0', 'p-0', 'overflow-hidden', 'border-none');
      elements.sidebar.classList.remove('w-80', 'border-r');
      elements.reopenSidebar.classList.remove('hidden');
    }
  } else {
    if (elements.sidebar.classList.contains('-translate-x-full')) {
      elements.sidebar.classList.remove('-translate-x-full');
      elements.reopenSidebar.classList.add('hidden');
    } else {
      elements.sidebar.classList.add('-translate-x-full');
      elements.reopenSidebar.classList.remove('hidden');
    }
  }
}

function updateSliderVisuals(minInput, maxInput, track, label) {
  let minVal = parseInt(minInput.value);
  let maxVal = parseInt(maxInput.value);

  if(minVal > maxVal) {
    const temp = minVal;
    minVal = maxVal;
    maxVal = temp;
  }

  const min = parseInt(minInput.min);
  const max = parseInt(minInput.max);
  const range = max - min;

  // Protect against divide by zero if range is 0 (unlikely with this data)
  const leftPercent = range === 0 ? 0 : ((minVal - min) / range) * 100;
  const rightPercent = range === 0 ? 0 : 100 - (((maxVal - min) / range) * 100);

  track.style.left = leftPercent + "%";
  track.style.right = rightPercent + "%";

  label.textContent = `${minVal} - ${maxVal}`;
}

/**
 * Handle Country Change from Dropdown
 */
function onCountryChange(selectedCountry) {
  console.log('Selecting country: ', selectedCountry);
  updateMap(selectedCountry);
  applyFilters()
}

function resetFilters() {
  const selects = [
    elements.genderSelect, elements.equipmentSelect, elements.eventSelect
  ];

  selects.forEach(select => select.selectedIndex = 0);
  if(elements.testedCheckbox) elements.testedCheckbox.checked = false;

  // Reset sliders to full range based on DATA bounds
  elements.ageMin.value = dataBounds.age.min;
  elements.ageMax.value = dataBounds.age.max;
  updateSliderVisuals(elements.ageMin, elements.ageMax, elements.ageTrack, elements.ageLabel);

  elements.weightMin.value = dataBounds.weight.min;
  elements.weightMax.value = dataBounds.weight.max;
  updateSliderVisuals(elements.weightMin, elements.weightMax, elements.weightTrack, elements.weightLabel);

  elements.dateMin.value = dataBounds.year.min;
  elements.dateMax.value = dataBounds.year.max;
  updateSliderVisuals(elements.dateMin, elements.dateMax, elements.dateTrack, elements.dateLabel);

  console.log("Filters reset to full data range.");
}

/**
 * Filter data based on UI state
 */
function applyFilters() {
  if (globalData.length === 0) {
    console.warn("Data not loaded yet.");
    return;
  }

  const filters = {
    country: elements.countrySelect.value,
    countryName: elements.countrySelect.value,
    gender: elements.genderSelect.value, // "all" or "M"/"F"
    equipment: elements.equipmentSelect.value, // "all" or value
    event: elements.eventSelect.value, // "all" or value
    isTested: elements.testedCheckbox.checked,
    ageMin: parseInt(elements.ageMin.value),
    ageMax: parseInt(elements.ageMax.value),
    weightMin: parseInt(elements.weightMin.value),
    weightMax: parseInt(elements.weightMax.value),
    yearMin: parseInt(elements.dateMin.value),
    yearMax: parseInt(elements.dateMax.value),

    scoreLabel: elements.scoreSelect.value,
    func: elements.functionSelect.value
  };

  // Normalize country names if needed
  if (filters.country === "United States of America") {
    filters.country = "USA";
  }
  if (filters.country === "United Kingdom") {
    filters.country = "England";
  }


  const scoreKeyMap = {
    "Dots": "Dots",
    "Goodlift": "Goodlift",
    "Wilks": "Wilks",
    "Glossbrenner": "Glossbrenner",
    "Squat in Kg": "Best3SquatKg",
    "Bench in kg": "Best3BenchKg",
    "Deadlift in kg": "Best3DeadliftKg",
    "Total in kg": "TotalKg"
  };

  const scoreColumn = scoreKeyMap[filters.scoreLabel];

  // Perform Filtering
  const filteredData = globalData.filter(d => {
    // 1. Text/Select Filters
    // Note: CSV country names might need normalization if they don't match dropdown exactly
    if (filters.country !== "all" && d.Country !== filters.country && d.MeetCountry !== filters.country)
      return false;
    if (filters.gender !== "all" && d.Sex !== filters.gender)
      return false;
    if (filters.equipment !== "all" && d.Equipment !== filters.equipment)
      return false;
    if (filters.event !== "all" && d.Event !== filters.event)
      return false;

    // 2. Boolean Filters
    if (filters.isTested && !d.Tested)
      return false;

    // 3. Range Filters (Handle nulls in data by excluding them if they fall outside?)
    // If d.Age is null, do we include it? Usually no if filtering by age.
    if (d.Age !== null && (d.Age < filters.ageMin || d.Age > filters.ageMax))
      return false;

    // Handle Bodyweight
    if (d.BodyweightKg !== null
        && (d.BodyweightKg < filters.weightMin || d.BodyweightKg > filters.weightMax))
      return false;

    // Handle Year
    if (d.Year !== null && (d.Year < filters.yearMin || d.Year > filters.yearMax))
      return false;

    // Ensure the score column exists and is not empty for this row
    if (d[scoreColumn] === "" || d[scoreColumn] === null || isNaN(d[scoreColumn]))
      return false;

    return true;
  });

  // 3. Aggregate: Find the Max/Min person per State
  const stateBestMap = {};

  filteredData.forEach(row => {
    const stateName = row.State;
    if (!stateName) return; // Skip records without a state

    // Force conversion to number for comparison
    const currentValue = parseFloat(row[scoreColumn]);

    // If we haven't seen this state yet, this row is currently the best
    if (!stateBestMap[stateName]) {
      stateBestMap[stateName] = row;
    } else {
      const existingBest = stateBestMap[stateName];
      const existingValue = parseFloat(existingBest[scoreColumn]);

      if (filters.func === "Min") {
        // Look for smaller values
        if (currentValue < existingValue) {
          stateBestMap[stateName] = row;
        }
      } else {
        // Default to Max
        if (currentValue > existingValue) {
          stateBestMap[stateName] = row;
        }
      }
    }
  });

  // Convert the Map object back to an Array
  const aggregatedData = Object.values(stateBestMap);

  console.log("--- Filter & Aggregation Applied ---");
  console.log(`Metric: ${filters.func} of ${filters.scoreLabel} (${scoreColumn})`);
  console.log(`Found winners for ${aggregatedData.length} states.`);

  // Debug: Log the winner of the first state found
  console.log("Example Winner:", aggregatedData);

  updateMap(filters.countryName, aggregatedData, scoreColumn);
}

function playTimeline() {
  if (animationInterval) return;

  elements.playBtn.classList.add('bg-blue-100', 'dark:bg-blue-900', 'border-blue-500');
  elements.pauseBtn.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'border-blue-500');

  // Disable sliders
  elements.dateMin.disabled = true;
  elements.dateMax.disabled = true;
  elements.dateMin.classList.add('opacity-50', 'cursor-not-allowed');
  elements.dateMax.classList.add('opacity-50', 'cursor-not-allowed');

  animationInterval = setInterval(() => {
    let currentMin = parseInt(elements.dateMin.value);
    let currentMax = parseInt(elements.dateMax.value);
    if (currentMin > currentMax) [currentMin, currentMax] = [currentMax, currentMin];

    const maxLimit = parseInt(elements.dateMax.max);
    const step = currentMax - currentMin;

    let nextMin = currentMax;
    let nextMax = currentMax + step;

    // Shrink window if hitting the end
    if (nextMin >= maxLimit) {
      stopTimeline();
      return;
    }

    if (nextMax > maxLimit) {
      nextMax = maxLimit;
    }

    elements.dateMin.value = nextMin;
    elements.dateMax.value = nextMax;
    updateSliderVisuals(elements.dateMin, elements.dateMax, elements.dateTrack, elements.dateLabel);

    // Optionally auto-apply filters during animation?
    // applyFilters();

    if (nextMin === nextMax) {
      stopTimeline();
    }

    applyFilters()

  }, 2000);
}

function stopTimeline() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  elements.pauseBtn.classList.add('bg-blue-100', 'dark:bg-blue-900', 'border-blue-500');
  elements.playBtn.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'border-blue-500');

  elements.dateMin.disabled = false;
  elements.dateMax.disabled = false;
  elements.dateMin.classList.remove('opacity-50', 'cursor-not-allowed');
  elements.dateMax.classList.remove('opacity-50', 'cursor-not-allowed');
}

function setupEventListeners() {
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.sidebarToggle.addEventListener('click', toggleSidebar);
  elements.desktopSidebarToggle.addEventListener('click', toggleSidebar);
  elements.reopenSidebar.addEventListener('click', toggleSidebar);
  elements.resetBtn.addEventListener('click', resetFilters);
  elements.applyBtn.addEventListener('click', applyFilters);

  const attachSliderEvents = (minIn, maxIn, track, label) => {
    const handler = () => updateSliderVisuals(minIn, maxIn, track, label);
    minIn.addEventListener('input', handler);
    maxIn.addEventListener('input', handler);
  };

  attachSliderEvents(elements.ageMin, elements.ageMax, elements.ageTrack, elements.ageLabel);
  attachSliderEvents(elements.weightMin, elements.weightMax, elements.weightTrack, elements.weightLabel);
  attachSliderEvents(elements.dateMin, elements.dateMax, elements.dateTrack, elements.dateLabel);

  elements.playBtn.addEventListener('click', playTimeline);
  elements.pauseBtn.addEventListener('click', stopTimeline);

  if(window.innerWidth < 768) {
    elements.sidebar.classList.add('-translate-x-full');
    elements.reopenSidebar.classList.remove('hidden');
  }
}

// Run
init();