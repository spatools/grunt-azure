var fs = require("fs");
var path = require("path");

function createDirectory(dirPath, mode, callback, position) {
    mode = mode || 0777;
    position = position || 0;
    var parts = path.normalize(dirPath).split(path.delimiter);

    if (position >= parts.length) {
        if (callback) {
            return callback();
        } else {
            return true;
        }
    }

    var directory = parts.slice(0, position + 1).join('/');
    fs.stat(directory, function (err) {
        if (err === null) {
            createDirectory(dirPath, mode, callback, position + 1);
        } else {
            fs.mkdir(directory, mode, function (err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    } else {
                        throw err;
                    }
                } else {
                    createDirectory(dirPath, mode, callback, position + 1);
                }
            })
        }
    })
}
exports.createDirectory = createDirectory;

function createDirectorySync(dirPath, mode) {
    mode = mode || 0777;

    var parts = path.normalize(dirPath).replace(/\\/g, "/").split('/'),
        position = 1,
        directory = parts.slice(0, position).join('/');

    while (position++ <= parts.length) {
        if (!fs.existsSync(directory))
            fs.mkdirSync(directory, mode);

        directory = parts.slice(0, position).join('/');
    }
}
exports.createDirectorySync = createDirectorySync;