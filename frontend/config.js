const API = (location.protocol.startsWith('http')) 
    ? location.origin 
    : 'http://localhost:8000';

const API_BASE     = API;      // admin panel
const API_BASE_URL = API;      // index.html, location.html etc
const BASE         = API;      // travel-agency.html

// Yandex Maps API Key (Obtain free API key from https://developer.tech.yandex.com/)
const YANDEX_API_KEY = "";