from typing import Optional, List
from .publication import Publication
import networkx as nx

class Cluster:

    def __init__(self, label_id: str):
        self.id: str = label_id
        self.pubs: List[Publication] = []
        self.label_group: List[str] = []
        self.primary_label: Optional[str] = None
        self.importance: int = 0
        self.main_timeline = []
        self.secondary_timeline = []
        self.graph: Optional[nx.DiGraph] = None