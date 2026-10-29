#!/usr/bin/env python3
"""Serves Flipper Lab on http://localhost:8080 (Web Serial needs localhost or https).

Caching is disabled so the browser always picks up edited files.
"""
import functools
import http.server
from pathlib import Path


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


handler = functools.partial(NoCacheHandler, directory=str(Path(__file__).parent / "web"))
http.server.ThreadingHTTPServer(("127.0.0.1", 8080), handler).serve_forever()
