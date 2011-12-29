#!/usr/bin/env python
import re
import sys
import os
import glob
import base64
import urlparse
import math
import difflib

from xml.etree import ElementTree


PUBSUF_PATH = "pubsuf.dat"
RULES = set()

BLANK_LINE = re.compile(r"\s")
COMMENT_LINE = re.compile(r"//")


def generate_rules():
    global RULES
    for line in open(PUBSUF_PATH, 'r'):
        rule = get_rule(line)
        if rule is not None:
            RULES.add(rule)


def get_rule(line):
    if BLANK_LINE.match(line) or COMMENT_LINE.match(line):
        return None
    return line.split()[0]


def extract_hld(hostname):
    labels = hostname.split(".")
    for i in range(1, len(labels)):
        suffix = ".".join(labels[i:])
        wildcard_suffix = "*." + ".".join(labels[i+1:])
        if suffix in RULES or wildcard_suffix in RULES:
            return ".".join(labels[i-1:])
    return None


def url_dict(folder):
    target = {}
    for filename in glob.glob(os.path.join(folder, '*')):
        name = base64.urlsafe_b64decode(
                os.path.relpath(filename, folder)).strip()
        target[name] = []
        for url in open(filename, 'r').read().splitlines():
            target[name].append(url)
    return target #%05.2f


# http://docs.python.org/library/xml.etree.elementtree.html#elementtree-objects
def test_db(db, folder):
    candidates = url_dict(folder)
    tree = ElementTree.parse(db)
    entries = tree.find("entries")
    for entry in entries.iter("entry"):
        target = entry.findtext("target").replace('&amp;', '&')
        target_url = entry.findtext("url")
        score = match(target_url, candidates[target])
        print "%05.2f - %s - %s (%s)" % (score, target, target_url,
                                         entry.findtext("phish_id"))


def match(target, candidates):
    """
    Compute a real value telling how well the domain matches with the
    results.
    """
    # Target properties.
    target_domain = urlparse.urlparse(target).netloc
    target_hld = extract_hld(target_domain)
    if target_hld is None:
        target_hld = target_domain
    # Score algorithm parameters.
    rank_decay = 2
    label_penalty = 0#1.5
    max_score = 100
    # And here we go...
    aggregate = 0
    for rank, url in enumerate(candidates):
        candidate_domain = urlparse.urlparse(url).netloc
        if candidate_domain.endswith(target_hld):
            score = ((max_score - 1) * (1 - 1.0 / rank_decay)
                     * math.pow(rank_decay, -rank))
            #print "base component", score
            # Deduct points for non-matching labels.
            score -= label_penalty * nb_diff_labels(
                    target_domain, candidate_domain)
            #print "after deduction", score
            if score > 0:
                aggregate += score
    # Project the aggregate score on a logarithmic scale.
    return (max_score / math.log(max_score)) * math.log1p(aggregate)


def nb_diff_labels(a, b):
    matcher = difflib.SequenceMatcher(None, a, b)
    matches = matcher.get_matching_blocks()
    # We just assume both domain share the same suffix.
    length = matches[-2].size
    a_pfx = a[:-length]
    b_pfx = b[:-length] 
    a_labels = [x for x in a_pfx.split(".") if x not in ('', 'www')]
    b_labels = [x for x in b_pfx.split(".") if x not in ('', 'www')]
    return len(a_labels) + len(b_labels)


#CANDIDATES1 = [
    #"http://lucas.maystre.ch/blog",
    #"http://www.maystre.ch",
    #"http://bla.bla.bla.lucas.maystre.ch"
#]
#TARGET1 = "http://lucas.maystre.ch/a/b/c.php"
def main():
    generate_rules()
    test_db(sys.argv[1], sys.argv[2])
    #print match(TARGET1, CANDIDATES1)
    #print extract_hld("foo.bar.com")
    #print extract_hld("foo.bar.co.uk")
    #print extract_hld("foo.bar.com.br")
    #print extract_hld("foo.pvt.k12.ma.us")


if __name__ == '__main__':
    main()
