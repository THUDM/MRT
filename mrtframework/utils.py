import networkx as nx
from typing import Dict, List, Optional, Tuple
from .base import Publication
import random
import numpy as np
import torch
import argparse

def build_graph(pid2pub: Dict[str, Publication]) -> nx.DiGraph:
    # build graph
    graph = nx.DiGraph()
    for pid, pub in pid2pub.items():
        for rid in pub.references:
            if rid in pid2pub:
                graph.add_edge(pid, rid)
    return graph

def build_graph_with_array(pubs: List[Publication]) -> nx.DiGraph:
    pid2pub = {pub.id: pub for pub in pubs}
    return build_graph(pid2pub)

def build_graph_with_nodes_and_edges(nodes: List[str], edges: List[Tuple[str, str]]) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(nodes)
    graph.add_edges_from(edges)
    return graph

def set_seed(seed: Optional[int] = None):
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)

def parse_args(add_arguments_func=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=str, default=None, help='the source of data provider')
    parser.add_argument('--pub_id', type=str, default=None, help='the id of publication to generate MRT')
    parser.add_argument('--downloader', type=str, default=None, help='the optional downloader for data provider')
    parser.add_argument('--write_source', type=lambda x: False if x is 'False' else (True if x is 'True' else x), default=False, help='the optional write source for data provider')
    parser.add_argument('--verbosity', type=str, default='WARNING', help='log level')
    parser.add_argument('--expected_size', type=int, default=100, help='the expected size for mrt to retrieve')
    parser.add_argument('--use_tfidf', type=int, default=1, help='whether to use tfidf during reading')
    parser.add_argument('--use_sbert', type=int, default=1, help='whether to use sbert during reading')
    parser.add_argument('--use_prone', type=int, default=1, help='whether to use prone during reading')
    parser.add_argument('--use_node2vec', type=int, default=0, help='whether to use node2vec during reading')

    parser.add_argument('--tfidf_ngram_begin', type=int, default=1, help='the begin of ngram for tfidf')
    parser.add_argument('--tfidf_ngram_end', type=int, default=5, help='the end of ngram for tfidf')
    parser.add_argument('--tfidf_max_features', type=int, default=2000, help='the max features for tfidf')
    parser.add_argument('--sbert_model_name', type=str, default='bert-base-nli-stsb-mean-tokens', help='the model name for sbert')
    parser.add_argument('--prone_features', type=int, default=32, help='the number of features for prone')
    parser.add_argument('--node2vec_features', type=int, default=32, help='the number of features for node2vec')

    parser.add_argument('--n_clusters', type=int, default=6, help='the number of clusters to generate')
    parser.add_argument('--cluster_algorithm', type=str, default='kernel-kmeans', help='the cluster algorithm to use')
    parser.add_argument('--alpha', type=float, default=1.0, help='weight for adjacency matrix when running kernel kmeans')
    parser.add_argument('--seed', type=int, default=42, help='the seed for running kernel kmeans')
    parser.add_argument('--label_group_size', type=int, default=5, help='the group of weight to generate')
    parser.add_argument('--mu', type=float, default=0.8, help='the discriminative weight for labeling')
    parser.add_argument('--phi', type=float, default=0.1, help='the coverage weight for labeling')
    parser.add_argument('--lbda', type=float, default=0.95, help='the discriminative weight for group labeling')

    parser.add_argument('--comention_source', type=str, default=None, help='the source for comention evaluation')
    parser.add_argument('--beta', type=float, default=1.0, help='the supervision weight')
    parser.add_argument('--supervision', type=str, default=None, help='the supervision to use: sc or wc')

    parser.add_argument('--output_path', type=str, default=None, help='the output path for generated result')

    if add_arguments_func is not None:
        add_arguments_func(parser)
    args = parser.parse_args()
    args.data_provider_args = {'source': args.source, 'downloader': args.downloader, 'write_source': args.write_source}
    args.retrieve_args = {'expected_size': args.expected_size}
    args.read_args = {'use_tfidf':args.use_tfidf, 'use_sbert':args.use_sbert, 'use_prone':args.use_prone, 'use_node2vec':args.use_node2vec,
         'tfidf_ngram_begin':args.tfidf_ngram_begin, 'tfidf_ngram_end':args.tfidf_ngram_end, 'tfidf_max_features':args.tfidf_max_features, 'sbert_model_name':args.sbert_model_name,
         'prone_features':args.prone_features, 'node2vec_features':args.node2vec_features}
    args.roadmap_args = {'n_clusters':args.n_clusters, 'algorithm':args.cluster_algorithm, 'alpha':args.alpha, 'seed':args.seed, 'beta':args.beta}
    args.reasoning_args = {'label_group_size':args.label_group_size, 'mu':args.mu, 'phi':args.phi, 'lbda':args.lbda}
    args.master_reading_tree_args = {**args.retrieve_args, **args.read_args, **args.roadmap_args, **args.reasoning_args}
    import logging
    logging.root.setLevel(args.verbosity)
    return args
