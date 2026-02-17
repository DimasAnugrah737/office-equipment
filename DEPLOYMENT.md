# Deployment Guide

This project is configured to be hosted as a single unit. The backend (Express) serves the frontend (React/Vite) as static files.

## Local Build & Test

1.  **Build the project**:
    ```bash
    npm run build
    ```
    This will install frontend dependencies and build the React app into `office-equipment-frontend/dist`.

2.  **Start the server**:
    ```bash
    npm start
    ```
    The application will be available at `http://localhost:5000` (or your configured `PORT`).

## Hosting on Platforms (Render, Railway, etc.)

### 1. Environment Variables
Ensure you set the following environment variables on your hosting provider:
- `NODE_ENV=production`
- `PORT=5000` (or whatever the provider requires, usually they set this automatically)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (Database credentials)
- `JWT_SECRET` (A strong random string)

### 2. Build and Start Commands
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### 3. Database
Make sure your database is accessible from the hosting environment. If using a cloud database (like Aiven, Railway MySQL, etc.), update the `DB_HOST` and other variables accordingly.

## Notes
- The frontend will automatically connect to the backend via relative paths (`/api`) in production.
- Uploads are served from the `/uploads` directory. Ensure your hosting environment persists this directory or use a cloud storage solution if needed.
