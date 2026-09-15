// Summarizes past conversation history for quick recall using AI.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationSummaryInputSchema = z.object({
  conversationHistory: z.string().describe('The full conversation history to summarize.'),
});
export type ConversationSummaryInput = z.infer<typeof ConversationSummaryInputSchema>;

const ConversationSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the conversation history.'),
});
export type ConversationSummaryOutput = z.infer<typeof ConversationSummaryOutputSchema>;

export async function summarizeConversationHistory(input: ConversationSummaryInput): Promise<ConversationSummaryOutput> {
  return summarizeConversationHistoryFlow(input);
}

const summarizeConversationHistoryPrompt = ai.definePrompt({
  name: 'summarizeConversationHistoryPrompt',
  input: {
    schema: ConversationSummaryInputSchema,
  },
  output: {
    schema: ConversationSummaryOutputSchema,
  },
  prompt: `Summarize the following conversation history. Focus on the main topics discussed and key decisions or insights shared:\n\n{{conversationHistory}}`,
});

const summarizeConversationHistoryFlow = ai.defineFlow(
  {
    name: 'summarizeConversationHistoryFlow',
    inputSchema: ConversationSummaryInputSchema,
    outputSchema: ConversationSummaryOutputSchema,
  },
  async input => {
    const {output} = await summarizeConversationHistoryPrompt(input);
    return output!;
  }
);
