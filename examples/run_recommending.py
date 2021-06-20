from mrtframework.recommending import BaselineModel, RecModel
import json
import numpy as np
import argparse
import os
from mrtframework.utils import set_seed
import torch
import random

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--mrt_file', type=str, required=True, help='the input file for mrt')
    parser.add_argument('--click_file', type=str, required=True, help='the input file for click data')
    parser.add_argument('--eval_proportion', type=float, default=0.2, help='the proportion of click data for evaluation')
    parser.add_argument('--k', type=int, default=5, help='the top K for recommendation')
    parser.add_argument('--train', type=int, default=0, help='whether to train model')
    parser.add_argument('--eval_epoch', type=int, default=5, help='the number of epoch for evaluation during training')
    parser.add_argument('--log_epoch', type=int, default=5, help='the number of epoch for logging during training')
    parser.add_argument('--n_epoch', type=int, default=50, help='the number of epoch for training')
    parser.add_argument('--gamma', type=float, default=0.9, help='the discount factor in RL')
    parser.add_argument('--model', type=str, default=None, help='the model to use')
    parser.add_argument('--out_model', type=str, default=None, help='the path for trained model to save')
    parser.add_argument('--seed', type=int, default=42, help='the random seed')
    parser.add_argument('--shuffle', type=int, default=0, help='whether to shuffle')
    args = parser.parse_args()

    source = json.load(open(args.mrt_file))
    source['root']['cluster_id'] = -1
    source['root']['main_timeline'] = True
    pubs = [source['root']]
    for cluster_id, cluster in enumerate(source['branches']):
        for branch_id, branch in enumerate(cluster):
            for pub in branch:
                pub['cluster_id'] = cluster_id
                pub['main_timeline'] = branch_id == 0
                pubs.append(pub)
    for idx, pub in enumerate(pubs):
        pub['idx'] = idx

    embeddings = np.array([pub['embeddings'] for pub in pubs])
    pid2pubs = {pub['paper_id']: pub for pub in pubs}

    set_seed(args.seed)

    all_users_actions = list(filter(lambda l: len(l) > 0, [[pid2pubs[pid]['idx'] for pid in seq if pid in pid2pubs] for seq in json.load(open(args.click_file))]))
    print('%d user actions were tests' % len(all_users_actions))

    print('missing publication ids:')
    for pid in set([pid for seq in json.load(open(args.click_file)) for pid in seq if pid not in pid2pubs]):
        print(pid)

    if args.shuffle:
        random.shuffle(all_users_actions)
    eval_size = int(len(all_users_actions) * args.eval_proportion)
    train_users_actions = all_users_actions[:-eval_size]
    eval_users_actions = all_users_actions[-eval_size:]

    if args.model == 'baseline':
        model = BaselineModel(pub_embeddings=embeddings)
        eval_rewards = model.run_evaluate(users_actions=eval_users_actions, k=args.k)
    else:
        model = RecModel(pub_embeddings=embeddings)
        if args.model is not None and os.path.exists(args.model):
            print('load pretrained model from %s' % args.model)
            model.load_state_dict(torch.load(args.model))
        if args.train > 0:
            model.run_train(train_users_actions, eval_users_actions=eval_users_actions, gamma=args.gamma,
                n_epoch=args.n_epoch, eval_epoch=args.eval_epoch, log_epoch=args.log_epoch, k=args.k)
            if args.out_model is not None:
                torch.save(model.state_dict(), args.out_model)
        eval_rewards = model.run_evaluate(users_actions=eval_users_actions, k=args.k)

    print('Evaluation average rewards: %.4f' % np.mean(eval_rewards))
