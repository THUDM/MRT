from ..base import Publication
from ..data_provider.utils import get_json_by_name_or_path
from typing import List, Tuple
import json
import re

def load_from_comention_source(source: str):
    return get_json_by_name_or_path(source, source_type='comention_sources')

def load_comentions(pubs: List[Publication], comention_source: str) -> Tuple[List[Tuple[str, str]], List[Tuple[str, str]]]:
    comention_source = load_from_comention_source(comention_source)
    gen_titlekey = lambda title: ''.join(re.findall('[A-Za-z0-9]+', title.lower()))
    titlekey2pubs = {gen_titlekey(pub.title): pub for pub in pubs}
    abbr2titlekey = {abbr: gen_titlekey(title) for abbr, title in comention_source['references'].items()}
    abbr2pub = {abbr: titlekey2pubs[titlekey] for abbr, titlekey in abbr2titlekey.items() if titlekey in titlekey2pubs}
    if 'alias' in comention_source:
        alias_abbr2titlekey = {abbr: gen_titlekey(title) for abbr, title in comention_source['alias'].items()}
        abbr2pub.update({abbr: titlekey2pubs[titlekey] for abbr, titlekey in alias_abbr2titlekey.items() if titlekey in titlekey2pubs})
    strong_comentions = set([(abbr2pub[x].id, abbr2pub[y].id) for group in comention_source['strong_comentions'] for x in group for y in group if x < y and x in abbr2pub and y in abbr2pub])
    weak_comentions = set([(abbr2pub[x].id, abbr2pub[y].id) for group in comention_source['weak_comentions'] for x in group for y in group if x < y and x in abbr2pub and y in abbr2pub])
    return list(strong_comentions), list(weak_comentions)

def evaluate_comentions(pubs: List[Publication], comentions: List[Tuple[str, str]]) -> Tuple[int,int,float]:
    pid2pubs = {pub.id: pub for pub in pubs}
    hits = [(uid, vid) for uid, vid in comentions if uid in pid2pubs and vid in pid2pubs and pid2pubs[uid].cluster_id == pid2pubs[vid].cluster_id]
    return (len(hits), len(comentions), len(hits) / len(comentions))
