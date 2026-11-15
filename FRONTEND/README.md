# <<YOUR PROJECT NAME>>
Digital Twin for Smart City & Manufacturing Systems

## Run the project

### 1. Frontend Setup
```bash
# Install dependencies
npm install

# Run the Vite development server
npm run dev
```
The frontend starts at `http://localhost:5173`. Open `http://localhost:5173/water-network` in your browser to inspect the hydraulic water distribution twin and simulation engine.

### 2. Backend Setup (FastAPI)
From your backend directory:
```bash
# Start FastAPI backend with Uvicorn
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
The backend API runs at `http://127.0.0.1:8000`. Configure `VITE_API_URL=http://127.0.0.1:8000` in `.env` (copy from `.env.example`).

### 3. Testing & Verification
- Lint check: `npm run lint`
- Production build: `npm run build`
