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

[grunt]: https://github.com/gruntjs/grunt
[blob-upload-options]: https://github.com/spatools/grunt-azure/wiki/Blob-Upload-Options
[blob-download-options]: https://github.com/spatools/grunt-azure/wiki/Blob-Download-Options
[queue-enqueue-options]: https://github.com/spatools/grunt-azure/wiki/Queue-Enqueue-Options
[queue-dequeue-options]: https://github.com/spatools/grunt-azure/wiki/Queue-Dequeue-Options
[queue-clear-options]: https://github.com/spatools/grunt-azure/wiki/Queue-Clear-Options

## Release History
* 0.1.0 Initial Release (Include blob download / upload)
* 0.1.1 Add Queue tasks (enqueue, dequeue, clear)
