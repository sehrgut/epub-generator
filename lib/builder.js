'use strict';

var fs = require('fs');
var handlebars = require('handlebars');
var ZipStream = require('zip-stream');
var mime = require('mime');
var uuid = require('node-uuid');

var string_tools = require('./string_tools');
var path_tools = require('./path_tools');

require('./helpers');

// static files
var STATIC_FILES = ['mimetype', 'META-INF/container.xml'];

// dynamic files
var DYNAMIC_FILES = ['OEBPS/content.opf', 'OEBPS/toc.ncx'];
var dynamicFilesCompiled = [];
DYNAMIC_FILES.forEach(function(file){
	dynamicFilesCompiled.push( handlebars.compile( fs.readFileSync(__dirname + '/templates/' + file).toString('utf8') ) );
});


module.exports = function(options){
	var zipStream = new ZipStream();
	options.files = [];
	
	// add file to zip stream
	var filePending = [];
	var nextFile = function(){
		if(!filePending.length) return;
		if(!filePending[0].length) {
			zipStream.finish();
			return;
		}
		zipStream.entry(filePending[0][0], filePending[0][1], function(err){
			filePending.shift();
			if(err) zipStream.emit('error', err);
			else nextFile();
		});
	};
	var addFile = function(file, options){
		filePending.push([file, options]);
		if(filePending.length === 1) nextFile();
	};

	// add static files
	var addBasicFiles = function(){
		STATIC_FILES.forEach(function(file){
			addFile(fs.createReadStream(__dirname + '/templates/' + file), { name: file });
		});
		for(var i=0; i<DYNAMIC_FILES.length; i++) {
			addFile(dynamicFilesCompiled[i](options), { name: DYNAMIC_FILES[i] });
		}
	};
	
	// fill meta
	var fillMeta = function(meta, path, data){
		var r = {};
		r.path = path_tools.sanitize(path);
		r.mimetype = meta.mimetype || mime.lookup(r.path);
		r.toc = !!meta.toc;
		r.title = meta.title || ''; // TODO extract title from data
		r.chapter_id = r.title ? string_tools.slugify(r.title) : uuid.v4();
		return r;
	};
	
	// return API
	var builder = Object.create(zipStream);
	// add a string/buffer/stream as a file
	builder.add = function(path, data, meta){
		meta = fillMeta(meta || {}, path, data);
		addFile(data, { name: 'OEBPS/' + meta.path }); //use sanitized path
		options.files.push(meta);
		return this;
	};
	// end adding files
	builder.end = function(cb){
		addBasicFiles();
		filePending.push([]);
		if(filePending.length === 1) nextFile();
		if(cb) builder.on('finish', cb);
		return this;
	};
	return builder;
};