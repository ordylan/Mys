
import axios from 'axios';

// Use Vite BASE_URL so in production (base '/MyFQs/') requests go to '/MyFQs/api',
// while in dev Vite proxy maps '/api' -> backend
const apiBase = (import.meta.env.BASE_URL || '/') + 'api';
const api = axios.create({
  baseURL: apiBase + '/',
});

// Attach Authorization header if token present
const STORAGE_KEY = 'ON_MyFQs_Key';

api.interceptors.request.use(cfg => {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t) cfg.headers = Object.assign({}, cfg.headers, { Authorization: 'Bearer ' + t });
  } catch (e) {}
  
  // Add cache prevention headers
  cfg.headers = Object.assign({}, cfg.headers, {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  // Add timestamp to GET requests to prevent caching
  if (cfg.method === 'get') {
    const timestamp = Date.now();
    if (cfg.params) {
      cfg.params._ = timestamp;
    } else {
      cfg.params = { _: timestamp };
    }
  }
  
  return cfg;
});

// Alert on non-2xx responses with returned error message when available
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    try {
      const r = err.response;
      if (r && r.data) {
        const msg = r.data.error || r.data.message || JSON.stringify(r.data);
        alert('API Error: ' + msg);
      } else if (err.message) {
        alert('API Error: ' + err.message);
      } else {
        alert('API Error: unexpected response');
      }
    } catch (e) {
      // ignore
    }
    return Promise.reject(err);
  }
);

// Login -> obtains token
export const login = async (username, password) => {
  const fd = new FormData();
  fd.append('username', username);
  fd.append('password', password);
  const res = await api.post('/', fd, { params: { action: 'login' } });
  if (res.data && res.data.success && res.data.token) {
    localStorage.setItem(STORAGE_KEY, res.data.token);
  }
  return res.data;
};

export const logout = () => { localStorage.removeItem('fqs_token'); };

// Upload original image
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/', formData, { params: { action: 'upload' } });
};

// Save a single question record
export const saveRecord = (data) => api.post('/', data, { params: { action: 'save_record' } });

// List all questions (with optional filters)
export const listRecords = (params) => api.get('/', { params: Object.assign({ action: 'list_records' }, params) });

// Get cropped question images (masked/original)
export const getCrops = (id) => api.get('/', { params: { action: 'get_crops', id } });

// Generate test paper
export const generatePaper = (ids) => api.post('/', { ids: ids.join(',') }, { params: { action: 'generate_paper' } });

// Crop boxes from an uploaded image (server returns array of web paths)
export const cropBoxes = (img_path, boxes) => api.post('/', { img_path, boxes }, { params: { action: 'crop_boxes' } });

// Update an existing record
export const updateRecord = (data) => api.post('/', data, { params: { action: 'update_record' } });

export default {
  login,
  logout,
  uploadImage,
  saveRecord,
  listRecords,
  getCrops,
  generatePaper,
  cropBoxes,
  updateRecord,
};