#!/usr/bin/env node

/**
 * Tag on github.
 */

"use strict";

var pkgPath = require.resolve('../../../package.json'); // Your project package.json path.

var fs = require('fs'),
    util = require('util'),
    async = require('async'),
    childProcess = require('child_process');

/**
 * Spawn a process and pip stdout/stderr
 * @param {string} command - Command to spawn.
 * @param {string[]} args - Command arguments.
 * @param {function} callback - Callback when done.
 * @returns {*} - Spawned process.
 * @private
 */
function _spawn(command, args, callback) {
    var spwaned = childProcess.spawn(command, args, {});
    spwaned.stdout.pipe(process.stdout);
    spwaned.stderr.pipe(process.stderr);
    spwaned.on('close', function (exitCode) {
        var success = exitCode === 0,
            err = success ? null : new Error(['Spawn', command, 'failed.'].join(' '));
        callback(err);
    });
    return spwaned;
}


/**
 * Read and parse json file.
 * @param {string} filename - Filename to read.
 * @param {function} callback - Callback when done.
 * @private
 */
function _readJsonFile(filename, callback) {
    async.waterfall([
        function (callback) {
            fs.readFile(filename, callback);
        },
        function (buffer, callback) {
            var data = JSON.parse(buffer.toString());
            callback(null, data);
        }
    ], callback);
}

/**
 * Tag name of a package json.
 * @param {string} packageJsonPath - File path of package.json
 * @param {function} callback - Callback when done.
 * @private
 */
function _tagNameForPackage(packageJsonPath, callback) {
    async.waterfall([
        function (callback) {
            _readJsonFile(packageJsonPath, callback);
        },
        function (data, callback) {
            var tagName = 'v' + data.version;
            callback(null, tagName);
        }
    ], callback);
}

/**
 * Check if tag alreay exists.
 * @param {string} tagName - Tag name to work with.
 * @param {function} callback - Callback when done.
 * @private
 */
function _tagExists(tagName, callback) {
    var command = util.format('git tag -l %s', tagName);
    childProcess.exec(command, function (err, stdOut, stdErr) {
        callback(err || stdErr || null, !!stdOut);
    });
}

/**
 * Add git tag.
 * @param {string} tagName - Tag name to add.
 * @param {function} callback - Callback when done.
 * @private
 */
function _addTag(tagName, callback) {
    _spawn('git', ['tag', tagName], callback);
}

/**
 * Push tag to remote server.
 * @param {function} callback - Callback when done.
 * @private
 */
function _pushTags(callback) {
    _spawn('git', ['push', '--tags'], callback);
}

async.waterfall([
    function (callback) {
        _tagNameForPackage(pkgPath, callback);
    },
    function (tagName, callback) {
        async.waterfall([
            function (callback) {
                _tagExists(tagName, callback);
            },
            function (exists, callback) {
                var err = exists ? new Error('Tag already exists.') : null;
                callback(err);
            },
            function (callback) {
                _addTag(tagName, callback);
            },
            function (callback) {
                _pushTags(callback);
            }
        ], callback);
    }
], function (err) {
    if (err) {
        console.error(err);
    } else {
        console.log('Tag on git done!');
    }
});
