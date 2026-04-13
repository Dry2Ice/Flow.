@echo off
setlocal
cd /d "%~dp0"

echo [Flow] Installing dependencies (if needed)...
where bun >nul 2>nul
if %errorlevel%==0 (
  bun install
  echo [Flow] Starting development server with Bun...
  bun run dev
  goto :end
)

echo [Flow] Bun not found. Switching to npm...
call npm install
call npm run dev

:end
endlocal
