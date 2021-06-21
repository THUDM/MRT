# MRT: Tracing the Evolution of Scientific Publications

[Official Site](https://mrt.aminer.cn/) | [Demo](https://thudm.github.io/MRT/)

The implementation for the paper "[MRT: Tracing the Evolution of Scientific Publications](http://keg.cs.tsinghua.edu.cn/jietang/publications/TKDE21-Yin-et-al-MRT-Tracing-the-Evolution-of-Scientific-Publications.pdf)" (TKDE 2021 accepted).

## Introduction

The MRT (Master Reading Tree) is designed to help researchers quickly find the evolution roadmap of a target paper, for example, tracing how the famous paper BERT evolves. [A demo of the BERT roadmap.](https://mrt.aminer.cn/5dd3de98e07b013b38cf3399)

Specifically, given a research paper, the designed algorithm will try to extract a small citation network with metainfo of papers and then build a roadmap to sketch different tracks of the target paper's evolution.

This repo includes two code libraries:
1. [**mrtframework**](https://github.com/THUDM/MRT/tree/mrtframework), the backend algorithm for generating roadmaps. You can either use the code to discover how the library works or how evaluations are conducted.
2. [**react-mrt**](https://github.com/THUDM/MRT/tree/react-mrt), the frontend UI (a React component) for displaying a generated roadmap. You can use this framework to integrate dynamic roadmaps in your own website.

This whole framework has already been integrated into the [AMiner](https://www.aminer.cn/) online system where you can click the "Generate MRT" button on paper pages to generate roadmaps for your interested papers.

## Citation

Please cite the following works if you find the work of MRT helps you in your research.
```
@article{yin2021mrt,
  title={MRT: Tracing the Evolution of Scientific Publications},
  author={Yin, Da and Tam, Weng Lam and Ding, Ming and Tang, Jie},
  journal={IEEE Transactions on Knowledge and Data Engineering},
  year={2021},
  publisher={IEEE}
}
```