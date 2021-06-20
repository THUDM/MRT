from typing import Set, Optional, List
import numpy as np

class Publication:

    def __init__(self, obj: dict):
        # inherit properties
        self.id: str = obj['id']
        if self.id is None:
            raise ValueError('id should exists in publication')
        self.title: str = obj['title']
        if self.title is None:
            raise ValueError('title should exists in publication')
        self.abstract: str = obj['abstract'] or ''
        self.references: Set[str] = set(obj['references']) or set()
        self.citations: Set[str] = set(obj['citations']) or set()
        self.year: int = obj['year']
        if self.year is None:
            raise ValueError('year should exists in publication')
        self.venue: str = obj.get('venue', '')
        self.authors: List[str] = obj.get('authors', [])

        # algorithm properties
        self.depth: int = 0
        self.pagerank_score: float = 0
        self.embedding: Optional[np.array] = None
        self.importance: float = 0
        self.cluster_id: Optional[int] = None
        self.topology_order: int = 0

    def content(self):
        return '%s %s' % (self.title, self.abstract)

    def to_json(self):
        return {
            '_id': self.id,
            'id': self.id,
            'title': self.title,
            'abstract': self.abstract,
            'references': list(self.references),
            'citations': list(self.citations),
            'year': self.year,
            'authors': self.authors,
            'venue': self.venue
        }

def OptionalPublication(obj: Optional[dict]) -> Optional[Publication]:
    try:
        return None if obj is None else Publication(obj)
    except ValueError:
        return None
