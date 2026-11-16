"""
local_dev_server.py
-------------------
Zero-dependency Python stdlib HTTP server used only as an automatic fallback
in sandboxes where `fastapi` / `uvicorn` are not installed. Delegates directly
to the exact same `evaluate_payload` engine used by `api/index.py`.
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from python_engine.api_bridge import evaluate_payload


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self._send_json(200, {"status": "ok", "backend": "python-dev-fallback"})
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/api/evaluate":
            self._send_json(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8")
            payload = json.loads(raw)
            result = evaluate_payload(payload)
            self._send_json(200, result)
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

    def log_message(self, format: str, *args) -> None:
        # Keep dev terminal output clean
        return


def main() -> None:
    port = int(os.environ.get("PYTHON_API_PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Python API running on http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
