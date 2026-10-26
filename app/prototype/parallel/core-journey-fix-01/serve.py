from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import argparse,webbrowser
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, max-age=0')
        super().end_headers()
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--no-browser',action='store_true');args=parser.parse_args()
server=ThreadingHTTPServer(('127.0.0.1',4240),partial(Handler,directory=str(root)))
url='http://127.0.0.1:4240/demo/home.html'
print('WX-NATIVE-01E: '+url,flush=True)
if not args.no_browser:webbrowser.open(url)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
