#!/usr/bin/env bash
# Запуск веб-приложения "Калькулятор" на локальном сервере
cd "$(dirname "$0")"
PORT="${1:-8000}"
python3 -m http.server "$PORT" --directory calculator &
SERVER_PID=$!
sleep 1
echo ""
echo "🧮 Калькулятор запущен. Кликабельная ссылка:"
echo "   👉 http://localhost:$PORT"
echo ""
echo "Открыть в браузере автоматически: xdg-open http://localhost:$PORT (Linux) / open http://localhost:$PORT (macOS)"
echo "Остановка сервера: Ctrl+C или kill $SERVER_PID"
wait "$SERVER_PID"
