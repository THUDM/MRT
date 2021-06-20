from ..base import Cluster, Publication
from typing import List
import networkx as nx
import numpy as np

def evaluate_mst(pubs: List[Publication], clusters: List[Cluster]):
    graph = nx.Graph()
    neighborhoods = {pub.id: set.union(pub.citations, pub.references, {pub.id}) for pub in pubs}
    def calculate_weight(i, j):
        intersect = neighborhoods[i].intersection(neighborhoods[j])
        return len(intersect) / np.sqrt(len(neighborhoods[i]) * len(neighborhoods[j]))
    for p_i in pubs:
        for p_j in pubs:
            graph.add_edge(p_i.id, p_j.id, weight=calculate_weight(p_i.id, p_j.id))
    mst = nx.algorithms.maximum_spanning_tree(graph)
    gold_edges = [(u, v) for u, v in mst.edges()]
    generated_edges = [(u, v) for cluster in clusters for u, v in cluster.graph.edges()]
    for cluster in clusters:
        if len(cluster.main_timeline) > 0:
            generated_edges.append((pubs[0].id, cluster.main_timeline[0].id))
        elif len(cluster.secondary_timeline) > 0:
            generated_edges.append((pubs[0].id, cluster.secondary_timeline[0].id))
    gold = np.sum([graph[u][v]['weight'] for (u, v) in gold_edges])
    generated = np.sum([graph[u][v]['weight'] for (u, v) in generated_edges])
    return generated / gold
