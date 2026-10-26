# Memora

Turn your notes into flashcards and remember them for exam day.

Students paste notes or upload a PDF or a photo of handwritten notes. Memora uses AI to generate flashcards and multiple-choice questions from that material only, lets the student review and edit every card, and then schedules study sessions with spaced repetition. If the deck has an exam date, reviews are paced so everything is seen again before the exam.

Built for high school learners, university students and professional exam candidates. One codebase runs on Android, iOS and the web.

## Features (MVP)

- Email and password accounts
- Decks with a subject, study level and optional exam date
- Card generation from pasted text, PDFs and images
- Each card shows the passage from your notes it came from
- Edit or delete any generated card
- Study sessions with Again / Hard / Good / Easy ratings (SM-2 scheduling)
- Exam-date pacing and an exam readiness score

## Tech stack

| Part | Choice |
| --- | --- |
| App | Expo (React Native + Expo Router), TypeScript |
| Backend | Supabase: Postgres, auth, row-level security, Edge Functions |
| AI | Claude API, called from a Supabase Edge Function |
| Tests | Vitest |

## Project structure

```
src/
  app/                  Screens (file-based routing)
    sign-in.tsx
    index.tsx           Deck list
    deck/new.tsx        Create a deck
    deck/[id]/index.tsx Deck detail, edit cards
    deck/[id]/add.tsx   Add notes and generate cards
    deck/[id]/study.tsx Study session
  components/ui.tsx     Shared UI components
  lib/srs.ts            Spaced-repetition engine (pure, tested)
  lib/cards.ts          Card data helpers
  lib/supabase.ts       Supabase client
supabase/
  migrations/           Database schema and security policies
  functions/generate-cards/  Edge Function that calls the Claude API
```

## Getting started

### 1. Install

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then link and push the schema:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

3. Add your Claude API key (from [console.anthropic.com](https://console.anthropic.com)) as a function secret, then deploy the function:

   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy generate-cards
   ```

   Optionally set `ANTHROPIC_MODEL` to choose a different Claude model.

4. Copy `.env.example` to `.env` and fill in your project URL and anon key (Supabase dashboard → Settings → API).

The API key stays on the server. The app only ever holds the public anon key, and row-level security keeps each user's decks private.

### 3. Run

```bash
npm run web       # in the browser
npm run android   # Android emulator or device
npm run ios       # iOS simulator (macOS) or device
```

You can also run `npx expo start` and scan the QR code with Expo Go.

## Scripts

```bash
npm test           # unit tests
npm run typecheck  # TypeScript
npm run lint       # ESLint
```

## Roadmap

- Offline study with sync
- Past-paper mode: generate new questions in the style of uploaded exam papers
- "Explain it back" answers graded by AI
- Shared class decks
- Teacher and tutor dashboards
- Curriculum tagging (CAPS, IEB, Cambridge, university modules)
- Study reminders and streaks

## License

MIT
