# The Anti-Recommender

A single-page discovery demo that finds excellent picks outside your taste, draws a map of the detour, and explains the connection. No account or API key is needed to run it.

## Run it

1. Install Node.js 20 or newer.
2. From this folder, run:

   ```sh
   npm install
   npm run dev
   ```

3. Open the Vite URL printed in the terminal (usually `http://localhost:5173`).

The demo profile is pre-filled, so the **Show me something I’d never pick** button works right away. The app includes 300 curated items across music, film, books, games, podcasts, and documentaries. The seed catalog is in `data/catalog.json`; the first server start also creates `data/catalog-embeddings.json`.

To run the production build locally, use `npm run build` and then `npm start` (open `http://localhost:3001`).

## Optional OpenAI APIs

The default demo uses local semantic embeddings and a local bridge-explanation fallback. To enable OpenAI embeddings and generated explanations:

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` in `.env`.
3. Restart the server.

The server caches catalog embeddings in `data/catalog-embeddings.json`. With an API key, it refreshes the cache using `text-embedding-3-small`; user profile entries use the same model. Bridge explanations use `gpt-4o-mini`, with a local fallback if the call fails.

## Feedback and privacy

There is no sign-in or profile upload. Ratings and stretch-tolerance history are stored in the browser's local storage. Without an API key, profile text stays on your machine; with an API key, it is sent to OpenAI to create embeddings and the bridge explanation.

## Stack

- React, Vite, Tailwind CSS, and Lucide icons
- Express API with a seeded JSON catalog
- Optional OpenAI embeddings and bridge explanations
