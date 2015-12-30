'use strict';

var handlebars = require('handlebars');
var path_tools = require('./path_tools');
var typogr = require('typogr');

// http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/

var ATTR_ENTITIES = { '&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'};

var reAttrChars = /[&<>'"]/g;

function encode_attr(str) {
	return str.replace(reAttrChars, function(c) {
		return ATTR_ENTITIES[c];
	});
}

handlebars.registerHelper('attr', function(value) {
	return new handlebars.SafeString(encode_attr(value));
});

handlebars.registerHelper('urlencode_path', function(value) {
	return new handlebars.SafeString(path_tools.uriencode(value));
});

handlebars.registerHelper('add', function (a, b) {
	return a + b;
});

handlebars.registerHelper('smarty', function (str) {
	var safe = handlebars.escapeExpression(str);
	return new handlebars.SafeString(typogr.smartypants(safe));
});