# Navio Widget — Embed Test

A throwaway static page that embeds the **live** Navio chat widget exactly the way a
SportNavi club website would. Use it to eyeball and click-test the widget against the
deployed backend.

## Run it (must be served over `localhost`, not `file://`)

The backend's CORS rule allows any `https://*.sportnavi.de` origin **plus** `localhost`.
Opening `index.html` directly as a `file://` path sends `Origin: null`, which the backend
rejects — so serve it from a local web server instead.

From this folder:

```bash
# Python (any 3.x) — serves on http://localhost:8000
python -m http.server 8000
```

or

```bash
# Node, if you prefer
npx serve -l 8000 .
```

Then open <http://localhost:8000> and look for the chat launcher in the bottom-right.

## What it proves

- `navio-widget.js` loads from the deployed frontend origin.
- The widget calls the deployed backend (`data-api`), and the backend's CORS allowlist
  accepts the `localhost` origin — the same code path that accepts any `*.sportnavi.de`
  club site.
- Accept the Datenschutz/consent gate, send a message, and you should get a reply from
  the live backend.

## The snippet a real club pastes

```html
<script
  src="https://navio-frontend-34ktkxptbq-ey.a.run.app/navio-widget.js"
  data-api="https://navio-34ktkxptbq-ey.a.run.app">
</script>
```

> `data-api` is currently required because the widget otherwise derives the backend URL
> from the script's own origin (the frontend), which has no `/api` proxy. If we ship the
> widget change that makes the baked-in backend URL win, `data-api` becomes optional.
