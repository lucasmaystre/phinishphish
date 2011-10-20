#!/bin/sh
# Author: Lucas Maystre <lucas@maystre.ch>
# Date: 2010-12-02
scp $* root@ka.lum.li:/var/www/dl/files
while [ "$*" != "" ]
do
  perl -e '$_ = shift; $_ =~ m/pprotection(\d+).xpi/; print "http://ka.lum.li/dl/?id=$1\n"' "$1"
  shift
done
