# Real-Time Multi-Tenant Event & Document System

This project is an implementation of **Task 1: Real-Time Multi-Tenant Event Feed** and **Task 2: Multi-Tenant Document API** from the technical assignment. It consists of a backend service and simple frontend clients to demonstrate real-time features and secure, multi-tenant document management.

## ✨ Features

- **Real-Time Broadcasting**: Uses **WebSockets** for instant event delivery to clients. [cite: 68]
- **Secure Document Management**: Full CRUD functionality for documents with role-based access control (RBAC) and strict tenant isolation.
- **Strict Tenant Isolation**: The architecture ensures that users of one tenant will never see data (events or documents) from another. [cite: 83, 120]
- **REST & WebSocket APIs**: Endpoints for both event submission and comprehensive document management.
- **Token-Based Authentication**: Secure access to document endpoints using Bearer tokens. [cite: 102]
- **Role-Based Access Control (RBAC)**: Clear distinction between `admin` and `user` roles, where admins have elevated privileges like document deletion. [cite: 103, 121]
- **Secure File Storage**: Uploaded files are stored on the filesystem with unique UUID-based names to prevent conflicts and path traversal vulnerabilities.
- **In-Memory Storage**: The project requires no database for simplicity, storing all metadata in-memory. [cite: 86]
- **Code Quality**: **ESLint** and **Prettier** are integrated to maintain a consistent code style.
- **Interactive Web Clients**: Comes with two separate HTML pages for testing and demonstrating all functionalities in real-time.

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
├── dist/
├── public/
│   ├── index.html            # Frontend client for Task 1 (Events)
│   └── docs.html             # Frontend client for Task 2 (Documents)
├── src/
│   ├── config/
│   │   └── config.ts
│   ├── factories/
│   │   └── logger.factory.ts
│   ├── services/
│   │   ├── event.service.ts    # Business logic for events
│   │   └── document.service.ts # Business logic for documents
│   ├── server/
│   │   └── server.ts           # Elysia server (routes, WebSocket, auth)
│   ├── types.ts                # Global types and interfaces
│   └── main.ts                 # Main application entry point
├── uploads/                    # Directory for uploaded files (gitignored)
├── .env
├── .env.example
├── package.json
└── README.md
```

## 🚀 Installation & Setup

### Prerequisites

Ensure you have **Bun** installed on your machine. Installation instructions can be found on the [official website](https://bun.sh/docs/installation).

### Step-by-Step Installation

1.  **Clone the repository:**

    ```bash
    git clone git@github.com:market-4-test/task-2-docs.git
    cd task-2-docs
    ```

2.  **Install dependencies:**

    ```bash
    bun install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root by copying `.env.example`.

    ```bash
    cp .env.example .env
    ```

    The `.env` file contains server and logging configuration.

### Available Scripts

- Run in development mode: `bun run dev`
- Build for Production: `bun run build`
- Run the Production version: `bun run start`
- Check & fix code style: `bun run lint:fix` and `bun run format`

## 🧪 How to Test

### Task 1: Real-Time Event Feed

1.  Run the application: `bun run dev`.
2.  Open a browser and navigate to `http://localhost:3001`.
3.  Open a second browser window (e.g., in incognito mode) and navigate to the same address.
4.  In the **first window**, select **Tenant A**. In the **second**, select **Tenant B**.
5.  Send an event from the Tenant A window and verify it appears **only** in that window. [cite: 89, 90]

### Task 2: Document Management API

1.  Run the application: `bun run dev`.
2.  Open a browser and navigate to `http://localhost:3001/docs`.
3.  **Authentication**: Use the dropdown to select a user to log in.
    - `Admin (Company A)` (Token: `token_admin_a`)
    - `User (Company A)` (Token: `token_user_a`)
    - `Admin (Company B)` (Token: `token_admin_b`)
4.  **Upload**: As any user, upload a file. Test both `private` and `tenant` access levels.
5.  **Tenant Isolation**: Log in as `Admin (Company B)` and verify you cannot see documents from `Company A`. [cite: 133]
6.  **RBAC**:
    - Log in as `User (Company A)` and upload a private file.
    - Log in as `Admin (Company A)` and verify you can see and delete the file uploaded by `User (Company A)`.
    - Log back in as `User (Company A)` and verify you **cannot** see a delete button. [cite: 134]

## 🔌 API Endpoints

### Event API

- **`GET /`**: Serves the event feed frontend (`index.html`).
- **`POST /events`**: Accepts and broadcasts a new event.
    - **Header**: `x-tenant-id` (e.g., `tenant_a`) required.
- **`WS /ws`**: Establishes a WebSocket connection.
    - **Query Param**: `tenantId` (e.g., `tenant_a`) required.

### User & Document API

Authentication is required for all document and user endpoints via `Authorization: Bearer <token>`.

- **`GET /users/me`**: Returns information about the currently authenticated user.

- **`GET /documents`**: Lists all documents accessible to the user, respecting tenant and RBAC rules. [cite: 98]

- **`POST /documents`**: Uploads a new document. [cite: 97]

    - **Body**: `multipart/form-data` with fields `file` and `access_level` (`private` or `tenant`).

- **`GET /documents/:id`**: Downloads a specific document file if the user has access. [cite: 99]

- **`DELETE /documents/:id`**: Deletes a document's metadata and file. **Admin-only**. [cite: 100]
