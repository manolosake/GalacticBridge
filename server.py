#!/usr/bin/env python3
"""Lightweight static server with a deployable health endpoint."""

from __future__ import annotations

import argparse
import json
import os
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


class GalacticBridgeRequestHandler(SimpleHTTPRequestHandler):
    """Serve static assets and a small JSON health probe."""

    server_version = "GalacticBridgeHTTP/1.0"

    def do_GET(self) -> None:  # noqa: N802 - stdlib hook name
        if self.path.rstrip("/") == "/health":
            self._handle_health()
            return
        super().do_GET()

    def end_headers(self) -> None:
        if self.path.rstrip("/") == "/health":
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: Any) -> None:
        # Keep logs concise for service mode while preserving request visibility.
        super().log_message(format, *args)

    def _handle_health(self) -> None:
        directory = Path(self.directory)
        index_exists = (directory / "index.html").is_file()
        status = HTTPStatus.OK if index_exists else HTTPStatus.SERVICE_UNAVAILABLE
        payload = {
            "status": "ok" if index_exists else "degraded",
            "asset_root": str(directory),
            "index_present": index_exists,
        }
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def build_server(host: str, port: int, directory: Path) -> ThreadingHTTPServer:
    handler = partial(GalacticBridgeRequestHandler, directory=str(directory))
    return ThreadingHTTPServer((host, port), handler)


def parse_args() -> argparse.Namespace:
    default_host = os.environ.get("HOST", "127.0.0.1")
    default_port = int(os.environ.get("PORT", "8787"))
    default_directory = Path(os.environ.get("STATIC_ROOT", Path(__file__).resolve().parent))

    parser = argparse.ArgumentParser(description="Serve GalacticBridge with health checks.")
    parser.add_argument("--host", default=default_host, help="Bind host. Defaults to HOST or 127.0.0.1.")
    parser.add_argument("--port", type=int, default=default_port, help="Bind port. Defaults to PORT or 8787.")
    parser.add_argument(
        "--directory",
        type=Path,
        default=default_directory,
        help="Static asset root. Defaults to STATIC_ROOT or the repo directory.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    directory = args.directory.resolve()

    if not directory.exists():
        raise SystemExit(f"Static asset directory does not exist: {directory}")

    server = build_server(args.host, args.port, directory)
    try:
        print(f"Serving GalacticBridge from {directory} at http://{args.host}:{args.port}")
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
