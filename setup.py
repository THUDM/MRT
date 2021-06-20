from setuptools import setup, find_packages
from mrtframework import __version__

setup(
    name = 'mrtframework',
    packages = find_packages(),
    version = __version__,
    license='MIT',
    description = 'The MRT framework to generate evolution roadmap for publications.',
    author = 'Da Yin, Weng Lam Tam, Ming Ding, Jie Tang',
    author_email = 'yd18@mails.tsinghua.edu.cn, tanyl19@mails.tsinghua.edu.cn, dm18@mails.tsinghua.edu.cn, jietang@tsinghua.edu.cn',
    url = 'https://github.com/THUDM/mrt',
    download_url = 'https://github.com/THUDM/mrtframework/archive/0.2.0.tar.gz',
    keywords = ['data mining', 'information retrieval', 'document representation', 'network embedding', 'document clustering'],   # Keywords that define your package best
    install_requires=[            # I get to this in a second
        'networkx',
        'requests',
        'tqdm',
        'pymongo',
        'node2vec',
        'nltk',
        'numpy',
        'pyssdb',
        'torch',
        'retry',
        'scipy',
        'pick',
        'scikit_learn',
        'sentence_transformers'
    ],
    classifiers=[
        'Development Status :: 3 - Alpha',      # Chose either "3 - Alpha", "4 - Beta" or "5 - Production/Stable" as the current state of your package
        'Intended Audience :: Science/Research',
        'Topic :: Scientific/Engineering :: Artificial Intelligence',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
    ],
)