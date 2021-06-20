import subprocess
import sys
import os
import re
import string
import numpy as np
import logging
import json

loggin_level = logging.DEBUG if 'DEBUG' in os.environ and os.environ['DEBUG'] == '1' else logging.INFO
_logger = logging.getLogger('mrtframework.comention-extract')
_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(logging.Formatter('[%(asctime)s][%(levelname)s][%(name)s] %(message)s', datefmt='%m/%d %H:%M:%S'))
_handler.setLevel(loggin_level)
_logger.addHandler(_handler)
_logger.setLevel(loggin_level)

def __get_approximate_column_width(lines):
    lens = np.array([len(line) for line in lines])
    non_ending_ids = [i for i, line in enumerate(lines) if len(re.findall('[A-Za-z-]+', line)) > 1 and line[-1] != '.' and not re.match('^[0-9a-zA-Z]{1,2}\.', line)]
    non_ending_lens = lens[non_ending_ids]
    return np.mean(non_ending_lens) - np.std(non_ending_lens)

def generate_paragraphs(lines):
    column_width = __get_approximate_column_width(lines)
    paragraphs, current_paragraph = [], ''
    def break_paragraph():
        nonlocal paragraphs, current_paragraph
        if len(re.findall('[A-Za-z-]+', current_paragraph)) > 0:
            paragraphs.append(current_paragraph)
        current_paragraph = ''
        # print('-------------------------------')
    for (i, line) in enumerate(lines):
        # print(i, line)
        if line.lower().endswith('references'):
            line += '.'
        words = line.split(' ')
        if len(words) == 0:
            break_paragraph()
            continue
        # append line to paragraph
        current_words = current_paragraph.split()
        if len(current_words) > 0 and re.match('^[\(\w-]+-$', current_words[-1]):
            current_paragraph = current_paragraph[:-1] + line
        elif len(current_paragraph) > 0:
            current_paragraph += ' ' + line
        else:
            current_paragraph = line
        # try to break paragraph
        if len(current_paragraph) > 0:
            current_words = current_paragraph.split()
            # if len(line.split()) <= 3:
                # break_paragraph()
            # current paragraph ends with hypen, should continue
            if len(current_words) > 0 and re.match('^[\w-]+-$', current_words[-1]):
                continue
            # next line start with lowercase
            if i + 1 < len(lines) and len(lines[i + 1]) > 0 and lines[i + 1][0].islower():
                continue
            # current line is shorter than column width
            if len(line) < column_width or (current_paragraph[-1] in ['.', '?', '!'] and (i+1 >= len(lines) or lines[i+1][0].isupper() or lines[i+1][0].isnumeric())):
                break_paragraph()
    break_paragraph()
    return paragraphs

def extract_mentions_from_pdf(filepath):
    filename = os.path.basename(filepath)
    tmp_filename = '.cache/' + filename  + '.txt'
    if not os.path.exists('.cache'):
        os.mkdir('.cache')
    ret = subprocess.call(['pdftotext', '-raw', filepath, tmp_filename])
    if ret != 0:
        raise Exception('pdftotext failed')
    paragraphs = generate_paragraphs([line.strip() for line in open(tmp_filename, errors='ignore') if len(line.strip()) > 0])
    texts = ' '.join(paragraphs)
    with open('.cache/' + filename + '-paragraphs.txt', 'w') as f:
        f.write('\n'.join(paragraphs))
    with open('.cache/' + filename + '-texts.txt', 'w') as f:
        f.write(texts)

    references = {}
    mentioned_paragraphs = {}

    YEAR_REGEX = r'(?P<year>(19|20)\d{2}[a-z]?)'
    AUTHORS_REGEX = r'(?P<authors>([^.]|[ -][A-Z][A-Za-z]?\.)*[a-z])\.'
    TITLE_REGEX = r'(?P<title>[^.\?]+[\.\?])'
    if 'references' not in texts.lower():
        return None, None, None
    reference_text = texts[texts.lower().index('references')+len('reference.'):]
    # ACM Style
    reference_candidates = {}
    _references = {}
    for it in re.finditer('\[(?P<key>\d+)\]%s %s' % (AUTHORS_REGEX, TITLE_REGEX), reference_text):
        _references[it.group('key')] = it.group('title')
        _logger.debug('[ACM-A] find: %s %s %s' % (it.group('key'), it.group('title'), it.group('authors')))
    reference_candidates['ACM-A'] = _references
    _references = {}
    for it in re.finditer('\[(?P<key>\d+)\](?P<authors>([^.]|[ -][A-Z][A-Za-z]?\.)*[a-z])\. (?P<year>(19|20)\d{2})\. (?P<title>[^.]+[\.\?])', reference_text):
        references[it.group('key')] = it.group('title')
        _logger.debug('[ACM-B] find: %s %s %s %s' % (it.group('key'), it.group('title'), it.group('authors'), it.group('year')))
    reference_candidates['ACM-B'] = _references
    # ACL Style
    raw_references_a = []
    for it in re.finditer('(%s %s ((In Proceeding|arXiv|http|In Advances|In Machine|In).*?|[^.]+) %s\.)' % (AUTHORS_REGEX, TITLE_REGEX, YEAR_REGEX), reference_text):
        raw_references_a.append(it)
        _logger.debug('[EMNLP-A] find: %s %s %s' % (it.group('title'), it.group('authors'), it.group('year')))
    raw_references_b = []
    for it in re.finditer('(%s %s\. %s)' % (AUTHORS_REGEX, YEAR_REGEX, TITLE_REGEX), reference_text):
        raw_references_b.append(it)
        _logger.debug('[EMNLP-B] find: %s %s %s' % (it.group('title'), it.group('authors'), it.group('year')))
    def process_acl_references(__raw_references):
        _references = {}
        for it in __raw_references:
            authors, year, title = it.group('authors'), it.group('year'), it.group('title')
            authors = [author.strip() for txt in authors.split(' and ') for author in txt.split(',') if len(author.strip()) > 0]
            lastnames = [author.replace(' et al', '_et_al').replace('-', ' ').split(' ')[-1].replace('_et_al', ' et al') for author in authors]
            if len(lastnames) == 1:
                authorname = lastnames[-1]
            elif len(lastnames) == 2:
                authorname = '%s and %s' % (lastnames[0].split(' ')[-1], lastnames[1].split(' ')[-1])
            else:
                authorname = '%s et al' % lastnames[0].split(' ')[-1]
            key = '%s %s' % (authorname, year)
            _references[key] = title
        return _references
    reference_candidates['ACL-A'] = process_acl_references(raw_references_a)
    reference_candidates['ACL-B'] = process_acl_references(raw_references_b)
    references, format_name = None, None
    for key, references_candidate in reference_candidates.items():
        if references is None or len(references) < len(references_candidate):
            references = references_candidate
            format_name = key
    _logger.info('Use %s format.' % format_name)

    body_paragraphs = []
    for para in paragraphs:
        if para.lower().find('references.') >= 0:
            break
        body_paragraphs.append(para)

    # ACM Style
    if format_name.startswith('ACM'):
        for i, para in enumerate(body_paragraphs):
            for item in re.findall(r'\[(((\d+),?\s*)+)\]', para):
                mentions = [v.strip() for v in item[0].split(',')]
                current_strong_comentions = set()
                for key in mentions:
                    if key in references:
                        mentioned_paragraphs[key] = i
                    else:
                        _logger.warning('Failed to find %s' % key)

    # ACL Style
    if format_name.startswith('ACL'):
        for i, para in enumerate(body_paragraphs):
            last_end = 0
            current_strong_comentions, current_weak_comentions = set(), set()
            for it in re.finditer(r'([A-Z][A-Za-z]*( et al\.| and [A-Z][A-Za-z]*)?,? ((\(\d{4}\w?\)|(\d{4}\w?))(, )?)+)', para):
                clue = re.sub(r'[^\w ]', '', it.group(0))
                authorname = re.sub(r'\d{4}\w?', '', clue).strip()
                local_strong_comentions = set()
                for year in re.findall(r'\d{4}\w?', clue):
                    key = '%s %s' % (authorname, year)
                    if key in references:
                        mentioned_paragraphs[key] = i
                    else:
                        _logger.warning('Failed to find %s' % key)

    return references, body_paragraphs, mentioned_paragraphs


