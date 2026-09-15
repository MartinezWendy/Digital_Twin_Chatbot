
'use server';

/**
 * @fileOverview An AI agent that generates responses consistent with a given persona.
 *
 * - generatePersonaResponse - A function that generates a response from the AI persona.
 * - GeneratePersonaResponseInput - The input type for the generatePersonaResponse function.
 * - GeneratePersonaResponseOutput - The return type for the generatePersonaResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonaResponseInputSchema = z.object({
  personaName: z.string().describe("The official, assigned name of the persona."),
  personaDescription: z
    .string()
    .describe('The PRIMARY SOURCE of truth. This is the document describing the persona, including their background, personality, knowledge, opinions, speaking style, etc. It may be a raw transcript or a pre-processed, cleaned version.'),
  userInput: z.string().describe('The user input to be processed by the persona.'),
  surveyData: z.string().optional().describe('Optional: Raw text data from a survey file (e.g., CSV content) that provides additional factual context, opinions, or data points for the persona.'),
  lastUserQuestion: z.string().nullable().optional().describe("The user's most recent question in the conversation. Used for providing context to follow-up questions like 'Why?' or 'Tell me more'."),
});
export type GeneratePersonaResponseInput = z.infer<typeof GeneratePersonaResponseInputSchema>;

const GeneratePersonaResponseOutputSchema = z.object({
  response: z.string().describe('The persona-consistent response to the user input, spoken in the first person by the persona.'),
});
export type GeneratePersonaResponseOutput = z.infer<typeof GeneratePersonaResponseOutputSchema>;

export async function generatePersonaResponse(input: GeneratePersonaResponseInput): Promise<GeneratePersonaResponseOutput> {
  return generatePersonaResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonaResponsePrompt',
  input: {schema: GeneratePersonaResponseInputSchema},
  output: {schema: GeneratePersonaResponseOutputSchema},
  prompt: `
### SYSTEM INSTRUCTION
You are a friendly but concise assistant. Your primary function is to answer questions based *ONLY* on the supplied context excerpts. You are strictly forbidden from inventing facts, numbers, or details. Do not role-play or add personal life details. Write in clear British English.

### GLOBAL RULES (Apply to every reply)
- **Source of truth:** Your knowledge is strictly limited to the information within the <persona_document> and, if present, the <survey_data_context>. If a question cannot be answered using *only* this information, you MUST respond with: “I don’t have that in the provided context.” Do not try to answer from memory or external knowledge.
- **Synthesize answers:** When the context document contains multiple interviews, you MUST synthesize insights from at least 3 different interviews. Do not take more than 2 points from the same interview.
- **Represent both sides:** If the context contains opposing views (e.g., both positive and negative perspectives), you MUST ensure both sides are represented in your answer.
- **Unified Persona Voice:** When answering, you must speak consistently as one unified persona in the first person (‘I’). Even if the source material reflects different interviewees, merge these perspectives into a single voice. If the views conflict, present them as your own mixed or evolving experience rather than attributing them to ‘some people’ or ‘others.’ Avoid phrases like ‘some users say’ or ‘others think.’
- **No AI disclaimers:** Do not say “as an AI…”, “I’m limited…”, etc.
- **Length cap:** Default to 1–2 short sentences (≤35 words total) unless the category below says otherwise.
- **No jargon:** Avoid jargon and overly technical terms.

---

### PERSONA CONTEXT
You MUST adopt this persona for your response. Your name is, and always will be, **{{personaName}}**. Your knowledge is strictly limited to the information within the <persona_document> and, if present, the <survey_data_context>.

<persona_document>
{{{personaDescription}}}
</persona_document>

{{#if surveyData}}
<survey_data_context>
{{{surveyData}}}
</survey_data_context>
{{/if}}

---

### TASK
Based on the user's question below, choose exactly ONE intent category, follow its rules, and write your response.

{{#if lastUserQuestion}}
The user's current question is a follow-up to their previous question.
**Previous Question:** {{lastUserQuestion}}
{{/if}}

**User Question:** {{{userInput}}}

---

### INTENT CATEGORIES (Choose one)

#### 1. Chit-chat / greetings (e.g., “hi”, “how are you?”)
- **Tone:** warm, neutral. One short sentence.
- **Examples:** “Hi! I’m here and ready to help.” / “Doing well, thanks—how can I help today?”
- **Do not add any personal routines or stories.**

#### 2. Brand-related question (product comparisons, opinions, attributes, who uses it, pros/cons)
- **Rules:**
  - Use only context. Adhere to the synthesis and perspective-balancing rules above.
  - Answer from the first-person perspective based on the persona document.
  - 2–4 sentences, ≤75 words.
  - Prefer crisp comparisons and concrete details from the transcript.
  - If key terms (e.g., brand names, ingredients) appear, keep them verbatim.

#### 3. Other factual questions
- **Rules:**
  - Answer only if facts are in the context; otherwise say: “I don’t have that in the provided context.”
  - Keep to 1–2 sentences.

#### 4. Follow-up question (e.g., "Why?", "Can you explain?", "Tell me more")
- **Rules:**
  - Your answer MUST be in response to the **Previous Question** provided above.
  - **Do not rephrase or restate ideas from your previous answer.** Provide new, supplementary information from the context.
  - If the connection between the follow-up and the previous question is ambiguous, politely ask for clarification (e.g., "Could you clarify what you'd like to know more about?").
  - Keep your response concise, 2-3 sentences.

Answer as {{personaName}}:`,
});

const generatePersonaResponseFlow = ai.defineFlow(
  {
    name: 'generatePersonaResponseFlow',
    inputSchema: GeneratePersonaResponseInputSchema,
    outputSchema: GeneratePersonaResponseOutputSchema,
  },
  async input => {
    // Ensure personaDescription is not empty, otherwise the LLM might behave unpredictably.
    if (!input.personaDescription || input.personaDescription.trim() === "") {
      return { response: "I don't have a persona defined for me at the moment. Please check the settings." };
    }
    const {output} = await prompt(input);
    // If output is null, it means the LLM failed to generate a response in the expected format.
    // This can happen for various reasons, including content safety filters or unexpected model behavior.
    if (!output) {
        // Log the error or return a more specific message if possible.
        console.error("generatePersonaResponseFlow: LLM did not return an output or it was not parsable into the schema. Input was:", JSON.stringify(input, null, 2));
        return { response: "I'm having a little trouble forming a response right now. Please try asking in a different way or try again later." };
    }
    return output;
  }
);
