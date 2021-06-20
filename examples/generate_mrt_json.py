from mrtframework import MasterReadingTree
from mrtframework.data_provider import DataProvider
from mrtframework.base import Publication, Cluster, OptionalPublication
import logging
from mrtframework.utils import parse_args
import json
from mrtframework.evaluations.comention_benchmark import load_comentions

if __name__ == '__main__':
    args = parse_args()
    logging.root.setLevel(args.verbosity)
    provider = DataProvider(**args.data_provider_args)
    if args.supervision in ['sc', 'wc'] and args.comention_source is not None and isinstance(provider.papers, dict):
        strong_comentions, weak_comentions = load_comentions(list(filter(None, [OptionalPublication(pub) for pub in provider.papers.values()])), args.comention_source)
        if args.supervision == 'sc':
            args.master_reading_tree_args['supervision_links'] = strong_comentions
        elif args.supervision == 'wc':
            args.master_reading_tree_args['supervision_links'] = weak_comentions
    query_pub = provider.get(args.pub_id)
    mrt = MasterReadingTree(provider=provider, query_pub=query_pub, **args.master_reading_tree_args)
    if args.output_path is None:
        print(json.dumps(mrt.to_json()))
    else:
        json.dump(mrt.to_json(), open(args.output_path, 'w'))