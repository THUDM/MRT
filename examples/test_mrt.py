from mrtframework import MasterReadingTree
from mrtframework.data_provider import DataProvider
import logging
from mrtframework.utils import parse_args

if __name__ == '__main__':
    args = parse_args()
    logging.root.setLevel(args.verbosity)
    provider = DataProvider(**args.data_provider_args)
    query_pub = provider.get(args.pub_id)
    mrt = MasterReadingTree(provider=provider, query_pub=query_pub, **args.master_reading_tree_args)
    mrt.print_summary()
