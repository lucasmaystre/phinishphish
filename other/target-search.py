#!/usr/bin/env python
import sys
import os
import time
import base64
import urllib
import urllib2

from xml.etree import ElementTree


SAVE_DIR = 'results'
URL_FORMAT = 'http://ku.lum.li/domains/%s'


def search(target):
    query = urllib.quote(target)
    response = urllib2.urlopen(URL_FORMAT % query).read()
    return ElementTree.XML(response)


def extract_links(xml):
    links = []
    entries = xml.find("entries")
    for result in xml.iter("result"):
        link = result.findtext("link")
        links.append(link)
    return links


def main():
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)
    targets = []
    for target in sys.stdin.read().splitlines():
        if target not in targets:
            xml = search(target)
            links = extract_links(xml)
            filename = os.path.join(SAVE_DIR, base64.urlsafe_b64encode(target))
            open(filename, 'w').write("\n".join(links))
            targets.append(target)
            time.sleep(1)


if __name__ == '__main__':
    main()
