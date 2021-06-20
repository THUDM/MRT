# encoding=utf8
import time

import numpy as np
import scipy.sparse
import scipy.sparse as sp
from scipy import linalg
from scipy.special import iv
from sklearn import preprocessing
from sklearn.utils.extmath import randomized_svd
from scipy.sparse.linalg import svds


class ProNE:
    def __init__(self, graph, dimension, step=10, mu=0.2, theta=0.5):
        self.G = graph.to_undirected()
        self.node_number = self.G.number_of_nodes()
        matrix0 = scipy.sparse.lil_matrix((self.node_number, self.node_number))
        for e in self.G.edges():
            if e[0] != e[1]:
                matrix0[e[0], e[1]] = 1
                matrix0[e[1], e[0]] = 1
        self.matrix0 = scipy.sparse.csr_matrix(matrix0)
        self.dimension = dimension
        self.step = step
        self.mu = mu
        self.theta = theta
        self.features_matrix = None
        self.embeddings_matrix = None

    def train(self):
        self.features_matrix = ProNE.pre_factorization(self.matrix0, self.matrix0, self.dimension)
        self.embeddings_matrix = ProNE.chebyshev_gaussian(self.matrix0, self.features_matrix, self.dimension, self.step, self.mu, self.theta)

    @staticmethod
    def get_embedding_rand(matrix, dimension):
        # Sparse randomized tSVD for fast embedding
        smat = scipy.sparse.csc_matrix(matrix)  # convert to sparse CSC format
        U, Sigma, VT = randomized_svd(smat, n_components=dimension, n_iter=5, random_state=None)
        U = U * np.sqrt(Sigma)
        U = preprocessing.normalize(U, "l2")
        return U

    @staticmethod
    def get_embedding_dense(matrix, dimension):
        # get dense embedding via SVD
        if scipy.sparse.issparse(matrix):
            U, s, Vh = svds(matrix, k=dimension)
        else:
            U, s, Vh = linalg.svd(matrix, full_matrices=False, check_finite=False, overwrite_a=True)
        U = np.array(U)
        U = U[:, :dimension]
        s = s[:dimension]
        s = np.sqrt(s)
        U = U * s
        U = preprocessing.normalize(U, "l2")
        return U

    @staticmethod
    def pre_factorization(tran, mask, dimension):
        # Network Embedding as Sparse Matrix Factorization
        l1 = 0.75
        C1 = preprocessing.normalize(tran, "l1")
        neg = np.array(C1.sum(axis=0))[0] ** l1

        neg = neg / neg.sum()

        neg = scipy.sparse.diags(neg, format="csr")
        neg = mask.dot(neg)

        C1.data[C1.data <= 0] = 1
        neg.data[neg.data <= 0] = 1

        C1.data = np.log(C1.data)
        neg.data = np.log(neg.data)

        C1 -= neg
        F = C1
        features_matrix = ProNE.get_embedding_rand(F, dimension)
        return features_matrix

    @staticmethod
    def chebyshev_gaussian(A, a, dimension, order=10, mu=0.2, s=0.5):
        # NE Enhancement via Spectral Propagation
        if order == 1:
            return a

        node_number = A.shape[0]
        A = sp.eye(node_number) + A
        DA = preprocessing.normalize(A, norm='l1')
        L = sp.eye(node_number) - DA

        M = L - mu * sp.eye(node_number)

        Lx0 = a
        Lx1 = M.dot(a)
        Lx1 = -0.5 * (M.dot(Lx1) - a)

        conv = iv(0, s) * Lx0
        conv -= 2 * iv(1, s) * Lx1
        for i in range(2, order):
            Lx2 = M.dot(Lx1)
            Lx2 = -(M.dot(Lx2) - Lx1) - Lx0
            if i % 2 == 0:
                conv += 2 * iv(i, s) * Lx2
            else:
                conv -= 2 * iv(i, s) * Lx2
            Lx0 = Lx1
            Lx1 = Lx2
            del Lx2
        mm = DA.dot(a - conv)
        emb = ProNE.get_embedding_dense(mm, dimension)
        return emb
