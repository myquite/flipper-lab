#!/usr/bin/env bash
# Serves Flipper Lab on http://localhost:8080 with caching disabled.
exec python3 "$(dirname "$0")/serve.py"
