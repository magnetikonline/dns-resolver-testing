#!/bin/bash -e

DIRNAME=$(dirname "$0")
FILE_BASE_DIR="$DIRNAME/bind-config"
QUERY_LOG_DIR="/var/log/named"
BIND_USER="bind"


# running as root?
if [[ $EUID -ne 0 ]]; then
	echo "Error: Must run as root" >&2
	exit 1
fi

# apt update, install bind
apt --yes update
apt --yes upgrade
apt --yes install bind9 dnsutils
apt-get clean

# setup bind log directory
mkdir --parents "$QUERY_LOG_DIR"
rm --force "$QUERY_LOG_DIR"/*
chown $BIND_USER:$BIND_USER "$QUERY_LOG_DIR"

# copy bind config files into place
cp "$FILE_BASE_DIR/named.conf" /etc/bind/named.conf
cp "$FILE_BASE_DIR/db.domain.test" /etc/bind/db.domain.test

# restart bind
/etc/init.d/bind9 stop
/etc/init.d/bind9 start
