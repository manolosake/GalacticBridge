import http.client
import json
import tempfile
import threading
import unittest
from pathlib import Path

from server import build_server


class ServerTestCase(unittest.TestCase):
    def start_server(self, directory: Path):
        server = build_server("127.0.0.1", 0, directory)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server, thread

    def request(self, server, path: str):
        conn = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        try:
            conn.request("GET", path)
            response = conn.getresponse()
            body = response.read()
            return response, body
        finally:
            conn.close()

    def stop_server(self, server, thread):
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    def test_health_endpoint_reports_ok_when_index_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            (directory / "index.html").write_text("<!doctype html><title>ok</title>", encoding="utf-8")
            (directory / "data").mkdir()
            (directory / "data" / "contracts.json").write_text(
                json.dumps({"contracts": {"orion": {}}, "phases": ["Briefing"], "defaultContractId": "orion"}),
                encoding="utf-8",
            )

            server, thread = self.start_server(directory)
            try:
                response, body = self.request(server, "/health")
            finally:
                self.stop_server(server, thread)

            payload = json.loads(body)
            self.assertEqual(response.status, 200)
            self.assertEqual(payload["status"], "ok")
            self.assertTrue(payload["index_present"])
            self.assertTrue(payload["contracts_present"])
            self.assertEqual(response.getheader("Cache-Control"), "no-store")

    def test_health_endpoint_reports_degraded_when_index_missing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)

            server, thread = self.start_server(directory)
            try:
                response, body = self.request(server, "/health")
            finally:
                self.stop_server(server, thread)

            payload = json.loads(body)
            self.assertEqual(response.status, 503)
            self.assertEqual(payload["status"], "degraded")
            self.assertFalse(payload["index_present"])

    def test_contracts_endpoint_returns_shared_contract_payload(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            (directory / "index.html").write_text("<!doctype html><title>ok</title>", encoding="utf-8")
            (directory / "data").mkdir()
            (directory / "data" / "contracts.json").write_text(
                json.dumps(
                    {
                        "contracts": {"orion": {"title": "Orion Relay Run"}, "vega": {"title": "Vega Medical Corridor"}},
                        "phases": ["Briefing", "Scan"],
                        "defaultContractId": "orion",
                    }
                ),
                encoding="utf-8",
            )

            server, thread = self.start_server(directory)
            try:
                response, body = self.request(server, "/api/contracts")
            finally:
                self.stop_server(server, thread)

            payload = json.loads(body)
            self.assertEqual(response.status, 200)
            self.assertEqual(payload["defaultContractId"], "orion")
            self.assertEqual(payload["phases"], ["Briefing", "Scan"])
            self.assertEqual(sorted(payload["contracts"].keys()), ["orion", "vega"])
            self.assertEqual(response.getheader("Cache-Control"), "no-store")

    def test_contract_detail_endpoint_returns_requested_contract(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            (directory / "index.html").write_text("<!doctype html><title>ok</title>", encoding="utf-8")
            (directory / "data").mkdir()
            (directory / "data" / "contracts.json").write_text(
                json.dumps(
                    {
                        "contracts": {"helios": {"title": "Helios Freight Escort", "eta": "16 min"}},
                        "phases": ["Briefing"],
                        "defaultContractId": "helios",
                    }
                ),
                encoding="utf-8",
            )

            server, thread = self.start_server(directory)
            try:
                response, body = self.request(server, "/api/contracts/helios")
            finally:
                self.stop_server(server, thread)

            payload = json.loads(body)
            self.assertEqual(response.status, 200)
            self.assertEqual(payload["id"], "helios")
            self.assertEqual(payload["contract"]["title"], "Helios Freight Escort")

    def test_contract_detail_endpoint_returns_404_for_unknown_contract(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            (directory / "index.html").write_text("<!doctype html><title>ok</title>", encoding="utf-8")
            (directory / "data").mkdir()
            (directory / "data" / "contracts.json").write_text(
                json.dumps(
                    {"contracts": {"orion": {"title": "Orion Relay Run"}}, "phases": ["Briefing"], "defaultContractId": "orion"}
                ),
                encoding="utf-8",
            )

            server, thread = self.start_server(directory)
            try:
                response, body = self.request(server, "/api/contracts/unknown")
            finally:
                self.stop_server(server, thread)

            payload = json.loads(body)
            self.assertEqual(response.status, 404)
            self.assertEqual(payload["status"], "not_found")

    def test_static_index_is_served_from_custom_directory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            content = "<!doctype html><h1>bridge</h1>"
            (directory / "index.html").write_text(content, encoding="utf-8")

            server, thread = self.start_server(directory)
            try:
                response, body = self.request(server, "/index.html")
            finally:
                self.stop_server(server, thread)

            self.assertEqual(response.status, 200)
            self.assertIn(b"bridge", body)


if __name__ == "__main__":
    unittest.main()
