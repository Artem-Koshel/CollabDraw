# CollabDraw

> **Note:** This is a test/learning project created to explore and practice using AI tools for software development.

A real-time collaborative drawing application where multiple users share a single canvas. Every stroke is broadcast over SignalR and persisted via event sourcing.

## Purpose

This project was built as a hands-on exercise for learning how to effectively use AI coding assistants in a realistic full-stack project scenario.

## Tech Stack

- **Backend:** ASP.NET Core 10, SignalR, SQLite, ImageSharp, Entity Framework Core
- **Frontend:** React 19, TypeScript, Vite 7, SignalR client
- **Testing:** xUnit + Moq (backend), Vitest + Testing Library (frontend)

## Features

- Real-time collaborative drawing via SignalR
- Pen and eraser tools
- Canvas state persisted with event sourcing (patch events + periodic snapshots)
- User capacity limits per session

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (v18+)

### Backend

```bash
cd backend/CollabDraw.Api
dotnet run
# Runs on http://localhost:5049
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Open your browser to `http://localhost:5173`, enter a name, and start drawing.

## Running Tests

### Backend (22 tests)

```bash
cd backend/CollabDraw.Tests
dotnet test
```

### Frontend (38 tests)

```bash
cd frontend
npm test
```

## Architecture Overview

- **Event sourcing:** Every pixel patch is saved to `PatchEvents`. On startup, the latest `CanvasSnapshot` is loaded and all subsequent events are replayed to reconstruct the current canvas state.
- **SignalR hub (`DrawHub`):** Handles user joins, pixel patch broadcasting, and connected-user tracking.
- **Frontend hooks:** `useSignalR` manages the connection; `useCanvas` owns all drawing state and batches dirty pixels into patch messages.

## License

MIT
