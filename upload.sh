#!/bin/sh
# Author: Lucas Maystre <lucas@maystre.ch>
# Date: 2010-12-02
scp $1 root@ka.lum.li:/var/www/dl/files
perl -e '$_ = shift; $_ =~ m/pprotection(\d+).xpi/; print "http://ka.lum.li/dl/?id=$1\n"' $1
