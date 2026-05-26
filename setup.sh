#!/bin/bash
# Быстрый запуск ИС Танкатус — управление IT-проектами (SQLite)

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  Танкатус — ИС управления IT-проектами"
echo "========================================"
echo ""

# --- Проверка Node.js ---
if ! command -v node &>/dev/null; then
  echo "[ОШИБКА] Node.js не установлен. Установите: https://nodejs.org"
  exit 1
fi

# --- Зависимости ---
echo "[1/3] Установка зависимостей..."
cd "$ROOT/backend" && npm install --silent
cd "$ROOT/frontend" && npm install --silent
cd "$ROOT"

# --- Сборка фронтенда ---
echo "[2/3] Сборка фронтенда..."
cd "$ROOT/frontend" && npx vite build --silent
cd "$ROOT"

echo ""
echo "  Тестовые пользователи (пароль: Admin123!):"
echo "    admin@tankatus.by    — Администратор"
echo "    manager@tankatus.by  — Менеджер проектов"
echo "    dev1@tankatus.by     — Разработчик"
echo "    analyst@tankatus.by  — Аналитик"
echo ""

echo "[3/3] Запуск серверов..."
echo "  Backend  → http://localhost:3001"
echo "  Frontend → http://localhost:5173"
echo ""

cd "$ROOT/backend" && npm run dev &
BACKEND_PID=$!

sleep 2

cd "$ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo "Нажмите Ctrl+C для остановки"
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Серверы остановлены'" EXIT
wait
