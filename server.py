"""HICTS server: shows the web pages AND saves the data in a database file.
Run:  python server.py     then open  http://localhost:8000/index.html
Needs only Python 3 (nothing to install)."""

import json
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DB_FILE = "hicts.db"      # the database file created next to this script
PORT = 8000


def open_db():
    con = sqlite3.connect(DB_FILE)
    con.execute("CREATE TABLE IF NOT EXISTS store (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)")
    return con


class Handler(SimpleHTTPRequestHandler):
    def send_json(self, code, text):
        body = text.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/data":                      # the page asks for the saved data
            con = open_db()
            row = con.execute("SELECT data FROM store WHERE id = 1").fetchone()
            con.close()
            self.send_json(200, row[0] if row else "null")
        else:                                             # any other address: show the web page files
            super().do_GET()

    def do_POST(self):
        if self.path != "/api/data":
            self.send_json(404, '{"error":"not found"}')
            return
        size = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(size).decode("utf-8")
        try:
            json.loads(raw)                               # make sure it is valid data
        except ValueError:
            self.send_json(400, '{"error":"bad data"}')
            return
        con = open_db()
        con.execute("INSERT OR REPLACE INTO store (id, data) VALUES (1, ?)", (raw,))
        con.commit()
        con.close()
        self.send_json(200, '{"saved":true}')


if __name__ == "__main__":
    print("HICTS is running. Open http://localhost:%d/index.html" % PORT)
    print("Press Ctrl+C to stop. Your data stays in %s" % DB_FILE)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()