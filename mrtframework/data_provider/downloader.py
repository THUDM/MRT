import json
import requests
from retry import retry
from typing import Optional, Callable, List, Tuple, Union
import logging
from . import logger
from tqdm import trange
import concurrent
from functools import partial

Downloader = Callable[[str], Optional[dict]]
DownloaderPar = Callable[[List[str]], List[Optional[dict]]]
DownloaderExt = Union[str, Downloader]

__S2_API__ = 'http://api.semanticscholar.org/v1/paper/'
@retry(tries=3)
def download_from_s2(pid: str) -> Optional[dict]:
    url = __S2_API__ + pid
    resp = requests.get(url)
    raw = resp.json()
    return None if 'error' in raw else {
        '_id': pid, 'id': pid,
        'title': raw['title'],
        'abstract': raw['abstract'],
        'citations': [c['paperId'] for c in raw['citations']],
        'references': [r['paperId'] for r in raw['references']],
        'year': raw['year'],
        'venue': raw['venue'],
        'authors': [a['name'] for a in raw['authors']]
    }

def safe_download_wrapper(download_func: Downloader) -> Downloader:
    def func(pid: str) -> Optional[dict]:
        try:
            return download_func(pid)
        except:
            return None
    return func

def parallel_download_wrapper(download_func: Downloader, workers: int = 32) -> DownloaderPar:
    safe_download_func = safe_download_wrapper(download_func)
    def download(pids: List[str]) -> List[Optional[dict]]:
        pbar = None
        if logger.getEffectiveLevel() <= logging.INFO:
            pbar = trange(len(pids), desc='downloading', leave=False)
        pid2obj = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            for obj in executor.map(safe_download_func, pids):
                if obj is not None:
                    pid2obj[obj['id']] = obj
                if pbar:
                    pbar.update(1)
                    pbar.refresh()
        if pbar:
            pbar.close()
        return [pid2obj.get(pid, None) for pid in pids]
    return download

def get_downloader(downloader: Optional[DownloaderExt] = None, parallel_workers: int = 32) -> Tuple[Optional[Downloader], Optional[DownloaderPar]]:
    if downloader is None:
        return None, None
    else:
        raw_downloader: Optional[Downloader] = None
        if downloader == 's2':
            raw_downloader = download_from_s2
        elif isinstance(downloader, Callable):
            raw_downloader = downloader
        else:
            raise NotImplementedError
        return safe_download_wrapper(raw_downloader), parallel_download_wrapper(raw_downloader, workers=parallel_workers)