import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-conversation-history.ts';
import '@/ai/flows/generate-persona-response.ts';
import '@/ai/flows/summarize-conversation-title.ts';
import '@/ai/flows/process-transcript.ts';
