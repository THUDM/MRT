from typing import List, Optional
from nltk.collocations import *
from collections import Counter
import numpy as np
import re
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from scipy.sparse import lil_matrix
from sklearn.preprocessing import normalize
import nltk

def generate_stop_words():
    _stop_words = set(stopwords.words('english'))
    _stop_words.update(['called', 'named', 'state-of-the-art', 'dataset', 'per'])
    return _stop_words

_stop_words = generate_stop_words()
_lemmatizer = WordNetLemmatizer()

def tokenize(text, word_min_len=3):
    text = re.sub('<[^>]*>', '', text.strip().lower())
    sents = nltk.sent_tokenize(text)
    return [[
        word if word not in _stop_words and len(word) >= word_min_len else '#'
        for word in [_lemmatizer.lemmatize(w) for w in re.findall('[a-z-_]+', sent)]
    ] for sent in sents]

def automatic_labeling(root: str, corpus: List[List[str]], root_weights: float=1, weights: Optional[List[List[float]]]=None, word_min_len=3, n_candidates=5, label_group_size=5, mu=0.7, phi=0.1, lbda=0.95, verbose=False):
    corpus = [[tokenize(root, word_min_len=word_min_len)]] + [[tokenize(text, word_min_len=word_min_len) for text in texts] for texts in corpus]
    if weights is None:
        weights = np.ones([1.0 for cluster in corpus for branch in cluster for paper in branch])
    else:
        weights = np.array([root_weights] + [w for ws in weights for w in ws])
    n_clusters = len(corpus)

    def get_counters(texts):
        word_counter, phrase_counter, doc_counters = Counter(), Counter(), []
        for text in texts:
            word_cnter, phrase_cnter = Counter(), Counter()
            for sent in text:
                word_cnter.update([token for token in sent if token != '#'])
                phrase_cnter.update([tuple(sent[i:i+1]) for i in range(len(sent)) if '-' in sent[i] and sent[i][-1] is not '-'])
                phrase_cnter.update([tuple(sent[i:i+2]) for i in range(len(sent) - 1) if '#' not in sent[i:i+2]])
                phrase_cnter.update([tuple(sent[i:i+3]) for i in range(len(sent) - 2) if '#' not in sent[i:i+3]])
            if len(phrase_cnter) == 0:
                for sent in text:
                    phrase_cnter.update([tuple(sent[i:i+1]) for i in range(len(sent)) if sent[i] != '#'])
            word_counter.update(word_cnter.keys())
            phrase_counter.update(phrase_cnter.keys())
            doc_counters.append((word_cnter, phrase_cnter))
        return word_counter, phrase_counter, doc_counters

    word_counters, phrase_counters, doc_counters = [], [], []
    for idx in range(len(corpus)):
        word_counter, phrase_counter, doc_counter = get_counters(corpus[idx])
        word_counters.append(word_counter)
        phrase_counters.append(phrase_counter)
        doc_counters.extend(doc_counter)

    def get_candidates(phrase_counter):
        threshold = phrase_counter.most_common(1)[0][1]
        candidates = [(key, cnt) for key, cnt in phrase_counter.items() if cnt >= threshold / len(key)]
        return list(sorted(candidates, key=lambda x: (x[1], len(x[0])), reverse=True))

    candidates = [get_candidates(phrase_counters[idx]) for idx in range(n_clusters)]

    labels = list(set([tup for cs in candidates for tup, cnt in cs]))
    labels2idx = {label: idx for idx, label in enumerate(labels)}
    words = list(set([key for idx in range(n_clusters) for key in word_counters[idx]]))
    words2idx = {word: idx for idx, word in enumerate(words)}

    def get_count_matrix():
        doc_labels_ = lil_matrix((len(doc_counters), len(labels2idx)))
        doc_words_ = lil_matrix((len(doc_counters), len(words2idx)))
        cluster_doc_ = lil_matrix((n_clusters, len(doc_counters)))
        for idx, (word_cnter, phrase_cnter) in enumerate(doc_counters):
            for w in word_cnter:
                if w in words2idx:
                    doc_words_[idx, words2idx[w]] = word_cnter[w]
            for w in phrase_cnter:
                if w in labels2idx:
                    doc_labels_[idx, labels2idx[w]] = phrase_cnter[w]
        cluster_document_indices = np.cumsum([0] + [len(texts) for texts in corpus])
        for idx in range(n_clusters):
            for j in range(cluster_document_indices[idx], cluster_document_indices[idx+1]):
                cluster_doc_[idx, j] = weights[j]
        return doc_labels_, doc_words_, cluster_doc_

    doc_labels_, doc_words_, cluster_doc_ = get_count_matrix()

    p_w = (doc_words_ > 0).mean(axis=0) # 1 * n_words
    p_l = (doc_labels_ > 0).mean(axis=0) # 1 * n_labels
    p_wl = (doc_words_ > 0).T * (doc_labels_ > 0) / len(doc_counters) # n_words * n_labels
    pmi = np.log((p_wl.todense()+1e-12) / (np.asarray(p_w.T * p_l))) # n_words * n_labels

    cluster_words_ = normalize(cluster_doc_, norm='l1', axis=1) * normalize(doc_words_, norm='l1', axis=1)
    scores = cluster_words_ * pmi # n_cluster * n_labels

    factor_matrix = (np.eye(n_clusters) * (n_clusters - 2 + mu * 2) - mu) / (n_clusters - 2)
    factor_matrix[:, 0] = phi
    rel_scores_ = np.asarray(factor_matrix @ scores)

    tf_scores = np.asarray((normalize(cluster_doc_, norm='l1', axis=1) * normalize(doc_labels_, norm='l1', axis=1)).todense()) # n_clusters * n_labels
    idf_scores = np.log(1 / np.asarray(p_l)) # 1 * n_labels
    tfidf_scores = (tf_scores * np.repeat(idf_scores, n_clusters, axis=0))

    # rel_scores_ = np.exp(rel_scores_) * (tfidf_scores > 0)

    p_w_cond_l = normalize(p_wl.multiply(1.0 / p_l), norm='l1', axis=0).todense() # n_words * n_labels
    entropy = np.asarray(np.log(p_w_cond_l+1e-12).T * p_w_cond_l) # n_labels * n_labels
    sim = entropy - np.diag(entropy)

    sorted_indices = np.array([
        list(sorted(range(len(labels)),
        key=lambda i: (rel_scores_[idx, i], tfidf_scores[idx, i], len(labels[i])),
        reverse=True)) for idx in range(n_clusters)
    ])

    if verbose:
        for idx in range(1, n_clusters):
            print(candidates[idx])
            for i in sorted_indices[idx][:30]:
                print(rel_scores_[idx, i], tfidf_scores[idx, i], labels[i])
            print()

    def assign_labels():
        results = []
        for idx in range(1, n_clusters):
            selected_labels, C, R = [], set(), set([label for i, label in enumerate(labels) if tfidf_scores[idx, i] > 0])
            def push_new_item(item):
                C.add(item)
                if item in R:
                    R.remove(item)
            while len(selected_labels) < label_group_size and len(R) > 0:
                Cids = [labels2idx[covered_label] for covered_label in C if covered_label in labels2idx]
                labels_with_score = []
                for remain_label in R:
                    remain_id = labels2idx[remain_label]
                    sim_score = sim[Cids, remain_id].max() if len(Cids) > 0 else 0
                    comb_score = lbda * rel_scores_[idx, remain_id] - (1 - lbda) * sim_score
                    labels_with_score.append((remain_label, comb_score, rel_scores_[idx, remain_id], -sim_score, tfidf_scores[idx, remain_id], phrase_counters[idx][remain_label], len(remain_label)))
                ranked_labels = [tup[0] for tup in sorted(labels_with_score, key=lambda x: x[1:], reverse=True)]
                ans = ranked_labels[0]
                push_new_item(ans)
                if len(ans) == 2:
                    # for i in range(1, min(n_candidates, len(ranked_labels))):
                    #     _ans = ranked_labels[i]
                    #     tmp = None
                    #     if len(_ans) == 2:
                    #         if ans[0] == _ans[-1]:
                    #             tmp = tuple(list(_ans)[:-1] + list(ans))
                    #         elif ans[-1] == _ans[0]:
                    #             tmp = tuple(list(ans)[:-1] + list(_ans))
                    #     else:
                    #         if ans[0] in _ans and ans[1] in _ans:
                    #             tmp = _ans
                    #     if tmp is not None and phrase_counters[idx][tmp] >= phrase_counters[idx][ans] / 2:
                    #         ans = tmp
                    #         break
                    push_new_item(ans)
                if len(ans) == 3:
                    push_new_item(ans[:2])
                    push_new_item(ans[1:])
                selected_labels.append(' '.join(ans))
            results.append(selected_labels)
        return results

    label_groups = assign_labels()

    cluster_weights, it = [], 0
    for texts in corpus[1:]:
        w = 0
        for j in range(len(texts)):
            w += weights[it]
            it += 1
        cluster_weights.append(w)

    top_labels = ['' for _ in range(len(corpus)-1)]
    for idx in np.argsort(cluster_weights)[::-1]:
        for l in label_groups[idx]:
            if l not in top_labels:
                top_labels[idx] = l
                break

    return top_labels, label_groups
