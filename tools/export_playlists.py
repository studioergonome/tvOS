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
    path=args.directory/('popular-'+slug+'-iptv.m3u')
    data[category]=parse_playlist(path.read_text(),include_streams=True) if path.exists() else []
args.output.write_text('window.CHANNELS = '+json.dumps(data,ensure_ascii=False)+';\n')
print('Private catalogue:',sum(map(len,data.values())),'channels;',sum(bool(c['streams']) for channels in data.values() for c in channels),'with streams.')
