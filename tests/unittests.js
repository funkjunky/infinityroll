$(function() {
	module('Test QUnit');
	test('Ensure Tests work', function() {
		ok(1 == '1', 'Tests Work.');
	});

	module('Test InfinityRoll Initialization', {
		setup: setupInfinityRoll
	});
	test('InfinityRoll Data Exists', function() {
		ok((typeof $('#container').data('InfinityRoll')) !== 'undefined', 'InfinityRoll Data Created.')
	});
	test('Prepending / Appending after Initialization', function() {
		var cont = $('#container');
		var pv = 'hi';
		var av = 'yo';
		cont.InfinityRoll('prependTile', '<p id="'+pv+'">'+pv+'</p>');
		ok(cont.children('#'+pv).text() === pv
			, 'Prepend simply prepends something to the container. Nothing more.');

		cont.InfinityRoll('unprependTile');
		ok(cont.children().length === 0
			, 'Unprepend removes a prepended element');

		cont.InfinityRoll('appendTile', '<p id="'+av+'">'+av+'</p>');
		ok(cont.children('#'+av).text() == av
			, 'Append appends something to the container');

		cont.InfinityRoll('unappendTile');
		ok(cont.children().length === 0
			, 'Unappend removed an appended element');

	});
	asyncTest('"Start" InfinityRoll', 1, function() {
		$('#container').InfinityRoll('start', function(status) {
			var $this = $('#container').data('InfinityRoll');
			equal($('#container').children().length, $this.displayRange.end, 'Start. displayRange.end = ' + $this.displayRange.end);
			start();
		});
	});
	//tests to add:
	//
});

function setupInfinityRoll()
{
	var Happenings = Backbone.Collection.extend({
		url: '../demo/brandicted.json',
		model: Backbone.Model,
		parse: function(result) {
			return result.data;
		},
	});
	var happenings = new Happenings();

	$('#container').InfinityRoll({
		start: false,
		bbCollection: happenings,
		customTile: function(obj) {
			var html = "<div class='square'>";
			html += " <h3>" + obj.id + "</h3>";
			html += " <img src='"+obj.get('media').square.url+"'></img>";
			html += "</div>";
			return html;
		},
	});
}
