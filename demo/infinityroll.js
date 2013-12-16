//For now, you can specify all the parameters you want to set on the fly. It's not well secured, but whatever.
(function($){ 
	var moreResults;
	$.fn.InfinityRoll = function(options)
	{
		var methods = {
			/*
			//I don't know how to approach this function yet...
			data: function(data)
			{
				var $this = $(this).data("InfinityRoll");
				//if no params were passed, then return the data.
				if(!data)
					return $this._data;

				//otherwise, we set hte new data
				for(var i=0; i!=data.length; ++i)
					
			},
			*/
			bufferTiles: function()
			{
				var $this = $(this).data("InfinityRoll");
				//if we want to buffer more than we currently have, then try and get more tiles.
				if($this.moreResults && $this._currentMaxTiles > $this._data.length)
				{
					console.log('grabbing more data');
					$this._loadingBufferData = true; //lock, so we don't do more calls
					var firstIndex = $this._data.length;
					var lastIndex = $this._currentMaxTiles;
					var pageNum = ($this._currentMaxTiles - $this.initTilesToBuffer) / $this.tilesToBuffer;
					var url = $this.moreResults(pageNum, firstIndex, lastIndex);
					var self = this;
					$(this).InfinityRoll("_loaddata", url, function() {
						console.log("more data acquired. Length: " + $this._data.length);
						$this._loadingBufferData = false; //done loading, remove lock
						$(self).InfinityRoll("bufferTiles");
					});
					return; //exit out of the buffer function... we call it again in ajax.
				}

				for(var i=$this._containersLoaded; i < $this._data.length && i < $this._currentMaxTiles; ++i)
				{
					var html = $this.customTile($this._data[i].data);
					var div = document.createElement("div");
					div.innerHTML = html;
					$this._data[i].dom = div.children[0];
					$(this).append(div.children[0]);
					$this._containersLoaded = i;
				}

				console.log("finished loading more containers. count: " + $(this).children().length);
			},
//set _data to whatever uyou want, then call reset, and the dom that already exists will be maintained.
			reset: function() {
				var $this = $(this).data("InfinityRoll");
				//load the url for a new set of data
				var olddata = $this._data;
				$(this).InfinityRoll("_loaddata", $this.url({}), function() {
					for(var i = 0; i != $this._data.length; ++i)
					{
						//if exists and we keep, then append
						//TODO: not sure about this wacky syntax
						if(!withIndex(olddata, $this._data[i], "data", function(index) {
							$this._data[i].dom = olddata[index].dom;
							olddata[index].markForKeep = true;
						}))
							//if doesnt exist, then create, then append
							$this._data[i].dom = $this.customTile($this._data[i].data);
					}

					for(var i = 0; i != olddata.length; ++i)
						if(!olddata[i].markForKeep)
							olddata[i].dom.remove();
					
					for(var i = 0; i != $this._data.length; ++i)
						if($this._data[i].dom) //only load the dom, if it exists... we may have not scrolled to it yet.
							$this.container.append($this._data[i].dom);
				});
			},
			_loaddata: function(url, fnc_cb) {
				var $this = $(this).data("InfinityRoll");
				$.get(url, function(data) {
					console.log(data);
					//create the data/dom array
					var data = $this.collectionMember(data);
					for(var i=0; i!=data.length; ++i)
						$this._data.push({data: data[i], dom:null});
					fnc_cb();
				}).error(function(ajax, param2, param3, param4) {
					console.log("ERROR:");
					console.log(ajax);
					console.log(param2);
					console.log(param3);
				});
			},
		};

		//first, if we are callinga  method on a valid IR object. Then call it.
		if(typeof $(this).data("InfinityRoll") != "undefined" && methods[options])
			return methods[options].apply(this, Array.prototype.slice.call(arguments, 1));
		//If we are attempting to initialize an IR object, then initialize it.
		else if(typeof options == "object") {
			var my_options = options;
			return this.each(function() {
				var defaults = {
					customTile: function() { return "<img src='"+imgurl+"'></img>"; },
					end: function() { return "<h1>NO MORE</h1>"; },
					initTilesToBuffer: 10,
					tilesToBuffer: 5
				};
				var options = $.extend(defaults, my_options);

				if(typeof $(this).data("InfinityRoll") != "undefined") {
					alert("WARNING: destroying instance of InfinityRoll to create a new one");
					$(this).InfinityRoll("destroy");
				}
				infinityroll_init($(this), options, methods);
			});
		} else
			alert("Warning: Incorrect usage. Method does not exist: '"+options+"'");
	}
})( jQuery );

function infinityroll_init(elem, options, methods) {
		elem.data("InfinityRoll", $.extend({
			url: null,
			collectionMember: function(obj) { return obj; },
			moreResults: null,
			customTile: function(imgurl) {
				return "<img src='"+imgurl+"'></img>";
			},
			tileCSS: null,
			initTilesToBuffer: 10,
			tilesTobuffer: 5,
			_currentMaxTiles: 10,
			_containersLoaded: 0,
			_data: [],
			_loadingBufferData: false
		}, options));
		var $this = elem.data("InfinityRoll");
	
		var url = $this.url({});	//TODO: what do i put in the where?
		elem.InfinityRoll("_loaddata", url, function() {
			elem.InfinityRoll("bufferTiles");	//well this be correcT?
		});


		var elemNotWindow = ($(elem).css("overflow") == "scroll" && $(elem).height() > 0);
		if(elemNotWindow)
			$(elem).scroll(function() {
				if($(this)[0].scrollHeight - $(this).scrollTop() < $(this).outerHeight() + 500)
				{
					//if we are already buffering, then don't buffer more, else...
					if(!$this._loadingBufferData)
					{
						$this._currentMaxTiles += $this.tilesToBuffer;
						methods.bufferTiles.call($(elem));
					}
				}
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
				{
					//if we are already buffering, then don't buffer more, else...
					if(!$this._loadingBufferData)
					{
						$this._currentMaxTiles += $this.tilesToBuffer;
						methods.bufferTiles.call($(elem));
					}
				}
			});
		}
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
