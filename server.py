#!/usr/bin/env python3
"""Lightweight static server with a deployable health endpoint."""

from __future__ import annotations

import argparse
import json
import os
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from json import JSONDecodeError
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


class GalacticBridgeRequestHandler(SimpleHTTPRequestHandler):
    """Serve static assets and a small JSON health probe."""

    server_version = "GalacticBridgeHTTP/1.0"

    def do_GET(self) -> None:  # noqa: N802 - stdlib hook name
        route = urlparse(self.path).path.rstrip("/") or "/"

        if route == "/health":
            self._handle_health()
            return
        if route == "/api/contracts":
            self._handle_contracts()
            return
        if route.startswith("/api/contracts/"):
            contract_id = route.rsplit("/", 1)[-1]
            self._handle_contract_detail(contract_id)
            return
        super().do_GET()

    def end_headers(self) -> None:
        route = urlparse(self.path).path.rstrip("/") or "/"
        if route == "/health" or route.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: Any) -> None:
        # Keep logs concise for service mode while preserving request visibility.
        super().log_message(format, *args)

    def _handle_health(self) -> None:
        directory = Path(self.directory)
        index_exists = (directory / "index.html").is_file()
        contracts_state = self._get_contracts_state()
        status = HTTPStatus.OK if index_exists else HTTPStatus.SERVICE_UNAVAILABLE
        if contracts_state["status"] == "invalid":
            status = HTTPStatus.SERVICE_UNAVAILABLE
        payload = {
            "status": "ok" if status == HTTPStatus.OK else "degraded",
            "asset_root": str(directory),
            "index_present": index_exists,
            "contracts_present": contracts_state["status"] != "missing",
            "contracts_status": contracts_state["status"],
        }
        if contracts_state["error"]:
            payload["contracts_error"] = contracts_state["error"]
        self._send_json(status, payload)

    def _handle_contracts(self) -> None:
        contracts_state = self._get_contracts_state()
        if contracts_state["payload"] is None:
            self._send_json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"status": "degraded", "error": contracts_state["error"]},
            )
            return
        payload = contracts_state["payload"]
        self._send_json(
            HTTPStatus.OK,
            {
                "contracts": payload["contracts"],
                "phases": payload["phases"],
                "defaultContractId": payload["defaultContractId"],
            },
        )

    def _handle_contract_detail(self, contract_id: str) -> None:
        contracts_state = self._get_contracts_state()
        if contracts_state["payload"] is None:
            self._send_json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"status": "degraded", "error": contracts_state["error"]},
            )
            return
        payload = contracts_state["payload"]

        contract = payload["contracts"].get(contract_id)
        if contract is None:
            self._send_json(
                HTTPStatus.NOT_FOUND,
                {"status": "not_found", "error": f"unknown contract '{contract_id}'"},
            )
            return

        self._send_json(HTTPStatus.OK, {"id": contract_id, "contract": contract})

    def _contracts_path(self) -> Path:
        return Path(self.directory) / "data" / "contracts.json"

    def _get_contracts_state(self) -> dict[str, Any]:
        try:
            with self._contracts_path().open(encoding="utf-8") as handle:
                payload = json.load(handle)
        except FileNotFoundError:
            return {"status": "missing", "payload": None, "error": "contracts data unavailable"}
        except JSONDecodeError:
            return {"status": "invalid", "payload": None, "error": "contracts data is invalid JSON"}

        contracts = payload.get("contracts")
        phases = payload.get("phases")
        default_contract_id = payload.get("defaultContractId")
        if not isinstance(contracts, dict) or not isinstance(phases, list) or not isinstance(default_contract_id, str):
            return {"status": "invalid", "payload": None, "error": "contracts data is missing required fields"}

        if default_contract_id not in contracts:
            return {"status": "invalid", "payload": None, "error": "default contract does not exist in contracts data"}

        return {"status": "ok", "payload": payload, "error": None}

    def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
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
