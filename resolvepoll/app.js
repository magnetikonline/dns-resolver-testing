'use strict'

let dns = require('dns'),
	fs = require('fs'),

	LOG_FILE = 'app.log',
	QUERY_DELAY = 1000,
	QUERY_HOSTNAME = 'record-5.domain.test';


{
	// get realpath to log file, current millisecond time
	let logFilePath = `${__dirname}/${LOG_FILE}`,
		lastMilliTime = 0;

	function writeLogLine(message) {

		function padZeroes(value,length) {

			value = '' + value; // cast to string
			while (value.length < length) value = '0' + value;
			return value;
		}

		// build log message
		let nowDate = new Date(),
			datePartList = [
				nowDate.getFullYear(),'-',
				padZeroes(nowDate.getMonth() + 1,2),'-',
				padZeroes(nowDate.getDate(),2),' ',
				padZeroes(nowDate.getHours(),2),':',
				padZeroes(nowDate.getMinutes(),2),':',
				padZeroes(nowDate.getSeconds(),2),'.',
				padZeroes(nowDate.getMilliseconds(),4)
			],
			logLine = `${datePartList.join('')} - ${message}`;

		// append message to file
		fs.appendFile(logFilePath,logLine + '\n',(err) => {

			// emit message to console
			console.log(logLine);
		});
	}

	function getMilliTimeTaken() {

		// get current milliseconds - work out difference to previous
		let nowMillTime = Date.now(),
			timeTaken = nowMillTime - lastMilliTime;

		// save now milliseconds, return difference
		lastMilliTime = nowMillTime;
		return timeTaken;
	}

	function queueQuery() {

		setTimeout(
			() => {

				// start the clock
				getMilliTimeTaken();

				// do DNS lookup
				dns.lookup(
					QUERY_HOSTNAME,
					{
						all: true, // return all resolved addresses
						family: 4 // only care for IPv4
					},
					(err,addressList) => {

						if (err) {
							// unable to resolve
							writeLogLine(`Unable to resolve [${QUERY_HOSTNAME}] - time taken [${getMilliTimeTaken()}ms]`);

						} else {
							// resolved successfully, log details
							let IPList = addressList.map((item) => item.address).join(',');

							writeLogLine(
								`Resolved [${QUERY_HOSTNAME}] with answer [${IPList}] ` +
								`- time taken [${getMilliTimeTaken()}ms]`
							);
						}

						// queue up next query
						queueQuery();
					}
				);
			},
			QUERY_DELAY
		);
	}

	// report server(s) used for resolution
	writeLogLine(`Starting - DNS servers are [${dns.getServers().join(',')}]`);

	// kick off query process
	queueQuery();
}
