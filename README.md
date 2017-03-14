# DNS resolver testing
Configuration and scripts for testing DNS resolvers and their behaviors during periods of network or DNS server instability.

Includes a series of results for simulated scenarios against Linux and Windows operating systems.

- [Summary](#summary)
- [Test suite](#test-suite)
	- [DNS server config](#dns-server-config)
	- [Resolve poller](#resolve-poller)
- [Test scenarios](#test-scenarios)
- [Results](#results)
	- [Linux](#linux)
	- [Windows](#windows)

## Summary
The TL;DR and takeaways from the tests:
- Linux distributions (more specifically those implementing `resolv`) **will not** cache DNS query results - ever.
- A Windows resolver **will cache** a query result for the duration of the record time to live (TTL). In addition algorithms are implemented to help avoid continual re-querying of known unavailable DNS servers.
- Where a resolver is required to query secondary DNS server(s) due to system/network outage a delayed result penalty will be incurred by the caller:
	- For Linux systems with `resolv` the delay is approximately `5000ms` per DNS server hop.
	- Windows will attempt the next server hop after approximately `30ms`.
- Linux systems (where no caching is offered) an introduced delay five seconds or greater **per query** may prove fatal for applications executing repeated lookups. Solutions for mitigation might include:
	- Replace `resolv` with a caching resolver such as [Dnsmasq](http://www.thekelleys.org.uk/dnsmasq/doc.html), [Unbound](https://www.unbound.net/) or [nscd](https://linux.die.net/man/8/nscd).
	- Implement a DNS caching layer internally to applications.
	- Modification to the [`resolv.conf`](https://linux.die.net/man/5/resolv.conf) `options` set, notably `timeout`, `attempts` and `rotate`.

## Test suite
Consisting of the following components:
- Two authoritative DNS servers running [BIND](https://www.isc.org/downloads/bind/) and serving a single mock DNS zone.
- Client operating system instances with DNS resolvers set to the two nameservers, thus *only* able to resolve the defined mock zone.
- Node.js utility to continually poll a DNS record in the mock zone via each operating system's resolver.

### DNS server config
The [`bind-config.sh`](bind-config.sh) script will setup the following on a `Ubuntu 14.04LTS` host:
- Upgrade distro packages via `apt`.
- Install `bind9` and `dnsutils` packages via `apt`.
- Configure BIND as a non-recursive nameserver with a single authoritative zone of [`domain.test`](bind-config/db.domain.test).
- BIND logging all client queries to `/var/log/named/queries.log`.
- Finally, restart BIND.

BIND related configuration for setup located under [`/bind-config`](bind-config).

### Resolve poller
Node.js utility [`resolvepoll/app.js`](resolvepoll/app.js) continually polls for a single record within the mock DNS zone:
- Queries performed via [`dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback).
- Results are logged to both console and file with 'fetch time taken' in milliseconds.

## Test scenarios
Simulations played out for both Linux and Windows operating systems:
- All DNS servers `active` and answering zone requests.
- Primary `down`.
- Primary `offline`.
- Primary `down`, secondary `offline`.
- All `down`.
- All `offline`.

Where server states are defined as:
- Active network connection - but no DNS service listening is classed as `down`.
- Disconnected from network or powered down is `offline`.

States simulated using `iptables` to `REJECT` (`down`) and `DROP` (`offline`) packets, which allows for the logging of incoming packets.

In each case _no modifications_ have been made to base operating system or DNS resolver sub-systems.

## Results

### Linux
**Operating system:** Ubuntu 14.04LTS

#### All `active`
- Resolver queries first DNS server and receives a **successful** timely response, secondary server never queried.
- Each query sends UDP request packets to the **first** server.

#### Primary `down`
- Resolver queries first DNS server and receives a timely **rejection**.
- Resolver then queries secondary server and receives a **successful** timely response.
- Each query sends UDP request packets to **both** servers.

#### Primary `offline`
- Resolver queries first DNS server.
- Resolver waits approximately `5000ms` before returning with server **failure**.
- Resolver then queries secondary server and receives a **successful** timely response.
- Each query sends UDP request packets to **both** servers.

#### Primary `down`, secondary `offline`
- Resolver queries first DNS server and receives a timely **rejection**.
- Resolver then queries secondary DNS server, attempting sends of multiple UDP request packets.
- After approximately `20000ms` returns with server **failure**.
- Completes with **unable to resolve hostname** result.
- Each query sends UDP request packets to **both** servers.

#### All `down`
- First iteration:
	- Resolver queries first DNS server and receives a timely **rejection**.
	- Resolver then queries secondary DNS server, again receives timely **rejection**.
	- Completes with **unable to resolve hostname** result.
- Second iteration:
	- Resolver re-queries both DNS servers, attempting send of multiple UDP request packets.
	- After approximately `5000ms` returns with server **failure**.
	- Completes with **unable to resolve hostname** result.
- Further queries will alternate "first iteration" and "second iteration" phases.
- Each query sends UDP request packets to **both** servers.

#### All `offline`
- Resolver queries first DNS server, returns with server **failure**.
- Resolver then queries secondary DNS server, again returning with server **failure**.
- Multiple UDP request packet attempts are then made to both servers.
- After approximately `40000ms` completes with **unable to resolve hostname** result.
- Each query sends UDP request packets to **both** servers.

### Windows
**Operating system:** Windows 2012 R2

#### All `active`
- Resolver queries first DNS server and receives a **successful** timely response, secondary server never queried.
- Query result **cached** by resolver for duration of the record time to live.
- Repeated queries within this duration **will not incur** additional UDP request packets.

#### Primary `down`
- Resolver queries first DNS server and receives a timely **rejection**.
- Resolver then queries secondary server and receives a **successful** timely response.
- Query result **cached** by resolver for duration of the record time to live.
- Repeated queries within this duration **will not incur** additional UDP request packets.

#### Primary `offline`
- Resolver queries first DNS server.
- Resolver waits approximately `30ms` before returning with server **failure**.
- Resolver then queries secondary server and receives a **successful** timely response.
- Query result **cached** by resolver for duration of the record time to live.
- Repeated queries within this duration **will not incur** additional UDP request packets.

#### Primary `down`, secondary `offline`
- Resolver queries first DNS server and receives a timely **rejection**.
- Resolver then queries secondary DNS server and returns instantly with server **failure**.
- Completes with **unable to resolve hostname** result.
- Query error result **cached** for a small time window.
- Repeated queries **incur additional** attempts made to **both** servers at intervals of approximately two UDP packets every five seconds.

#### All `down`
- First iteration:
	- Resolver queries first DNS server and receives a timely **rejection**.
	- Resolver then queries secondary DNS server, again receives timely **rejection**.
	- Completes with **unable to resolve hostname** result.
- Second iteration:
	- Resolver re-queries both DNS servers, attempting send of multiple UDP request packets.
	- After approximately `4000ms` completes with **unable to resolve hostname** result.
- Next few queries will alternate "first iteration" and "second iteration" phases.
- Resolver will then adjust total timeout period to `2000ms`, while occasionally attempting longer timeouts of `6000ms`.
- The resolver **will not** cache any query results.

#### All `offline`
- Request iteration:
	- Resolver queries first DNS server, returns with server **failure**.
	- Resolver then queries secondary DNS server, again returning with server **failure**.
	- Multiple UDP request packet attempts are then made to both servers.
	- After approximately `11000ms` completes with **unable to resolve hostname** result.
- Two "request iteration" phases are executed, after which queries will instantly return a cached **unable to resolve hostname** result.
- Resolver will continue to attempt queries in the background to make connection to a DNS server.
