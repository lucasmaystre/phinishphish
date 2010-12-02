#!/bin/sh
# Author: Lucas Maystre <lucas@maystre.ch>
# Date: 2010-12-01
#
# Packages the Phinishing Phishing Firefox extension.

PREFIX=pprotection
CID=$1
NAME=$PREFIX$CID
test -e $NAME.xpi && rm $NAME.xpi
EXPR="s!/\*BEGIN_CID\*/.*/\*END_CID\*/!/\*BEGIN_CID\*/"$1"/\*END_CID\*/!"
perl -p -i -e "$EXPR" modules/globals.js
zip -r $NAME.xpi * -x \*.git \*.DS_Store \*.swp $PREFIX\*.xpi make.sh
