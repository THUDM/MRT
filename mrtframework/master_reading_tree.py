from .retrieving import retrieve
from .reading import read
from .roadmapping import roadmap, KERNEL_KMEANS
from .reasoning import reason
from typing import Optional, List, Tuple
from .data_provider import DataProvider
from .base import Publication
from . import __version__, logger

class MasterReadingTree:

    def __init__(self, provider: DataProvider, query_pub: Publication, expected_size: int = 100,
                    use_tfidf=True, use_sbert=True, use_prone=True, use_node2vec=False,
                    tfidf_ngram_begin=1, tfidf_ngram_end=5, tfidf_max_features=2000,
                    sbert_model_name='bert-base-nli-stsb-mean-tokens', prone_features=32, node2vec_features=32,
                    n_clusters: int = 6, algorithm: str = KERNEL_KMEANS, alpha: float = 1.0, seed: Optional[int] = 42,
                    beta: float = 1.0, supervision_links: List[Tuple[str, str]]=[],
                    label_group_size: int = 5, mu: float = 0.8, phi: float = 0.1, lbda: float = 0.95):
        logger.info('MRT is retrieving')
        self.pubs = retrieve(provider=provider, query_pub=query_pub, expected_size=expected_size)
        logger.info('MRT is reading')
        self.embeddings = read(self.pubs, use_tfidf=use_tfidf, use_sbert=use_sbert, use_prone=use_prone, use_node2vec=use_node2vec,
            tfidf_ngram_begin=tfidf_ngram_begin, tfidf_ngram_end=tfidf_ngram_end, tfidf_max_features=tfidf_max_features, sbert_model_name=sbert_model_name,
            prone_features=prone_features, node2vec_features=node2vec_features)
        logger.info('MRT is roadmapping')
        self.clusters, self.kernel = roadmap(self.pubs, n_clusters=n_clusters, algorithm=algorithm, alpha=alpha, seed=seed, beta=beta, supervision_links=supervision_links)
        logger.info('MRT is reasoning')
        reason(self.pubs, self.clusters, self.kernel, label_group_size=label_group_size, mu=mu, phi=phi, lbda=lbda)
        logger.info('MRT generated')

    def print_summary(self):
        for cluster in self.clusters:
            print('=== Cluster[%s] %s (%s) ===' % (cluster.id, cluster.primary_label, ', '.join(cluster.label_group)))
            main_ids = set([pub.id for pub in cluster.main_timeline])
            expander = [u for (u, v) in cluster.graph.edges() if u in main_ids and v not in main_ids]
            print('\t> Main Timeline')
            for pub in cluster.main_timeline:
                print('\t\t%s %d %s' % ('+' if pub.id in expander else ' ' , pub.year, pub.title))
            print('\t> Secondary Timeline')
            for pub in cluster.secondary_timeline:
                print('\t\t  %d %s' % (pub.year, pub.title))
            print()

    def to_json(self):
        ids = {pub.id for pub in self.pubs}
        def pub2json(pub: Publication) -> dict:
            return {
                'paper_id': pub.id,
                'paper_title': pub.title,
                'paper_year': pub.year,
                'paper_venue': pub.venue,
                'paper_authors': pub.authors,
                'paper_citations': len(pub.citations),
                'paper_abstract': pub.abstract,
                'citations': list(pub.citations.intersection(ids)),
                'references': list(pub.references.intersection(ids)),
                'score': pub.importance,
                'embeddings': pub.embedding.tolist()
            }

        related_pub = list(sorted(self.pubs[1:], key=lambda p: p.importance, reverse=True))[:5]
        clusters = []
        for cluster in sorted(self.clusters, key=lambda cluster: cluster.importance, reverse=True):
            if len(clusters) % 2 == 0:
                clusters.insert(0, cluster)
            else:
                clusters.append(cluster)

        return {
            'root': pub2json(self.pubs[0]),
            'branches': [[[pub2json(pub) for pub in cluster.main_timeline], [pub2json(pub) for pub in cluster.secondary_timeline]] for cluster in clusters],
            'importance': [cluster.importance for cluster in clusters],
            'clusterNames': [cluster.primary_label for cluster in clusters],
            'tagGroups': [cluster.label_group for cluster in clusters],
            'related_paper_titles': [pub.title for pub in related_pub],
            'version': __version__
        }