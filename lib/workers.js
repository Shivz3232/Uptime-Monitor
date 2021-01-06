/*
 * Worker related tasks
 */

// Dependencies
const https = require('https');
const http = require('http');
const _data = require('./data');
const helpers = require('./helpers')
const url = require('url')
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');

// Instantioate the worker object
const workers = {};

// Lookup all the checks, get their data, send to a validator
workers.gatherAllChecks = function() {
    // Get all the checks
    _data.list('checks', function(err, checks) {
        if (!err && checks && checks.length > 0) {
            checks.forEach(function(check) {
                // Read in the check data
                _data.read('checks', check, function(err, originalCheckData) {
                    if (!err && originalCheckData) {
                        // Pass it to the check validator, and let that function continue or log errors
                        workers.validateCheckData(originalCheckData);
                    }else {
                        debug("Error: could not read one of the check's data");
                    }
                })
            })
        }else {
            debug("Error: Could not find any checks to process");
        }
    })
}

// Timer to execute worker-process once every minute
workers.loop = function(){
    setInterval(function() {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

// Sanity-check the check-data
workers.validateCheckData= function(originalCheckData) {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol.trim() : false;
    originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method.trim() : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not have been set (if the workers have never seen this check before)
    originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state.trim() : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all the checks pass, pass the data along to the next step in the process
    if (originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) {
            workers.performCheck(originalCheckData);
        }else {
            debug('Error: One of the checks is not formatted properly. Skipping it.');
        }
}

// Perform the check, send the originalCheckData and send the outcome to the next process
workers.performCheck = function(originalCheckData) {
    // Prepare the initial check outcome
    const checkOutcome = {
        'error': false,
        'responseCode': false
    };

    // Mark that the outcome had not been sent yet
    var outcomeSent = false;

    // Parse the host name and the path out of the original check data
    const parsedURL = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    const hostName = parsedURL.hostname;
    const path = parsedURL.path; // Using path and not path name because we want the query string

    // Construct the request
    const requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname':hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object (using the http or https module)
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, function(res) {
        // Grab the status of the request sent
        const statusCode = res.statusCode;

        // Update the check outcome and pass the data along
        checkOutcome.responseCode = statusCode;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so that it doesn't get thrown
    req.on('error', function(e) {
        // Update the chekc outcome and pass it along
        checkOutcome.error = {
            'error': true,
            'value': e
        };

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('error', function (e) {
        // Update the chekc outcome and pass it along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.end();
};

// Process the check out come and update the chekc data as needed and trigger an alert if needed
// Special logic for accomadating a chekc that has never been tested before (don't alert about that one)
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
    // Decide if the check is considered up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Decide if an alert is warranted
    const alertWarrented = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome
    const timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarrented, timeOfCheck);

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.lastChecked = Date.now();
    newCheckData.state = state;

    // Save the chekc data
    _data.update('checks', newCheckData.id, newCheckData, function(err) {
        if (!err) {
            // Send the new check data to the next phase in the process if needed
            if (alertWarrented) {
                workers.alertUsersToStatusChange(newCheckData);
            }else {
                debug('Out come has not changed, no alert needed');
            }
        }else {
            debug("Error trying to save updates to one of the checks");
        }
    })
};

// Alert the user as to a change in their check status
workers.alertUsersToStatusChange = function(newCheckData) {
    const msg = 'Alert: your check for: ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;

    helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err) {
        if (!err) {
            debug('Success: User was alerted to a status change in their check, via sms: ' + msg);
        } else {
            debug("Could not send sms alert to user who had a state change in their check");
        }
    })
}

workers.log = function (originalCheckData, checkOutcome, state, alertWarrented, timeOfCheck) {
    // Form the log data
    const logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarrented,
        'time': timeOfCheck
    }

    // Convert date to a string
    const logString = JSON.stringify(logData);

    // Determine the name of the log file
    const logFile = originalCheckData.id;

    // Append the log string to the file
    _logs.append(logFile, logString, function (err) {
        if (!err) {
            debug("Logging to file succeeded");
        } else {
            debug(err);
        }
    });
};

workers.rotateLogs = function() {
    // List all the non-compressed log files
    _logs.list(false, function(err, logs) {
        if (!err && logs && logs.length > 0) {
            logs.forEach(function(logName) {
                // Compress the data to a diffrent file
                const logID = logName.replace('.log', '');
                const newFileID = logID + '-' + Date.now();
                _logs.compress(logID, newFileID, function(err) {
                    if (!err) {
                        // Trunctate the log
                        _logs.truncate(logID, function(err) {
                            if (!err) {
                                debug("Success truncating log file");
                            } else {
                                debug("Error truncating log file");
                            }
                        })
                    } else {
                        debug("Error compressing one of the log files", err);
                    }
                })
            })
        } else {
            debug("Error: could not find any logs to rotate")
        }
    })
}

// Timer to execute the log-rotation process once every day
workers.logRotationLoop = function() {
    setInterval(function () {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

// Init script
workers.init = function() {
    // Send to console in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();

    // Compress all the logs immediatelly
    workers.rotateLogs();

    // Call the compression loop so that logs will be compressed late on
    workers.logRotationLoop();

}

// Export the module
module.exports = workers;
