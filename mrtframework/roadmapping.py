from typing import List
from .base import Publication, Cluster
from .utils import build_graph_with_array, build_graph, set_seed, build_graph_with_nodes_and_edges
import numpy as np
import networkx as nx
import sklearn
import sklearn.cluster
from .algorithms import kernel_kmeans
from typing import Optional, List, Tuple
from itertools import groupby

KMEANS = 'kmeans'
SPECTRAL = 'spectral'
KERNEL_KMEANS = 'kernel-kmeans'
HIERARCHICAL = 'hierarchical'

def roadmap(pubs: List[Publication], n_clusters: int = 6, algorithm: str = KERNEL_KMEANS, alpha: float = 1.0, seed: Optional[int] = 42, beta: float = 1.0, supervision_links: List[Tuple[str, str]]=[]) -> Tuple[List[Cluster], np.array]:
    set_seed(seed=seed)
    # clustering into groups
    graph = build_graph_with_array(pubs)
    nodelist = [pub.id for pub in pubs]
    A = nx.to_numpy_array(graph.to_undirected(), nodelist=nodelist)
    W = nx.to_numpy_array(build_graph_with_nodes_and_edges(nodes=nodelist, edges=supervision_links).to_undirected(), nodelist=nodelist)
    kernel = A * alpha + W * beta
    embeddings, similarity = None, None
    if pubs[0].embedding is not None:
        embeddings = np.array([pub.embedding for pub in pubs])
        similarity = sklearn.metrics.pairwise.cosine_similarity(embeddings, embeddings)
        embeddings_ = embeddings[1:] - embeddings[1:].mean(axis=0)
        similarity[1:,1:] = embeddings_ @ embeddings_.T
        kernel += similarity

    retry = 0
    while True:
        if algorithm == KMEANS:
            if embeddings is None:
                raise ValueError('k-means needs embeddings')
            _, labels, _ = sklearn.cluster.k_means(X=embeddings[1:], n_clusters=n_clusters)
        elif algorithm == HIERARCHICAL:
            if embeddings is None:
                raise ValueError('hierarchical needs embeddings')
            labels = sklearn.cluster.AgglomerativeClustering(n_clusters=n_clusters).fit(X=embeddings[1:]).labels_
        elif algorithm == SPECTRAL:
            if similarity.min() < 0:
                kernel += (1 - similarity) / 2
            labels = sklearn.cluster.spectral_clustering(affinity=kernel[1:,1:], n_clusters=n_clusters)
        elif algorithm == KERNEL_KMEANS:
            labels = kernel_kmeans(kernel[1:,1:], n_clusters=n_clusters)
        else:
            raise NotImplementedError

        # build clusters
        clusters = {cluster_id: Cluster(cluster_id) for cluster_id in range(n_clusters)}
        for pub, label in zip(pubs[1:], labels):
            clusters[label].pubs.append(pub)
            pub.cluster_id = label

        # test if there are clusters without main timeline
        escape = True
        retry += 1
        for cluster in clusters.values():
            main_timeline_pubs = list(filter(lambda pub: pub.depth == 1, cluster.pubs))
            if len(main_timeline_pubs) == 0:
                escape = False
                break
        if escape:
            break
    # build timelines
    for cluster in clusters.values():
        main_timeline_pubs = list(filter(lambda pub: pub.depth == 1, cluster.pubs))
        secondary_timeline_pubs = list(filter(lambda pub: pub.depth > 1, cluster.pubs))
        def build_timeline(pubs):
            for year, group in groupby(pubs, lambda pub: pub.year):
                pid2pub = {pub.id: pub for pub in group}
                graph = build_graph(pid2pub)
                try:
                    for idx, pid in enumerate(nx.algorithms.topological_sort(graph)):
                        pid2pub[pid].topology_order = idx
                except:
                    pass
            return list(sorted(pubs, key=lambda pub: (-pub.year, pub.topology_order, -len(pub.citations))))
        cluster.main_timeline = build_timeline(main_timeline_pubs)
        cluster.secondary_timeline = build_timeline(secondary_timeline_pubs)
        cluster.graph = nx.DiGraph()
        for pub in cluster.pubs:
            cluster.graph.add_node(pub.id, data=pub)
        for i in range(len(cluster.main_timeline)-1):
            cluster.graph.add_edge(cluster.main_timeline[i].id, cluster.main_timeline[i+1].id)
        for i in range(len(cluster.secondary_timeline)-1):
            cluster.graph.add_edge(cluster.secondary_timeline[i].id, cluster.secondary_timeline[i+1].id)
        if len(cluster.secondary_timeline) > 0 and len(cluster.main_timeline) > 0:
            secondary_latest = cluster.secondary_timeline[0]
            connector = cluster.main_timeline[0]
            for pub in reversed(cluster.main_timeline):
                if pub.year >= secondary_latest.year:
                    connector = pub
                    break
            cluster.graph.add_edge(connector.id, secondary_latest.id)

    return list(clusters.values()), kernel
