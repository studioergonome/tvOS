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

 def test_category_format_keeps_local_logo_and_export_prefers_named_playlist(self):
  import tempfile,subprocess,json
  logo='assets/logos/channels/sky-sports-cricket.png'
  self.assertEqual(safe_logo(logo),logo)
  for unsafe in ['assets/logos/channels/../secret.png','/tmp/icon.png','assets/logos/channels/icon.svg']:
   self.assertEqual(safe_logo(unsafe),'')
  text='#EXTM3U\n#PLAYLIST:Sports\n\n#EXTINF:-1 tvg-id="SkySportsCricket.uk" tvg-name="Sky Sports Cricket UK HD" tvg-logo="'+logo+'" group-title="Sports", Sky Sports Cricket UK HD\nhttps://example.com/live.m3u8?token=private\n'
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'Sports.m3u').write_text(text)
   (root/'popular-sports-iptv.m3u').write_text('#EXTM3U\n#EXTINF:-1,Old channel\nhttps://example.com/old.m3u8\n')
   output=root/'out.js'
   subprocess.run([sys.executable,str(Path(__file__).resolve().parents[1]/'tools/export_playlists.py'),folder,str(output)],check=True,capture_output=True)
   result=json.loads(output.read_text().removeprefix('window.CHANNELS = ').strip().rstrip(';'))['Sports']
   self.assertEqual(len(result),1);self.assertEqual(result[0]['name'],'Sky Sports Cricket UK HD');self.assertEqual(result[0]['logo'],logo);self.assertEqual(len(result[0]['streams']),1)
