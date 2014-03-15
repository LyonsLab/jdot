//function Controller(elements, config) {
//	this.elements = elements;
//	
//}

function Rule(element, config) {
    this.configure = function(config) {
        this.config = config || {};

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

        console.log("xaxis zoom wheel="+wheel+" zoom="+zoom+" scale="+this.scale + " trans=" + trans + " origin=" + this.origin + " view=" + this.view);

        // Redraw
        this.redraw();
	}
	
    this.onmousedown = function(e) {
        this.mouse.drag.offset = e.x;
        this.mouse.isDown = true;
    };

    this.onmouseup = function(e) {
        //if (this.mouse.isDown) this.mouseClick(e);
        this.mouse.isDown = false;
    };
	
    this.onmousemove = function(e) {
        if (!this.mouse.isDown) return;
        if (this.view == this.config.extent) return; // can't move, zoomed out all the way

        var tx = (e.x - this.mouse.drag.offset) / this.scale / this.config.dragSpeed;
        console.log("xaxis mousemove: e=" + e.x + " trans=" + tx + " origin=" + this.origin + " width=" + this.view + " scale=" + this.scale);

        //console.log("translate: x,y=" + x + "," + y + " origin=" + origin.x + "," + origin.y + " scale=" + scale + " w,h=" + view.width + "," + view.height);

        // Check bounds
        if (this.origin - tx < 0)
            tx = this.origin;
        else if (this.origin + this.view - tx >= this.config.extent)
            tx = this.origin + this.view - this.config.extent;

        // Translate
        //this.context.translate( tx, 0 );
        this.origin -= tx;
        
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
		ctx.lineWidth = .2;
		var tick = roundBase10(this.view/10);
		var start = roundBase10(this.origin) + tick;
		//console.log('tick='+tick+' origin='+this.origin+' start='+start);
		for (var x = this.scale+int(tick*this.scale), pos = start;  x < this.length-tick*this.scale/2;  x += tick*this.scale, pos += tick) {
			//console.log('x=' + x + ' pos=' + pos + ' scale=' + this.scale);
			
			if (this.config.orientation == 'horizontal') {
				ctx.beginPath();
				ctx.moveTo(x, element.height-11);
				ctx.lineTo(x, element.height);
				ctx.stroke();
				drawText(ctx, toUnits(pos), x, element.height-13, { rotate: 45, font: '6pt Arial'});
			}
			else {
				ctx.beginPath();
				ctx.moveTo(element.width-11, x);
				ctx.lineTo(element.width, x);
				ctx.stroke();
				drawText(ctx, toUnits(pos), element.width-32, x+20, { rotate: 45, font: '6pt Arial'});
			}
		}
		
		if (this.labels) {
			for (var i = 0; i < this.labels.length; i++) {
				var label = this.labels[i];
				var x = int((label.pos-this.origin) * this.scale);
				if (x >= 0 && x <= this.length) {
					var x = int((label.pos-this.origin) * this.scale);
					if (this.config.orientation == 'horizontal')
						drawText(ctx, label.text, x, element.height-1, { align: 'center', rotate: 0, font: 'bold 12pt Arial'});
					else
						drawText(ctx, label.text, element.width-3, x, { align: 'right', rotate: 0, font: 'bold 12pt Arial'});
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

    this.origin = 0;
    this.view = this.config.extent;
    this.scale = this.length / this.config.extent;
    
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
        //ctx.globalAlpha = this.view.width * this.xscale;
        //ctx.imageSmoothingEnabled = false;
        ctx.lineWidth = 1 / this.yscale / 2; // same size regardless of zoom
        //console.log('view.width='+this.view.width + ' xscale=' + this.xscale + ' ' + ' lineWidth=' + ctx.lineWidth + ' alpha=' + ctx.globalAlpha);
        for (var i = 0, x = 0; i < this.chr1.length-1; i++) {
        	x += this.chr1[i].length;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, this.config.extent.height-1);
			ctx.stroke();
        }
        ctx.lineWidth = 1 / this.xscale / 2; // same size regardless of zoom
        for (var i = 0, y = 0; i < this.chr2.length-1; i++) {
        	y += this.chr2[i].length;
        	ctx.beginPath();
        	ctx.moveTo(0, y);
        	ctx.lineTo(this.config.extent.width-1, y);
        	ctx.stroke();
        }
    }
    
    this.drawDots = function() {
    	var ctx = this.context;
//      ctx.lineWidth = 20;
        ctx.globalAlpha = 1;
        for (var i = 0; i < data.length; i++) {
//            if (data[i].color) {
//                this.context.fillStyle = data[i].color;
//            }
//            else {
//                this.context.fillStyle = "black";
//            }
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
    	var ctx = this.context;
        ctx.lineWidth = 1 / Math.min(this.xscale, this.yscale); // same size regardless of zoom
        ctx.strokeRect( 0, 0, this.config.extent.width-1, this.config.extent.height-1 );
    }
    
    this.render = function() {
    	if (!this.fetch) return;
    	
        var data = this.fetch(this.origin.x, this.origin.y,
                			  this.view.width, this.view.height );
        var ctx = this.context;
        
        this.drawChromosomes();
        this.drawDots();
        this.drawBorder();
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
    
    this.select = function(x, y, width, height) {
    	drawRect(this.context, x, y, width, height, 0.1);
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

        console.log("dp zoom wheel="+wheel+" xzoom="+xzoom+" yzoom="+yzoom+" xscale="+this.xscale + " yscale=" + this.yscale + " trans=" + tx + "," + ty + " origin=" + this.origin.x + "," + this.origin.y)

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
        //if (this.scale == 1) return;

        var tx = 0;
        var ty = 0;
        
        if (!axis || axis == 'x')
        	tx = (e.x - this.mouse.drag.offset.x) / this.xscale / this.config.dragSpeed;
        if (!axis || axis == 'y')
        	ty = (e.y - this.mouse.drag.offset.y) / this.yscale / this.config.dragSpeed;
        console.log("mousemove: e=" + e.x + "," + e.y + " trans=" + tx + "," + ty + " origin=" + this.origin.x + "," + this.origin.y + " scale=" + this.scale);

        this.translate(tx, ty);
        this.redraw();
    };

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

    this.xscale = this.config.size.width / this.config.extent.width;
    this.yscale = this.config.size.height / this.config.extent.height;
    this.context.scale(this.xscale, this.yscale);

    this.origin = { x: 0, y: 0 };
    this.view = { width: this.config.extent.width, height: this.config.extent.height };

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

function drawRect(context, x, y, width, height, alpha) {
	if (typeof(alpha) == "undefined")
		alpha = 1;
	var image = context.getImageData(x, y, width, height);
	for (var i = 0, pos = 0; i < width*height;  i++, pos += 4) {
		//image.data[pos] = 0;
		//image.data[pos+1] = 0;
		//image.data[pos+2] = 0;
		image.data[pos+3] = alpha * 255;
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
