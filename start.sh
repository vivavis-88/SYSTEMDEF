#!/bin/sh
cd "$(dirname "$0")"
echo "AMAYA Booth - starting on port 8000 (no internet needed)"
echo "Other devices: join this computer's hotspot/router, then open http://<this-computer-ip>:8000"
hostname -I 2>/dev/null
php -S 0.0.0.0:8000 -t .
