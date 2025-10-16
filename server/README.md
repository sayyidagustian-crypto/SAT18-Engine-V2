# SAT18 Engine v2 - Handshake & Log Stream Server

This directory contains the Node.js server responsible for handling secure handshakes and streaming encrypted deployment logs to the SAT18 Engine v2 frontend.

## 🚀 Features

-   **Secure Handshake**: Provides a temporary `sessionToken` and a unique AES-256 `sessionKey` to authenticated clients.
-   **Encrypted WebSocket Stream**: Establishes a WebSocket connection for clients with a valid `sessionToken` and streams logs encrypted with their specific `sessionKey`.
-   **Reinforcement Memory Layer API**: Provides secure endpoints for storing and retrieving AI deployment feedback, enabling collective learning.
-   **Multi-Database Support**: Supports both SQLite for development and PostgreSQL for production environments through a smart migration script.
-   **In-Memory Session Management**: Manages active sessions with an automatic expiration mechanism.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v18.x or later recommended)
-   [npm](https://www.npmjs.com/)
-   [PM2](https://pm2.keymetrics.io/) (for production process management)
-   `sqlite3` and/or `psql` command-line tools available in your PATH.

## ⚙️ Setup & Installation

1.  **Navigate to this directory:**
    If you are running this standalone, navigate into the `server/` directory.

2.  **Install dependencies:**
    ```bash
    npm install
    
    # For PostgreSQL support in production, install the 'pg' driver:
    # npm install pg
    ```
    
3.  **Initialize Database:**
    Run the migration script to create the database file and tables based on your environment.
    ```bash
    # For SQLite (default, for development)
    npm run migrate
    
    # For PostgreSQL (for production)
    DB_ENGINE=postgres npm run migrate
    ```
    This will create a `feedback.db` file in `/srv/sat18/data/` for SQLite, or apply schemas to your configured PostgreSQL database.

## 🔐 Configuration

The server relies on environment variables for its configuration.

### `DEPLOY_API_KEY`
This key is used to authenticate handshake requests from the frontend.
**Important:** The value of this variable must match the `API_KEY` configured in the frontend's `src/config.ts` file. For local development, if this key is not set, the server will allow requests to proceed without authentication.

### `DB_ENGINE`
This variable determines which database to use.
-   **`sqlite`** (default): Uses a local SQLite database file. Ideal for development and testing.
-   **`postgres`**: Uses a PostgreSQL server. Required for production. You must also configure standard PostgreSQL environment variables (`PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).

**How to Set Environment Variables:**

-   **Linux/macOS (for a single command):**
    ```bash
    # Export the variable in your terminal session before running the server
    export DEPLOY_API_KEY="SAT18_DEPLOY_SECRET_KEY_PLACEHOLDER"
    export DB_ENGINE="postgres"
    npm start
    ```

For persistent configuration, consider using a `.env` file with a library like `dotenv` or your hosting provider's environment variable management system.

## ▶️ Running the Server

### For Development
```bash
# This will use SQLite by default
npm run dev
```
By default, the server will run on port `24700`.

### For Production (with PM2)
It is highly recommended to use a process manager like `pm2` to keep the server running reliably.
```bash
# Ensure environment variables are set before starting
# Build the TypeScript code first
npm run build

# Start the application using the ecosystem config file
pm2 start ecosystem.config.js

# Save the process list to resurrect on server reboot
pm2 save

# Generate and display startup script command
pm2 startup
```

## ✅ Verification & Testing

After running migrations, you can verify the integrity of the Reinforcement Memory Layer (RML) by running the audit test script. This script performs a series of database operations (create, read, update) to ensure the `decisions` table is functioning correctly.

```bash
# This will run the test against the database specified by the DB_ENGINE variable
npm run test:audit
```
If all checks pass, the RML is ready.

## 🚀 Automated Deployment with CI/CD

For automated deployments from a CI/CD pipeline (like GitLab CI or GitHub Actions), you can use the provided deployment script.

1.  **CI/CD Job Steps:**
    -   Your CI/CD runner should connect to the VPS (e.g., via SSH).
    -   Copy the contents of this `server` directory to the target deployment directory on the VPS (e.g., `/srv/sat18/app`).
    -   Ensure the correct environment variables (`DEPLOY_API_KEY`, `DB_ENGINE=postgres`, etc.) are set in the CI/CD environment or on the server.
    -   Execute the deployment script from within the target directory.

2.  **Executing the Script:**
    First, make the script executable (only needs to be done once):
    ```bash
    chmod +x /srv/sat18/app/scripts/deploy-backend.sh
    ```
    
    Then, run the script in your CI/CD job:
    ```bash
    cd /srv/sat18/app && ./scripts/deploy-backend.sh
    ```

The script will handle dependency installation (`npm ci`), database migration, and reloading the application with zero downtime using PM2.

## 🌐 Endpoints

### 1. Handshake

-   **URL**: `/auth/handshake`
-   **Method**: `POST`
-   **Headers**:
    -   `Authorization`: `Bearer YOUR_API_KEY`
-   **Success Response (200 OK)**:
    ```json
    {
      "sessionToken": "a-unique-uuid-token",
      "sessionKeyBase64": "a-base64-encoded-32-byte-aes-key",
      "expiresIn": 600,
      "wsUrl": "wss://your-vps-domain.com/logs"
    }
    ```

### 2. Reinforcement Memory Layer (RML) API

These endpoints are protected and require a valid `sessionToken` obtained from the handshake.

#### Add Feedback Record

-   **URL**: `/api/feedback`
-   **Method**: `POST`
-   **Headers**: `Authorization: Bearer <sessionToken>`, `Content-Type: application/json`
-   **Body**: A JSON object matching the `FeedbackRecord` type.

#### Get Feedback Summary

-   **URL**: `/api/feedback/summary`
-   **Method**: `GET`
-   **Query Parameters**: `project` (string, required)
-   **Headers**: `Authorization: Bearer <sessionToken>`