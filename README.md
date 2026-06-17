# voice-assistent-frontend
Voice assisten which will create todo list with help of voice and will book a calendar event 

## Text analysis

Authenticated users can paste longer text into the "Analysera text" panel. The app sends the text to `/api/text-analysis`, shows suggested calendar events, todos, informational items, and warnings, and only calls `/api/text-analysis/approve` after the user selects and confirms the items to create.
