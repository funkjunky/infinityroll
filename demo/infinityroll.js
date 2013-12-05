//For now, you can specify all the parameters you want to set on the fly. It's not well secured, but whatever.
function InfinityRoll(params)
{
	//all the possible parameters... no defaults right now.
	this.container;
	this.url;
	this.moreResults;
	this.customTile = function(imgurl) {
		return "<img src='"+imgurl+"'></img>";
	};
	this.tileCSS; //not implemented yet.
	this.initTilesToBuffer = 10;
	this.currentMaxTiles = this.initTilesToBuffer;
	this.tilesToBuffer = 5;
	this._containersLoaded = 0;
	this._data = [];
	this._loadingBufferData = false;
	var $this = this;

	//set any params passed.
	for(var key in params)
		this[key] = params[key];

	//this function actually sets up everything. Eventually the user shouldn't need to call this. Instead just call it internall after every function call and during this initialization.
	this.dostuff = function() {
		if(!this.requirementsMet())
			return;

		var url = this.url({});	//TODO: what do i put in here?
		ajaxget(url, function() {
			var objs = JSON.parse(this.responseText);
			$this._data = objs;

			$this.bufferTiles();
		});

		//TODO: What if they are scrolling in an div? I'll need to think of a more clever solution
		window.onscroll = function() {
			var body = document.body,
			html = document.documentElement;

			var height = Math.max( body.scrollHeight, body.offsetHeight, 
				html.clientHeight, html.scrollHeight, html.offsetHeight );

			if(window.scrollY + window.innerHeight > height-200)
			{
				//if we are already buffering, then don't buffer more, else...
				if(!$this._loadingBufferData)
				{
					$this.currentMaxTiles += $this.tilesToBuffer;
					$this.bufferTiles();
				}
			}
		};
	};

	this.bufferTiles = function()
	{
		//if we want to buffer more than we currently have, then try and get more tiles.
		if(this.moreResults && this.currentMaxTiles > this._data.length)
		{
			console.log('grabbing more data');
			this._loadingBufferData = true; //lock, so we don't do more calls
			var firstIndex = this._data.length;
			var lastIndex = this.currentMaxTiles;
			var pageNum = (this.currentMaxTiles - this.initTilesToBuffer) / this.tilesToBuffer;
			var url = this.moreResults(pageNum, firstIndex, lastIndex);
			ajaxget(url, function() {
				var newResults = JSON.parse(this.responseText);
				for(var i=0; i!=newResults.length; ++i)
					$this._data.push(newResults[i]);
				console.log("more data acquired. Length: " + $this._data.length);
				$this._loadingBufferData = false; //done loading, remove lock
				$this.bufferTiles();
			});
			return; //exit out of the buffer function... we call it again in ajax.
		}

		for(var i=this._containersLoaded; i < this._data.length && i < this.currentMaxTiles; ++i)
		{
			var html = this.customTile(this._data[i]);
			var div = document.createElement("div");
			div.innerHTML = html;
			this.container.appendChild(div.children[0]);
			this._containersLoaded = i;
		}

		console.log("finished loading more containers. count: " + this.container.children.length);
	}

	this.requirementsMet = function() {
		var requirements = ["container", "url", "moreResults"];
		for(var i=0; i!=requirements.length; ++i)
			if(!this[requirements[i]]) //TODO: should be "unedfined"
				return false;
		
		return true;
	};
}

//TODO: the callback should have the return str as a parameter, also perhaps allow the ajaxget caller to assign this to the cb.
function ajaxget(url, cb)
{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET", url);
		xmlhttp.onload = cb;
		xmlhttp.send();
}
