from .base import Publication
from typing import List, Optional
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import SentenceTransformer
import re
import networkx as nx
import numpy as np
from node2vec import Node2Vec
import scipy
from .utils import build_graph_with_array
from .algorithms import ProNE

import warnings
warnings.filterwarnings("ignore", category=UserWarning)

# lazy loading modules
_lemmatizer = None
def _get_wordnet_lemmatizer():
    global _lemmatizer
    if _lemmatizer is None:
        _lemmatizer = WordNetLemmatizer()
    return _lemmatizer

_sberts = {}
def _get_sbert(model_name) -> SentenceTransformer:
    global _sberts
    if model_name not in _sberts:
        _sberts[model_name] = SentenceTransformer(model_name)
    return _sberts[model_name]


def read(pubs: List[Publication], use_tfidf=True, use_sbert=True, use_prone=True, use_node2vec=False,
         tfidf_ngram_begin=1, tfidf_ngram_end=1, tfidf_max_features=500, sbert_model_name='bert-base-nli-stsb-mean-tokens',
         prone_features=32, node2vec_features=32) -> Optional[np.array]:
    features = []

    # encode contents
    contents = [pub.content() for pub in pubs]
    content_features = []
    if use_tfidf:
        lemmatizer, regex = _get_wordnet_lemmatizer(), re.compile('[a-zA-Z0-9-]+')
        tokenize = lambda sentence: [lemmatizer.lemmatize(word) for word in regex.findall(sentence)]
        vectorizer = TfidfVectorizer(ngram_range=(tfidf_ngram_begin, tfidf_ngram_end), max_features=tfidf_max_features, stop_words='english', tokenizer=tokenize)
        content_features.append(vectorizer.fit_transform(contents))
    if use_sbert:
        sbert = _get_sbert(model_name=sbert_model_name)
        content_features.append(scipy.sparse.csr_matrix(sbert.encode(contents)))

    # encode structure
    graph = build_graph_with_array(pubs)
    A = nx.to_scipy_sparse_matrix(graph.to_undirected(), nodelist=[pub.id for pub in pubs])
    if use_prone:
        if len(content_features) == 0: # no content provided, fallback to pre factorization
            content_features.append(ProNE.pre_factorization(A, A, dimension=prone_features))
        features = [ProNE.chebyshev_gaussian(A, content_feature, dimension=prone_features) for content_feature in content_features]
    if use_node2vec:
        model = Node2Vec(graph=graph.to_undirected(), dimensions=node2vec_features, walk_length=20, num_walks=60, workers=6, quiet=True).fit(
            window=5, min_count=1, batch_words=4)
        features = content_features + [np.array([model.wv[pub.id] for pub in pubs])]
    if len(features) == 0: # no structure information is encoded
        features += content_features

    features = [feature if scipy.sparse.issparse(feature) else scipy.sparse.csr_matrix(feature) for feature in features]
    for pub in pubs:
        pub.embedding = None
    if len(features) > 0:
        embeddings = scipy.sparse.hstack(features).toarray()
        if use_prone and use_sbert and use_tfidf:
            embeddings = ProNE.chebyshev_gaussian(A, embeddings, dimension=prone_features)
        for idx, pub in enumerate(pubs):
            pub.embedding = embeddings[idx]
        return embeddings
    return None
