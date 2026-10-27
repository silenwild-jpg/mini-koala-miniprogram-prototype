from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import argparse,webbrowser
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, max-age=0')
        super().end_headers()
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--no-browser',action='store_true');parser.add_argument('--port',type=int,default=4270);parser.add_argument('--review',default='consistency-review.html');args=parser.parse_args()
server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(root)))
url='http://127.0.0.1:'+str(args.port)+'/'+args.review
print('VISUAL-CONSISTENCY-01: '+url,flush=True)
if not args.no_browser:webbrowser.open(url)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
