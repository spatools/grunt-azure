# grunt-azure [![NPM version](https://badge.fury.io/js/grunt-azure.png)](http://badge.fury.io/js/grunt-azure)

[Grunt][grunt] Azure - Allows to use Windows Azure Storage Blobs / Tables / Queues inside Grunt.

## Getting Started

Install this grunt plugin next to your project's gruntfile with: `npm install grunt-azure --save-dev`

Then add this line to your project's `Gruntfile.js` :

```javascript
grunt.loadNpmTasks('grunt-azure');
```

Then specify your config:

```javascript
grunt.initConfig({
```

## Blobs

### Uploading Blob : ([more informations][blob-upload-options])

```javascript
    'azure-blob-upload': {
        dist: {
            options: {
                serviceOptions: '{connectionstring}',
                container: 'testcontainer'
            },

            src: 'local/folder/**',
            dest: 'remote/prefix/'
        }
    }
```

### Downloading Blob : ([more informations][blob-download-options])

```javascript
	'azure-blob-download': {
		dist: {
			options: {
		        serviceOptions: '{connectionstring}',
		        container: 'testcontainer'
			},

		    src: 'remote/prefix/',
		    dest: 'local/folder/'
		}
	}
```

## Queues

### Enqueue Message : ([more informations][queue-enqueue-options])

```javascript
	'azure-queue-enqueue": {
		dist: {
			options: {
		        serviceOptions: '{connectionstring}',
		        queue: 'testqueue',
                message: "String or JS"
			}
		}
	}
```

### Dequeue Message : ([more informations][queue-dequeue-options])

```javascript
	'azure-queue-dequeue": {
		dist: {
			options: {
		        serviceOptions: '{connectionstring}',
		        queue: 'testqueue',
                numOfMessages: "String or JS"
			},

            actions: [
                function (work, callback) {
                    //...
                    callback(null, result);
                    // or
                    callback(err);
                },
                function (work) {
                    console.log(work);
                }
            ]
		}
	}
```

### Clear Queue Messages : ([more informations][queue-clear-options])

```javascript
	'azure-queue-clear": {
		dist: {
			options: {
		        serviceOptions: '{connectionstring}',
		        queue: 'testqueue'
			}
		}
	}
```

## Tables

### Entities Operations : ([more informations][table-entity-options])

```javascript
	'azure-table-insert": {
		dist: {
			options: {
		        serviceOptions: '{connectionstring}',
		        table: 'testtable'
			},

            entities: [
                {
                    PartitionKey: "partkey",
                    RowKey: "key1",
                    Property: "Value"
                },
                {
                    PartitionKey: "partkey",
                    RowKey: "key2",
                    Property: "Value"
                }
            ]
		}
	}
```

Note: There are tasks for every entities operations :
 * _insert_
 * _update_
 * _merge_
 * _delete_
 * _insertorupdete_
 * _insertormerge_

### Query Entities : ([more informations][table-query-options])

```javascript
	'azure-table-query": {
		dist: {
			options: {
		        serviceOptions: '{connectionstring}',
		        table: 'testtable',
                top: 10,
                pkPrefix: "prefix"
			},

            actions: [
                function (entities, callback) {
                    //...
                    callback(null, result);
                    // or
                    callback(err);
                },
                function (entities) {
                    console.log(work);
                }
            ]
		}
	}
```

[grunt]: https://github.com/gruntjs/grunt
[blob-upload-options]: https://github.com/spatools/grunt-azure/wiki/Blob-Upload-Options
[blob-download-options]: https://github.com/spatools/grunt-azure/wiki/Blob-Download-Options
[queue-enqueue-options]: https://github.com/spatools/grunt-azure/wiki/Queue-Enqueue-Options
[queue-dequeue-options]: https://github.com/spatools/grunt-azure/wiki/Queue-Dequeue-Options
[queue-clear-options]: https://github.com/spatools/grunt-azure/wiki/Queue-Clear-Options
[table-entity-options]: https://github.com/spatools/grunt-azure/wiki/Table-Entity-Options
[table-query-options]: https://github.com/spatools/grunt-azure/wiki/Table-Query-Options

## Release History
* 0.1.0 Initial Release (Include blob download / upload)
* 0.1.1 Add Queue tasks (enqueue, dequeue, clear)
* 0.1.2 Add Table tasks (insert, update, delete, merge, insertorupdate, insertormerge, query)
