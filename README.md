# DNS resolver testing
Configuration and scripts for testing DNS resolvers and their behaviours.

- [Overview](#overview)
- [DNS server config](#dns-server-config)
- [DNS resolve poller](#dns-resolve-poller)

## Overview
The test suite involves the following components:
- Two authoritative DNS servers running [BIND](https://www.isc.org/downloads/bind/) and serving a single mock DNS zone.
- Client OS instances (Linux / Windows) configured with their DNS resolvers set to the two authoritative servers. Meaning they can *only* resolve the defined mock zone.
- Node.js utility to continually poll for a record in the mock DNS zone using the operating system provided resolver.

## DNS server config
The [`bind-config.sh`](bind-config.sh) script will setup the following on a `Ubuntu 14.04LTS` host OS:
- Upgrade distro packages via `apt` (`apt-get`).
- Install `bind9` and `dnsutils` packages via `apt-get`.
- Configure BIND as a non-recursive nameserver with a single authoritative zone of `domain.test` with [the following zone file](bind-config/db.domain.test).
- BIND will log all client queries to `/var/log/named/queries.log`.
- Finally, restart BIND.

Script is used to stand up **two** BIND server instances to simulate primary/secondary name servers. All config files located under [`/bind-config`](bind-config).

## DNS resolve poller
Node.js utility [`resolvepoll/app.js`](resolvepoll/app.js) will continually poll for a single DNS record - logging results/timings to both console and file:
- Queries are performed via [`dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback).
- Results are logged to both console and file with 'fetch time taken' in milliseconds.
