#!/bin/bash
cd /home/kavia/workspace/code-generation/kavia-app-metrics-gallery-ae724cf7/gallery_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

