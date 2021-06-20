import numpy as np
import concurrent
import os
import time

def _compute_dist(kernel_matrix, sample_weights, mask):
    """compute the distance of all samples to one cluster"""
    weights = mask * sample_weights
    denom = np.sum(weights)
    if denom == 0:
        raise ValueError('current cluster has no member')
    d_k = np.diag(kernel_matrix).copy()
    d_k -= 2 * np.sum(kernel_matrix * weights, axis=1) / denom
    d_k += np.sum((weights.reshape(-1, 1) @ weights.reshape(1, -1)) * kernel_matrix) / np.square(denom)
    return d_k


def _kernel_kmeans(kernel_matrix, n_clusters, max_iter=300, sample_weights=None, init_labels=None, verbose=False):
    """calculate kmeans with the similarity matrix (kernel matrix)"""
    size = kernel_matrix.shape[0]
    if sample_weights is None:
        sample_weights = np.ones((size,))
    labels, dist = init_labels, None

    # use k-means++ to initialize
    if labels is None:
        labels = np.ones((size,)) * n_clusters
        labels[np.random.randint(low=0, high=size)] = 0
        for k in range(1, n_clusters):
            dist = np.zeros((k, size))
            for j in range(k):
                dist[j,:] = _compute_dist(kernel_matrix, sample_weights, labels == j)
            labels[np.argmax(np.min(dist, axis=0))] = k
        dist = np.zeros((n_clusters, size))
        for k in range(n_clusters):
            dist[k,:] = _compute_dist(kernel_matrix, sample_weights, labels == k)
        labels = np.argmin(dist, axis=0)

    # iterate
    for t in range(max_iter):
        dist = np.zeros((n_clusters, size))
        for k in range(n_clusters):
            dist[k,:] = _compute_dist(kernel_matrix, sample_weights, labels == k)
        _labels = np.argmin(dist, axis=0)
        if verbose:
            print('iter: %d: ' % t, end='')
            for k in range(n_clusters):
                print('%d:%d ' % (k+1, (_labels == k).sum()), end='')
            print('change: %d' % (labels != _labels).sum())
        if (labels != _labels).sum() == 0:
            break
        labels = _labels

    return labels, dist.min(axis=0).sum()


def _ensure_approximate_kernel(kernel_matrix):
    kernel_matrix_no_diag = kernel_matrix * (1 - np.eye(*kernel_matrix.shape))
    dominant = np.abs(kernel_matrix_no_diag).max()
    delta = dominant - np.diag(kernel_matrix).min()
    return kernel_matrix + np.eye(*kernel_matrix.shape) * delta if delta > 0 else kernel_matrix


def kernel_kmeans(kernel_matrix, n_clusters, max_iter=300, sample_weights=None, init_labels=None, verbose=False, n_init=10, sigma=None):
    kernel_matrix = _ensure_approximate_kernel(kernel_matrix) if not sigma else kernel_matrix + np.eye(*kernel_matrix.shape) * sigma
    best_labels, best_score = None, None
    for i in range(n_init):
        try:
            labels, score = _kernel_kmeans(kernel_matrix, n_clusters, max_iter=max_iter, sample_weights=sample_weights, init_labels=init_labels, verbose=verbose)
            if best_score is None or best_score > score:
                best_labels, best_score = labels, score
        except ValueError:
            continue
    if best_labels is None:
        raise ValueError('cluster has no member, n_clusters might be too large')
    return best_labels
