import http.client,json,sqlite3,tempfile,threading,unittest
from pathlib import Path
from unittest.mock import patch
from tools import preview

class PreviewRatingsTest(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory();database=Path(self.folder.name)/'ratings.sqlite3'
        with sqlite3.connect(database) as db:
            db.execute('CREATE TABLE ratings (id TEXT PRIMARY KEY,score TEXT,votes INTEGER)')
            db.execute('INSERT INTO ratings VALUES (?,?,?)',('tt39578551','7.8',930))
        self.override=patch.object(preview,'DATABASE',database);self.override.start()
        self.report_override=patch.object(preview,'REPORT',Path(self.folder.name)/'audit.json');self.report_override.start()
        self.server=preview.ThreadingHTTPServer(('127.0.0.1',0),preview.Handler)
        self.worker=threading.Thread(target=self.server.serve_forever,daemon=True);self.worker.start()
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.worker.join();self.override.stop();self.report_override.stop();self.folder.cleanup()
    def request(self,path,headers=None,method="GET",body=None):
        connection=http.client.HTTPConnection('127.0.0.1',self.server.server_port)
        connection.request(method,path,body=body,headers=headers or {});response=connection.getresponse();data=response.read();status=response.status;connection.close();return status,data
    def test_score_from_cache_and_missing_score(self):
        status,data=self.request('/api/imdb-rating?i=tt39578551');self.assertEqual(status,200);value=json.loads(data);self.assertEqual(value['rating'],'7.8');self.assertEqual(value['votes'],930)
        status,data=self.request('/api/imdb-rating?i=tt0000000');self.assertEqual(status,200);self.assertIsNone(json.loads(data)['rating'])
    def test_invalid_id_and_untrusted_host(self):
        self.assertEqual(self.request('/api/imdb-rating?i=not-an-id')[0],400)
        self.assertEqual(self.request('/api/imdb-rating?i=tt39578551',{'Host':'untrusted.example'})[0],403)
    def test_private_paths_are_not_served_even_when_encoded(self):
        for path in ['/.env','/%2Eenv','/dist/app/index.html','/%6eode_modules/esbuild/package.json','/config.properties','/playlist.m3u']:
            self.assertEqual(self.request(path)[0],403,path)
            self.assertEqual(self.request(path,method='HEAD')[0],403,path)

    def test_audit_report_requires_same_origin_and_saves_only_public_fields(self):
        payload=json.dumps({'checked':1,'rated':1,'verified':1,'mismatches':0,'unmapped':0,'errors':0,'privateField':'must not save','rows':[{'title':'BTS','type':'movie','tmdbId':1,'imdbId':'tt39578551','official':'7.8','displayed':'7.8','source':'IMDb daily dataset','status':'verified','error':'must not save'}]})
        self.assertEqual(self.request('/api/ratings-audit',method='POST',body=payload)[0],403)
        headers={'Origin':'http://127.0.0.1:'+str(self.server.server_port),'X-TVOS-Preview':'audit','Content-Type':'application/json'}
        self.assertEqual(self.request('/api/ratings-audit',headers,method='POST',body=payload)[0],204)
        saved=preview.REPORT.read_text();self.assertNotIn('privateField',saved);self.assertNotIn('must not save',saved)
        headers['Origin']='https://untrusted.example';self.assertEqual(self.request('/api/ratings-audit',headers,method='POST',body=payload)[0],403)

    def test_private_channel_streams_merge_only_into_preview_response(self):
        private=Path(self.folder.name)/'streams.json'
        catalogue=json.loads((preview.ROOT/'channels.js').read_text().removeprefix('window.CHANNELS = ').strip().rstrip(';'))
        category=next(key for key,items in catalogue.items() if items)
        name=catalogue[category][0]['name']
        private.write_text(json.dumps({category:{name:['https://example.com/live.m3u8?token=test']}}))
        original=(preview.ROOT/'channels.js').read_bytes()
        with patch.object(preview,'PRIVATE_STREAMS',private):
            status,payload=self.request('/channels.js?v=9')
        self.assertEqual(status,200)
        self.assertIn(b'https://example.com/live.m3u8?token=test',payload)
        self.assertEqual((preview.ROOT/'channels.js').read_bytes(),original)
        self.assertNotIn(b'token=test',original)
