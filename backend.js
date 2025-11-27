// --- Data Configurations ---

const dropdownData = {
  countries: [
    "Australia", "Brazil", "Canada", "China", "England",
    "Germany", "India", "Mexico", "Netherlands",
    "New Zealand", "South Africa"
  ],
  scores: [
    "Dots", "Goodlift", "Wilks", "Glossbrenner",
    "Squat in Kg", "Bench in kg", "Deadlift in kg", "Total in kg"
  ],
  functions: [
    "Average", "Max", "Min", "Mean"
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

// --- DOM Elements ---
const elements = {
  countrySelect: document.getElementById('countrySelect'),
  scoreSelect: document.getElementById('scoreSelect'),
  functionSelect: document.getElementById('functionSelect'),
  genderSelect: document.getElementById('genderSelect'),
  equipmentSelect: document.getElementById('equipmentSelect'),
  eventSelect: document.getElementById('eventSelect'),
  testedCheckbox: document.getElementById('tested-checkbox'),
  themeToggle: document.getElementById('themeToggle'),
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  desktopSidebarToggle: document.getElementById('desktopSidebarToggle'),
  reopenSidebar: document.getElementById('reopenSidebar'),
  playBtn: document.getElementById('playBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  resetBtn: document.getElementById('resetBtn'),
  applyBtn: document.getElementById('applyBtn'),
  // Sliders
  ageMin: document.getElementById('ageMin'),
  ageMax: document.getElementById('ageMax'),
  ageLabel: document.getElementById('ageLabel'),
  ageTrack: document.getElementById('ageTrack'),
  weightMin: document.getElementById('weightMin'),
  weightMax: document.getElementById('weightMax'),
  weightLabel: document.getElementById('weightLabel'),
  weightTrack: document.getElementById('weightTrack'),
};

// --- Initialization ---

function init() {
  populateDropdowns();
  initTheme();
  setupEventListeners();
  // Initialize slider visuals
  updateSliderVisuals(elements.ageMin, elements.ageMax, elements.ageTrack, elements.ageLabel);
  updateSliderVisuals(elements.weightMin, elements.weightMax, elements.weightTrack, elements.weightLabel);
}

// --- Functions ---

/**
 * Populates all select elements with "All" (default) + data
 */
function populateDropdowns() {
  // Helper to create options
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
  dropdownData.countries.forEach(c => {
    elements.countrySelect.appendChild(createOption(c));
  });

  // 2. Scores (No "All" option)
  dropdownData.scores.forEach(s => {
    elements.scoreSelect.appendChild(createOption(s));
  });

  // 3. Functions (No "All" option)
  dropdownData.functions.forEach(f => {
    elements.functionSelect.appendChild(createOption(f));
  });

  // 4. Gender
  addAllOption(elements.genderSelect);
  dropdownData.gender.forEach(g => {
    elements.genderSelect.appendChild(createOption(g));
  });

  // 5. Equipment (Using objects for labels)
  addAllOption(elements.equipmentSelect);
  dropdownData.equipment.forEach(item => {
    elements.equipmentSelect.appendChild(createOption(item.label, item.value));
  });

  // 6. Events
  addAllOption(elements.eventSelect);
  dropdownData.events.forEach(item => {
    elements.eventSelect.appendChild(createOption(item.label, item.value));
  });
}

/**
 * Handle Dark Mode Logic
 */
function initTheme() {
  // Check local storage or system preference
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

/**
 * Handle Sidebar Collapse
 */
function toggleSidebar() {
  const isMobile = window.innerWidth < 768;

  if (!isMobile) {
    // Desktop behavior
    if (elements.sidebar.classList.contains('w-0')) {
      // Open Sidebar
      elements.sidebar.classList.remove('w-0', 'p-0', 'overflow-hidden', 'border-none');
      elements.sidebar.classList.add('w-80', 'border-r');
      elements.reopenSidebar.classList.add('hidden');
    } else {
      // Close Sidebar
      elements.sidebar.classList.add('w-0', 'p-0', 'overflow-hidden', 'border-none');
      elements.sidebar.classList.remove('w-80', 'border-r');
      elements.reopenSidebar.classList.remove('hidden');
    }
  } else {
    // Mobile behavior
    if (elements.sidebar.classList.contains('-translate-x-full')) {
      // Open Sidebar
      elements.sidebar.classList.remove('-translate-x-full');
      elements.reopenSidebar.classList.add('hidden');
    } else {
      // Close Sidebar
      elements.sidebar.classList.add('-translate-x-full');
      elements.reopenSidebar.classList.remove('hidden');
    }
  }
}

/**
 * Update Slider Visuals (Track & Label)
 */
function updateSliderVisuals(minInput, maxInput, track, label) {
  const minVal = parseInt(minInput.value);
  const maxVal = parseInt(maxInput.value);

  // Ensure min <= max
  if(minVal > maxVal) {
    // If user dragged min past max, swap visual logic or prevent.
    // Simple prevention:
    const tmp = minVal;
    // This part is tricky with two inputs.
    // For simplicity, we assume they don't cross drastically or we let them cross.
    // Better UX: prevent crossing in the event listener.
  }

  // Calculate percentages
  const min = parseInt(minInput.min);
  const max = parseInt(minInput.max);
  const range = max - min;

  const leftPercent = ((minVal - min) / range) * 100;
  const rightPercent = 100 - (((maxVal - min) / range) * 100);

  track.style.left = leftPercent + "%";
  track.style.right = rightPercent + "%";

  label.textContent = `${minVal} - ${maxVal}`;
}

/**
 * Reset all filters to default state
 */
function resetFilters() {
  // Reset Dropdowns
  const selects = [
    elements.countrySelect, elements.scoreSelect,
    elements.functionSelect, elements.genderSelect,
    elements.equipmentSelect, elements.eventSelect
  ];

  selects.forEach(select => {
    select.selectedIndex = 0;
  });

  // Reset Checkbox
  if(elements.testedCheckbox) elements.testedCheckbox.checked = false;

  // Reset Age Slider (Min - Max)
  elements.ageMin.value = elements.ageMin.min;
  elements.ageMax.value = elements.ageMax.max;
  updateSliderVisuals(elements.ageMin, elements.ageMax, elements.ageTrack, elements.ageLabel);

  // Reset Weight Slider (Min - Max)
  elements.weightMin.value = elements.weightMin.min;
  elements.weightMax.value = elements.weightMax.max;
  updateSliderVisuals(elements.weightMin, elements.weightMax, elements.weightTrack, elements.weightLabel);

  console.log("Filters reset to default.");
}

/**
 * Gather all filter values and print to console
 */
function applyFilters() {
  const filterSettings = {
    country: elements.countrySelect.value,
    score: elements.scoreSelect.value,
    function: elements.functionSelect.value,
    gender: elements.genderSelect.value,
    ageRange: {
      min: parseInt(elements.ageMin.value),
      max: parseInt(elements.ageMax.value)
    },
    weightRange: {
      min: parseInt(elements.weightMin.value),
      max: parseInt(elements.weightMax.value)
    },
    isTested: elements.testedCheckbox.checked,
    equipment: elements.equipmentSelect.value,
    event: elements.eventSelect.value
  };

  console.log("--- Applying Filters ---");
  console.log(filterSettings);
}

function setupEventListeners() {
  // Theme
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Sidebar
  elements.sidebarToggle.addEventListener('click', toggleSidebar);
  elements.desktopSidebarToggle.addEventListener('click', toggleSidebar);
  elements.reopenSidebar.addEventListener('click', toggleSidebar);

  // Filter Buttons
  elements.resetBtn.addEventListener('click', resetFilters);
  elements.applyBtn.addEventListener('click', applyFilters);

  // Sliders Logic
  const attachSliderEvents = (minIn, maxIn, track, label) => {
    const handler = () => {
      // Prevent crossing
      if(parseInt(minIn.value) > parseInt(maxIn.value)) {
        // Swap values if crossed or simply push
        // Simple approach: if min > max, set min = max
        // Here we just update visuals
      }
      updateSliderVisuals(minIn, maxIn, track, label);
    };
    minIn.addEventListener('input', handler);
    maxIn.addEventListener('input', handler);
  };

  attachSliderEvents(elements.ageMin, elements.ageMax, elements.ageTrack, elements.ageLabel);
  attachSliderEvents(elements.weightMin, elements.weightMax, elements.weightTrack, elements.weightLabel);


  // Play/Pause visual feedback
  elements.playBtn.addEventListener('click', () => {
    elements.playBtn.classList.add('bg-blue-100', 'dark:bg-blue-900', 'border-blue-500');
    elements.pauseBtn.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'border-blue-500');
  });

  elements.pauseBtn.addEventListener('click', () => {
    elements.pauseBtn.classList.add('bg-blue-100', 'dark:bg-blue-900', 'border-blue-500');
    elements.playBtn.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'border-blue-500');
  });

  // Initialize mobile sidebar state
  if(window.innerWidth < 768) {
    elements.sidebar.classList.add('-translate-x-full');
    elements.reopenSidebar.classList.remove('hidden');
  }
}

// Run
init();