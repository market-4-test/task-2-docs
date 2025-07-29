# Real-Time Multi-Tenant Event Feed (Task 1)

This project is an implementation of **Task 1: Real-Time Multi-Tenant Event Feed** from the technical assignment. It
consists of a backend service and a simple frontend client to demonstrate real-time event broadcasting with full data
isolation between different tenants.

## ✨ Features

- **Real-Time Broadcasting**: Uses **WebSockets** for instant event delivery to clients.
- **Strict Tenant Isolation**: The architecture ensures that users of one tenant will never see events from another.
- **REST API for Event Submission**: Events are sent to the server via the `POST /events` endpoint.
- **Tenant-Based Authentication**: Tenant identification is handled via the `x-tenant-id` HTTP header for REST requests
  and the `tenantId` query parameter for WebSocket connections.
- **In-Memory Storage**: The project requires no database and stores all events in-memory as per the assignment
  requirements.
- **Code Quality**: **ESLint** and **Prettier** are integrated to maintain a consistent code style and catch errors.
- **Interactive Web Client**: Comes with a simple HTML page for testing and demonstrating the functionality in
  real-time.

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Web Framework**: [Elysia.js](https://elysiajs.com/)
- **Logging**: [Pino](https://getpino.io/)
- **Linting & Formatting**: ESLint & Prettier
- **Frontend**: HTML, CSS, JavaScript (Vanilla)

## 📁 Project Structure

The project has a well-defined structure to separate concerns.

```
.
├── dist/                     # Directory for compiled files (created after build)
├── public/
│   └── index.html            # Frontend client
├── src/
│   ├── config/
│   │   └── config.ts         # Class for handling configuration (.env)
│   ├── factories/
│   │   └── logger.factory.ts # Factory for creating the logger
│   ├── services/
│   │   └── event.service.ts  # Business logic (storage, event creation)
│   ├── server/
│   │   └── server.ts         # Elysia server logic (routes, WebSocket)
│   ├── types.ts              # Global types and interfaces (IEvent)
│   └── main.ts               # Main application entry point
├── .env                      # Local environment variables (not in repository)
├── .env.example              # Example .env file
├── eslint.config.js          # ESLint v9+ configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This documentation
```

## 🚀 Installation & Setup

### Prerequisites

Ensure you have **Bun** installed on your machine. Installation instructions can be found on
the [official website](https://bun.sh/docs/installation).

### Step-by-Step Installation

1. **Clone the repository:**

   ```bash
   git clone <your-repository-url>
   cd next-basket-task-1
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the project root by copying `.env.example`.

   ```bash
   cp .env.example .env
   ```

   The `.env` file contains the following variables:

    - `PORT`: The port on which the server will run.
    - `HOSTNAME`: The host on which the server will run.
    - `LOG_LEVEL`: The logging level (e.g., `info`, `warn`, `error`).

### Available Scripts

The project is configured with the following scripts:

- **Run in development mode:**

  ```bash
  bun run dev
  ```

- **Build for Production:**
  *This command will compile the TypeScript, optimize the code, and copy the `public` assets to the `dist` folder.*

  ```bash
  bun run build
  ```

- **Run the Production version:**
  *Runs the compiled application from the `dist` folder.*

  ```bash
  bun run start
  ```

- **Check the code (linting):**
  *Checks the entire codebase against ESLint rules.*

  ```bash
  bun run lint
  ```

- **Automatically fix linting errors:**

  ```bash
  bun run lint:fix
  ```

- **Format the code:**
  *Formats the entire codebase using Prettier.*

  ```bash
  bun run format
  ```

## 🧪 How to Test

The key success criterion is strict tenant isolation. Here is how to verify it:

1. Run the application in development mode: `bun run dev`.
2. Open a browser and navigate to `http://localhost:3001` (or the port specified in your `.env` file).
3. Open a second browser window in incognito mode (or a different browser) and navigate to the same address.
4. In the **first window**, select **Tenant A** from the dropdown menu.
5. In the **second window**, select **Tenant B**.
6. In the **Tenant A** window, enter a message in the "New Event Message" form and click "Send Event".
7. **Result**: The event should appear **only in Tenant A's event list**. Nothing should change in the Tenant B window.
8. Do the same for **Tenant B** and verify that its events are only visible to it.

## 🔌 API Endpoints

- **`GET /`**

    - **Description**: Serves the frontend application (`index.html`).
    - **Response**: `text/html`

- **`POST /events`**

    - **Description**: Accepts and broadcasts a new event.
    - **Headers**:
        - `x-tenant-id` (required): `string` (e.g., `tenant_a`)
    - **Request Body** (`application/json`):
      ```json
      {
        "message": "My new event message"
      }
      ```
    - **Response**: `IEvent`

- **`WS /ws`**

    - **Description**: Establishes a WebSocket connection to receive events.
    - **URL**: `ws://localhost:3001/ws?tenantId=<tenant_id>`
    - **Query Parameters**:
        - `tenantId` (required): `string` (e.g., `tenant_a`)
    - **Server Messages**: The server will send JSON strings in the `IEvent` format when new events occur for the given
      tenant.