//For now, you can specify all the parameters you want to set on the fly. It's not well secured, but whatever.
//You can subscribed to bufferBegins and BufferingEnds events, be wary, this plugin will only unbind events with the InfinityRoll namespace.
//This plugin is non-destructive. So if you add something to the container it won't ever be removed by my plugin.
(function($){ 
	var moreResults;
		window.first = true;
	$.fn.InfinityRoll = function(options)
	{
        var methods;
        prepareMethods();
		
		//first, if we are passing a string to a valid InfinityRoll plugin, then we are attempting to call a method.
		if(!_.isUndefined($(this).data("InfinityRoll")) && methods[options])
			return methods[options].apply(this, Array.prototype.slice.call(arguments, 1));
		//We are attempting to initialize InfinityRoll
		else if(_.isObject(options)) {
			var my_options = options;
			return this.each(function() {
				var defaults = {
					customTile: function() { return "<img src='"+imgurl+"'></img>"; },
					//end: function() { return "<h1>NO MORE</h1>"; },
                    prepend: null,
					bbCollection: null,
                    bbImageMember: null,
					displayRange: {begin: 0, end: 20}, //default 0-10
					_displayedRange: {begin: 0, end: 0}, //used to know when to sync
					_resultCount: -2, //it just needs to be larger than displayRange.end
                    _prerenderingImageCount: 0,
					tilesToBuffer: 5,
                    dataToBufferAhead: 50,
					_dom: [],
				};

				if(!_.isUndefined($(this).data("InfinityRoll"))) {
					//console.log("WARNING: destroying instance of InfinityRoll to create a new one");
					$(this).InfinityRoll("destroy");
				}

				//set plugin data and extend the defaults with options passed.
				$(this).data("InfinityRoll", $.extend(defaults, options));

				var $this = $(this).data("InfinityRoll");

                if($this.prepend)
                    $(this).InfinityRoll("prependTile", $this.prepend);
			
                $this.waitingForDataToDisplayImages = true;
                $(this).trigger('bufferingBegins');
                $(this).InfinityRoll("syncData", true);

				//scrolling event.
				var self = this;
				var addMoreResultsCB = function() {
					$this.displayRange.end += $this.tilesToBuffer;
					console.log("SCROLL: Extending displayRange: " + $this.displayRange.begin + " -> " + $this.displayRange.end);
                    if(!$this.waitingForDataToDisplayImages && $this.displayRange.end < ($this._resultCount + $this.tilesToBuffer)) {
                        if($this.displayRange.end + $this.dataToBufferAhead > $this.bbCollection.length)
                            $(self).InfinityRoll("syncData");
                        return $(self).InfinityRoll("syncImages");
                    } else if($this.waitingForDataToDisplayImages)
                        $(self).InfinityRoll('syncData');

                    return false;
				};
				var elemNotWindow = ($(this).css("overflow") == "scroll" && $(this).height() > 0);
				if(elemNotWindow)
					$(this).on("scroll.InfinityRoll", function() {
						if($(this)[0].scrollHeight - $(this).scrollTop() < $(this).outerHeight() + 800)
							addMoreResultsCB();
					});
				else
				{
					//console.log("Warning: doing infinite scroll on window. If you attached InfinityRoll to multiple objects, then  they will all load more results when you scroll on the entire page."); //TODO: only show this warning, when we know there are multiple objects assigned, and make it more clear that it is a bad idea except in very special circumstances.
                    var windowCB = function() {
                        if(hasHitBottom())
                        {
                            $(window).off('scroll.InfinityRoll');
                            if(addMoreResultsCB() && hasHitBottom())
                            {
                                //first is for chrome, seocnd for ff.
                                //TODO: find a better solution than delay for ff
                                windowCB();
                                window.setTimeout(windowCB, 300);
                            }
                            $(window).on('scroll.InfinityRoll', windowCB);
                        }
                            
                    };
                    $(window).on("scroll.InfinityRoll", windowCB);
                    //$(window).smack({threshold: '200px'})
                    //    .done(addMoreResultsCB);
                }
			});
		}
		else
			throw "Warning: Incorrect usage. Method does not exist: '"+options+"'";

        function prepareMethods() {
            methods = {
                prependTile: function(tile)
                {
                    $(this).prepend(tile);
                },
                appendTile: function(tile)
                {
                    $(this).append(tile);
                },
                remove: function(id)
                {
                    var $this = $(this).data("InfinityRoll");
                    $this._dom[id].remove();
                    delete $this._dom[id];
                    --$this._displayedRange.end;
                },
                syncData: function()
                {
                    var $this = $(this).data("InfinityRoll");
                    /*if we have enough data, then just return.*/
                    if($this.displayRange.end + $this.dataToBufferAhead <= $this.bbCollection.length)
                        return;

                    var $this = $(this).data("InfinityRoll");

                    //console.log("Grabbed range: " + $this.bbCollection.length + " -> " + ($this.bbCollection.length + $this.dataToBufferAhead));
                    var options = $.extend(options, {
                        _start: $this.bbCollection.length,
                        _limit: $this.dataToBufferAhead,
                    });
          
                    var self = this;
                    $this.bbCollection.fetch({
                        remove: false,
                        data: options,
                        success: function(collection, result) {
                            $(self).InfinityRoll('_preloadImages');
                            if($this._resultCount === -2) {
                                $this._resultCount = result.total;
                                $(self).InfinityRoll("syncImages");
                            }

                            //if we are still in sync, then just call CB
                            if(result.total == $this._resultCount)
                            {
                                if($this.waitingForDataToDisplayImages) /*if the user scrolled too fast and is waiting for data to display more images.*/
                                {
                                    $this.waitingForDataToDisplayImages = false; /*reset the flag.*/
                                    if($this._prerenderingImageCount <= 0)
                                        $(self).trigger('bufferingEnds');
                                    $(self).InfinityRoll("syncImages"); //Now that we have more data, we need to add the tiles the user is waiting for.
                                }
                                return;
                            }
                           
                            console.log("InfinityRoll Data Out of Sync...");
                            $this._resultCount = result.total; //get the new total.
                            /*call fetchs with entire range, to get new data.*/
                            $this.bbCollection.fetch({
                                data: {
                                    _start: 0,	//from the beginning...
                                    _limit: $this.displayRange.end + $this.dataToBufferAhead,
                                },
                                success: function() {
                                    if($this.waitingForDataToDisplayImages)
                                    {
                                        $this.waitingForDataToDisplayImages = false;
                                        if($this._prerenderingImageCount <= 0)
                                            $(self).trigger('bufferingEnds');
                                        $(self).InfinityRoll("syncImages");
                                    }
                                },
                                failure: function() {
                                    console.log("failed to grab data for a sync");
                                    if($this.waitingForDataToDisplayImages)
                                    {
                                        $this.waitingForDataToDisplayImages = false;
                                        $(self).trigger('bufferingEnds');
                                    }
                                },
                            });
                        },
                        failure: function() {
                            console.log("failed to load more data");
                            if($this.waitingForDataToDisplayImages)
                            {
                                $this.waitingForDataToDisplayImages = false;
                                if($this._prerenderingImageCount <= 0)
                                    $(self).trigger('bufferingEnds');
                            }
                        },
                    });
                },
                syncImages: function() {
                    var $this = $(this).data("InfinityRoll");

                    //if our displayed range is the same as our display range, then we don't need to do anything.
                    if(JSON.stringify($this._displayedRange) === JSON.stringify($this.displayRange))
                        return false;

                    //if we don't have enough data for our display range
                    if(!$this.waitingForDataToDisplayImages && $this.displayRange.end > $this.bbCollection.length && $this.displayRange.end < $this._resultCount)
                    {
                        $this.waitingForDataToDisplayImages = true; //flag for datasync
                        $(this).trigger('bufferingBegins');
                    }

                    //go through every model in our display range, marking what to keep in for dom.
                    //This extra complexity is necessary for when we implement resyncing of data [when their are new results between page loads]
                    var keepers = [];
                    for(var i = $this.displayRange.begin; i < $this.displayRange.end && i < $this.bbCollection.length; ++i)
                    {
                        var model = $this.bbCollection.at(i);
                        var id = model.get("id");

                        if(!$this._dom[id])
                            this.append($this._dom[id] = $($this.customTile(model, this)));
                        //This bit is necessary for reordering.
                        //else if(jQuery.contains(this.get(0), $this._dom[id].get(0)))
                        //    this.append($this._dom[id]);

                        keepers.push(id); //list of doms to keep

                    }
                    //update the range we are already displaying.
                    $this._displayedRange = {
                        begin: $this.displayRange.begin,
                        end: Math.min($this.displayRange.end, $this.bbCollection.length)
                    };

                    //remove any unused DOM
                    for(var key in $this._dom)
                        if(keepers.indexOf(key) == -1)
                        {
                            $this._dom[key].remove();
                            delete $this._dom[key];
                        }
                    
                    //console.log("finished loading more containers. count: " + $(this).children().length);
                    return true;
                },
                destroy: function() {
                    $(this).removeData("InfinityRoll");
                    $(this).unbind(".InfinityRoll");
                    $(window).unbind(".InfinityRoll");
                    $(this).empty();
                },
                //TODO: put this somewhere else... it's a private method...
                _preloadImages: function() {
                    var $this = $(this).data('InfinityRoll');
                    var self = this;
                    if($this.bbImageMember)     /*if the developer provided us with the image member in each object, then we can predownload the image.*/
                    {
                        for(var i=$this._displayedRange.end; i<$this.bbCollection.length; ++i) {
                            /*This is all it takes to predownload an image*/
                            ++$this._prerenderingImageCount;
                            var img = new Image();
                            img.onload = function() {
                                $(self).trigger('imageFinishedLoading', $(this));
                                --$this._prerenderingImageCount;
                                if($this._prerenderingImageCount <= 0 && !$this.waitingForDataToDisplayImages)
                                    $(self).trigger('bufferingEnds');

                            };
                            if(img.complete)
                                _.delay(function() { $(self).trigger('imageFinishedLoading', [$(img)]); }, 50);

                            img.onerror = function() {
                                --$this._prerenderingImageCount;
                                if($this._prerenderingImageCount <= 0 && !$this.waitingForDataToDisplayImages)
                                    $(self).trigger('bufferingEnds');
                            }
                            img.src = $this.bbImageMember($this.bbCollection.at(i).toJSON());
                        }
                    }
                },
            };
        }
	}
})( jQuery );

function hasHitBottom()
{
    var body = document.body,
    html = document.documentElement;

    var height = Math.max( body.scrollHeight, body.offsetHeight, 
        html.clientHeight, html.scrollHeight, html.offsetHeight );
    var scrollY = window.scrollY || window.pageYOffset;
    //console.log('left: ' + (scrollY + window.innerHeight) + ' > right: ' + (height-800));
    return scrollY + window.innerHeight > height-800;
}
