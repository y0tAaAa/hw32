// ============================================
// MovieFinder - Movie Search Application
// ============================================

// Configuration
const CONFIG = {
    API_KEY: 'OMDb API Key потрібен для роботи додатку',
    BASE_URL: 'https://www.omdbapi.com/',
    SEARCH_DELAY: 500, // Затримка в ms перед запитом до API
    MIN_SEARCH_LENGTH: 2, // Мінімальна довжина запиту
};

// Application State
let searchTimeout;
let currentSearchQuery = '';
let currentPage = 1;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const searchInfo = document.getElementById('searchInfo');
const movieModal = document.getElementById('movieModal');
const closeModalButton = document.getElementById('closeModal');
const movieDetails = document.getElementById('movieDetails');

// Initialize Application
function init() {
    setupEventListeners();
    console.log('🎬 MovieFinder ініціалізовано');
}

// Setup Event Listeners
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearchInput);
    closeModalButton.addEventListener('click', closeModal);
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) closeModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// Handle Search Input - LiveSearch Function
function handleSearchInput(event) {
    const query = event.target.value.trim();
    
    // Clear previous timeout
    clearTimeout(searchTimeout);

    if (query.length < CONFIG.MIN_SEARCH_LENGTH) {
        resetResults();
        return;
    }

    currentSearchQuery = query;
    currentPage = 1;

    // Show loading state after delay
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, CONFIG.SEARCH_DELAY);
}

// Perform Search
async function performSearch(query) {
    try {
        showLoading(true);
        hideError();
        
        const data = await fetchMovies(query);
        
        if (data.Response === 'True') {
            displayResults(data.Search);
            updateSearchInfo(`Знайдено: ${data.totalResults} результатів`);
        } else {
            showError(data.Error || 'Фільми не знайдені');
            emptyState.classList.remove('hidden');
            resultsContainer.innerHTML = '';
        }
    } catch (error) {
        handleError(error);
    } finally {
        showLoading(false);
    }
}

// Fetch Movies from OMDb API
async function fetchMovies(query, page = 1) {
    try {
        // Перевіримо, чи встановлений API key
        if (CONFIG.API_KEY === 'OMDb API Key потрібен для роботи додатку') {
            throw new Error(
                'OMDb API key не налаштований. ' +
                'Будь ласка, отримайте API key на https://www.omdbapi.com/ ' +
                'та встановіть його в script.js (CONFIG.API_KEY)'
            );
        }

        const url = new URL(CONFIG.BASE_URL);
        url.searchParams.append('apikey', CONFIG.API_KEY);
        url.searchParams.append('s', query);
        url.searchParams.append('type', 'movie');
        url.searchParams.append('page', page);

        const response = await fetch(url.toString());
        
        if (!response.ok) {
            throw new Error(`HTTP помилка! статус: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.Response === 'False') {
            throw new Error(data.Error || 'Невідома помилка API');
        }

        return data;
    } catch (error) {
        console.error('❌ Помилка при отриманні даних:', error);
        throw error;
    }
}

// Display Results
function displayResults(movies) {
    if (!movies || movies.length === 0) {
        emptyState.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    resultsContainer.innerHTML = movies.map(movie => createMovieCard(movie)).join('');

    // Add click handlers to movie cards
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const imdbID = card.dataset.imdbid;
            showMovieDetails(imdbID);
        });
    });
}

// Create Movie Card HTML
function createMovieCard(movie) {
    const { Title, Year, Type, Poster, imdbID } = movie;
    const posterURL = Poster !== 'N/A' ? Poster : null;

    return `
        <div class="movie-card" data-imdbid="${imdbID}">
            <div class="movie-poster">
                ${posterURL 
                    ? `<img src="${posterURL}" alt="${Title}" loading="lazy">` 
                    : '<div class="movie-poster-placeholder">🎬</div>'
                }
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${escapeHtml(Title)}</h3>
                <div class="movie-meta">
                    <span class="movie-year">${Year}</span>
                    <span class="movie-type">${Type}</span>
                </div>
            </div>
        </div>
    `;
}

// Show Movie Details in Modal
async function showMovieDetails(imdbID) {
    try {
        showLoading(true);
        hideError();

        const movie = await fetchMovieDetails(imdbID);
        
        movieDetails.innerHTML = createMovieDetailHTML(movie);
        movieModal.classList.remove('hidden');
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    } catch (error) {
        handleError(error);
    } finally {
        showLoading(false);
    }
}

// Fetch Movie Details
async function fetchMovieDetails(imdbID) {
    try {
        if (CONFIG.API_KEY === 'OMDb API Key потрібен для роботи додатку') {
            throw new Error('OMDb API key не налаштований');
        }

        const url = new URL(CONFIG.BASE_URL);
        url.searchParams.append('apikey', CONFIG.API_KEY);
        url.searchParams.append('i', imdbID);
        url.searchParams.append('plot', 'full');

        const response = await fetch(url.toString());
        
        if (!response.ok) {
            throw new Error(`HTTP помилка! статус: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.Response === 'False') {
            throw new Error(data.Error || 'Деталі фільму не знайдені');
        }

        return data;
    } catch (error) {
        console.error('❌ Помилка при отриманні деталей:', error);
        throw error;
    }
}

// Create Movie Detail HTML
function createMovieDetailHTML(movie) {
    const {
        Title,
        Year,
        Rated,
        Runtime,
        Genre,
        Director,
        Writer,
        Actors,
        Plot,
        Language,
        Country,
        Awards,
        imdbRating,
        imdbVotes,
        Poster
    } = movie;

    const posterURL = Poster !== 'N/A' ? Poster : null;

    return `
        <div class="movie-detail">
            <div class="movie-detail-poster">
                ${posterURL 
                    ? `<img src="${posterURL}" alt="${Title}">` 
                    : '<div style="width: 150px; height: 225px; background: #2d3561; display: flex; align-items: center; justify-content: center; border-radius: 10px;">🎬</div>'
                }
            </div>
            <div class="movie-detail-info">
                <h2 class="detail-title">${escapeHtml(Title)}</h2>
                <div class="detail-meta">
                    ${createDetailRow('Рік', Year)}
                    ${createDetailRow('Рейтинг', `⭐ ${imdbRating} / 10 (${imdbVotes} голосів)`)}
                    ${Runtime !== 'N/A' ? createDetailRow('Тривалість', Runtime) : ''}
                    ${Rated !== 'N/A' ? createDetailRow('Вік', Rated) : ''}
                    ${Genre !== 'N/A' ? createDetailRow('Жанр', Genre) : ''}
                    ${Director !== 'N/A' ? createDetailRow('Режисер', Director) : ''}
                </div>
            </div>
        </div>
        ${Plot !== 'N/A' ? `<p class="detail-description"><strong>Сюжет:</strong><br>${escapeHtml(Plot)}</p>` : ''}
        ${Actors !== 'N/A' ? `<p class="detail-description"><strong>Актори:</strong> ${escapeHtml(Actors)}</p>` : ''}
        ${Awards !== 'N/A' && Awards !== 'N/A Nominations' ? `<p class="detail-description"><strong>Нагороди:</strong> ${escapeHtml(Awards)}</p>` : ''}
        ${Language !== 'N/A' ? `<p class="detail-description"><strong>Мови:</strong> ${escapeHtml(Language)}</p>` : ''}
        ${Country !== 'N/A' ? `<p class="detail-description"><strong>Країни:</strong> ${escapeHtml(Country)}</p>` : ''}
    `;
}

// Create Detail Row
function createDetailRow(label, value) {
    return `
        <div class="detail-row">
            <span class="detail-label">${label}:</span>
            <span class="detail-value">${escapeHtml(value)}</span>
        </div>
    `;
}

// Close Modal
function closeModal() {
    movieModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// UI Helper Functions
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function showError(message) {
    errorMessage.textContent = `⚠️ ${message}`;
    errorMessage.classList.remove('hidden');
    console.error('❌', message);
}

function hideError() {
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
}

function updateSearchInfo(info) {
    searchInfo.textContent = info;
}

function resetResults() {
    resultsContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    searchInfo.textContent = '';
    hideError();
    showLoading(false);
}

// Error Handling
function handleError(error) {
    const errorMessages = {
        'OMDb API key не налаштований': 
            'API key не налаштований. Отримайте його на https://www.omdbapi.com/ та встановіть в script.js',
        'No API key provided': 
            'API key не надан. Отримайте його на https://www.omdbapi.com/',
        'Invalid API key!': 
            'Невірний API key. Перевірте значення в script.js',
        'Movie not found!': 
            'Фільм не знайдений',
    };

    let displayMessage = error.message;
    
    // Check for specific error messages
    for (const [key, value] of Object.entries(errorMessages)) {
        if (error.message.includes(key)) {
            displayMessage = value;
            break;
        }
    }

    showError(displayMessage);
    resetResults();
}

// Utility Functions
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Check if API key is configured
function checkApiKeyConfiguration() {
    if (CONFIG.API_KEY === 'OMDb API Key потрібен для роботи додатку') {
        console.warn(
            '%c⚠️ ВАЖЛИВО: OMDb API key не налаштований!',
            'color: red; font-size: 16px; font-weight: bold;'
        );
        console.log(
            '%cДля роботи додатку:' +
            '\n1. Перейдіть на https://www.omdbapi.com/' +
            '\n2. Натисніть "API key" і отримайте безплатний ключ' +
            '\n3. Відкрийте script.js' +
            '\n4. Знайдіть CONFIG.API_KEY і встановіть ваш ключ',
            'color: blue; font-size: 14px;'
        );
    }
}

// Start Application
window.addEventListener('DOMContentLoaded', () => {
    init();
    checkApiKeyConfiguration();
});
