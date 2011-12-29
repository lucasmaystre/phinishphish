#!/usr/bin/env python
import base64
import os
import sys
import glob
import urlparse

from xml.etree import ElementTree


def domain_dict(folder):
    target = {}
    for filename in glob.glob(os.path.join(folder, '*')):
        name = base64.urlsafe_b64decode(
                os.path.relpath(filename, folder)).strip()
        target[name] = []
        for url in open(filename, 'r').read().splitlines():
            target[name].append(get_domain(url))
    return target


def get_domain(url):
    return '.'.join(urlparse.urlparse(url).netloc.split('.')[-2:])


# http://docs.python.org/library/xml.etree.elementtree.html#elementtree-objects
def main(db, folder):
    allowed_domains = domain_dict(folder)
    tree = ElementTree.parse(db)
    entries = tree.find("entries")
    for entry in entries.iter("entry"):
        target = entry.findtext("target").replace('&amp;', '&')
        domain = get_domain(entry.findtext("url"))
        if domain in allowed_domains[target]:
            print '%s: %s - %s' % (entry.findtext("phish_id"),
                    target, entry.findtext("url"))


if __name__ == '__main__':
    if len(sys.argv) > 2:
        main(sys.argv[1], sys.argv[2])
    else:
        print "Path to PhishTank database or search result folder missing."
