// --- Global Variables ---
let ALL_COUNTRIES = {}; // Stores country data from restcountries.com
let COUNTRY_GEO_DATA = null; // Stores GeoJSON data for globe.gl
let START_COUNTRY = null;
let END_COUNTRY = null;
let CURRENT_COUNTRY_CODE = null; // The country (CCA3 code) the player is currently in
let LIVES = 5;
let gameGlobe; // The globe.gl instance
let pathCoords = []; // Stores { lat, lng } for drawing the path on the globe

// --- DOM Elements ---
const startCountryEl = document.getElementById('start-country');
const endCountryEl = document.getElementById('end-country');
const countryInput = document.getElementById('country-input');
const submitButton = document.getElementById('submit-guess');
const newGameButton = document.getElementById('new-game');
const pathListEl = document.getElementById('path-list');
const messageEl = document.getElementById('message');
const livesCountEl = document.getElementById('lives-count');
const currentCountryDisplayEl = document.getElementById('current-country-display');


// --- API FETCH AND INITIAL SETUP ---

async function fetchInitialData() {
    messageEl.textContent = "Fetching world data...";
    // API endpoint to get all countries with necessary fields: name, borders, and cca3
    const REST_COUNTRIES_API_URL = 'https://restcountries.com/v3.1/all?fields=name,borders,cca3,latlng';
    // GeoJSON for globe.gl to draw country polygons
    const GEOJSON_COUNTRIES_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson';

    try {
        // Fetch REST Countries data
        const countriesResponse = await fetch(REST_COUNTRIES_API_URL);
        if (!countriesResponse.ok) throw new Error("Failed to fetch REST Countries data.");
        const countriesData = await countriesResponse.json();
        
        const mappedData = {};
        for (const country of countriesData) {
            if (country.borders && country.latlng && country.latlng.length === 2) { 
                const commonName = country.name.common.toUpperCase();
                mappedData[commonName] = country;
            }
        }
        ALL_COUNTRIES = mappedData;

        // Fetch GeoJSON data for globe
        const geojsonResponse = await fetch(GEOJSON_COUNTRIES_URL);
        if (!geojsonResponse.ok) throw new Error("Failed to fetch GeoJSON data.");
        COUNTRY_GEO_DATA = await geojsonResponse.json();
        
        messageEl.textContent = "Data loaded. Starting game...";
        initializeGlobe(); // Initialize the globe after data is ready
        startGame();

    } catch (error) {
        console.error("Error loading data:", error);
        messageEl.textContent = "Error loading data. Please check console.";
        submitButton.disabled = true;
        countryInput.disabled = true;
    }
}

// --- GLOBE.GL INTEGRATION ---
function initializeGlobe() {
    gameGlobe = Globe()
        (document.getElementById('globe-viz'))
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
        .width(document.getElementById('globe-viz').clientWidth)
        .height(document.getElementById('globe-viz').clientHeight)
        .showAtmosphere(true)
        .atmosphereColor('lightskyblue')
        .atmosphereAltitude(0.25)
        .polygonsData(COUNTRY_GEO_DATA.features)
        .polygonCapColor(() => 'rgba(200, 0, 200, 0.05)') // Very faint color for all countries
        .polygonSideColor(() => 'rgba(0, 100, 0, 0.15)')
        .polygonStrokeColor(() => '#111');
        // .pointsData([]); // No initial points

    // Optionally set initial camera position
    gameGlobe.pointOfView({ lat: 0, lng: 0, altitude: 2 });
    
    // Auto-rotate the globe for better visual appeal
    let autoRotate = true;
    const initialRotationSpeed = 0.05; // degrees per frame
    function animateGlobe() {
        if (autoRotate) {
            gameGlobe.rotation.y += initialRotationSpeed * Math.PI / 180; // Convert to radians
        }
        requestAnimationFrame(animateGlobe);
    }
    // animateGlobe(); // Start animation loop
}

function updateGlobeVisualization() {
    if (!gameGlobe) return;

    const currentCountryData = Object.values(ALL_COUNTRIES).find(c => c.cca3 === CURRENT_COUNTRY_CODE);
    const startCountryGlobeData = ALL_COUNTRIES[START_COUNTRY];
    const endCountryGlobeData = ALL_COUNTRIES[END_COUNTRY];

    const highlightedPolygons = [];
    let currentCountryPolygon = null;

    if (currentCountryData) {
        // Find the GeoJSON feature for the current country
        currentCountryPolygon = COUNTRY_GEO_DATA.features.find(f => f.properties.ISO_A3 === CURRENT_COUNTRY_CODE);
        if (currentCountryPolygon) {
            highlightedPolygons.push(currentCountryPolygon);
        }
    }
    
    // Always highlight the start and end countries
    const startCountryPolygon = COUNTRY_GEO_DATA.features.find(f => f.properties.ISO_A3 === startCountryGlobeData.cca3);
    const endCountryPolygon = COUNTRY_GEO_DATA.features.find(f => f.properties.ISO_A3 === endCountryGlobeData.cca3);
    if (startCountryPolygon && !highlightedPolygons.includes(startCountryPolygon)) highlightedPolygons.push(startCountryPolygon);
    if (endCountryPolygon && !highlightedPolygons.includes(endCountryPolygon)) highlightedPolygons.push(endCountryPolygon);

    gameGlobe
        .polygonsData(COUNTRY_GEO_DATA.features) // Re-set all countries
        .polygonCapColor(feature => {
            if (feature.properties.ISO_A3 === START_COUNTRY_CODE) return 'rgba(0, 255, 0, 0.5)'; // Green for start
            if (feature.properties.ISO_A3 === END_COUNTRY_CODE) return 'rgba(255, 0, 0, 0.5)'; // Red for end
            if (feature.properties.ISO_A3 === CURRENT_COUNTRY_CODE) return 'rgba(0, 200, 255, 0.5)'; // Blue for current
            return 'rgba(200, 0, 200, 0.05)'; // Faint for others
        })
        .polygonAltitude(feature => {
            if (feature.properties.ISO_A3 === START_COUNTRY_CODE || feature.properties.ISO_A3 === END_COUNTRY_CODE || feature.properties.ISO_A3 === CURRENT_COUNTRY_CODE) {
                return 0.03; // Slightly raise highlighted countries
            }
            return 0.01;
        })
        .arcsData(pathCoords.map((c, i) => ({
            startLat: c.lat,
            startLng: c.lng,
            endLat: pathCoords[i + 1]?.lat,
            endLng: pathCoords[i + 1]?.lng,
            color: 'rgba(255, 255, 0, 0.8)' // Yellow path
        })).filter(arc => arc.endLat !== undefined)); // Filter out incomplete arcs

    // Make the globe focus on the current country
    if (currentCountryData) {
        gameGlobe.pointOfView({ 
            lat: currentCountryData.latlng[0], 
            lng: currentCountryData.latlng[1], 
            altitude: 2.5 
        }, 1000); // Zoom to current country over 1 second
    }
}


// --- GAME LOGIC FUNCTIONS ---

function getRandomCountryName() {
    const countryNames = Object.keys(ALL_COUNTRIES);
    const randomIndex = Math.floor(Math.random() * countryNames.length);
    return countryNames[randomIndex];
}

function startGame() {
    // Reset state
    pathListEl.innerHTML = '';
    messageEl.textContent = '';
    countryInput.value = '';
    countryInput.disabled = false;
    submitButton.disabled = false;
    LIVES = 5;
    livesCountEl.textContent = LIVES;
    pathCoords = []; // Clear path for globe
    
    // Select start and end countries (must have borders)
    let start, end;
    do {
        start = getRandomCountryName();
        // Ensure the selected country has border data and coordinates
    } while (!ALL_COUNTRIES[start] || !ALL_COUNTRIES[start].borders || ALL_COUNTRIES[start].borders.length === 0 || !ALL_COUNTRIES[start].latlng);
    START_COUNTRY = start;
    const START_COUNTRY_CODE = ALL_COUNTRIES[START_COUNTRY].cca3; // Store code for path consistency

    do {
        end = getRandomCountryName();
    } while (end === START_COUNTRY || !ALL_COUNTRIES[end] || !ALL_COUNTRIES[end].borders || ALL_COUNTRIES[end].borders.length === 0 || !ALL_COUNTRIES[end].latlng); // Ensure different and valid
    END_COUNTRY = end;
    const END_COUNTRY_CODE = ALL_COUNTRIES[END_COUNTRY].cca3; // Store code

    // Set initial current country and display
    CURRENT_COUNTRY_CODE = START_COUNTRY_CODE;
    
    startCountryEl.textContent = ALL_COUNTRIES[START_COUNTRY].name.common;
    endCountryEl.textContent = ALL_COUNTRIES[END_COUNTRY].name.common;
    currentCountryDisplayEl.textContent = ALL_COUNTRIES[START_COUNTRY].name.common;

    // Add starting country to the path list and globe path
    addCountryToPath(ALL_COUNTRIES[START_COUNTRY].name.common, ALL_COUNTRIES[START_COUNTRY].latlng[0], ALL_COUNTRIES[START_COUNTRY].latlng[1], true);
    messageEl.textContent = "Find a path!";
    
    updateGlobeVisualization(); // Update globe with start/end/current
}

function checkGuess(guessName) {
    if (LIVES <= 0) {
        messageEl.classList.add('error');
        messageEl.textContent = "Game Over! Start a new game.";
        return;
    }

    const normalizedGuess = guessName.toUpperCase().trim();
    const currentCountryData = Object.values(ALL_COUNTRIES).find(c => c.cca3 === CURRENT_COUNTRY_CODE);

    // 1. Validate Guess
    if (!ALL_COUNTRIES[normalizedGuess]) {
        messageEl.classList.remove('success');
        messageEl.classList.add('error');
        messageEl.textContent = `"${guessName}" is not a recognized country or has no land borders.`;
        deductLife();
        return;
    }

    const guessCountryData = ALL_COUNTRIES[normalizedGuess];
    
    // 2. Check Border
    const isBorder = currentCountryData.borders.includes(guessCountryData.cca3);

    if (isBorder) {
        // Correct Border
        messageEl.classList.remove('error');
        messageEl.classList.add('success');
        messageEl.textContent = `${guessName} borders ${currentCountryData.name.common}!`;
        addCountryToPath(guessName, guessCountryData.latlng[0], guessCountryData.latlng[1]);

        // 3. Check for Win Condition
        const endCountryCode = ALL_COUNTRIES[END_COUNTRY].cca3;
        
        if (guessCountryData.borders.includes(endCountryCode)) {
             // Game Won
            messageEl.classList.remove('error');
            messageEl.classList.add('success');
            messageEl.textContent = `VICTORY! ${guessName} borders ${ALL_COUNTRIES[END_COUNTRY].name.common}! You Win!`;
            addCountryToPath(ALL_COUNTRIES[END_COUNTRY].name.common, ALL_COUNTRIES[END_COUNTRY].latlng[0], ALL_COUNTRIES[END_COUNTRY].latlng[1]);
            endGame();
        } else {
            // Continue Game
            CURRENT_COUNTRY_CODE = guessCountryData.cca3;
            currentCountryDisplayEl.textContent = guessCountryData.name.common;
            countryInput.value = ''; // Clear input for next guess
            updateGlobeVisualization(); // Update globe to highlight new current country
        }
    } else {
        // Incorrect Border
        messageEl.classList.remove('success');
        messageEl.classList.add('error');
        messageEl.textContent = `${guessName} does NOT border ${currentCountryData.name.common}.`;
        deductLife();
    }
}

function deductLife() {
    LIVES--;
    livesCountEl.textContent = LIVES;
    if (LIVES <= 0) {
        messageEl.classList.add('error');
        messageEl.textContent = `Game Over! You ran out of lives. The correct path was leading to ${ALL_COUNTRIES[END_COUNTRY].name.common}.`;
        endGame();
    }
}

function endGame() {
    countryInput.disabled = true;
    submitButton.disabled = true;
}

function addCountryToPath(countryName, lat, lng, isStart = false) {
    const listItem = document.createElement('li');
    listItem.textContent = isStart ? `Start: ${countryName}` : countryName;
    pathListEl.appendChild(listItem);
    pathListEl.scrollTop = pathListEl.scrollHeight; // Scroll to bottom

    // Add to globe path coordinates
    pathCoords.push({ lat, lng });
    updateGlobeVisualization(); // Update globe with new path segment
}

// --- EVENT LISTENERS ---

submitButton.addEventListener('click', () => {
    const guess = countryInput.value;
    if (guess && LIVES > 0) {
        checkGuess(guess);
    } else if (LIVES <= 0) {
        messageEl.textContent = "Game Over! Start a new game.";
    }
});

countryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitButton.click();
    }
});

newGameButton.addEventListener('click', startGame);

// --- Initial Data Fetch ---
fetchInitialData();

// Adjust globe size on window resize
window.addEventListener('resize', () => {
    if (gameGlobe) {
        gameGlobe
            .width(document.getElementById('globe-viz').clientWidth)
            .height(document.getElementById('globe-viz').clientHeight);
    }
});