$(function() {
	module('Test QUnit');
	test('Ensure Tests work', function() {
		ok(1 == '1', 'Tests Work.');
	});

	module('Test InfinityRoll Initialization', {
		setup: setupInfinityRoll,
		teardown: function() {
			$('#container').InfinityRoll('destroy');
		},
	});
	test('InfinityRoll Data Exists', 1, function() {
		ok((typeof $('#container').data('InfinityRoll')) !== 'undefined', 'InfinityRoll Data Created.')
	});
	test('Prepending / Appending after Initialization', 4, function() {
		var cont = $('#container');
		var pv = 'hi';
		var av = 'yo';
		cont.InfinityRoll('prependTile', '<p id="'+pv+'">'+pv+'</p>');
		ok(cont.children().first().text() === pv
			, 'Prepend simply prepends something to the container. Nothing more.');

		cont.InfinityRoll('unprependTile');
		ok(cont.children().length === 0
			, 'Unprepend removes a prepended element');

		cont.InfinityRoll('appendTile', '<p id="'+av+'">'+av+'</p>');
		ok(cont.children().last().text() == av
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

	module('Test InfinityRoll Scrolling', {
		setup: setupInfinityRoll,
		teardown: function() {
			$('#container').InfinityRoll('destroy');
		},
	});
	asyncTest('"showMoreResults" InfinityRoll', 2, function() {
		$('#container').InfinityRoll('start', function(status) {
			var $this = $('#container').data('InfinityRoll');
			var oldEnd = $this.displayRange.end;
			var buffer = $this.tilesToBuffer;
			$('#container').InfinityRoll('showMoreResults');
			equal($this.displayRange.end, $('#container').children().length, 'displayRange: ' + $this.displayRange.end);
			equal($this.displayRange.end, oldEnd + buffer, 'oldEnd(='+oldEnd+') + buffer = newEnd(='+$this.displayRange.end+')');
			start();
		});
	});
	
	//tests to add:
	//scrolling
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
		displayRange: {begin: 0, end: 15},
	});
}
