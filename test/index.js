/*
 *  Test runner
 * 
 */

//  Override the NODE_ENV variable
process.env.NODE_ENV = 'testing';

// Application logic for the test runner
_app = {}

// Container for the test
_app.tests = {};

_app.tests.unit = require('./unit');
_app.tests.api = require('./api');

// To count all the test
_app.countTests = function() {
    let counter = 0;
    for (let key in _app.tests) {
        if (_app.tests.hasOwnProperty(key)) {
            let subTests = _app.tests[key];
            for (let testName in subTests) {
                if (subTests.hasOwnProperty(testName)) {
                    counter++;
                }
            }
        }
    }
    return counter;
}

// Rull all the tests, collecting the errors and successes
_app.runTests = function() {
    let errors = [];
    let successes = 0;
    const limit = _app.countTests();
    let counter = 0;
    for (let key in _app.tests) {
        if(_app.tests.hasOwnProperty(key)) {
            let subTests = _app.tests[key];
            for (let testName in subTests) {
                if (subTests.hasOwnProperty(testName)) {
                    (function() {
                        let tempTestName = testName;
                        let testValue = subTests[testName];

                        // Call the test
                        try {
                            testValue(function() {
                                // It if calls back without throwing, then it succeeded, so log it in green
                                console.log('\x1b[32m%s\x1b[0m', tempTestName);
                                counter++;
                                successes++;
                                if (counter == limit) {
                                    _app.produceTestReport(limit, successes, errors);
                                }
                            });
                        } catch (e) {
                            // If it throws, then it failed, so capture the error throuwn and log it
                            errors.push({
                                'name': testName,
                                'error': e
                            });
                            console.log('\x1b[31m%s\x1b[0m', tempTestName);
                            counter++;
                            if (counter == limit) {
                                _app.produceTestReport(limit, successes, errors);
                            }
                        }
                    })();
                }
            }
        }
    }
}

// Produce a test outcome report
_app.produceTestReport = function(limit, successes, errors) {
    console.log("");
    console.log("------------------------BEGIN TEST REPORT-----------------------------");
    console.log("");
    console.log("Total Tests: ", limit);
    console.log("Pass: ", successes);
    console.log("Fail: ", errors.length);
    console.log("");

    // If there are errors, print them in detail
    if (errors.length > 0) {
        console.log("------------------------BEGIN ERROR DETAILS-------------------------------");    
        console.log("");

        errors.forEach(function(testError) {
            console.log('\x1b[31m%s\x1b[0m', testError.name);
            console.log(testError.error);
            console.log("");
        });

        console.log("");
        console.log("------------------------END ERROR DETAILS-------------------------------");
    }

    console.log("");
    console.log("------------------------END TEST REPORT-------------------------------");
    process.exit(0);
}

// Run the tests
_app.runTests();