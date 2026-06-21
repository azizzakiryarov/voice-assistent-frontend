import axios from 'axios';

const API_URL = '/api/voice-assistent';
const TEXT_ANALYSIS_API_URL = '/api/text-analysis';
const FORM_SCAN_API_URL = '/api/form-scans';
const TEXT_ANALYSIS_TIMEOUT_MS = 1200000;
const TEXT_ANALYSIS_POLL_INTERVAL_MS = 5000;

// Skapa en axios-instans med gemensam konfiguration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 sekunder timeout
  withCredentials: true,
});

const textAnalysisClient = axios.create({
  baseURL: TEXT_ANALYSIS_API_URL,
  timeout: TEXT_ANALYSIS_TIMEOUT_MS,
  withCredentials: true,
});

const formScanClient = axios.create({
  baseURL: FORM_SCAN_API_URL,
  timeout: TEXT_ANALYSIS_TIMEOUT_MS,
  withCredentials: true,
});

// Lägg till retry-logik för att hantera 502-fel
const axiosRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && (error.response?.status === 502 || error.response?.status === 503)) {
      console.warn(`Request failed with ${error.response?.status}, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosRetry(fn, retries - 1, delay * 1.5); // Exponential backoff
    }
    throw error;
  }
};

// Interceptor för att logga requests och responses
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`Response received: ${response.status} ${response.statusText}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`Response error: ${error.response.status} ${error.response.statusText}`);
      if (error.response.status === 502) {
        console.error('502 Bad Gateway - Backend service might be unavailable');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

textAnalysisClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export const uploadVoiceRecording = async (audioBlob, language = 'sv') => {
  return axiosRetry(async () => {
    const formData = new FormData();
    const extension = audioBlob.type === 'audio/mp4' ? 'm4a' : 'webm';
    formData.append('file', audioBlob, `recording.${extension}`);
    if (language) {
      formData.append('language', language);
    }

    const response = await apiClient.post('/voice-command/preview', formData, {
      timeout: 180000, // Lokal Whisper + LLM kan ta över en minut på Raspberry Pi
    });

    return response.data;
  });
};

export const approveVoiceCommand = async (command) => {
  return axiosRetry(async () => {
    const response = await apiClient.post('/voice-command/approve', command);
    return response.data;
  });
};

export const analyzeText = async (payload) => {
  const response = await textAnalysisClient.post('', payload, {
    timeout: TEXT_ANALYSIS_TIMEOUT_MS,
  });
  return response.data;
};

export const startTextAnalysisJob = async (payload) => {
  const response = await textAnalysisClient.post('/jobs', payload, {
    timeout: 30000,
  });
  return response.data;
};

export const fetchTextAnalysisJob = async (jobId) => {
  const response = await textAnalysisClient.get(`/jobs/${encodeURIComponent(jobId)}`, {
    timeout: 30000,
  });
  return response.data;
};

export const analyzeTextWithJob = async (payload, onJobUpdate) => {
  let job = await startTextAnalysisJob(payload);
  onJobUpdate?.(job);

  const deadline = Date.now() + TEXT_ANALYSIS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (job.status === 'SUCCEEDED') {
      return job.result;
    }
    if (job.status === 'FAILED') {
      throw new Error(job.message || 'Kunde inte analysera texten');
    }

    await new Promise(resolve => setTimeout(resolve, TEXT_ANALYSIS_POLL_INTERVAL_MS));
    job = await fetchTextAnalysisJob(job.jobId);
    onJobUpdate?.(job);
  }

  const timeoutError = new Error('Textanalysen tog för lång tid');
  timeoutError.code = 'ECONNABORTED';
  throw timeoutError;
};

export const approveTextAnalysis = async (payload) => {
  return axiosRetry(async () => {
    const response = await textAnalysisClient.post('/approve', payload, {
      timeout: 60000,
    });
    return response.data;
  });
};

export const scanForm = async (file) => {
  const formData = new FormData();
  formData.append('file', file, file.name || 'form-photo.jpg');
  const response = await formScanClient.post('', formData, {
    timeout: TEXT_ANALYSIS_TIMEOUT_MS,
  });
  return response.data;
};

export const approveFormScan = async (scanId, payload) => {
  const response = await formScanClient.post(`/${encodeURIComponent(scanId)}/approve`, payload, {
    timeout: 60000,
  });
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await apiClient.get('/auth/me', { timeout: 10000 });
  return response.data;
};

export const fetchSyncStatus = async () => {
  const response = await apiClient.get('/auth/sync-status', { timeout: 10000 });
  return response.data;
};

export const loginWithGoogle = () => {
  window.location.href = '/oauth2/authorization/google';
};

export const logout = async () => {
  await axios.post('/logout', null, { withCredentials: true });
};

export const confirmEmail = async (email, transcription) => {
  return axiosRetry(async () => {
    const response = await apiClient.post('/confirm-email', {
      email,
      transcription
    });
    return response.data;
  });
};

export const fetchTodos = async () => {
  return axiosRetry(async () => {
    const response = await apiClient.get('/todos');
    return response.data;
  });
};

export const syncGoogleTasks = async () => {
  return axiosRetry(async () => {
    const response = await apiClient.post('/todos/sync/google', null, {
      timeout: 60000,
    });
    return response.data;
  });
};

export const createTodo = async (todo) => {
  return axiosRetry(async () => {
    const response = await apiClient.post('/todos', todo);
    return response.data;
  });
};

export const updateTodo = async (id, updates) => {
  return axiosRetry(async () => {
    const response = await apiClient.put(`/todos/${id}`, updates);
    return response.data;
  });
};

export const deleteTodo = async (id) => {
  return axiosRetry(async () => {
    await apiClient.delete(`/todos/${id}`);
  });
};

// Hjälpfunktion för att kontrollera API-hälsa
export const checkApiHealth = async () => {
  try {
    const response = await apiClient.get('/health', { timeout: 5000 });
    return { healthy: true, status: response.status };
  } catch (error) {
    return { 
      healthy: false, 
      error: error.response?.status || 'Network Error',
      message: error.message 
    };
  }
};
