import numpy as np
from sklearn.utils.validation import check_random_state
from sklearn.cluster._kmeans import _check_normalize_sample_weight, stable_cumsum
import warnings
from sklearn.metrics.pairwise import pairwise_distances_argmin_min, pairwise_distances, euclidean_distances
from sklearn.preprocessing import normalize

def _init_centroids(kernel, n_clusters, random_state=None):
    random_state = check_random_state(random_state)
    n_samples = kernel.shape[0]

    if n_samples < n_clusters:
        raise ValueError('n_samples=%d should be larger than n_clusters=%d' % (n_samples, n_clusters))

    labels = np.full(kernel.shape[0], -1)
    n_local_trials = 2 + int(np.log(n_clusters))

    # Pick first center randomly
    center_id = random_state.randint(n_samples)
    labels[center_id] = 0

    # Initialize list of closest distances and calculate current potential
    closest_dist_sq = _compute_dist(kernel, masked_weight=(labels == 0))
    current_pot = closest_dist_sq.sum()

    # Pick the remaining n_clusters-1 points
    for c in range(1, n_clusters):
        # Choose center candidates by sampling with probability proportional
        # to the squared distance to the closest existing center
        rand_vals = random_state.random_sample(n_local_trials) * current_pot
        candidate_ids = np.searchsorted(stable_cumsum(closest_dist_sq), rand_vals)
        np.clip(candidate_ids, None, closest_dist_sq.size - 1, out=candidate_ids)

        # Compute distances to center candidates
        distance_to_candidates = np.zeros((len(candidate_ids), n_samples))
        for idx, candidate_id in enumerate(candidate_ids):
            mask = np.zeros(n_samples)
            mask[candidate_id] = 1
            distance_to_candidates[idx] = _compute_dist(kernel, masked_weight=mask)

        # update closest distances squared and potential for each candidate
        np.minimum(closest_dist_sq, distance_to_candidates, out=distance_to_candidates)
        candidates_pot = distance_to_candidates.sum(axis=1)

        # Decide which candidate is the best
        best_candidate = np.argmin(candidates_pot)
        current_pot = candidates_pot[best_candidate]
        closest_dist_sq = distance_to_candidates[best_candidate]
        best_candidate = candidate_ids[best_candidate]

        labels[best_candidate] = c

    return labels


def _compute_dist(kernel, masked_weight):
    w = masked_weight / (masked_weight.sum() + 1e-12)
    return (np.diag(kernel) - 2 * np.sum(kernel * w, axis=1) + (w.reshape(-1, 1) @ w.reshape(1, -1) * kernel).sum()).clip(0, None)


def _labels_inertia(kernel, sample_weight, n_clusters, pre_labels):
    n_samples = kernel.shape[0]
    dist = np.zeros((n_clusters, n_samples))
    for k in range(n_clusters):
        dist[k,:] = _compute_dist(kernel, masked_weight=sample_weight * (pre_labels == k))
    labels = np.argmin(dist, axis=0)
    mindist = dist[labels, np.arange(n_samples)]
    inertia = (mindist * sample_weight).sum()
    return labels, inertia, dist


def _kmeans_single_lloyd(kernel, sample_weight, n_clusters, max_iter=300,
                        verbose=False,
                        random_state=None, tol=1e-4,
                        precompute_distances=True):
    random_state = check_random_state(random_state)

    best_labels, best_inertia, best_dists = None, None, None
    # init
    labels = _init_centroids(kernel, n_clusters, random_state=random_state)

    # iterations
    for i in range(max_iter):
        old_labels = labels.copy()
        labels, inertia, dists = _labels_inertia(kernel, sample_weight, n_clusters, labels)

        if verbose:
            print("Iteration %2d, inertia %.3f" % (i, inertia))

        if best_inertia is None or inertia < best_inertia:
            best_labels = labels.copy()
            best_dists = dists.copy()
            best_inertia = inertia

        labels_shift_total = np.abs(old_labels - labels).mean()
        if labels_shift_total <= tol:
            if verbose:
                print("Converged at iteration %d: "
                    "labels shift %e within tolerance %e"
                    % (i, float(labels_shift_total), tol))
            break

    if labels_shift_total > 0:
        # rerun E-step in case of non-convergence so that predicted labels
        # match cluster centers
        best_labels, best_inertia, best_dists = \
            _labels_inertia(kernel, sample_weight, n_clusters, labels)

    return best_labels, best_inertia, best_dists, i + 1


def kernel_kmeans(kernel, n_clusters, verbose=False, n_init=10, tol=1e-8, seed=None, sample_weight=None, max_iter=300):
    random_state = check_random_state(seed)

    if sample_weight is None:
        sample_weight = np.ones(kernel.shape[0])

    best_labels, best_inertia, best_centers = None, None, None
    for seed in random_state.randint(np.iinfo(np.int32).max, size=n_init):
        # run a k-means once
        labels, inertia, centers, n_iter_ = _kmeans_single_lloyd(
            kernel=kernel, sample_weight=sample_weight, n_clusters=n_clusters,
            max_iter=max_iter, verbose=verbose,
            precompute_distances=True, tol=tol, random_state=seed)
        # determine if these results are the best so far
        if best_inertia is None or inertia < best_inertia:
            best_labels = labels.copy()
            best_centers = centers.copy()
            best_inertia = inertia
            best_n_iter = n_iter_

    return best_labels