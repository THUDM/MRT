import numpy as np
from typing import List, Tuple
import torch

class BaselineModel():

    def __init__(self, pub_embeddings: np.ndarray):
        self.pub_embeddings = pub_embeddings

    def run_seq(self, user_actions: List[int], k=5) -> Tuple[List[float], List[float]]:
        state = self.pub_embeddings[0]
        rewards = []
        for idx, user_action in enumerate(user_actions):
            exp = np.exp(self.pub_embeddings @ state)
            probs = exp / exp.sum()
            reward = user_action in np.argsort(probs)[-k:] # probs[user_action]
            rewards.append(reward)
            # print('reward:', 1 if user_action in np.argsort(probs)[-k:] else 0, user_action, 'history:', user_actions[:idx] ,'predict:', [(i, probs[i]) for i in np.argsort(probs)[-k:]])
            state = self.pub_embeddings[user_action]
        return rewards, None

    def run_evaluate(self, users_actions: List[List[int]], k=5) -> List[float]:
        total_rewards = []
        for user_actions in users_actions:
            rewards, _ = self.run_seq(user_actions, k=k)
            total_rewards.append(np.sum(rewards))
        return total_rewards


class RecModel(torch.nn.Module):

    def __init__(self, pub_embeddings: np.ndarray):
        super(RecModel, self).__init__()
        embedding_size = pub_embeddings.shape[1]
        self.rnn = torch.nn.GRUCell(embedding_size, embedding_size)
        # self.rnn.load_state_dict({'weight_ih': torch.eye(embedding_size), 'weight_hh': torch.zeros((embedding_size, embedding_size))})
        self.fc = torch.nn.Linear(embedding_size, embedding_size)
        self.fc.load_state_dict({'weight': torch.eye(embedding_size), 'bias': torch.zeros(embedding_size)})
        self.A = pub_embeddings

    def forward(self, state, actions): # state: (embedding_size,), actions: (N, embedding_size) -> (N, 1)
        return torch.matmul(actions, self.fc(state).T).squeeze()

    def pi(self, state, actions):
        return torch.nn.functional.softmax(self.forward(state, actions), dim=0)

    def proceed(self, prev_state, user_action): # prev_state: (embedding_size,), action: (embedding_size,) -> (embedding_size,)
        return self.rnn(user_action.unsqueeze(0), prev_state.unsqueeze(0)).squeeze()

    def run_seq(self, user_actions: List[int], k=5, evaluate=False):
        rewards, log_probs = [], []
        state = torch.Tensor(self.A[0])
        for idx, user_action in enumerate(user_actions):
            probs = self.pi(state, torch.Tensor(self.A))
            if not evaluate:
                m = torch.distributions.Categorical(probs=probs)
                selected = set()
                while len(selected) < k:
                    a = m.sample()
                    selected.add(a.item())
                reward = torch.BoolTensor([user_action in selected]).float()
                log_prob = torch.log(1-(1-probs[user_action])**len(selected)+1e-8)
                log_probs.append(log_prob)
            else:
                # print('reward:', 1 if user_action in probs.argsort()[-k:] else 0, user_action, 'history:', user_actions[:idx] ,'predict:', [(i.item(), probs[i].item()) for i in probs.argsort()[-k:]])
                reward = torch.BoolTensor([user_action in probs.argsort()[-k:]]).float()
            rewards.append(reward)
            state = self.proceed(state, torch.Tensor(self.A[user_action]))
        return rewards, log_probs

    def run_evaluate(self, users_actions: List[List[int]], k=5) -> List[float]:
        self.eval()
        total_rewards = []
        for user_actions in users_actions:
            ep_rewards, log_probs = self.run_seq(user_actions, k=k, evaluate=True)
            total_rewards.append(np.sum([r.item() for r in ep_rewards]))
        return total_rewards

    def run_train(self, train_users_actions, eval_users_actions=None, optimizer=None, n_epoch=100, gamma=0.9, log_epoch=5, eval_epoch=5, k=5):
        if optimizer is None:
            optimizer = torch.optim.Adam(self.parameters(), lr=1e-3)
        for epoch in range(n_epoch):
            total_rewards = []
            self.train()
            for user_actions in train_users_actions:
                ep_rewards, log_probs = self.run_seq(user_actions)
                total_rewards.append(np.sum([r.item() for r in ep_rewards]))
                returns, R = [], 0
                for r in ep_rewards[::-1]:
                    R = r + gamma * R
                    returns.insert(0, R)
                returns = torch.FloatTensor(returns)
                log_probs = torch.stack(log_probs)
                policy_loss = -log_probs * returns
                loss = policy_loss.sum()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.parameters(), 1)
                optimizer.step()
            if log_epoch > 0 and (epoch+1) % log_epoch == 0:
                print('Epoch %d: average rewards: %.4f' % (epoch+1, np.mean(total_rewards)))
            if eval_epoch > 0 and eval_users_actions is not None and (epoch+1) % eval_epoch == 0:
                eval_rewards = self.run_evaluate(users_actions=eval_users_actions, k=k)
                print('Validation rewards: %.4f' % (np.mean(eval_rewards)))