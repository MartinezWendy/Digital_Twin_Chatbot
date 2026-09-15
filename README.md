# Digital Twin Chatbot

Interview a persona built from real qualitative research. You upload the interview
transcripts; the app turns them into a synthetic respondent you can question — one
that is only allowed to answer from what participants actually said.

Next.js 14 · Genkit · Gemini · Firebase · shadcn/ui — around 7,200 lines of TypeScript.

---

## What it does

- **Builds a persona from transcripts.** Raw interview text goes through a cleaning
  flow that fixes grammar and structure without inventing content, and the result
  becomes the persona's source document.
- **Answers in the persona's voice**, first person, grounded in that document.
- **Takes survey data as extra context** — CSV content can be supplied alongside the
  transcripts as additional factual grounding.
- **Keeps conversations** — auto-titled from the first exchange, summarised as history
  grows, archivable.
- **Runs multi-tenant** — separate client workspaces, each with its own logo and colour
  scheme injected at runtime, plus user roles and access control.

## The part that matters: grounding

The prompt behind `generate-persona-response` is where the actual product lives. Four
rules do the work:

1. **One source of truth.** The model may answer only from the persona document and the
   optional survey data. Anything else returns *"I don't have that in the provided
   context."* — an explicit refusal rather than a plausible guess.
2. **Forced synthesis.** When the document holds multiple interviews, an answer must
   draw on at least three of them, and no more than two points from any single one.
3. **Both sides represented.** Where the source contains opposing views, the answer has
   to carry both.
4. **One unified voice.** Conflicting views are merged into a single first-person
   account — "my own mixed experience", never "some users say".

Synthetic respondents fail in two characteristic ways: the model invents consumer
opinions that sound right, or it collapses a whole sample into the one most vivid
interview. Rule 1 targets the first; rules 2 and 4 target the second. Rule 3 stops the
persona flattening into whatever view dominated the transcript.

## Flows

| Flow | What it does |
|---|---|
| `generate-persona-response` | The grounded answer, first person, with the rules above |
| `process-transcript` | Cleans a raw interview into a readable source document |
| `summarize-conversation-history` | Compresses a long conversation so context stays in budget |
| `summarize-conversation-title` | Names a conversation from its opening exchange |

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev
```

You need a Google AI key (Genkit reads `GOOGLE_API_KEY`) and a Firebase web config for
auth, Firestore and Storage — `.env.example` lists every variable and where to find it.
Without a complete Firebase config the app starts and logs a clear error rather than
crashing.

To inspect and trace the AI flows in the Genkit developer UI:

```bash
npm run genkit:dev
```

## Project structure

```
src/
├── app/            routes — chat, persona, archive, profile, settings, admin
├── ai/
│   ├── genkit.ts   Genkit + Gemini configuration
│   └── flows/      the four flows above
├── components/
│   ├── chat/       chat client, message list, input, sidebar
│   └── ui/         shadcn components
├── context/        auth and client-branding provider
└── lib/            Firebase initialisation, helpers
```

## Where this goes next

There's no validation layer yet, and that's the honest gap: a synthetic respondent is
only as trustworthy as its agreement with real ones. The next piece of work is holding
out a portion of the source interviews, asking the persona the same questions, and
publishing the error analysis — including where it disagrees. Until that exists, treat
the output as a way to explore a dataset, not a substitute for fieldwork.

## Licence

MIT — see [LICENSE](LICENSE).
