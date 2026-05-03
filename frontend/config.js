const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8000' : '';

const API_BASE     = API;      // admin panel uses API_BASE
const API_BASE_URL = API;      // index.html, location.html etc use API_BASE_URL