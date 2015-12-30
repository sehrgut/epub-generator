'use strict';

var path = require('path');
var sanitize_filename = require('sanitize-filename');
var string_tools = require('./string_tools');

var reEscapedSlash = /\\\//g;
var reSlashEntity = /\{\{escaped_slash}}/g;
var reHash = /#/g;


function sanitize_component(str) {
	str = string_tools.strip_nonspacing_marks(str);
	str = sanitize_filename(str);

/* Sigil decodes entities in URLs and never reencodes them,	leading to
   invalid fragment parts in URLs with encoded '#'.
*/
	str = str.replace(reHash, '');

	return str;
}

function posix_join_arr(parts) {
	return path.posix.join.apply(null, parts);
}

function path_posix_split(str) {
	return str
		.replace(reEscapedSlash, '{{escaped_slash}}')
		.split('/')
		.map(function (p) { return p.replace(reSlashEntity, '\\/'); });
}

function sanitize_path(str) {
	var parts = path_posix_split(str)
				.map(sanitize_component);

	return posix_join_arr(parts);
}

function encode_parts(str) {
	var parts = path_posix_split(str)
					.map(function (p) { return encodeURIComponent(p); });

	return posix_join_arr(parts);
}

module.exports = {
	posix_split: path_posix_split,
	uriencode: encode_parts,
	sanitize: sanitize_path
};