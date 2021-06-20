from typing import List
from .base import Publication, Cluster
from .algorithms import automatic_labeling
import numpy as np

AL_WORD_MIN_LEN=3
AL_N_CANDIDATES=5

def reason(pubs: List[Publication], clusters: List[Cluster], kernel: np.array, label_group_size=5, mu=0.8, phi=0.1, lbda=0.95):
    # calculate importance
    for pub, importance in zip(pubs, kernel[0]):
        pub.importance = importance
    for cluster in clusters:
        cluster.importance = np.sum([pub.importance for pub in cluster.pubs])

    corpus = [[pub.content() for pub in cluster.pubs] for cluster in clusters]
    weights = [[pub.importance for pub in cluster.pubs] for cluster in clusters]
    primary_labels, label_groups = automatic_labeling(root=pubs[0].content(), corpus=corpus, root_weights=1, weights=weights)
    for (cluster, primary_label, label_group) in zip(clusters, primary_labels, label_groups):
        cluster.primary_label = primary_label
        cluster.label_group = label_group
