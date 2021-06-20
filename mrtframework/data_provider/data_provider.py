from .utils import get_json_by_name_or_path, write_json_to_filepath
from .exceptions import PublicationNotFoundError
from ..base import Publication, OptionalPublication
from .downloader import get_downloader, DownloaderExt
from typing import Optional, List, Union
import pymongo
from . import logger

class DataProvider:

    def __init__(self, source: Optional[str] = None, downloader: Optional[DownloaderExt] = None, download_workers: int = 32, write_source: Union[str, bool] = False):
        if source is not None:
            if source.startswith('mongodb://'): # assume mongodb is the source
                uri, col = source.split(' ')
                logger.info('Use mongodb as source, col: %s' % col)
                self.papers = pymongo.MongoClient(uri).get_default_database()[col]
            else: # assume file is the source
                self.papers = get_json_by_name_or_path(source, source_type='data_sources')
        else:
            self.papers = {}
        self.downloader, self.bulk_downloader = get_downloader(downloader=downloader, parallel_workers=download_workers)
        self.write_source = source if write_source is True else write_source

    def get(self, pid: str) -> Publication:
        if isinstance(self.papers, pymongo.collection.Collection):
            obj = self.papers.find_one({'_id': pid})
        elif isinstance(self.papers, dict):
            obj = self.papers.get(pid)
        else:
            raise NotImplementedError
        # if not found in source and downloader is enabled
        if obj is None and self.downloader is not None:
            obj = self.downloader(pid)
            self.write([Publication(obj)])
        if obj is None:
            raise PublicationNotFoundError(pid)
        return Publication(obj)

    def get_bulk(self, pids: List[str]) -> List[Publication]:
        if isinstance(self.papers, pymongo.database.Collection):
            pubs = [OptionalPublication(obj) for obj in self.papers.find({'_id': {'$in': pids}})]
        elif isinstance(self.papers, dict):
            pubs = [OptionalPublication(self.papers.get(pid)) for pid in pids]
        else:
            raise NotImplementedError
        pid2pubs = {pub.id: pub for pub in pubs if pub is not None}
        missed = [pid for pid in pids if pid not in pid2pubs]
        if len(missed) > 0 and self.bulk_downloader is not None:
            new_pubs = list(filter(None, [OptionalPublication(pub) for pub in self.bulk_downloader(missed)]))
            self.write(new_pubs)
            pid2pubs.update({pub.id: pub for pub in new_pubs})
        return [pid2pubs[pid] for pid in pids if pid in pid2pubs]

    def write(self, pubs: List[Publication]):
        if self.write_source is False:
            return
        if isinstance(self.papers, pymongo.collection.Collection):
            for pub in pubs:
                self.papers.replace_one({'_id': pub.id}, pub.to_json(), upsert=True)
            logger.info('write %d publications into mongo' % len(pubs))
        elif isinstance(self.papers, dict):
            self.papers.update({pub.id: pub.to_json() for pub in pubs})
            write_json_to_filepath(self.papers, self.write_source, source_type='data_sources')
            logger.info('write %d publications to %s' % (len(pubs), self.write_source))
        else:
            raise NotImplementedError