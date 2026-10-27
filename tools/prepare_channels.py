"""Export channel names and safe HTTPS logo URLs; never include stream URLs."""
import json,re,ipaddress
from pathlib import Path
from urllib.parse import urlsplit,parse_qsl
ROOT=Path(__file__).resolve().parents[1]
CATEGORIES=['Business','Entertainment','News','Sports','Travel']
def safe_logo(value):
    if re.fullmatch(r'assets/logos/channels/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp)',value,re.I):return value
    try:
        u=urlsplit(value)
        if u.scheme!='https' or u.username or u.password or u.port not in (None,443):return ''
        host=u.hostname or ''
        if '.' not in host or host.endswith(('.local','.localhost','.internal')):return ''
        try:ipaddress.ip_address(host);return ''
        except ValueError:pass
        if any(re.search('token|key|pass|auth|secret|signature',k,re.I) for k,v in parse_qsl(u.query)):return ''
        return value
    except ValueError:return ''
def safe_stream(value):
    try:
        u=urlsplit(value)
        if u.scheme not in ('http','https') or not u.hostname or u.username or u.password:return ''
        host=u.hostname.lower()
        if '.' not in host or host.endswith(('.local','.localhost','.internal')):return ''
        try:
            if not ipaddress.ip_address(host).is_global:return ''
        except ValueError:pass
        return value
    except ValueError:return ''

def parse_playlist(text,include_streams=False):
    out=[];seen={}
    lines=text.splitlines()
    for index,line in enumerate(lines):
        if not line.startswith('#EXTINF:'):continue
        # Attributes may contain commas; the label starts after the unquoted comma.
        parts=re.split(r',(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)',line,maxsplit=1)
        if len(parts)<2:continue
        name=re.sub(r'\s*[\[(].*','',parts[1]).strip()
        logo=re.search(r'tvg-logo="([^\"]*)"',parts[0])
        url=safe_logo(logo.group(1)) if logo else ''
        if not name:continue
        country_attr=re.search(r'tvg-country="([^\"]*)"',parts[0],re.I)
        tvg_id=re.search(r'tvg-id="([^\"]*)"',parts[0],re.I)
        countries=[]
        if country_attr:
            countries=[c.upper() for c in re.split(r'[;,|\s]+',country_attr.group(1)) if re.fullmatch(r'[A-Za-z]{2}',c)]
        if not countries and tvg_id:
            match=re.search(r'\.([a-z]{2})(?:@[^@]*)?$',tvg_id.group(1),re.I)
            if match:countries=[match.group(1).upper()]
        streams=[]
        if include_streams:
            for following in lines[index+1:]:
                following=following.strip()
                if following.startswith('#EXTINF:'):break
                if not following or following.startswith('#'):continue
                stream=safe_stream(following)
                if stream:streams.append(stream)
                break
        if name in seen:
            previous=seen[name]
            previous['countries']=list(dict.fromkeys(previous['countries']+countries))
            if include_streams:previous['streams']=list(dict.fromkeys(previous['streams']+streams))
            if not previous['logo']:previous['logo']=url
            continue
        entry={'name':name,'logo':url,'countries':list(dict.fromkeys(countries))}
        if include_streams:entry['streams']=streams
        seen[name]=entry;out.append(entry)
    return out
if __name__=='__main__':
    data={}
    for category in CATEGORIES:
        slug='general' if category=='Entertainment' else category.lower()
        p=(Path.home()/'Downloads/tvOS/channels')/('popular-'+slug+'-iptv.m3u')
        data[category]=parse_playlist(p.read_text())
    (ROOT/'channels.js').write_text('window.CHANNELS = '+json.dumps(data,ensure_ascii=False)+';\n')
    origins=sorted({urlsplit(item['logo']).scheme+'://'+urlsplit(item['logo']).netloc for items in data.values() for item in items if item['logo']})
    html=ROOT/'index.html';s=html.read_text();s=re.sub(r"img-src [^;]+;", "img-src 'self' data: https://image.tmdb.org "+' '.join(origins)+';',s);html.write_text(s)
    print('Exported',sum(map(len,data.values())),'channel names and logo references. No stream URLs.')
