//function Controller(elements, config) {
//	this.elements = elements;
//	
//}

function Rule(element, config) {
    this.configure = function(config) {
        this.config = config || {};
        this.selectionBuffer;

        if (this.config.style) {
        	applyStyles(this.element, this.config.style);
        }
        
        this.config.size = this.config.size || {
            width: 800,
            height: 50
        };
        
        this.config.zoomSpeed = this.config.zoomSpeed || 1000;
        this.config.dragSpeed = this.config.dragSpeed || 10;
        
        this.config.orientation = this.config.orientation || 'horizontal';
        if (this.config.orientation == 'horizontal') {
        	this.length = this.config.size.width;
        }
        else {
        	this.length = this.config.size.height;
        }
        
        if (this.config.labels) {
        	this.labels = [];
        	for (var i = 0, pos = 0; i < this.config.labels.length; i++) {
        		var label = this.config.labels[i];
        		pos += label.length/2;
        		this.labels.push({ pos: pos, text: label.name });
        		pos += label.length/2;
        	}
        }
    };
    
	this.onmousewheel = function(e) {
        var mousex = e.clientX - this.element.offsetLeft;
        var mousey = e.clientY - this.element.offsetTop;
        var mousePos = ( this.config.orientation == 'horizontal' ? mousex : mousey );
        var wheel = e.wheelDelta / this.config.zoomSpeed;

        // Calculate new scale and origin
        var zoom = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1);

        var minScale = this.length / this.config.extent;
        var newScale = this.scale * zoom;
        if (newScale < minScale) {
            newScale = minScale;
            zoom = newScale / this.scale;
        }

        var trans = ( mousePos / this.scale + this.origin - mousePos / newScale );

        this.scale = newScale;
        this.view = this.length / this.scale;
        this.origin = trans;
        
        // Check bounds
        if (this.origin < 0) {
        	this.view += this.origin;
        	this.origin = 0;
        }
        else if (this.origin + this.view >= this.config.extent) {
        	this.origin = this.config.extent - this.view;
        }

        //console.log("xaxis zoom wheel="+wheel+" zoom="+zoom+" scale="+this.scale + " trans=" + trans + " origin=" + this.origin + " view=" + this.view);

        // Redraw
        this.redraw();
	}
	
    this.highlight = function(x, y, width, height) {
        console.log('ruler highlight: '+x+' '+y+' '+width+' '+height);

        var x1 = Math.min(x, x + width),
            y1 = Math.min(y, y + height),
            w  = Math.abs(width),
            h  = Math.abs(height);

        // Check for zero length
        if (w === 0 || h === 0) return;

        if (this.config.orientation == 'horizontal') {
            restoreSelection(this.context, x1, 0);
            saveSelection(this.context, x1, 0, w, this.config.size.height-1, 0.1);
            drawRect(this.context, x1, 0, w, this.config.size.height-1, 0.1);
        } else {
            restoreSelection(this.context, 0, y1);
            saveSelection(this.context, x1, 0, w, this.config.size.height-1, 0.1);
            drawRect(this.context, 0, y1, this.config.size.width-1, height, 0.1);
        }
    }
	
    this.select = function(x, y, width, height) {
    	var pos = (this.config.orientation == 'horizontal' ? x : y);
    	var trans = pos/this.scale;
    	this.view = (this.config.orientation == 'horizontal' ? width : height)/this.scale;
    	var newScale = this.length / this.view;
    	var zoom = newScale / this.scale;
    	this.scale = newScale;
    	
//    	this.context.translate( this.origin.x, this.origin.y );
//    	this.context.scale(xzoom, yzoom);
//    	this.context.translate(-tx, -ty);
    	
    	this.origin = trans;
    	console.log('ruler select: '+x+','+y+','+width+','+height+' trans='+trans+' '+this.scale);
    	
    	this.redraw();
    }
	
    this.onmousedown = function(e) {
        this.mouse.drag.offset.x = e.x;
        this.mouse.drag.offset.y = e.y;
        this.mouse.isDown = true;
    };

    this.onmouseup = function(e) {
        //if (this.mouse.isDown) this.mouseClick(e);
        this.mouse.isDown = false;
    };
	
    this.onmousemove = function(e) {
        if (!this.mouse.isDown) return;
        if (this.view == this.config.extent) return; // can't move, zoomed out all the way

        var mousePos, mouseOfs;
        if (this.config.orientation == 'horizontal') {
        	mousePos = e.x;
        	mouseOfs = this.mouse.drag.offset.x;
        }
        else {
        	mousePos = e.y;
        	mouseOfs = this.mouse.drag.offset.y;
        }
        
        var trans = (mousePos - mouseOfs) / this.scale / this.config.dragSpeed;
        //console.log("xaxis mousemove: e=" + mousePos + " trans=" + trans + " origin=" + this.origin + " width=" + this.view + " scale=" + this.scale);

        // Check bounds
        if (this.origin - trans < 0)
        	trans = this.origin;
        else if (this.origin + this.view - trans >= this.config.extent)
        	trans = this.origin + this.view - this.config.extent;

        // Translate
        this.origin -= trans;
        
        this.redraw();
    }	
	
	this.clear = function() {
		this.context.clearRect(0, 0, element.width, element.height);
	}
	
	this.drawTick = function(pos) {
		var ctx = this.context;
		var x = this.scale * pos;
		ctx.beginPath();
		ctx.moveTo(x, element.height-11);
		ctx.lineTo(x, element.height);
		ctx.stroke();
		drawText(ctx, toUnits(pos), x, element.height-13, { rotate: 45, font: '6pt Arial'});
	}
	
	this.draw = function() {
		var ctx = this.context;
		
		// Draw ruler tick marks/labels
		ctx.lineWidth = .2;
		var tick = roundBase10(this.view/10);
		var guStart = roundBase10(this.origin) + tick;
		var pxStart = this.scale+int(tick*this.scale);
		for (var pxPos = pxStart, guPos = guStart; pxPos < this.length-tick*this.scale/2; pxPos += tick*this.scale, guPos += tick) {
			// TODO optimize this code
			if (this.config.orientation == 'horizontal') {
				ctx.beginPath();
				ctx.moveTo(pxPos, element.height-11);
				ctx.lineTo(pxPos, element.height);
				ctx.stroke();
				drawText(ctx, toUnits(guPos), pxPos, element.height-13, { rotate: 45, font: '6pt Arial'});
			}
			else {
				ctx.beginPath();
				ctx.moveTo(element.width-11, pxPos);
				ctx.lineTo(element.width, pxPos);
				ctx.stroke();
				drawText(ctx, toUnits(guPos), element.width-32, pxPos+20, { rotate: 45, font: '6pt Arial'});
			}
		}
		
		// Draw chromosome labels
		// TODO: keep label centered within chromosome as long as any part of chromosome is visible
		if (this.labels) {
			for (var i = 0; i < this.labels.length; i++) {
				var label = this.labels[i];
				var pxPos = int((label.pos-this.origin) * this.scale);
				if (pxPos >= 0 && pxPos <= this.length) {
					if (this.config.orientation == 'horizontal')
						drawText(ctx, label.text, pxPos, element.height-1, { align: 'center', rotate: 0, font: 'bold 12pt Arial'});
					else
						drawText(ctx, label.text, element.width-3, pxPos+3, { align: 'right', rotate: 0, font: 'bold 12pt Arial'});
				}
			}
		}
	}
	
    this.redraw = function() {
        this.clear();
        this.draw();
    };
    
    this.element = element;
    this.configure(config);
    this.element.width = this.config.size.width;
    this.element.height = this.config.size.height;
	this.context = element.getContext("2d");

    this.origin = 0;  // gu
    this.view = this.config.extent; // gu
    this.scale = this.length / this.config.extent; // px/gu
    
    this.mouse = {
        isDown: false,
        drag: {
        	x: 0,
        	y: 0,
        	offset: {
        		x: 0,
        		y: 0
        	}
        }
    };    
}

function DotPlot(element, chr1, chr2, config) {
    this.configure = function(config) {
        this.config = config || {};
        
        if (this.config.style) {
        	applyStyles(this.element, this.config.style);
        }

        this.config.size = this.config.size || {
            width: 800,
            height: 600
        };

        this.config.zoomSpeed = this.config.zoomSpeed || 1000;
        this.config.dragSpeed = this.config.dragSpeed || 10;
        
        this.chr1 = chr1;
        this.chr2 = chr2;
    };

    this.clear = function() {
        //g.clearRect( origin.x, origin.y, dim.width/scale, dim.height/scale );
        this.context.clearRect(0, 0, this.config.extent.width, this.config.extent.height);
    };
    
    this.drawChromosomes = function() { //FIXME: use drawRect() instead
    	var ctx = this.context;
        //ctx.imageSmoothingEnabled = false;
        ctx.lineWidth = 1 / this.xscale / 2; // same size regardless of zoom
        for (var i = 0, x = 0; i < this.chr1.length-1; i++) {
        	x += this.chr1[i].length;
        	drawLine(ctx, x, 1, x, this.config.extent.height-1);
        }
        ctx.lineWidth = 1 / this.yscale / 2; // same size regardless of zoom
        for (var i = 0, y = 0; i < this.chr2.length-1; i++) {
        	y += this.chr2[i].length;
        	drawLine(ctx, 1, y, this.config.extent.width-1, y);
        }
    }
    
    this.drawDots = function() {
    	if (!data) return;
    	
    	var ctx = this.context;
        for (var i = 0; i < data.length; i++) {
//            if (data[i].color)
//                this.context.fillStyle = data[i].color;
//            else
//                this.context.fillStyle = "black";
            var x = data[i].x;
            var y = data[i].y;
            ctx.fillRect( x, y, 1000, 1000 );
//            ctx.beginPath();
//            ctx.moveTo(x, y);
//            ctx.lineTo(x+1000, y-1000);
//            ctx.stroke();
        }
    }
    
    this.drawBorder = function() {
        // Draw frame around canvas
    	drawScaledRect(this.context, 0, 0, this.config.extent.width, this.config.extent.height, this.xscale, this.yscale);
    }
    
    this.render = function() {
    	if (!this.fetch) return;

    	//var startTime = Date.now();
    	
        var data = this.fetch(this.origin.x, this.origin.y,
                			  this.view.width, this.view.height );
        
        this.drawChromosomes();
        this.drawDots();
        this.drawBorder();
        
        //console.log('render time: ' + (Date.now() - startTime));
    };
    
    this.translate = function translate(x, y) {
        //console.log("translate: x,y=" + x + "," + y + " origin=" + origin.x + "," + origin.y + " scale=" + scale + " w,h=" + view.width + "," + view.height);

        // Check bounds
        if (this.origin.x - x < 0)
            x = this.origin.x;
        else if (this.origin.x + this.view.width - x >= this.config.extent.width)
            x = this.origin.x + this.view.width - this.config.extent.width;
        if (this.origin.y - y < 0)
            y = this.origin.y;
        else if (this.origin.y + this.view.height - y >= this.config.extent.height)
            y = this.origin.y + this.view.height - this.config.extent.height;

        // Translate
        this.context.translate( x, y );
        this.origin.x -= x;
        this.origin.y -= y;
    };

    this.redraw = function() {
        this.clear();
        this.render();
    };
    
    this.highlight = function(x, y, width, height) {
        var x1 = Math.min(x, x + width),
            y1 = Math.min(y, y + height),
            w  = Math.abs(width),
            h  = Math.abs(height);

        // Check for zero length
        if (w === 0 || h === 0) return;

        restoreSelection(this.context);
        saveSelection(this.context, x1, y1, w, h);
        drawRect(this.context, x1, y1, w, h, 0.1);
    }
    
    this.select = function(x, y, width, height) {
    	var tx = x/this.xscale;
    	var ty = y/this.yscale;
    	this.view.width = width/this.xscale;
    	this.view.height = height/this.yscale;

    	var newXScale = this.config.size.width / this.view.width;
    	var newYScale = this.config.size.height / this.view.height;
    	var xzoom = newXScale / this.xscale;
    	var yzoom = newYScale / this.yscale;
    	
    	this.xscale = newXScale;
    	this.yscale = newYScale;
    	
    	this.context.translate( this.origin.x, this.origin.y );
    	this.context.scale(xzoom, yzoom);
    	this.context.translate(-tx, -ty);
    	
    	this.origin.x = tx;
    	this.origin.y = ty;
    	//console.log('select: '+x+','+y+','+width+','+height+' t='+tx+','+ty+' '+this.xscale+' '+this.yscale);
    	
    	this.redraw();
    }

    this.onmousewheel = function (e, axis) {
        var mousex = e.clientX - this.element.offsetLeft;
        var mousey = e.clientY - this.element.offsetTop;
        var wheel = e.wheelDelta / this.config.zoomSpeed;

        // Calculate new scale and origin
        var zoom = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1);
        var xzoom, yzoom;
        xzoom = yzoom = zoom;

        var minXScale = this.config.size.width / this.config.extent.width;
        var newXScale = this.xscale * zoom;
        if (newXScale < minXScale) {
            newXScale = minXScale;
            xzoom = newXScale / this.xscale;
        }

        var minYScale = this.config.size.height / this.config.extent.height;
        var newYScale = this.yscale * zoom;
        if (newYScale < minYScale) {
            newYScale = minYScale;
            yzoom = newYScale / this.yscale;
        }

        if (axis == 'x') {
        	yzoom = 1;
        	newYScale = this.yscale;
        }
        else if (axis == 'y') {
        	xzoom = 1;
        	newXScale = this.xscale;       	
        }
        
        var tx = ( mousex / this.xscale + this.origin.x - mousex / newXScale );
        var ty = ( mousey / this.yscale + this.origin.y - mousey / newYScale );

        this.xscale = newXScale;
        this.yscale = newYScale;
        this.view.width = this.config.size.width / this.xscale;
        this.view.height = this.config.size.height / this.yscale;

        // Check bounds - FIXME: can this be rewritten to use translate() ...?
        if (tx < 0)
            tx = 0;
        else if (tx + this.view.width >= this.config.extent.width)
            tx = this.config.extent.width - this.view.width;
        if (ty < 0)
            ty = 0;
        else if (ty + this.view.height >= this.config.extent.height)
            ty = this.config.extent.height - this.view.height;

        //console.log("dp zoom wheel="+wheel+" xzoom="+xzoom+" yzoom="+yzoom+" xscale="+this.xscale + " yscale=" + this.yscale + " trans=" + tx + "," + ty + " origin=" + this.origin.x + "," + this.origin.y)

        // Zoom
        this.context.translate( this.origin.x, this.origin.y );
        this.context.scale( xzoom, yzoom );
        this.context.translate( -tx, -ty );
        this.origin.x = tx;
        this.origin.y = ty;
        
        // Redraw
        this.redraw();
    };

    this.onmousedown = function(e) {
        this.mouse.drag.offset.x = e.x;
        this.mouse.drag.offset.y = e.y;
        this.mouse.isDown = true;
    };

    this.onmouseup = function(e) {
        //if (this.mouse.isDown) this.mouseClick(e);
        this.mouse.isDown = false;
    };

    this.onmousemove = function(e, axis) {
        if (!this.mouse.isDown) return;
        if (this.isMinScale()) return; // can't move, zoomed-out all the way

        var tx = 0;
        var ty = 0;
        
        if (!axis || axis == 'x')
        	tx = (e.x - this.mouse.drag.offset.x) / this.xscale / this.config.dragSpeed;
        if (!axis || axis == 'y')
        	ty = (e.y - this.mouse.drag.offset.y) / this.yscale / this.config.dragSpeed;
        //console.log("mousemove: e=" + e.x + "," + e.y + " trans=" + tx + "," + ty + " origin=" + this.origin.x + "," + this.origin.y + " scale=" + this.scale);

        this.translate(tx, ty);
        this.redraw();
    };

    this.isMinScale = function() {
        var minXScale = this.config.size.width / this.config.extent.width;
        var minYScale = this.config.size.height / this.config.extent.height;
        return (this.xscale == minXScale && this.yscale == minYScale);
    }
    
//    this.load = function(data) {
//      this.data = data;
//    };

    this.setFetch = function(fetch) {
        this.fetch = fetch;
    };

    // Initialize
    this.element = element;
    this.configure(config);
    this.element.width = this.config.size.width;
    this.element.height = this.config.size.height;

    // TODO verify element is of type canvas
    this.context = element.getContext("2d");

    this.xscale = this.config.size.width / this.config.extent.width; // px/gu
    this.yscale = this.config.size.height / this.config.extent.height; // px/gu
    this.context.scale(this.xscale, this.yscale);

    this.origin = { x: 0, y: 0 }; // gu
    this.view = { width: this.config.extent.width, height: this.config.extent.height }; // gu

    this.mouse = {
        isDown: false,
        drag: {
        	x: 0,
        	y: 0,
        	offset: {
        		x: 0,
        		y: 0
        	}
        }
    };

   console.log("init xscale="+this.xscale+" yscale="+this.yscale);
}

function toUnits(n) {
	var k = 1000;
	var sizes = ['', 'K', 'M', 'G', 'T'];
	if (n === 0) return '0';
	var i = parseInt(Math.floor(Math.log(n) / Math.log(k)),10);
	var prec = 4;
	//if (n % 1 === 0) prec = 1;
	return (n / Math.pow(k, i)).toPrecision(prec) + ' ' + sizes[i];
}

//humanReadableNumber: function( num ) {
//    num = parseInt(num);
//    var suffix = '';
//    if( num >= 1e12 ) {
//        num /= 1e12;
//        suffix = 'T';
//    } else if( num >= 1e9 ) {
//        num /= 1e9;
//        suffix = 'G';
//    } else if( num >= 1e6 ) {
//        num /= 1e6;
//        suffix = 'M';
//    } else if( num >= 1000 ) {
//        num /= 1000;
//        suffix = 'K';
//    }
//
//    return (num.toFixed(2)+' '+suffix).replace(/0+ /,' ').replace(/\. /,' ');
//}

function commify(val) {
//    my $text = reverse $_[0];
//    $text =~ s/(\d\d\d)(?=\d)(?!\d*\.)/$1,/g;
//    return scalar reverse $text;
}

function log10(n) {
	return Math.log(n) / Math.log(10);
}

function roundPow10(n) {
	return Math.pow(10, Math.ceil(log10(n)));
}

function roundBase10(n) {
	if (n === 0) return 0;
	var acc = Math.pow(10, Math.floor(log10(n)));
	return Math.round(n / acc) * acc;	
}

function int(floatvalue) {
	return Math.floor( floatvalue );
}

function drawLine(context, x1, y1, x2, y2, lineWidth) {
	if (lineWidth)
		context.lineWidth = lineWidth;
	context.beginPath();
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
}

function drawScaledRect(context, x1, y1, x2, y2, xscale, yscale) {
	context.lineWidth = 1 / xscale; // same size regardless of zoom
	drawLine(context, x1, y1, x2, y1);
	drawLine(context, x1, y2, x2, y2);
	context.lineWidth = 1 / yscale; // same size regardless of zoom
	drawLine(context, x1, y1+1, x1, y2-1);
	drawLine(context, x2, y1+1, x2, y2-1);
}

function restoreSelection(context) {
    if (this.selectionBuffer !== undefined) {
        var x = this.selectionBuffer[0],
            y = this.selectionBuffer[1];

        context.putImageData(this.selectionBuffer[2], x, y);
        this.selectionBuffer = undefined;
    }
}

function saveSelection(context, x, y , width, height) {
    this.selectionBuffer = [x, y, context.getImageData(x, y, width, height)];
}

function drawRect(context, x, y, width, height, alpha) {
	if (typeof(alpha) == "undefined")
		alpha = 1;
	var image = context.getImageData(x, y, width, height);
	for (var i = 0, pos = 0; i < width*height;  i++, pos += 4) {
		//image.data[pos] = 0;
		//image.data[pos+1] = 0;
		//image.data[pos+2] = 0;
		image.data[pos+3] = Math.max(image.data[pos+3],alpha * 255);
	}
	context.putImageData(image, x, y);
}

function drawText(context, text, x, y, options) {
	context.save();
	if (options && (options.align || options.valign)) {
		var metrics = context.measureText(text);
		if (options.align == 'center')
			x -= metrics.width/2;
		else if (options.align == 'right')
			x -= metrics.width+1;
		//if (options.valign == 'middle')
		//	y -= metrics.height/2;
	}
	context.translate(x, y);
	if (options && options.rotate)
		context.rotate(-2 * Math.PI * (options.rotate/365));
	if (options && options.font)
		context.font = options.font;
	context.fillText(text, 0, 0);
	context.restore();
}

/**
* Source: http://www.rgraph.net/blog/2013/january/measuring-text-height-with-html5-canvas.html
* Measures text by creating a DIV in the document and adding the relevant text to it.
* Then checking the .offsetWidth and .offsetHeight. Because adding elements to the DOM is not particularly
* efficient in animations (particularly) it caches the measured text width/height.
* 
* @param  string text   The text to measure
* @param  bool   bold   Whether the text is bold or not
* @param  string font   The font to use
* @param  size   number The size of the text (in pts)
* @return array         A two element array of the width and height of the text
*/
function measureText(text, bold, font, size)
{
    // This global variable is used to cache repeated calls with the same arguments
    var str = text + ':' + bold + ':' + font + ':' + size;
    if (typeof(__measuretext_cache__) == 'object' && __measuretext_cache__[str]) {
        return __measuretext_cache__[str];
    }

    var div = document.createElement('DIV');
        div.innerHTML = text;
        div.style.position = 'absolute';
        div.style.top = '-100px';
        div.style.left = '-100px';
        div.style.fontFamily = font;
        div.style.fontWeight = bold ? 'bold' : 'normal';
        div.style.fontSize = size + 'pt';
    document.body.appendChild(div);
    
    var size = [div.offsetWidth, div.offsetHeight];

    document.body.removeChild(div);
    
    // Add the sizes to the cache as adding DOM elements is costly and can cause slow downs
    if (typeof(__measuretext_cache__) != 'object') {
        __measuretext_cache__ = [];
    }
    __measuretext_cache__[str] = size;
    
    return size;
}

function applyStyles(element, styles) {
	for (var prop in styles) {
		//alert(prop + " is " + styles[prop]);
		element.style[prop] = styles[prop];
	}
}
