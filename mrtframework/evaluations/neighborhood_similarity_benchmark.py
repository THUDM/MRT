from ..base import Publication
from typing import List, Set
import numpy as np
import sklearn
import scipy

def evaluate_neighborhood_similarity(pubs: List[Publication]):
    embeddings = np.array([pub.embedding for pub in pubs])
    similarity = sklearn.metrics.pairwise.cosine_similarity(embeddings)
    neighborhoods: List[Set[str]] = [set.union(pub.citations, pub.references, {pub.id}) for pub in pubs]
    gold = np.zeros_like(similarity)
    for i, n_i in enumerate(neighborhoods):
        for j, n_j in enumerate(neighborhoods):
            gold[i, j] = len(n_i.intersection(n_j)) / (np.sqrt(len(n_i) * len(n_j)) + 1e-8)
    gold_, similarity_ = gold.reshape(-1), similarity.reshape(-1)
    spearman, _ = scipy.stats.spearmanr(gold_, similarity_)
    return spearman
