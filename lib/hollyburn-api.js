import axios from 'axios';

export function hollyburnApiBaseUrl() {
  const url = process.env.HOLLYBURN_API_URL;
  if (!url) {
    throw new Error('HOLLYBURN_API_URL env variable is not set');
  }
  return String(url).replace(/\/$/, '');
}

export function hollyburnApiHeaders() {
  const apiKey = process.env.HOLLYBURN_API_KEY;
  if (!apiKey) {
    throw new Error('HOLLYBURN_API_KEY env variable is not set');
  }
  return { key: apiKey };
}

export function hollyburnApi() {
  return axios.create({
    baseURL: hollyburnApiBaseUrl(),
    headers: hollyburnApiHeaders()
  });
}

export function apiErrorMessage(error, fallback = 'Unknown error occurred. Please try again.') {
  return error?.response?.data?.errorMessage || error?.message || fallback;
}
