# Calorie Tracker

A web app for logging food and tracking daily calorie and macronutrient intake. Search a food database, log portions by weight, and see running totals for calories, protein, fat, and carbohydrates.

## Features

- **Food search with autocomplete**, type a food name and pick from live suggestions backed by the Edamam food database. Requests are debounced so typing doesn't fire one call per keystroke.
- **Portion-based logging**, enter an amount in grams; macros are calculated from the per-100g values returned by the API.
- **Live totals**, calories, protein, fat, and carbs update as entries are added or removed.
- **Works without an account**, the tracker is fully usable logged out (entries stay in the browser tab). Logging in carries those entries over to your account rather than discarding them.
- **Saved history**, signed-in users have their entries stored per-user in Firebase Firestore and synced live across tabs.
- **Responsive**, single-column layout on mobile, no horizontal scrolling at any width.

## Tech stack

| Layer | Technology |
| --- | --- |
| Front end | HTML, CSS, vanilla JavaScript (ES modules) |
| Auth | Firebase Authentication (email/password) |
| Database | Firebase Firestore |
| Food data | Edamam Food Database API |

## Running locally

The app uses ES modules, so it needs to be served over HTTP rather than opened directly from the filesystem.

```bash
git clone https://github.com/nikolam121/Nutrient_Tracker.git
cd Nutrient_Tracker
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Configuration

Firebase and Edamam credentials live in `config.js`.

Because this is a static client-side app with no backend, any key it uses is visible to visitors. The Firebase web API key is designed to be public, access is controlled by Firestore security rules, not by hiding the key. The Edamam credentials are not, so keep them on a free-tier key and rotate them if the quota starts getting drained. Moving the food lookups behind a small backend proxy is the proper fix if this ever needs to scale.

## Project structure

```
index.html    Tracker page
main.js       Food search, entry state, totals, Firestore sync
main.css      Shared styles and design tokens
auth.html     Sign up / log in page
auth.js       Firebase Authentication flows
auth.css      Auth page layout
config.js     Firebase and Edamam configuration
```
