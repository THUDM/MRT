from mrtframework import MasterReadingTree, retrieve, read, roadmap
from mrtframework.data_provider import DataProvider
from typing import Optional
import argparse
from mrtframework.evaluations.neighborhood_similarity_benchmark import evaluate_neighborhood_similarity
from mrtframework.evaluations.mst_benchmark import evaluate_mst
from mrtframework.evaluations.comention_benchmark import evaluate_comentions, load_comentions
from examples import extract_mentions_from_pdf
import logging
from mrtframework.utils import set_seed
import numpy as np
import json
import sys
import re

logger = logging.getLogger('mrtframework.evaluation')

def run_evaluation_for_single_mrt(args: argparse.Namespace):
    provider = DataProvider(source=args.source, downloader=args.downloader, write_source=args.write_source)
    query_pub = provider.get(args.pub_id)
    logger.debug('MRT is retrieving')
    pubs = retrieve(provider=provider, query_pub=query_pub, expected_size=args.expected_size)
    logger.debug('MRT is reading')
    embeddings = read(pubs, use_tfidf=args.use_tfidf, use_sbert=args.use_sbert, use_prone=args.use_prone, use_node2vec=args.use_node2vec,
                      tfidf_ngram_begin=args.tfidf_ngram_begin, tfidf_ngram_end=args.tfidf_ngram_end, tfidf_max_features=args.tfidf_max_features,
                      sbert_model_name=args.sbert_model_name, prone_features=args.prone_features, node2vec_features=args.node2vec_features)
    spearman = evaluate_neighborhood_similarity(pubs)
    print('Neighborhood Similarity Benchmark (Spearman): %.4f' % spearman)
    if args.disable_clustering:
        return spearman
    logger.debug('MRT is roadmapping')
    set_seed(args.seed)
    mrt_scores, sc_scores, wc_scores = [], [], []
    strong_comentions, weak_comentions = load_comentions(pubs, comention_source=args.comention_source)
    if args.supervision == 'sc':
        supervision_links = strong_comentions
    elif args.supervision == 'wc':
        supervision_links = weak_comentions
    else:
        supervision_links = []
    for i in range(args.repeat):
        clusters, kernel = roadmap(pubs, n_clusters=args.n_clusters, algorithm=args.cluster_algorithm, alpha=args.alpha, seed=None, supervision_links=supervision_links)
        score = evaluate_mst(pubs, clusters)
        mrt_scores.append(score)
        _, _, sc_score = evaluate_comentions(pubs, comentions=strong_comentions)
        _, _, wc_score = evaluate_comentions(pubs, comentions=weak_comentions)
        sc_scores.append(sc_score)
        wc_scores.append(wc_score)
    mst_score = np.nanmean(mrt_scores), np.nanmax(mrt_scores)
    print('MST Relative Score: avg:%.4f max:%.4f' % mst_score)
    comention_strong_score = np.nanmean(sc_scores), np.nanmax(sc_scores)
    comention_weak_score = np.nanmean(wc_scores), np.nanmax(wc_scores)
    print('Comention Score: ')
    print('\tStrong: avg:%.4f max:%.4f' % comention_strong_score)
    print('\tWeak  : avg:%.4f max:%.4f' % comention_weak_score)
    return spearman, mst_score, (comention_strong_score, comention_weak_score)

def run_labeling_evaluation_for_single_mrt(args: argparse.Namespace):
    provider = DataProvider(source=args.source, downloader=args.downloader, write_source=args.write_source)
    query_pub = provider.get(args.pub_id)
    mrt = MasterReadingTree(provider=provider, query_pub=query_pub, **args.master_reading_tree_args)
    pubs = mrt.pubs
    pid2pubs = {pub.id: pub for pub in pubs}
    references, body_paragraphs, mentioned_paragraphs = extract_mentions_from_pdf(args.paper_source)

    gen_titlekey = lambda title: ''.join(re.findall('[A-Za-z0-9]+', title.lower()))
    titlekey2pubs = {gen_titlekey(pub.title): pub for pub in pubs}
    abbr2titlekey = {abbr: gen_titlekey(title) for abbr, title in references.items()}
    abbr2pub = {abbr: titlekey2pubs[titlekey] for abbr, titlekey in abbr2titlekey.items() if titlekey in titlekey2pubs}

    cluster_paragraphs = { i: [] for i in range(len(mrt.clusters))}
    for key, para in mentioned_paragraphs.items():
        if key not in abbr2pub: continue
        pub = abbr2pub[key]
        if pub.cluster_id is not None:
            cluster_paragraphs[pub.cluster_id].append(para)

    cluster_label_scores = {}
    for cluster_id, para_ids in cluster_paragraphs.items():
        cluster_label_scores[cluster_id] = {}

        for label in mrt.clusters[cluster_id].label_group:
            words = label.split()
            scores = []
            for para_i in para_ids:
                score = 1
                for word in words:
                    min_dist = len(body_paragraphs)
                    for para_j in range(len(body_paragraphs)):
                        if word in body_paragraphs[para_j] and abs(para_i - para_j) < min_dist:
                            min_dist = abs(para_i - para_j) + 1
                    if min_dist == len(body_paragraphs):
                        score *= 0
                        break
                    else:
                        score *= 1 / min_dist
                    score = score ** (1/len(words))
                scores.append(score)

            cluster_label_scores[cluster_id][label] = sum(scores)

    cluster_max_score = [ max(cluster_label_scores[i].values()) / len(cluster_paragraphs[i]) for i in range(len(mrt.clusters)) if len(cluster_paragraphs[i]) > 0 ]
    if len(cluster_max_score) == 0: return None, None

    label_groups = [cluster.label_group for cluster in mrt.clusters]
    labels = []
    for idx in range(len(label_groups)):
        for label in label_groups[idx]:
            labels.append(label)
    duplicated_labels = len(labels) - len(set(labels))

    return np.mean(cluster_max_score), duplicated_labels

def run_evaluations_for_multiple_mrt(args: argparse.Namespace):
    evaluation_list = json.load(open(args.evaluation_list))
    spearman_scores, mst_mean_scores, mst_max_scores = [], [], []
    comention_strong_mean_scores, comention_strong_max_scores, comention_weak_mean_scores, comention_weak_max_scores = [], [], [], []
    for case in evaluation_list:
        args.source = case['source']
        args.comention_source = case.get('comention_source', args.source)
        args.pub_id = case['pub_id']
        print('Running case for %s' % args.source)
        try:
            if args.disable_clustering:
                spearman = run_evaluation_for_single_mrt(args)
                spearman_scores.append(spearman)
                continue
            spearman, mst_score, (comention_strong_score, comention_weak_score) = run_evaluation_for_single_mrt(args)
            spearman_scores.append(spearman)
            mst_mean_scores.append(mst_score[0])
            mst_max_scores.append(mst_score[1])
            comention_strong_mean_scores.append(comention_strong_score[0])
            comention_strong_max_scores.append(comention_strong_score[1])
            comention_weak_mean_scores.append(comention_weak_score[0])
            comention_weak_max_scores.append(comention_weak_score[1])
        except Exception as e:
            print('Unexpected exception: ', e)
    print()
    print('=== Summary ===')
    print('Calculated Count/Total Count: %d/%d' % (len(spearman_scores), len(evaluation_list)))
    print('Neighborhood Similarity Benchmark (Spearman): %.4f' % np.nanmean(spearman_scores))
    if not args.disable_clustering:
        print('MST Relative Score: avg:%.4f max:%.4f' % (np.nanmean(mst_mean_scores), np.nanmean(mst_max_scores)))
        print('Comention Score: ')
        print('\tStrong: avg:%.4f max:%.4f' % (np.nanmean(comention_strong_mean_scores), np.nanmean(comention_strong_max_scores)))
        print('\tWeak  : avg:%.4f max:%.4f' % (np.nanmean(comention_weak_mean_scores), np.nanmean(comention_weak_max_scores)))
    sys.stdout.flush()


if __name__ == '__main__':
    from mrtframework.utils import parse_args
    def add_arguments_func(parser: argparse.ArgumentParser):
        parser.add_argument('--evaluation_list', type=str, default=None, help='the file containing evaluation cases')
        parser.add_argument('--disable_clustering', action='store_true', help='whether to disable clustering evaluation')
        parser.add_argument('--repeat', type=int, default=10, help='the rounds to repeat clustering')
        parser.add_argument('--paper_source', type=str, default=None, help='the source of paper')


    args = parse_args(add_arguments_func=add_arguments_func)
    if args.comention_source is None:
        args.comention_source = args.source
    print('Arguments:', args)
    if args.evaluation_list:
        run_evaluations_for_multiple_mrt(args)
    else:
        run_evaluation_for_single_mrt(args)
