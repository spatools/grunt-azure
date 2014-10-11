/*
 * grunt-azure
 * https://github.com/spatools/grunt-azure
 * Copyright (c) 2014 SPA Tools
 * Code below is licensed under MIT License
 *
 * Permission is hereby granted, free of charge, to any person 
 * obtaining a copy of this software and associated documentation 
 * files (the "Software"), to deal in the Software without restriction, 
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be 
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR 
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION 
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

module.exports = function (grunt) {
    var _ = grunt.util._,
        fs = require("fs"),
        async = require("async"),
        mime = require("mime"),
        path = require("path"),

        filesystem = require("../lib/filesystem");
    
    //#region Private Methods

    function getFileMap(files) {
        var result = [],
            isDestAFile = false;
        
        files.forEach(function (file) {
            isDestAFile = !!path.extname(file.dest);
            file.src.forEach(function (src) {
                if (fs.lstatSync(src).isFile()) {
                    result.push({ src: src, dest: isDestAFile ? file.dest : path.join(file.dest, src).replace(/\\/g, "/") });
                }
            });
        });
        
        return result
    }
    
    function createContainer(service, params, callback) {
        service.createContainerIfNotExists(params.container, params.containerOptions, function (err, created) {
            if (created) {
                grunt.verbose.writeln("Container '" + params.container + "' created !");
            }
            
            callback(err, created);
        });
    }
    
    function deleteContainer(service, params, callback) {
        if (params.containerDelete) {
            service.deleteContainerIfExists(params.container, function (err, deleted) {
                if (deleted) {
                    grunt.verbose.writeln("Container '" + params.container + "' deleted !");
                }
                
                callback(err, deleted);
            });
        }
        else {
            callback();
        }
    }
    
    function ensureContainer(service, params, callback) {
        async.applyEachSeries([deleteContainer, createContainer], service, params, callback);
    }
    
    function uploadFiles(service, files, params, callback) {
        var container = params.container;
        
        async.eachSeries(
            files,
            function (file, callback) {
                var props = _.extend({}, params.blobProperties);
                props.contentType = props.contentTypeHeader = mime.lookup(file.src);
            
                service.createBlockBlobFromLocalFile(container, file.dest, file.src, props, function (err, result) {
                    if (!err) {
                        grunt.verbose.writeln(file.src + " uploaded to container: " + container + " at url: " + file.dest);
                    }
                
                    callback(err, result);
                });
            },
            function (err) {
                if (err) {
                    grunt.log.error()
                            .error("An error occured while uploading files to Windows Azure !")
                            .error(err);
                
                    callback(err);
                    return;
                }
            
                grunt.log.ok(files.length + " file(s) uploaded to Windows Azure !");
                callback();
            });
    }
    
    function downloadFiles(service, prefix, dest, params, callback) {
        var blobsLength;

        var sequence = async.seq(
            function (container, cb) { service.listBlobsSegmentedWithPrefix(container, prefix, null, cb); },
            function (blobs, response, cb) { cb(null, blobs.entries.map(function (blob) { return blob.name; })); },
            function (blobs, cb) { 
                blobsLength = blobs.length;

                async.eachSeries(
                    blobs,
                    function (blob, end) {
                        var local = path.join(dest, blob).replace(/\\/g, "/");
                        if (params.removePrefix) {
                            local = local.replace(prefix, "");
                        }
                
                        filesystem.createDirectorySync(path.dirname(local));

                        service.getBlobToLocalFile(params.container, blob, local, function (err) {
                            if (!err) {
                                grunt.verbose.writeln(blob + " downloaded from container: " + params.container + " to path: " + local);
                            }

                            end(err);
                        });
                    },
                    cb);
            });

        sequence(params.container, function (err) {
            if (err) {
                grunt.log.error()
                        .error("An error occured while downloading blobs from Windows Azure !")
                        .error(err);
                
                callback(err);
                return;
            }
            
            grunt.log.ok(blobsLength + " blob(s) downloaded from Windows Azure !");
            callback();
        });
    }
    
    //#endregion
    
    //#region Upload

    grunt.registerMultiTask('azure-blob-upload', "Azure Blob Upload - Allow to upload file to Windows Azure Storage Blobs", function () {
        var azure = require("azure"),

            done = this.async(),
            params = this.options({
                serviceOptions: [],
                container: null,
                containerOptions: {},
                containerDelete: false,
                blobProperties: {},
                retryFilter: "ExponentialRetryPolicyFilter"
            });
        
        if (!params.container) {
            grunt.log.error().error("Please provide at least a container parameter !");
            return done(false);
        }
        
        if (typeof params.serviceOptions === "string") {
            params.serviceOptions = [params.serviceOptions];
        }
        
        var files = getFileMap(this.files),
            service = azure.createBlobService.apply(azure, params.serviceOptions).withFilter(new azure[params.retryFilter]());
        
        async.series(
            [
                function (callback) { ensureContainer(service, params, callback); },
                function (callback) { uploadFiles(service, files, params, callback); }
            ], 
            function (err) {
                if (err) {
                    done(false);
                    return;
                }
            
                done();
            });
    });
    
    //#endregion
    
    //#region Download

    grunt.registerMultiTask('azure-blob-download', "Azure Blob Download - Allow to download file from Windows Azure Storage Blobs", function () {
        var azure = require("azure"),

            done = this.async(),
            params = this.options({
                serviceOptions: [],
                container: null,
                containerDelete: false,
                prefix: null,
                removePrefix: true,
                retryFilter: "ExponentialRetryPolicyFilter"
            });
        
        if (!params.container || !this.data.dest) {
            grunt.log.error().error("Please provide at least a container and a destination parameter !");
            return done(false);
        }
        
        if (typeof params.serviceOptions === "string") {
            params.serviceOptions = [params.serviceOptions];
        }
        
        var service = azure.createBlobService.apply(azure, params.serviceOptions).withFilter(new azure[params.retryFilter]()),
            prefix = this.data.src || this.data.prefix || params.prefix,
            dest = this.data.dest;
        
        async.series(
            [
                function (callback) { downloadFiles(service, prefix, dest, params, callback); },
                function (callback) { deleteContainer(service, params, callback); }
            ], 
            function (err) {
                if (err) {
                    done(false);
                    return;
                }
            
                done();
            });
    });

    //#endregion
};
