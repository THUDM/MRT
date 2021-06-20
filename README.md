# mrtframework

[![NPM](https://img.shields.io/pypi/v/mrtframework.svg)](https://pypi.org/project/mrtframework/) [![Python Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://www.python.org/dev/peps/pep-0008/)

[Demo Web Page](https://somefive.github.io/react-mrt) | [UI Library](https://github.com/Somefive/mrtframework/tree/react-mrt)

## Introduction

This is the python code for generating MRT (Master Reading Tree). The output json can be loaded using the React Component [react-mrt](https://www.npmjs.com/package/react-mrt). You can directly go to the [demo](https://somefive.github.io/react-mrt) page and click the **Load Json** button to upload the output json as well.

The [AMiner](https://www.aminer.cn) system has already integrated this library and can generate MRTs for papers. So if you just want to see MRTs for papers, you can go to AMiner directly.

If you want to generate MRTs with customized settings or dive deeper to substitute some modules, read the following descriptions.

## Run scripts to generate your MRT

Clone this branch first.
```bash
git clone git@github.com:THUDM/MRT.git -b mrtframework
```

Currently, this library supports SemanticScholar as data source. So to generate the MRT for your interested paper, you need to go to [SemanticScholar](https://www.semanticscholar.org) and find the paper id for this paper. For example, the famous GPT-3 paper has the s2 paper id [6b85b63579a916f705a8e10a49bd8d849d91b1fc](https://www.semanticscholar.org/paper/Language-Models-are-Few-Shot-Learners-Brown-Mann/6b85b63579a916f705a8e10a49bd8d849d91b1fc).

Then run the following scripts to generate the MRT for GPT-3.
```bash
python examples/generate_mrt_json.py \
--pub_id 6b85b63579a916f705a8e10a49bd8d849d91b1fc \
--output_path outputs/gpt-3.json
```
The output MRT will saved as Json file at location `outputs/gpt-3.json`.

There are some parameters you can change to alter the generation process. For example, you can set `--use_sbert=0` to disable the use of Sentence-BERT and only use TF-IDF during the generation. A full list of configurable parameters can be listed with
```bash
python examples/generate_mrt_json.py -h
```

> Notice that the SemanticScholar has rate limit for its api. Generating MRTs will trigger lots of api calls. Therefore, you may encounter rate limitation when using SemanticScholar data source. The use of [Web API](https://api.semanticscholar.org/) must follow the agreements of [SemanticScholar](https://www.semanticscholar.org/?utm_source=api).

## Use the python library instead of cloning the codes

The **mrtframework** has already been published to the python library. So you can install the library and direcly call it.
```bash
# Install the library
pip install mrtframework
```

```python
# Caculate mrt for the paper GPT-3 with SemanticScholar as data source
from mrtframework import MasterReadingTree
from mrtframework.data_provider import DataProvider
provider = DataProvider(downloader='s2')
query_pub = provider.get('6b85b63579a916f705a8e10a49bd8d849d91b1fc')
mrt = MasterReadingTree(provider=provider, query_pub=query_pub)
print(mrt.to_json())
```

## Use customized data sources

If you want to use other data sources, you can write your own downloader for MRT to use as follows
```python
def customized_downloader(pid: str) -> Optional[dict]:
    # do something here like retrieving data
    return {
        '_id': pid,
        'id': pid,
        'title': 'MRT: Tracing the Evolution of Scientific Publications',
        'abstract': 'The fast development of science and technology is accompanied by the booming of cutting edge research. Researchers need to digest more and more recently published publications in order to keep themselves up to date. This becomes tough in particular with the prevalence of preprint publishing such as arXiv, where inspiring works could come out without being peer-reviewed. Is that possible to design an automatic system to help researchers quickly gain a glimpse of a piece of work or gain useful background knowledge for deeply understanding it? To this end, we proposed a practical framework called Master Reading Tree (MRT) to trace the evolution of scientific publications. In this framework, we can build annotated evolution roadmaps for publications and identify important previous works or evolution tracks by generating expressive embeddings and clustering them into various groups. With comprehensive evaluations, our proposed framework demonstrates its superior capability in capturing underlying relations behind publications over several baseline algorithms. Finally, we integrated the proposed MRT framework on AMiner, an online academic platform, where users can generate roadmaps using MRT for free and their interactions are further used to refine the model.',
        'citations': [101, 102, 103], # the pids of citation papers
        'references': [104, 105, 106], # the pids of reference papers
        'year': 2021,
        'venue': 'TKDE',
        'authors': [{
            'name': 'Da Yin'
        }, {
            'name': 'Weng Lam Tam'
        }, {
            'name': 'Ming Ding'
        }, {
            'name': 'Jie Tang'
        }]
    }
# replace the downloader in provider
provider = DataProvider(downloader=customized_downloader)
```
