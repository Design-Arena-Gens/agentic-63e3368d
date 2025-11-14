## Minimalist Expense Dashboard

A clean personal dashboard for tracking expenses, budgets, and category insights. All data lives only in the browser (localStorage), making it fast, private, and ready to deploy to Vercel.

### Features
- Month selector with spending summaries and projected totals.
- Adjustable monthly budget with progress indicators.
- Quick-add form with category presets and optional notes.
- Category distribution visualisation and sortable expense log.
- Works entirely on the client; no database or auth required.

### Develop
Run the dev server and visit [http://localhost:3000](http://localhost:3000):

```bash
npm install
npm run dev
```

### Build
Generate an optimized production build:

```bash
npm run build
npm start
```

### Deploy
The project is configured for zero-config deployment on Vercel:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-63e3368d
```
