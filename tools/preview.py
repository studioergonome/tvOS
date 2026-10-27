"""Loopback-only preview server with a cached official IMDb ratings fallback."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, unquote
import argparse, datetime, gzip, json, os, re, sqlite3, threading, time, urllib.request
ROOT=Path(__file__).resolve().parents[1]
CACHE=Path.home()/'.cache'/'tvos-imdb-preview'
DATABASE=CACHE/'ratings.sqlite3'
REPORT=ROOT/'dist'/'ratings-audit.json'
PRIVATE_STREAMS=CACHE/'channel-streams.json'
LOCK=threading.Lock()
DATA_URL='https://datasets.imdbws.com/title.ratings.tsv.gz'
def refresh(force=False):
    with LOCK:
        if not force and DATABASE.exists() and time.time()-DATABASE.stat().st_mtime<86400:return
        CACHE.mkdir(parents=True,exist_ok=True)
        temporary=CACHE/'ratings-new.sqlite3'
        if temporary.exists():temporary.unlink()
        db=sqlite3.connect(temporary)
        try:
            db.execute('CREATE TABLE ratings (id TEXT PRIMARY KEY, score TEXT NOT NULL, votes INTEGER NOT NULL) WITHOUT ROWID')
            with urllib.request.urlopen(DATA_URL,timeout=30) as response:
                with gzip.GzipFile(fileobj=response) as stream:
                    next(stream)
                    batch=[]
                    for raw in stream:
                        identifier,score,votes=raw.decode('utf-8').strip().split('\t')
                        if re.fullmatch(r'tt\d{7,10}',identifier) and re.fullmatch(r'\d(?:\.\d)?|10(?:\.0)?',score):
                            batch.append((identifier,score,int(votes)))
                        if len(batch)>=10000:db.executemany('INSERT INTO ratings VALUES (?,?,?)',batch);batch=[]
                    if batch:db.executemany('INSERT INTO ratings VALUES (?,?,?)',batch)
            db.commit();db.close();os.replace(temporary,DATABASE)
        except Exception:
            db.close()
            if temporary.exists():temporary.unlink()
            raise

def lookup(identifier):
    try:refresh()
    except Exception:
        if not DATABASE.exists():raise
    with sqlite3.connect(f'file:{DATABASE}?mode=ro',uri=True) as db:
        result=db.execute('SELECT score,votes FROM ratings WHERE id=?',(identifier,)).fetchone()
    return {'id':identifier,'rating':result[0] if result else None,'votes':result[1] if result else None,'source':'IMDb daily dataset','updated':datetime.datetime.fromtimestamp(DATABASE.stat().st_mtime,datetime.timezone.utc).isoformat(),'stale':time.time()-DATABASE.stat().st_mtime>=86400}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
    def log_message(self,*args):pass
    def list_directory(self,path):self.send_error(403,'Directory listing disabled')
    def allowed(self):
        if self.headers.get('Host') not in {'127.0.0.1:'+str(self.server.server_port),'localhost:'+str(self.server.server_port)}:
            self.send_error(403);return False
        path=unquote(urlsplit(self.path).path)
        if any(s.startswith('.') or s in {'dist','node_modules','__pycache__','config.properties'} for s in path.split('/') if s) or path.lower().endswith(('.m3u','.m3u8','.ipk','.sqlite3','.log')):
            self.send_error(403);return False
        return True
    def do_HEAD(self):
        if not self.allowed():return
        if urlsplit(self.path).path=='/api/imdb-rating':self.send_error(405);return
        super().do_HEAD()
    def do_POST(self):
        if not self.allowed():return
        origin='http://'+self.headers.get('Host','')
        if urlsplit(self.path).path!='/api/ratings-audit':self.send_error(404);return
        if self.headers.get('Origin')!=origin or self.headers.get('X-TVOS-Preview')!='audit' or self.headers.get('Content-Type')!='application/json':self.send_error(403);return
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:self.send_error(400);return
        if not 0<length<=262144:self.send_error(413);return
        try:
            data=json.loads(self.rfile.read(length));rows=data['rows']
            if not isinstance(rows,list) or len(rows)>1000:raise ValueError()
            clean=[]
            for row in rows:
                if not isinstance(row,dict) or row.get('status') not in {'verified','mismatch','unmapped','no_official_score','error'}:raise ValueError()
                if row.get('imdbId') is not None and not re.fullmatch(r'tt\d{7,10}',row['imdbId']):raise ValueError()
                clean.append({key:row.get(key) for key in ['title','type','tmdbId','imdbId','official','displayed','source','status']})
            report={key:data.get(key) for key in ['checked','rated','verified','mismatches','unmapped','errors']}
            report.update({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rows':clean})
            REPORT.parent.mkdir(parents=True,exist_ok=True)
            temporary=REPORT.with_suffix('.tmp');temporary.write_text(json.dumps(report,ensure_ascii=False,indent=2));os.replace(temporary,REPORT)
        except (ValueError,TypeError,KeyError):self.send_error(400);return
        self.send_response(204);self.end_headers()
    def do_GET(self):
        if not self.allowed():return
        parts=urlsplit(self.path)
        if parts.path=='/channels.js' and PRIVATE_STREAMS.exists():
            # Merge local playback credentials into the preview response only.
            # Source files and GitHub exports remain metadata-only.
            data=json.loads((ROOT/'channels.js').read_text().removeprefix('window.CHANNELS = ').strip().rstrip(';'))
            private=json.loads(PRIVATE_STREAMS.read_text())
            for category,channels in data.items():
                for channel in channels:
                    streams=private.get(category,{}).get(channel['name'])
                    if streams is not None:channel['streams']=streams
            payload=('window.CHANNELS = '+json.dumps(data,ensure_ascii=False)+';').encode()
            self.send_response(200);self.send_header('Content-Type','text/javascript; charset=utf-8');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload);return
        if parts.path=='/api/imdb-rating':
            identifier=parse_qs(parts.query).get('i',[''])[0]
            if not re.fullmatch(r'tt\d{7,10}',identifier):self.send_error(400,'Invalid IMDb ID');return
            try:payload=json.dumps(lookup(identifier)).encode()
            except Exception:self.send_error(503,'Official IMDb cache is not available yet');return
            self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload);return
        super().do_GET()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);parser.add_argument('--refresh-only',action='store_true');parser.add_argument('--force',action='store_true');args=parser.parse_args()
    if args.refresh_only:refresh(force=args.force);print('Official IMDb preview cache refreshed.')
    else:
        print(f'tvOS preview: http://127.0.0.1:{args.port}/?preview=1',flush=True)
        ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
