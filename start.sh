#!/bin/bash
echo "========================================"
echo "Realtime Speech Recognition App"
echo "========================================"
echo ""

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    echo ""
    npm install
    echo ""
fi

echo "Starting server..."
npm start &
SERVER_PID=$!

echo "Waiting for server to start..."
sleep 3

# macOSでデフォルトブラウザを開く
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000 2>/dev/null || echo "Please open http://localhost:3000 in your browser"
else
    echo "Please open http://localhost:3000 in your browser"
fi

echo ""
echo "Server is running at http://localhost:3000"
echo "Press Ctrl+C to stop the server"

# サーバーをフォアグラウンドで実行（Ctrl+Cで停止可能）
wait $SERVER_PID

