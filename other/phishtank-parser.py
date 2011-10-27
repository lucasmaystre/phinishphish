#!/usr/bin/env python
from xml.etree import ElementTree

# http://docs.python.org/library/xml.etree.elementtree.html#elementtree-objects
def main():
    count = {}
    tree = ElementTree.parse("verified_online.xml")
    entries = tree.find("entries")
    for entry in entries.iter("entry"):
        target = entry.findtext("target")
        count[target] = count.get(target, 0) + 1
    print len(count)

if __name__ == '__main__':
    main()
