"""Private build-only export. Never print or publish stream addresses."""
import argparse,json
from pathlib import Path
from prepare_channels import CATEGORIES,parse_playlist
parser=argparse.ArgumentParser()
parser.add_argument('directory',type=Path)
parser.add_argument('output',type=Path)
args=parser.parse_args()
data={}
for category in CATEGORIES:
    slug='general' if category=='Entertainment' else category.lower()
    path=args.directory/(category+'.m3u')
    if not path.exists():path=args.directory/('popular-'+slug+'-iptv.m3u')
    data[category]=parse_playlist(path.read_text(),include_streams=True) if path.exists() else []
# Use supplied local channel artwork when exporting private playback sources.
metadata=json.loads((Path(__file__).resolve().parents[1]/'channels.js').read_text().removeprefix('window.CHANNELS = ').strip().rstrip(';'))
for category,items in metadata.items():
    local={c['name']:c['logo'] for c in items if c.get('logo','').startswith('assets/logos/channels/')}
    for item in data.get(category,[]):
        if item['name'] in local:item['logo']=local[item['name']]
args.output.write_text('window.CHANNELS = '+json.dumps(data,ensure_ascii=False)+';\n')
print('Private catalogue:',sum(map(len,data.values())),'channels;',sum(bool(c.get('streams')) for channels in data.values() for c in channels),'with streams.')
