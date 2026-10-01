import axios from 'axios';

const DEFAULT_BASE_URL = 'https://api.hollyburn.com';

function requireApiKey() {
  const key = process.env.HOLLYBURN_API_KEY;
  if (!key) {
    throw new Error('Hollyburn API key is not set.');
  }
  return key;
}

function baseUrl() {
  const configured = process.env.HOLLYBURN_API_BASE_URL;
  const url = configured && configured.trim() ? configured.trim() : DEFAULT_BASE_URL;
  return url.replace(/\/$/, '');
}

/**
 * POST a JSON body to Hollyburn API. Returns the parsed response body.
 * A non-2xx throws an Error with `status` and `errorMessage` from the API.
 */
export async function post(path, body) {
  const key = requireApiKey();
  try {
    const response = await axios.post(`${baseUrl()}${path}`, body, {
      headers: {key}
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      const errorMessage = error.response.data && error.response.data.errorMessage;
      const wrapped = new Error(errorMessage || error.message);
      wrapped.status = error.response.status;
      wrapped.errorMessage = errorMessage;
      throw wrapped;
    }
    throw error;
  }
}
