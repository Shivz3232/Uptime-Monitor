/*
 *  Unit tests
 *
 */

// Dependencies
const helpers = require('../lib/helpers');
const assert = require('assert');
const logs = require('../lib/logs');
const troubleMaker = require('../lib/troubleMaker');

// Holder for tests
const unit = {};

// Assert that the getANumber function is returning a number
unit['helper.getANumber should return number'] = function(done) {
    const val = helpers.getANumber();
    assert.strictEqual(typeof (val), 'number');
    done();
};

// Assert that the getANumber function is returning a 1
unit['helper.getANumber should return 1'] = function(done) {
    const val = helpers.getANumber();
    assert.strictEqual(val, 1);
    done();
};

// Assert that the getANumber function is returning a 2
unit['helper.getANumber should return 2'] = function(done) {
    const val = helpers.getANumber();
    assert.strictEqual(val, 2);
    done();
};

// Logs.list should callback an array and a false error
unit['logs.list should callback a false error and an array of log names'] = function(done) {
    logs.list(true, function(err, logFileNames) {
        assert.strictEqual(err, false);
        assert.ok(logFileNames instanceof Array);
        assert.ok(logFileNames.length > 1);
        done();
    });
}

// Logs truncate should not throw if the log id doesn't exist
unit['logs.truncate should not throw if the logId doesn\'t exist. It should callback an error instead'] = function(done) {
    assert.doesNotThrow(function() {
        logs.truncate('I do not exist', function(err) {
            assert.ok(err);
        });
        done();
    }, TypeError);
}

// trouble maker should not throw but it does
unit['troubleMaker.init should not throw when called'] = function(done) {
    assert.doesNotThrow(function() {
        troubleMaker.init();
        done();
    }, TypeError);
}

// Export the tests to the runner
module.exports = unit;