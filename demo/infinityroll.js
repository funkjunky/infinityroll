//For now, you can specify all the parameters you want to set on the fly. It's not well secured, but whatever.
(function($){ 
	var moreResults;
		window.first = true;
	$.fn.InfinityRoll = function(options)
	{
		var methods = {
			syncData: function(fncCB)
			{
				var $this = $(this).data("InfinityRoll");
				//if we have enough data, then just return.
				if($this.displayRange.end <= $this.bbCollection.length)
					return;

				console.log('attempting to grab more data...');

				var $this = $(this).data("InfinityRoll");
				var options = $.extend(options, {
					firstIndex: $this._displayedRange.end,
					lastIndex: $this.displayRange.end,
				});

				$this.bbCollection.fetch({
					data: options,
					success: function(collection, result) {
						//if we are still in sync, then just call CB
						if(result.total == $this._resultCount)
							return fncCB(result);

						console.log("Out of Sync...");
						$this._resultCount = result.count;
						//call fetchs with entire range, to get new data.
						$this.bbCollection.fetch({
							data: {
										firstIndex: 0,	//from the beginning...
										lastIndex: $this.displayRange.end,
							},
							success: fncCB
						});
					},
				});
			},
			syncImages: function() {
				var $this = $(this).data("InfinityRoll");

				//if our displayed range is the same as our display range, then we don't need to do anything.
				if(objIsEqual($this._displayedRange, $this.displayRange))
					return;

				//if we don't have enough data for our display range, then syncData, and return, because the callback on syncData will rerun syncImage.
				if($this.displayRange.end > $this.bbCollection.length && $this.displayRange.end < $this._resultCount)
				{
					var self = this;
					return $(this).InfinityRoll("syncData", function() {
						$(self).InfinityRoll("syncImages");
					});
				}

				//go through every model in our display range, marking what to keep in for dom.
				var keepers = [];
				for(var i = $this.displayRange.begin; i != $this.displayRange.end && i < $this.bbCollection.length; ++i)
				{
					var model = $this.bbCollection.at(i);
					var id = model.get("id");

					if(!$this._dom[id])
						$this._dom[id] = $($this.customTile(model.toJSON()));
					keepers.push(id); //list of doms to keep

					$(this).prepend($this._dom[id]);
				}
				$this._displayedRange = $.extend({}, $this.displayRange);

				//remove any unused DOM
				for(var key in $this._dom)
					if(keepers.indexOf(key) == -1)
						$this._dom[key].remove();
				
				console.log("finished loading more containers. count: " + $(this).children().length);
			},
		};

		//first, if we are callinga  method on a valid IR object. Then call it.
		if(typeof $(this).data("InfinityRoll") != "undefined" && methods[options])
			return methods[options].apply(this, Array.prototype.slice.call(arguments, 1));
		//We are attempting to initialize InfinityRoll
		else if(typeof options == "object") {
			var my_options = options;
			return this.each(function() {
				var defaults = {
					customTile: function() { return "<img src='"+imgurl+"'></img>"; },
					end: function() { return "<h1>NO MORE</h1>"; },
					bbCollection: null,
					tileCSS: null,
					displayRange: {begin: 0, end: 10}, //default 0-10
					_displayedRange: {begin: 0, end: 0}, //used to know when to sync
					 //TODO: not have 9999999 here... i need it to start the process.
					_resultCount: 999999,
					tilesToBuffer: 5,
					_dom: [],
				};

				if(typeof $(this).data("InfinityRoll") != "undefined") {
					alert("WARNING: destroying instance of InfinityRoll to create a new one");
					$(this).InfinityRoll("destroy");
				}

				//set plugin data and extend the defaults with options passed.
				$(this).data("InfinityRoll", $.extend(defaults, options));

				var $this = $(this).data("InfinityRoll");
			
				//this will attempt to sync images, causing a sync of data, and updating of image.
				$(this).InfinityRoll("syncImages");

				//scrolling event.
				var self = this;
				var addMoreResultsCB = _.debounce(function() {
					$this.displayRange.end += $this.tilesToBuffer;
					console.log("SCROLL: Extending displayRange: " + $this.displayRange.begin + " -> " + $this.displayRange.end);
					$(self).InfinityRoll("syncImages");
				}, 100);
				var elemNotWindow = ($(this).css("overflow") == "scroll" && $(this).height() > 0);
				if(elemNotWindow)
					$(this).scroll(function() {
						if($(this)[0].scrollHeight - $(this).scrollTop() < $(this).outerHeight() + 500)
							addMoreResultsCB();
					});
				else
				{
					console.log("Warning: doing infinite scroll on window. If you attached InfinityRoll to multiple objects, then  they will all load more results when you scroll on the entire page."); //TODO: only show this warning, when we know there are multiple objects assigned, and make it more clear that it is a bad idea except in very special circumstances.
					$(window).scroll(function() {
						var body = document.body,
						html = document.documentElement;

						var height = Math.max( body.scrollHeight, body.offsetHeight, 
							html.clientHeight, html.scrollHeight, html.offsetHeight );
						if(window.scrollY + window.innerHeight > height-500)
							addMoreResultsCB();
					});
				}
			});
		}
		else
			throw "Warning: Incorrect usage. Method does not exist: '"+options+"'";
	}
})( jQuery );

function infinityroll_init(elem, options, methods) {
	}

//returns whether "haystack" has an element that has the same "member" value as "needle", then calls "fnc_cb" with the index of that element.
function withIndex(haystack, needle, member, fnc_cb)
{
	for(var i=0; i!=haystack.length; ++i)
		if(objIsEqual(haystack[i][member], needle[member]))
		{
			fnc_cb(i);
			return true; //have a different mode where we don't return.
		}

	return false;
}

function objIsEqual(obj1, obj2)
{
	for(var key in obj1)
		if(obj1[key] != obj2[key])
			return false
	for(var key in obj2)
		if(obj2[key] != obj1[key])
			return false
	
	return true;
}
