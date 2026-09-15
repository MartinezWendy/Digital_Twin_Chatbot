'use server';
/**
 * @fileOverview An AI flow to generate a concise title for a conversation.
 *
 * - summarizeConversationTitle - A function that generates a short title.
 * - SummarizeConversationTitleInput - The input type for the function.
 * - SummarizeConversationTitleOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeConversationTitleInputSchema = z.object({
  conversationHistory: z
    .string()
    .describe('The transcript of the first few messages of a conversation.'),
});
export type SummarizeConversationTitleInput = z.infer<typeof SummarizeConversationTitleInputSchema>;

const SummarizeConversationTitleOutputSchema = z.object({
  title: z
    .string()
    .describe('A very concise, 4-5 word title that summarizes the main topic or question of the conversation. Do not use quotes.'),
});
export type SummarizeConversationTitleOutput = z.infer<typeof SummarizeConversationTitleOutputSchema>;


export async function summarizeConversationTitle(input: SummarizeConversationTitleInput): Promise<SummarizeConversationTitleOutput> {
  return summarizeConversationTitleFlow(input);
}


const prompt = ai.definePrompt({
  name: 'summarizeConversationTitlePrompt',
  input: {schema: SummarizeConversationTitleInputSchema},
  output: {schema: SummarizeConversationTitleOutputSchema},
  prompt: `You are an expert at summarizing conversations. Based on the following chat transcript, create a very concise title of no more than 5 words. The title should capture the main topic or user's primary goal. Do not use quotation marks in the title.

Transcript:
{{{conversationHistory}}}
`,
});


const summarizeConversationTitleFlow = ai.defineFlow(
  {
    name: 'summarizeConversationTitleFlow',
    inputSchema: SummarizeConversationTitleInputSchema,
    outputSchema: SummarizeConversationTitleOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      // Fallback in case the LLM fails to generate a title
      return { title: "New Conversation" };
    }
    return output;
  }
);
