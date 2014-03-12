function DotPlot(element, config) {
    this.configure = function(config) {
        this.config = config || {};

        this.config.size = this.config.size || {
            width: 800,
            height: 600
        };
        
//        this.config.extent = this.config.extent || {
//        	width: 1,
//        	height: 1
//        }
        
        this.config.zoomSpeed = this.config.zoomSpeed || 1000;
        this.config.dragSpeed = this.config.dragSpeed || 1;
    }

    this.clear = function() {
        //g.clearRect( origin.x, origin.y, dim.width/scale, dim.height/scale );
    	this.context.clearRect(0, 0, this.config.extent.width, this.config.extent.height);
    }

    this.render = function() {
    	var data = this.fetch(this.origin.x, this.origin.y, 
    			this.view.width, this.view.height );
     	for (i = 0; i < data.length; i++) {
     		//console.log(data[i].x + ' ' + data[i].y);
     		if (data[i].color) {
     			this.context.fillStyle = data[i].color;
     		}
     		else {
     			this.context.fillStyle = 'black';
     		}
     		var x = data[i].x;
     		var y = data[i].y;
     		//console.log(x + ' ' + y);
     		this.context.fillRect( x, y, 1000, 1000 );
    	}
     	
     	// Draw frame around canvas
     	this.context.lineWidth = 1000;
     	this.context.strokeRect( 0, 0, this.config.extent.width-1, this.config.extent.height-1 );
    }
    
    this.translate = function translate(x, y) {
    	//console.log('translate: x,y=' + x + ',' + y + ' origin=' + origin.x + ',' + origin.y + ' scale=' + scale + ' w,h=' + view.width + ',' + view.height);

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
    }
    
    this.redraw = function() {
    	this.clear();
    	this.render();
    }

    this.onmousewheel = function (e) {
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
        	
//        var newScale = this.scale * zoom;
//        if (newScale < 1) { // limit zoom out to full-size
//        	newScale = 1;
//        	zoom = newScale / this.scale;
//        }
        var tx = ( mousex / this.xscale + this.origin.x - mousex / newXScale );
        var ty = ( mousey / this.yscale + this.origin.y - mousey / newYScale );
        
        this.xscale = newXScale;
        this.yscale = newYScale;
        this.view.width = this.config.size.width / this.xscale;
        this.view.height = this.config.size.height / this.yscale;
        console.log(this.view.width + ' ' + this.view.height)
        
        // Check bounds - FIXME: can this be rewritten to use translate() ...?
        if (tx < 0)
        	tx = 0;
        else if (tx + this.view.width >= this.config.extent.width)
        	tx = this.config.extent.width - this.view.width;
        if (ty < 0)
        	ty = 0;
        else if (ty + this.view.height >= this.config.extent.height)
        	ty = this.config.extent.height - this.view.height;
        
        console.log('zoom wheel='+wheel+' xzoom='+xzoom+' yzoom='+yzoom+' xscale='+this.xscale + ' yscale=' + this.yscale + ' trans=' + tx + ',' + ty + ' origin=' + this.origin.x + ',' + this.origin.y)
        
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
        this.mouse.dragOffset.x = e.x;
        this.mouse.dragOffset.y = e.y;
        this.mouse.isDown = true;
    };

    this.onmouseup = function(e) {
        //if (this.mouse.isDown) this.mouseClick(e);
        this.mouse.isDown = false;
    };

    this.onmousemove = function(e) {
        if (!this.mouse.isDown) return;
        //if (this.scale == 1) return;

        var tx = (e.x - this.mouse.dragOffset.x) / this.xscale;// / this.config.dragSpeed;
        var ty = (e.y - this.mouse.dragOffset.y) / this.yscale;// / this.config.dragSpeed;
        //console.log('mousemove: e=' + e.x + ',' + e.y + ' trans=' + tx + ',' + ty + ' origin=' + origin.x + ',' + origin.y + ' scale=' + scale);
        
        this.translate(tx, ty);
        this.redraw();
    };
    
//    this.load = function(data) {
//    	this.data = data;
//    };
    
    this.setFetch = function(fetch) {
    	this.fetch = fetch;
    }
    
    // Initialize
    
    this.element = element;
    this.configure(config);
    this.element.width = this.config.size.width;
    this.element.height = this.config.size.height;
    
    // TODO verify element is of type canvas
    this.context = element.getContext('2d');
    
    this.xscale = this.config.size.width / this.config.extent.width;
    this.yscale = this.config.size.height / this.config.extent.height;
    this.context.scale(this.xscale, this.yscale);
    
    this.origin = { x: 0, y: 0 };
    this.view = { width: this.config.extent.width, height: this.config.extent.height };
    
    this.mouse = {
    	isDown: false,
        dragOffset: { x: 0, y: 0 }
    };
    
    console.log('init xscale='+this.xscale+' yscale='+this.yscale);
}
