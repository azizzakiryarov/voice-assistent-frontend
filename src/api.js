import axios from 'axios';

const API_URL = '/api/voice-assistent';

// Skapa en axios-instans med gemensam konfiguration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 sekunder timeout
  headers: {
    'Content-Type': 'application/json',
  },
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

export const uploadVoiceRecording = async (audioBlob) => {
  return axiosRetry(async () => {
    const formData = new FormData();
    const extension = audioBlob.type === 'audio/mp4' ? 'm4a' : 'webm';
    formData.append('file', audioBlob, `recording.${extension}`);

    const response = await apiClient.post('/transcribe', formData, {
      timeout: 60000, // Längre timeout för filuppladdning
    });

    return {
      audioUrl: response.data.audioUrl,
      transcription: response.data.transcription,
      extractedEmail: response.data.extractedEmail
    };
  });
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

export const createTodo = async (todo) => {
  return axiosRetry(async () => {
    const response = await apiClient.post('/text', todo);
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
