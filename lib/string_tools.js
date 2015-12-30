'use strict';

var reMn = require('unicode-3.0.1/categories/Mn/regex');
var unorm = require('unorm');
var uslug = require('uslug');

var reMnG = new RegExp(reMn.source, 'g');

function strip_nonspacing_marks(str) {
	/* http://www.siao2.com/2007/05/14/2629747.aspx
	   This is as correct as possible, but should not be used for
	   body text, as it removes some characters which are meaningful in certain
	   languages.
	 */
	var stripped = unorm.nfd(str)
					.replace(reMnG, '');
	return unorm.nfc(stripped);
}

function slugify(str) {
	return uslug(strip_nonspacing_marks(str));
}

module.exports = {
	strip_nonspacing_marks: strip_nonspacing_marks,
	slugify: slugify
};