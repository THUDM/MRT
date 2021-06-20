import requests
import os
from tqdm import tqdm
from . import __DOWNLOAD_SERVER__, logger
import gzip
import json
import urllib.parse

def download_file_to_path(url, path):
    logger.info('Downloading source from %s to %s' % (url, path))
    dirpath = os.path.dirname(path)
    if not os.path.isdir(dirpath):
        os.makedirs(dirpath)
    tmp_path = path + '.tmp'
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
    with open(tmp_path, 'wb') as f:
        req = requests.get(url, stream=True)
        if req.status_code != 200:
            logger.error('Downloading source from %s failed' % url)
            req.raise_for_status()
        content_length = req.headers.get('Content-Length')
        total = int(content_length) if content_length is not None else None
        pbar = tqdm(unit='B', total=total, unit_scale=True)
        for chunk in req.iter_content(chunk_size=1024):
            if chunk: # filter out keep-alive new chunks
                pbar.update(len(chunk))
                f.write(chunk)
        pbar.close()
    os.rename(tmp_path, path)
    logger.info('%s downloaded to %s' % (url, path))

def get_json_by_name_or_path(source: str, source_type: str = 'data_sources'):
    if '/' not in source and '\\' not in source and not os.path.isfile(source):
        source = __DOWNLOAD_SERVER__ + source_type + '/' + urllib.parse.quote(source) + '.json.gz'
    if source.startswith('https://') or source.startswith('http://'):
        from urllib.parse import urlparse
        url = source
        basename = os.path.basename(urlparse(url).path)
        cache_file_path = get_cache_file_path(basename, source_type=source_type)
        if not os.path.isfile(cache_file_path):
            download_file_to_path(url, cache_file_path)
        source = cache_file_path
    if not os.path.isfile(source):
        raise FileNotFoundError
    logger.info('loading %s from: %s' % (source_type, source))
    fp = gzip.open(source, 'rt') if source.endswith('.gz') else open(source, 'r')
    obj = json.load(fp)
    fp.close()
    return obj

def get_cache_file_path(filepath: str, source_type: str = 'data_sources'):
    if not filepath.endswith('.gz') and not filepath.endswith('.json'):
        filepath += '.json.gz'
    if '/' not in filepath and '\\' not in filepath and not os.path.isfile(filepath):
        return os.path.join(os.path.expanduser(os.getenv('XDG_CACHE_HOME', '~/.cache')), 'mrt', source_type, filepath)
    else:
        return filepath

def write_json_to_filepath(data, filepath: str, source_type: str = 'data_sources'):
    source = get_cache_file_path(filepath, source_type=source_type)
    fp = gzip.open(source, 'wt') if source.endswith('.gz') else open(source, 'w')
    json.dump(data, fp)
    fp.close()