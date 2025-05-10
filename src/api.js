import axios from 'axios';

const API_URL = 'http://localhost:8081/api/voice-assistent'; // Replace with your actual API URL

export const uploadVoiceRecording = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');

    const response = await axios.post(`${API_URL}/transcribe`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Nu förväntar vi oss en utökad respons som innehåller både audioUrl, transkription och extraherad email
    return {
      audioUrl: response.data.audioUrl,
      transcription: response.data.transcription,
      extractedEmail: response.data.extractedEmail
    };
  } catch (error) {
    console.error('Error uploading voice recording:', error);
    throw error;
  }
};

// Ny funktion för att bekräfta en e-postadress
export const confirmEmail = async (email, transcription) => {
  try {
    const response = await axios.post(`${API_URL}/confirm-email`, {
      email,
      transcription
    });
    return response.data;
  } catch (error) {
    console.error('Error confirming email:', error);
    throw error;
  }
};

export const fetchTodos = async () => {
  try {
    const response = await axios.get(`${API_URL}/todos`);
    return response.data;
  } catch (error) {
    console.error('Error fetching todos:', error);
    throw error;
  }
};

export const createTodo = async (todo) => {
  try {
    const response = await axios.post(`${API_URL}/todos`, todo);
    return response.data;
  } catch (error) {
    console.error('Error creating todo:', error);
    throw error;
  }
};

export const updateTodo = async (id, updates) => {
  try {
    const response = await axios.patch(`${API_URL}/todos/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating todo:', error);
    throw error;
  }
};

export const deleteTodo = async (id) => {
  try {
    await axios.delete(`${API_URL}/todos/${id}`);
  } catch (error) {
    console.error('Error deleting todo:', error);
    throw error;
  }
};