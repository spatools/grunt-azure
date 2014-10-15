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
        path = require("path"),

        azure = require("azure"),
        storage = require("azure/node_modules/azure-storage/lib/azure-storage"),
        EntityGenerator = storage.TableUtilities.entityGenerator,

        filesystem = require("../lib/filesystem");
    
    //#region Private Methods
    
    function createTable(service, params, callback) {
        service.createTableIfNotExists(params.table, params.tableOptions, function (err, created) {
            if (created) {
                grunt.verbose.writeln("Table '" + params.table + "' created !");
            }
            
            callback(err, created);
        });
    }
    
    function deleteTable(service, params, callback) {
        if (params.tableDelete) {
            service.deleteTableIfExists(params.table, function (err, deleted) {
                if (deleted) {
                    grunt.verbose.writeln("Table '" + params.table + "' deleted !");
                }
                
                callback(err, deleted);
            });
        }
        else {
            callback();
        }
    }
    
    function ensureTable(service, params, callback) {
        async.applyEachSeries([deleteTable, createTable], service, params, callback);
    }
    
    function execOperation(service, operation, entities, params, callback) {
        var batches = groupEntities(entities);
        
        async.series(
            [
                function (callback) { ensureTable(service, params, callback); },
                function (callback) {
                    async.eachSeries(
                        batches,
                        function (batch, cb) { execBatch(service, operation, batch, params, cb); },
                        callback);
                }
            ], 
            callback);
    }
    
    function execBatch(service, operation, entities, params, callback) {
        operation = operation + "Entity";

        if (entities.length > 1) {
            var batch = new storage.TableBatch();
            entities.map(transformEntity).forEach(function (entity) {
                batch[operation](entity);
            });
            
            service.executeBatch(params.table, batch, callback);
        }
        else {
            service[operation](params.table, transformEntity(entities[0]), callback);
        }
    }
    
    function getEntities(data, params, files) {
        var entities = data.entities || [];
        
        if (!Array.isArray(entities)) {
            entities = [entities];
        }
        
        if (params.entities) {
            if (Array.isArray(params.entities)) {
                entities = params.entities.concat(entities);
            }
            else {
                entities.unshift(params.entities);
            }
        }
        
        if (data.entity) {
            entities.push(data.entity);
        }
        
        if (params.entity) {
            entities.unshift(params.entity);
        }
        
        if (files && files.length) {
            files.forEach(function (file) {
                file.src.map(grunt.file.read).map(JSON.parse).forEach(function (result) {
                    if (Array.isArray(result)) {
                        entities.push.apply(entities, result);
                    }
                    else {
                        entities.push(result);
                    }
                });
            });
        }
        
        return entities;
    }
    
    function groupEntities(entities) {
        var result = [],
            groups = {},
            pk;
        
        entities.forEach(function (entity) {
            pk = entity.PartitionKey;
            if (!groups[pk]) {
                groups[pk] = [];
                result.push(groups[pk]);
            }
            
            groups[pk].push(entity);
        });
        
        return result;
    }
    
    function transformEntity(entity) {
        var result = {},
            guidRegex = new RegExp("^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$");
        
        Object.keys(entity).forEach(function (prop) {
            var value = entity[prop],
                valType = typeof value,
                type = "String";
            
            if (prop === "PartitionKey" || prop === "RowKey") {
            }
            
            else if (valType === "number") {
                if (parseInt(value, 10) === value) {
                    type = value > 2147483647 ? "Int64" : "Int32";
                }
                else {
                    type = "Double";
                }
            }

            else if (valType === "boolean") {
                type = "Boolean";
            }

            else if (value instanceof Date) {
                type = "DateTime";
            }

            else if (guidRegex.test(value)) {
                type = "Guid";
            }
            
            else if (Array.isArray(value)) {
                type = "Binary";
            }
            
            else if (valType !== "string") {
                value = value.toString();
            }
            
            result[prop] = EntityGenerator[type](value);
        });
        
        return result;
    }
    
    function transformDescriptor(descriptor) {
        var result = {};
        
        Object.keys(descriptor).forEach(function (prop) {
            result[prop] = descriptor[prop]._;
        });
        
        return result;
    }
    
    function getNextPrefix(prefix) {
        var len = prefix.length - 1,
            last = prefix.charCodeAt(len);
        
        if (last === 57) last = 64; // 57 = "9", next = 65 = "A"
        
        return prefix.substr(0, len).concat(String.fromCharCode(last + 1));
    }
    
    function executeActions(entities, actions, callback) {
        async.eachSeries(
            actions, 
            function (action, cb) {
                try {
                    if (action.length > 1) {
                        action(entities, cb);
                    }
                    else {
                        action(entities);
                        cb();
                    }
                }
                catch (err) {
                    cb(err);
                }
            },
            function (err) {
                if (err) {
                    callback(err);
                    return;
                }
            
                callback();
            });
    }

    //#endregion
    
    //#region Factories
    
    function createEntityTask(operation, operationed) {
        return function () {
            var done = this.async(),
                params = this.options({
                    serviceOptions: [],
                    table: null,
                    tableOptions: {},
                    tableDelete: false,
                    entities: [],
                    retryFilter: "ExponentialRetryPolicyFilter"
                });
            
            if (!params.table) {
                grunt.log.error().error("Please provide at least a table parameter !");
                return done(false);
            }
            
            if (typeof params.serviceOptions === "string") {
                params.serviceOptions = [params.serviceOptions];
            }
            
            var entities = getEntities(this.data, params, this.files),
                service = azure.createTableService.apply(azure, params.serviceOptions).withFilter(new azure[params.retryFilter]());
            
            execOperation(service, operation, entities, params, function (err) {
                if (err) {
                    grunt.log.error()
                        .error("An error occured while trying to " + operation + " entities in Windows Azure Storage Table!")
                        .error(err);
                    
                    done(false);
                    return;
                }
                
                grunt.log.ok(entities.length + " entities successfully " + operationed + " in Windows Azure Storage Table!");
                done();
            });
        };
    }

    //#endregion
    
    //#region Entities Tasks
    
    grunt.registerMultiTask(
        "azure-table-insert", 
        "Azure Table Insert - Allows to insert entities in Windows Azure Storage Table",
        createEntityTask("insert", "inserted")
    );
    
    grunt.registerMultiTask(
        "azure-table-update", 
        "Azure Table Update - Allows to update entities in Windows Azure Storage Table",
        createEntityTask("update", "updated")
    );
    
    grunt.registerMultiTask(
        "azure-table-insertorupdate", 
        "Azure Table Insert Or Update - Allows to insert entities or update if existing in Windows Azure Storage Table",
        createEntityTask("insertOrUpdate", "inserted or updated")
    );
    
    grunt.registerMultiTask(
        "azure-table-merge", 
        "Azure Table Insert - Allows to merge entities in Windows Azure Storage Table",
        createEntityTask("merge", "merged")
    );
    
    grunt.registerMultiTask(
        "azure-table-insertormerge", 
        "Azure Table Insert - Allows to insert entities or merge if existing in Windows Azure Storage Table",
        createEntityTask("insertOrMerge", "inserted or merged")
    );
    
    grunt.registerMultiTask(
        "azure-table-delete", 
        "Azure Table Insert - Allows to delete entities from Windows Azure Storage Table",
        createEntityTask("delete", "deleted")
    );
    
    //#endregion

    //#region Query Tasks

    grunt.registerMultiTask("azure-table-query", "Azure Table Query - Allows to query entities from Windows Azure Storage Table", function () {
        var done = this.async(),
            params = this.options({
                serviceOptions: [],
                table: null,

                pkPrefix: null,
                rkPrefix: null,
                where: [],
                select: [],
                top: -1,
                
                raw: false,
                retryFilter: "ExponentialRetryPolicyFilter"
            });
        
        if (!params.table) {
            grunt.log.error().error("Please provide at least a table parameter !");
            return done(false);
        }
        
        if (typeof params.serviceOptions === "string") {
            params.serviceOptions = [params.serviceOptions];
        }
        
        var service = azure.createTableService.apply(azure, params.serviceOptions).withFilter(new azure[params.retryFilter]()),
            query = new azure.TableQuery(),
            dest = this.data.dest,
            actions = this.data.actions || params.actions || [];
        
        if (!Array.isArray(actions)) {
            actions = [actions];
        }
        
        if (params.pkPrefix) {
            params.where.push(["PartitionKey ge ? and PartitionKey lt ?", params.pkPrefix, getNextPrefix(params.pkPrefix)]);
        }
        
        if (params.rkPrefix) {
            params.where.push(["RowKey ge ? and RowKey lt ?", params.rkPrefix, getNextPrefix(params.rkPrefix)]);
        }

        if (params.where && params.where.length > 0) {
            query.where.apply(query, params.where.pop());
            
            params.where.forEach(function (where) {
                query.and.apply(query, where);
            });
        }
        
        if (params.top > 0) {
            query.top(params.top);
        }
        
        if (params.select) {
            query.select.apply(query, params.select);
        }

        service.queryEntities(params.table, query, null, function (err, result) {
            if (err) {
                grunt.log.error()
                        .error("An error occured while trying to query entities from Windows Azure Storage Table!")
                        .error(err);
                
                done(false);
                return;
            }
            
            var entities = result.entries;
            
            if (!params.raw) {
                entities = entities.map(transformDescriptor);
            }
            
            if (dest) {
                grunt.file.write(dest, JSON.stringify(entities));
            }
            
            executeActions(entities, actions, function (err2) {
                if (err2) {
                    grunt.log.error()
                        .error("An error occured while trying to execute actions with queried entities !")
                        .error(err2);
                    
                    done(false);
                    return;
                }
                
                grunt.log.ok(entities.length + " entities successfully queried from Windows Azure Storage Table!");
                done();
            });
        });
    });

    //#endregion
};
