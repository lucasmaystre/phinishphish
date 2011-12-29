#!/usr/bin/env python
import sys
from xml.etree import ElementTree

# http://docs.python.org/library/xml.etree.elementtree.html#elementtree-objects
def parse(db):
    count = {}
    tree = ElementTree.parse(db)
    entries = tree.find("entries")
    for entry in entries.iter("entry"):
        target = entry.findtext("target").replace('&amp;', '&')
        count[target] = count.get(target, 0) + 1
    for target, nb in count.iteritems():
        print target
    #print len(count)
    #print sum(count.values())
    #print count['Other']

if __name__ == '__main__':
    if len(sys.argv) > 1:
        parse(sys.argv[1])
    else:
        print "Path to PhishTank database missing."
