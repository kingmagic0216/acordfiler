#!/bin/sh

# Start backend server
cd backend
node dist/server.js &

# Start nginx for frontend
nginx -g "daemon off;" &

# Wait for any process to exit
wait

