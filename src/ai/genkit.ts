
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// IMPORTANT: The googleAI plugin is configured to use the API key from your
// .env file (GOOGLE_API_KEY). For this to work, you must ensure that
// the "Generative Language API" is enabled for this key in your
// Google Cloud Console. If you encounter authentication errors, it's likely
// because the key lacks the necessary permissions.
export const ai = genkit({
  plugins: [
    googleAI() // Genkit automatically looks for GOOGLE_API_KEY in the environment.
  ],
  model: 'googleai/gemini-2.0-flash',
});
