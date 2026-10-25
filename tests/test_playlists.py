import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from prepare_channels import parse_playlist,safe_stream,safe_logo
class Playlists(unittest.TestCase):
 def test_public_export_has_no_streams(self):
  text='#EXTM3U\n#EXTINF:-1 tvg-id="News.au" tvg-logo="https://example.com/icon.png",News [HD]\nhttps://example.com/live.m3u8?token=private\n'
  result=parse_playlist(text)
  self.assertEqual(result,[{'name':'News','logo':'https://example.com/icon.png','countries':['AU']}])
 def test_private_export_merges_alternatives_and_countries(self):
  text='#EXTINF:-1 tvg-country="AU NZ",News\nhttps://example.com/first.m3u8\n#EXTINF:-1 tvg-id="News.gb",News\nhttp://example.com/second.m3u8\n'
  result=parse_playlist(text,include_streams=True)[0]
  self.assertEqual(result['countries'],['AU','NZ','GB'])
  self.assertEqual(len(result['streams']),2)
 def test_rejects_executable_and_internal_sources(self):
  for value in ['javascript:alert(1)','file:///etc/passwd','https://user:pass@example.com/a','http://127.0.0.1/a','http://192.168.1.1/a','http://localhost/a','http://router.local/a']:
   self.assertEqual(safe_stream(value),'')
  self.assertEqual(safe_logo('https://example.com/icon?api_key=secret'),'')
