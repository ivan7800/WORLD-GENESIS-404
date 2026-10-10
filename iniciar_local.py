"""Servidor local WORLD GENESIS 404. Solo escucha en 127.0.0.1."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

ROOT = Path(__file__).resolve().parent
handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print("WORLD GENESIS 404 listo en", url, flush=True)
    print("Cierra esta ventana para detener el servidor.", flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
