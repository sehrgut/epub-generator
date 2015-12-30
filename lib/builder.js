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

function compile_template(fp) {
	return handlebars.compile( fs.readFileSync(__dirname + '/templates/' + fp).toString('utf8') );
}

// dynamic files
var DYNAMIC_FILES = ['OEBPS/content.opf', 'OEBPS/toc.ncx'];
var dynamicFilesCompiled = [];
DYNAMIC_FILES.forEach(function(fp){
	dynamicFilesCompiled.push( compile_template(fp) );
});

var tocCompiled = compile_template('toc.xhtml');
var titleCompiled = compile_template('title.xhtml');


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
	builder.add = function(path, data, meta, prepend){
		meta = fillMeta(meta || {}, path, data);
		addFile(data, { name: 'OEBPS/' + meta.path }); //use sanitized path

		if (prepend)
			options.files.unshift(meta);
		else
			options.files.push(meta);
			
		return this;
	};
	
	function addFrontmatter() {

		if (options.write_toc)
			builder.add('toc.xhtml', tocCompiled(options),
				{title: options.toc_title, toc: true}, true);
		
		if (options.write_tp)
			builder.add('title.xhtml', titleCompiled(options),
				{title: options.tp_title, toc: true}, true);
	}
	
	// end adding files
	builder.end = function(cb){
		addFrontmatter();
		addBasicFiles();
		filePending.push([]);
		if(filePending.length === 1) nextFile();
		if(cb) builder.on('finish', cb);
		return this;
	};
	return builder;
};