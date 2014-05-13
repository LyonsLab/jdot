function MultiDotPlot(id, config) {
    this.constructor = function() {
        this.element = document.getElementById(id);
        if (!this.element) {
            console.log("MultiDotPlot: error: id '"+id+"' not found");
            return;
        }

        this.configure(config);

        if (!this.config.genomes) {
            console.log("MultiDotPlot: no genomes specified");
        }

        this.controller = new Controller();

        var numGenomes = this.config.genomes.length;
        var dpPadding = 15;
        var dpWidth = config.size.width / numGenomes - dpPadding;
        var dpHeight = config.size.height / numGenomes - dpPadding;
        this.dotplots = [];
        for (var i = 0; i < numGenomes; i++) {
            for (var j = 0;  j < numGenomes; j++) {
                var div = createDiv(this.element, this.element.id+"_"+i+"_"+j);
                var dotplot = new DotPlot(div.id, {
                    size: { width: dpWidth, height: dpHeight },
                    genomes: [ this.config.genomes[i], this.config.genomes[j] ],
                    fetchDataHandler: this.config.fetchDataHandler,
                    controller: this.controller,
                    disableRulers: false,
                    gridCol: i,
                    gridRow: j,
                    style: {
                        left: (i * dpWidth) + "px",
                        top:  (j * dpHeight) + "px",
                        position: "relative"
                    }
                });
                this.dotplots.push(dotplot);
            }
        }
    };

    this.configure = function(config) {
        this.config = config || {};

        this.config.size = this.config.size || {
            width: 800,
            height: 600
        };

        if (this.config.style) {
            applyStyles(this.element, this.config.style);
        }
    };

    this.redraw = function() {
        for (var i = 0; i < this.dotplots; i++) {
            this.dotplots[i].redraw();
        }
    };

    this.constructor();
}

function DotPlot(id, config) {
    this.constructor = function() {
        this.element = document.getElementById(id);
        if (!this.element) {
            console.log("DotPlot: error: id '"+id+"' not found");
            return;
        }

        this.configure(config);

        // Setup the UI controller
        this.controller = this.config.controller || new Controller();

        // Create Plot
        var ruleWidth = (config.disableRulers ? 0 : 75);
        var plotWidth = config.size.width - ruleWidth;
        var plotHeight = config.size.height - ruleWidth;
        var genome1 = config.genomes[0];
        var genome2 = config.genomes[1];
        this.plot = new Plot(
            createCanvas(this.element, "plot"+generateID()),
            {   size: { width: plotWidth, height: plotHeight },
                extent: { width: genome1.length, height: genome2.length },
                labels: { x: genome1.chromosomes, y: genome2.chromosomes },
                scaled: true,
                crosshairs: true,
                fetchDataHandler: config.fetchDataHandler,
                style: {
                    left: ruleWidth+"px",
                    top:  ruleWidth+"px",
                    position: "absolute"
                }
            }
        );
        this.controller.addListener(this.plot.drawable);

        // Create X and Y rulers
        if (!config.disableRulers) {
            if (!this.config.gridRow || this.config.gridRow === 0) {
                this.xrule = new Rule(
                    createCanvas(this.element, "xrule"+generateID()),
                    {   size: { width: plotWidth, height: ruleWidth }, //0 }, // zero height means auto-size
                        extent: { width: genome1.length, height: genome2.length },
                        orientation: "horizontal",
                        direction: "increasing",
                        scaled: false,
                        title: ((!this.config.gridRow || this.config.gridRow === 0) ? genome1.name : ""),
                        labels: genome1.chromosomes,
                        style: {
                            left: ruleWidth+"px",
                            top:  "0px",
                            position: "absolute"
                        }
                    }
                );
                this.controller.addListener(this.xrule.drawable);
            }

            if (!this.config.gridCol || this.config.gridCol === 0) {
                this.yrule = new Rule(
                    createCanvas(this.element, "yrule"+generateID()),
                    {   size: { width: ruleWidth /*0*/, height: plotHeight }, // zero width means auto-size
                        extent: { width: genome1.length, height: genome2.length },
                        orientation: "vertical",
                        direction: (this.config.origin === "northwest" ? "increasing" : "decreasing" ),
                        scaled: false,
                        title: ((!this.config.gridCol || this.config.gridCol === 0) ? genome2.name : ""),
                        labels: genome2.chromosomes,
                        style: {
                            left: "0px",
                            top:  ruleWidth+"px",
                            position: "absolute"
                        }
                    }
                );
                this.controller.addListener(this.yrule.drawable);
            }
        }
    };

    this.configure = function(config) {
        this.config = config || {};

        if (!this.config.genomes) {
            console.log("Error: no genomes");
            return;
        }

        this.config.size = this.config.size || {
            width: 800,
            height: 600
        };

        if (this.config.style) {
            applyStyles(this.element, this.config.style);
        }
    };

    this.redraw = function() {
        this.plot.redraw();
        if (this.xrule)
            this.xrule.redraw();
        if (this.yrule)
            this.yrule.redraw();
    };

    this.reset = function() {
        this.plot.zoom(0, 0, 0);
        this.xrule.zoom(0, 0, 0);
        this.yrule.zoom(0, 0, 0);
    };

    this.constructor();
}

function Controller(drawables, config) {
    // Common mouse and keyboard handler
    this.constructor = function() {
        this.config = config || {};
        this.config.zoomSpeed = this.config.zoomSpeed || 1000;
        this.config.dragSpeed = this.config.dragSpeed || 10;

        this.mouse = {
            target: undefined,
            isDown: false,
            drag: {
                x: 0,
                y: 0
            }
        };

        var me = this;
        document.onmousedown = function(e) { this.onmousedown.call(me, e); };
        document.onmouseup   = function(e) { this.onmouseup.call(me, e);   };
        document.onmousemove = function(e) { this.onmousemove.call(me, e); };

        this.drawables = drawables || [];
        this.drawables.forEach(function(item) {
            if (item)
                item.element.onmousewheel = function(e) { this.onmousewheel.call(me, e); };
        });

        document.onkeydown = function(e) { this.onkeydown.call(me, e); };
    };

    this.addListener = function(d) {
        this.drawables.push(d);
        var me = this;
        d.element.onmousewheel = function(e) { this.onmousewheel.call(me, e); };
    };

    this._getDrawableById = function(id) {
        var found;
        this.drawables.some(function(d) {
            if (d.element.id === id) {
                found = d;
                return true;
            }
        });
        return found;
    };

    this.onkeydown = function(e) {
        //console.log("keydown");
        var tx = 0, ty = 0;
        switch(e.keyCode) {
            case 37: tx = 5;  ty = 0;  break; // left
            case 38: tx = 0,  ty = 5;  break; // up
            case 39: tx = -5; ty = 0;  break; // right
            case 40: tx = 0;  ty = -5; break; // down
        }

        this.drawables.forEach(function(d) {
            if (d.drag && d.config.orientation === "both")
                d.drag(tx, ty);
        });

        //e.preventDefault();
    };

    this.onmousewheel = function(e) {
        //console.log("mousewheel");
        var loc = e.target.getBoundingClientRect();
        var mousex = e.x - loc.left;
        var mousey = e.y - loc.top;
        var wheel = e.wheelDelta / this.config.zoomSpeed;
        var zoom = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1);

        var selected = this._getDrawableById(e.target.id);
        if (!selected)
            return;

        this.drawables.forEach(function(d) {
            if (d.zoom &&
                (d.config.orientation === selected.config.orientation ||
                     d.config.orientation === "both" ||
                     selected.config.orientation === "both")
               )
            {
                d.zoom(mousex, mousey, zoom, selected.config.orientation);
            }
        });

        e.preventDefault();
    };

    this.onmousedown = function(e) {
        //console.log("mousedown");
        if (this.mouse.target && e.target !== this.mouse.target)
            return;

        this.mouse.target = e.target;
        var loc = e.target.getBoundingClientRect();
        this.mouse.drag.x = e.x - loc.left;
        this.mouse.drag.y = e.y - loc.top;
        this.mouse.isDown = true;
        this.mouse.shiftKey = e.shiftKey;
    };

    this.onmousemove = function(e) {
        var loc, x, y;

        if (this.mouse.isDown) { // mouse move
            return this.onmousedrag(e);
        }

        loc = e.srcElement.getBoundingClientRect();

        x = e.x - loc.left;
        y = e.y - loc.top;

        this.drawables.forEach(function (d) {
            if (d.hover && d.element === e.srcElement) {
                d.hover(x, y);
            }
        });
    };

    this.onmousedrag = function(e) {
        if (!this.mouse.target)
            return;

        var loc = this.mouse.target.getBoundingClientRect();
        var x1 = e.x - loc.left;
        var y1 = e.y - loc.top;

        var selected = this._getDrawableById(this.mouse.target.id);
        if (!selected)
            return;

        if (this.mouse.shiftKey) {
            var x2 = this.mouse.drag.x;
            var y2 = this.mouse.drag.y;
            //console.log("mousemove "+x1+" "+y1+" "+x2+" "+y2);

            selected.highlight(x1, y1, x2, y2);
        }
        else {
            var tx = (x1 - this.mouse.drag.x) / this.config.dragSpeed;
            var ty = (y1 - this.mouse.drag.y) / this.config.dragSpeed;
            //console.log("mousemove "+tx+" "+ty);

            if (selected.config.orientation === "horizontal")
                ty = 0;
            else if (selected.config.orientation === "vertical")
                tx = 0;

            this.drawables.forEach(function(d) {
                if (d.drag &&
                        (d.config.orientation === selected.config.orientation
                        || d.config.orientation === "both"
                        || selected.config.orientation === "both")
                    )
                {
                    d.drag(tx, ty);
                }
            });
        }
    };

    this.onmouseup = function(e) {
        //console.log("mouseup");
        //if (this.mouse.isDown) this.mouseClick(e);
        var isDown = this.mouse.isDown;
        this.mouse.isDown = false;

        if (!this.mouse.target)
            return;

        var target = this.mouse.target;
        this.mouse.target = null;

        var selected = this._getDrawableById(target.id);
        if (!selected)
            return;

        var loc = target.getBoundingClientRect();

        if (this.mouse.shiftKey) {
            if (isDown) {
                var x1 = e.x - loc.left;
                var y1 = e.y - loc.top;
                var x2 = this.mouse.drag.x;
                var y2 = this.mouse.drag.y;

                if (selected.config.orientation === "horizontal") {
                    y1 = 0;
                    y2 = Number.MAX_VALUE;
                }
                else if (selected.config.orientation === "vertical") {
                    x1 = 0;
                    x2 = Number.MAX_VALUE;
                }

                this.drawables.forEach(function(d) {
                    if (d.select &&
                    		(d.config.orientation === selected.config.orientation
                            || d.config.orientation === "both"
                            || selected.config.orientation === "both")
                       )
                    {
                        d.select(x1, y1, x2, y2);
                    }
                });
            }
        }
    };

    this.constructor();
}


function Drawable(element, config) {
    // Consolidates common functions for Rule and Dotplot: zoom, highlight, select, translate

    this.configure = function(config) {
        this.config = config || {};
        this.selectionBuffer;

        this.config.size = this.config.size || {
            width: 800,
            height: 50
        };

        if (this.config.crosshairs) {
            this.crosshairs = new Crosshairs();
        }

        this.config.orientation = this.config.orientation || "both";
    };

    this.constructor = function() {
        this.element = element;
        this.configure(config);
        this.element.width  = this.config.size.width;
        this.element.height = this.config.size.height;
        this.context = element.getContext("2d");

        this.origin = { x: 0, y: 0 }; // gu
        this.extent = { width: this.config.extent.width, height: this.config.extent.height }; // gu
        this.view   = { width: this.config.extent.width, height: this.config.extent.height }; // gu
        this.scale  = { x: this.config.size.width / this.config.extent.width,
                        y: this.config.size.height / this.config.extent.height }; // px/gu

        if (this.config.scaled)
            this.context.scale(this.scale.x, this.scale.y);
    };

    this.setRenderer = function(scope, func) {
        this.renderer = func;
        this.scope = scope;
    };
    
    this.setSize = function(width, height) {
    	this.element.width = width;
    	this.element.height = height;
    }

    this.clear = function() {
        this.context.clearRect(0, 0, this.config.extent.width, this.config.extent.height);
    };

    this.redraw = function() {
        this.clear();
        this.renderer.call(this.scope);
    };

    this.highlight = function(x1, y1, x2, y2) {
        x1 = constrainTo(x1, 0, this.config.size.width-1);
        y1 = constrainTo(y1, 0, this.config.size.height-1);
        x2 = constrainTo(x2, 0, this.config.size.width-1);
        y2 = constrainTo(y2, 0, this.config.size.height-1);
        //console.log("highlight: "+x1+","+y1+" "+x2+","+y2);

        var x = Math.min(x1, x2),
            y = Math.min(y1, y2),
            width = Math.abs(x1-x2)+1,
            height  = Math.abs(y1-y2)+1;


        if (this.crosshairs) {
            this.crosshairs.clear(this);
        }

        if (!this.config.orientation || this.config.orientation === "both") {
            restoreSelection(this.context);
            saveSelection(this.context, x, y, width, height);
            drawRect(this.context, x, y, width, height, 0.1);
        }
        else if (this.config.orientation === "horizontal") {
            restoreSelection(this.context, x, 0);
            saveSelection(this.context, x, 0, width, this.config.size.height-1, 0.1);
            drawRect(this.context, x, 0, width, this.config.size.height-1, 0.1);
        }
        else if (this.config.orientation === "vertical") {
            restoreSelection(this.context, 0, y);
            saveSelection(this.context, 0, y, this.config.size.width-1, height, 0.1);
            drawRect(this.context, 0, y, this.config.size.width-1, height, 0.1);
        }
    };

    this.select = function(x1, y1, x2, y2) {
        x1 = constrainTo(x1, 0, this.config.size.width-1);
        y1 = constrainTo(y1, 0, this.config.size.height-1);
        x2 = constrainTo(x2, 0, this.config.size.width-1);
        y2 = constrainTo(y2, 0, this.config.size.height-1);
        var x = Math.min(x1, x2),
            y = Math.min(y1, y2),
            width = Math.abs(x1-x2)+1,
            height  = Math.abs(y1-y2)+1;

        // Check for zero size
        if (width === 0 || height === 0) return;

        var tx = this.origin.x + x/this.scale.x;
        var ty = this.origin.y + y/this.scale.y;
        this.view.width = width/this.scale.x;
        this.view.height = height/this.scale.y;

        var newXScale = this.config.size.width / this.view.width;
        var newYScale = this.config.size.height / this.view.height;
        var xzoom = newXScale / this.scale.x;
        var yzoom = newYScale / this.scale.y;

        this.scale.x = newXScale;
        this.scale.y = newYScale;

        if (this.config.scaled) {
            this.context.translate( this.origin.x, this.origin.y );
            this.context.scale(xzoom, yzoom);
            this.context.translate(-tx, -ty);
        }

        this.origin.x = tx;
        this.origin.y = ty;
        //console.log("select: "+x+","+y+","+width+","+height+" t="+tx+","+ty+" "+this.scale.x+" "+this.scale.y);

        clearSelection();

        this.redraw();
    };

    this.zoom = function(x, y, zoom, axis) {
        if (this.crosshairs) {
            this.crosshairs.clear(this);
        }

        //console.log("zoom: "+x+" "+y+" "+zoom);
        var xzoom, yzoom;
        xzoom = yzoom = zoom;

        var minXScale = this.config.size.width / this.extent.width;
        var newXScale = this.scale.x * zoom;
        if (newXScale < minXScale) {
            newXScale = minXScale;
            xzoom = newXScale / this.scale.x;
        }

        var minYScale = this.config.size.height / this.extent.height;
        var newYScale = this.scale.y * zoom;
        if (newYScale < minYScale) {
            newYScale = minYScale;
            yzoom = newYScale / this.scale.y;
        }

        if (axis === "horizontal") {
            yzoom = 1;
            newYScale = this.scale.y;
        }
        else if (axis === "vertical") {
            xzoom = 1;
            newXScale = this.scale.x;
        }

        var tx = ( x / this.scale.x + this.origin.x - x / newXScale );
        var ty = ( y / this.scale.y + this.origin.y - y / newYScale );

        this.scale.x = newXScale;
        this.scale.y = newYScale;
        this.view.width = this.config.size.width / this.scale.x;
        this.view.height = this.config.size.height / this.scale.y;

        if (this.config.scaled) {
            // Check bounds - FIXME: can this be rewritten to use translate() ...?
            if (tx < 0)
                tx = 0;
            else if (tx + this.view.width >= this.extent.width)
                tx = this.extent.width - this.view.width;
            if (ty < 0)
                ty = 0;
            else if (ty + this.view.height >= this.extent.height)
                ty = this.extent.height - this.view.height;

            // Zoom
            this.context.translate( this.origin.x, this.origin.y );
            this.context.scale( xzoom, yzoom );
            this.context.translate( -tx, -ty );
        }

        this.origin.x = tx;
        this.origin.y = ty;

        // Check bounds
        if (!this.config.scaled) {
            if (this.origin.x < 0) {
                this.view.width += this.origin.x;
                this.origin.x = 0;
            }
            else if (this.origin.x + this.view.width >= this.extent.width) {
                this.origin.x = this.extent.width - this.view.width;
            }
            if (this.origin.y < 0) {
                this.view.height += this.origin.y;
                this.origin.y = 0;
            }
            else if (this.origin.y + this.view.height >= this.extent.height) {
                this.origin.y = this.extent.height - this.view.height;
            }
        }

        //console.log("zoom " + this.element.id + ": zoom="+zoom+" xzoom="+xzoom+" yzoom="+yzoom+" scale="+this.scale.x + "," + this.scale.y + " trans=" + tx + "," + ty + " origin=" + this.origin.x + "," + this.origin.y)

        this.redraw();
    };

    this.hover = function(tx, ty) {
        if (this.crosshairs) {
            this.crosshairs.redraw(this, tx, ty);
        }
    };

    this.drag = function(tx, ty) {
        if (this.crosshairs) {
            this.crosshairs.clear(this);
        }

        if (this.isMinScale()) return; // can"t move, zoomed-out all the way
        //console.log("move: " + tx + " " + ty);

        tx = tx / this.scale.x;
        ty = ty / this.scale.y;
        this.translate(tx, ty);
        this.redraw();
    };

    this.translate = function translate(x, y) {
        //console.log("translate: x,y=" + x + "," + y + " origin=" + this.origin.x + "," + this.origin.y + " scale=" + this.scale.x + "," + this.scale.y + " w,h=" + this.view.width + "," + this.view.height);

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
        if (this.config.scaled)
            this.context.translate( x, y );
        this.origin.x -= x;
        this.origin.y -= y;
    };

    this.isMinScale = function() {
        var minXScale = this.config.size.width / this.config.extent.width;
        var minYScale = this.config.size.height / this.config.extent.height;
        return (this.scale.x === minXScale && this.scale.y === minYScale);
    };

    this.constructor();
}

function Crosshairs(colors, width, alpha) {
    this.constructor = function() {
        this.styles = {
            "colors": colors || (colors = [255, 0, 0]),
            "alpha": alpha || (alpha = 1),
            "lineWidth": width || (width = 1)
        };

        this.buffer = undefined;
    };

    // Saves the pixel buffer for the drawable
    this._save = function(context, x, y, width, height) {
        var lineWidth = this.styles.lineWidth;

        this.buffer = {
            verticalBuffer: context.getImageData(x, 0, lineWidth, height),
            horizontalBuffer: context.getImageData(0, y, width, lineWidth),
            previousX: x,
            previousY: y
        };
    };

    // Restores the pixel buffer to the drawable if required
    this._restore = function(context) {
        var buffer = this.buffer;

        if (buffer !== undefined) {
            // restore vertical line
            context.putImageData(buffer.verticalBuffer, buffer.previousX, 0);

            // restore horizontal line
            context.putImageData(buffer.horizontalBuffer, 0, buffer.previousY);
            this.buffer = undefined;
        }
    };

    // Clear the stored buffer
    this.clear = function(drawable) {
        this._restore(drawable.context);
    };

    this.redraw = function(drawable, x, y) {
        var context = drawable.context,
            width = drawable.config.size.width,
            height = drawable.config.size.height,
            lineWidth = this.styles.lineWidth,
            alpha = this.styles.alpha,
            colors = this.styles.colors;

        this._restore(context);
        this._save(context, x, y, width, height);

        //Draw the vertical line
        drawRect(context, x, 0, lineWidth, height, alpha, colors, true);

        //Draw the horizontal line
        drawRect(context, 0, y, width, lineWidth, alpha, colors, true);
    };

    this.constructor();
}

function Rule(element, config) {
    this.constructor = function() {
        this.element = element;
        this.configure(config);
        this.drawable = new Drawable(element, config);
        this.drawable.setRenderer(this, this.redraw);
    };

    this.configure = function(config) {
        this.config = config || {};

        this.config.orientation = this.config.orientation || "horizontal"; // valid values are "horizontal" and "vertical"
        this.config.direction   = this.config.direction   || "increasing"; // valid values are "increasing" and "descreasing"

        this.config.titleFontName = this.config.titleFontName || "Arial";
        this.config.titleFontSize = this.config.titleFontSize || 12;
        this.config.labelFontName = this.config.labelFontName || "Arial";
        this.config.labelFontSize = this.config.labelFontSize || 10;
        this.config.tickFontName  = this.config.tickFontName  || "Arial";
        this.config.tickFontSize  = this.config.tickFontSize  || 6;

        // Calculate label positions using direction
        var maxLabelWidth = 0, maxLabelHeight = 0;
        var isIncreasing = (this.config.direction === 'increasing');
        if (this.config.labels) {
            this.labels = [];

            var pos;
            if (isIncreasing)
                pos = 0;
            else // decreasing
                pos = this.config.labels.reduce(function (a, b) {
                    return { length: a.length + b.length };
                }).length;

            for (var i = 0; i < this.config.labels.length; i++) {
                var label = this.config.labels[i];
                var halfLength = label.length/2;
                if (!isIncreasing) halfLength *= -1;
                pos += halfLength;
                this.labels.push({ pos: pos, text: label.name });
                pos += halfLength;

                // Find max label width and height
//              var labelWidth = measureText(label.name, "", this.config.labelFontName, this.config.labelFontSize);
//              console.log(labelWidth);
//              maxLabelWidth  = Math.max( maxLabelWidth, labelWidth[0] );
//              maxLabelHeight = this.config.labelFontSize;
            }
        }
        //console.log("max " + maxLabelWidth + " " + maxLabelHeight);

        // Auto-size if necessary
//        if (!this.config.size.width)
//          this.config.size.width = maxLabelWidth;
//        if (!this.config.size.height)
//          this.config.size.height = maxLabelHeight;

        // Apply user-defined styles
        if (this.config.style) {
            applyStyles(this.element, this.config.style);
        }
    };

    this.zoom = function(x, y, zoom, axis) {
        this.drawable.zoom(x, y, zoom, axis);
    };

    this.highlight = function(x1, y1, x2, y2) {
        this.drawable.highlight(x1, y1, x2, y2);
    };

    this.select = function(x1, y1, x2, y2) {
        this.drawable.select(x1, y1, x2, y2);
    };

    this.drag = function(tx, ty) {
        this.drawable.drag(tx, ty);
    };

    this.drawTick = function(pos) {
        var ctx = this.drawable.context;
        var scale = (this.config.orientation === "horizontal" ? this.scale.x : this.scale.y);
        var x = this.scale * pos;
        ctx.beginPath();
        ctx.moveTo(x, element.height-11);
        ctx.lineTo(x, element.height);
        ctx.stroke();
        drawText(ctx, toUnits(pos), x, element.height-13, { rotate: 45, font: "6pt Arial"});
    };

    this.redraw = function() {
        var ctx = this.drawable.context,
            pxPos;

        this.drawable.clear();

        // Draw title
        var font = this.config.titleFontSize + "pt " + this.config.titleFontName;
        if (this.config.title) {
            if (this.config.orientation === "horizontal")
                drawText(ctx, this.config.title, element.width/2, 14, { align: "center", font: font});
            else
                drawText(ctx, this.config.title, 14, element.height/2, { rotate: 90, font: font});
        }

        // Draw ruler tick marks/labels
        // FIXME this can be optimized further
        font = this.config.tickFontSize + "pt " + this.config.tickFontName;
        ctx.lineWidth = 0.2;
        var pxLength, origin, view, scale;
        if (this.config.orientation === "horizontal") {
            pxLength = this.config.size.width;
            guLength = this.config.extent.width;
            origin   = this.drawable.origin.x;
            view     = this.drawable.view.width;
            scale    = this.drawable.scale.x;
        }
        else { // vertical
            pxLength = this.config.size.height;
            guLength = this.config.extent.height;
            origin   = this.drawable.origin.y;
            view     = this.drawable.view.height;
            scale    = this.drawable.scale.y;
        }

        var tick    = roundBase10(view / 10);
        var guStart = roundBase10(origin) + tick;
        var pxStart = scale + int(tick * scale);
        var numTicks = int(guLength / tick)-1;
        if (this.config.direction === "decreasing") {
            pxStart = guLength * scale - pxStart;
            tick *= -1;
        }

        for (pxPos = pxStart, guPos = guStart; numTicks > 0; numTicks--, pxPos += tick*scale, guPos += Math.abs(tick)) {
            if (this.config.orientation === "horizontal") {
                drawLine(ctx, pxPos, element.height-11, pxPos, element.height);
                drawText(ctx, toUnits(guPos), pxPos, element.height-13, { rotate: 45, font: font});
            }
            else { // vertical
                drawLine(ctx, element.width-11, pxPos, element.width, pxPos);
                drawText(ctx, toUnits(guPos), element.width-32, pxPos+20, { rotate: 45, font: font});
            }
        }

        // Draw labels
        // TODO: keep label centered within chromosome as long as any part of chromosome is visible
        font = "bold " + this.config.labelFontSize + "pt " + this.config.labelFontName;
        if (this.labels) {
            for (var i = 0; i < this.labels.length; i++) {
                var label = this.labels[i];
                pxPos = int((label.pos - origin) * scale);
                if (pxPos >= 0 && pxPos <= pxLength) {
                    if (this.config.orientation === "horizontal")
                        drawText(ctx, label.text, pxPos, element.height-2, { align: "center", rotate: 0, font: font});
                    else
                        drawText(ctx, label.text, element.width-7, pxPos+3, { align: "right", rotate: 0, font: font});
                }
            }
        }
    };

    this.constructor();
    this.drawable.redraw();
}

function Plot(element, config) {
    this.constructor = function() {
        this.element = element;
        if (!this.element) {
            console.log("Plot: error: id '"+id+"' not found");
            return;
        }

        this.configure(config);
        this.drawable = new Drawable(element, config);
        this.setFetch(config.fetchDataHandler);
        this.drawable.setRenderer(this, this.render);
    };

    this.configure = function(config) {
        this.config = config || {};

        if (this.config.style) {
            applyStyles(this.element, this.config.style);
        }

        this.config.origin = this.config.origin || 'southwest'; // valid values are 'northwest' or 'southwest'
    };

    this.drawLabels = function() {
        var ctx = this.drawable.context;
        //ctx.imageSmoothingEnabled = false;

        // X-axis
        ctx.lineWidth = 1 / this.drawable.scale.x / 2; // same size regardless of zoom
        var labels = this.config.labels.x;
        for (var i = 0, x = 0; i < labels.length-1; i++) {
            x += labels[i].length;
            drawLine(ctx, x, 1, x, this.config.extent.height-1);
        }

        // Y-axis
        labels = this.config.labels.y;
        ctx.lineWidth = 1 / this.drawable.scale.y / 2; // same size regardless of zoom
        for (i = 0, y = 0; i < labels.length-1; i++) {
            y += labels[i].length;
            var y2 = y;
            if (this.config.origin === "southwest")
                y2 = this.config.extent.height - y;
            drawLine(ctx, 1, y2, this.config.extent.width-1, y2);
        }
    };

    this.drawDots = function(data) {
        if (!data) return;

        var ctx = this.drawable.context;
        var flipY = (this.config.origin === "southwest");
        var length = this.config.extent.height;
        for (var i = 0; i < data.length; i++) {
            // Reflect y-axis if southwest origin
            var y = data[i].y;
            if (flipY)
                y = length - y;

            ctx.fillRect( data[i].x, y, 1000, 1000 );
        }
    };

    this.drawLines = function(data) {
        if (!data) return;

        var ctx = this.drawable.context,
            scale = Math.max(this.drawable.scale.x, this.drawable.scale.y);

        var flipY = (this.config.origin === "southwest");
        var length = this.config.extent.height;

        for (var i = 0; i < data.length; i++) {
            // Reflect y-axis if southwest origin
            var y1 = data[i].y1;
            var y2 = data[i].y2;
            if (flipY) {
                y1 = length - y1;
                y2 = length - y2;
            }

            if (data[i].color) {
                ctx.strokeStyle = data[i].color;
            }

            ctx.lineWidth = 1 / scale;
            ctx.beginPath();
            ctx.moveTo(data[i].x1, y1);
            ctx.lineTo(data[i].x2, y2);
            ctx.stroke();
        }
    };

    this.drawRects = function(data) {
        if (!data) return;

        var ctx = this.drawable.context,
            scalar = Math.max(this.drawable.scale.x, this.drawable.scale.y),
            x, y, width, height;

        var flipY = (this.config.origin === "southwest");
        var length = this.config.extent.height;

        for (var i = 0; i < data.length; i++) {
            x = data[i][0];
            y = data[i][1];
            width = data[i][2];
            height = data[i][3];

            // Reflect y-axis if southwest origin
            if (flipY) {
                y = length - y;
                height *= -1;
            }

            ctx.lineWidth = 2 / scalar;
            ctx.strokeRect(x, y, width, height);
        }
    };

    this.drawBorder = function() {
        // Draw frame around canvas
        drawScaledRect(this.drawable.context, 0, 0, this.config.extent.width, this.config.extent.height, this.drawable.scale.x, this.drawable.scale.y);
    };

    this.render = function() {
        if (!this.fetch) {
            console.log("Plot: no fetch handler");
            return;
        }

        //var startTime = Date.now();
        var layers = this.fetch(this.drawable.origin.x, this.drawable.origin.y,
                                this.drawable.view.width, this.drawable.view.height );
        this.drawLabels();

        // Draw all layers returned from the fetch
        for(var i = 0; i < layers.length; i++) {
            this.drawable.context.save();
            applyProperties(this.drawable.context, layers[i].style);
            this.drawDots(layers[i].points);
            this.drawLines(layers[i].lines);
            this.drawRects(layers[i].rects);
            this.drawable.context.restore();
        }

        this.drawBorder();
        //console.log("render time: " + (Date.now() - startTime));
    };

    this.redraw = function() {
        this.drawable.redraw();
    };

    this.highlight = function(x1, y1, x2, y2) {
        this.drawable.highlight(x1, y1, x2, y2);
    };

    this.select = function(x1, y1, x2, y2) {
        this.drawable.select(x1, y1, x2, y2);
    };

    this.hover = function(tx, ty) {
        this.drawable.hover(tx, ty);
    };

    this.zoom = function(x, y, zoom, axis) {
        this.drawable.zoom(x, y, zoom, axis);
    };

    this.drag = function(tx, ty) {
        this.drawable.drag(tx, ty);
    };

    this.setFetch = function(fetch) {
        this.fetch = fetch;
    };

    this.constructor();
    this.drawable.redraw();
}

function toUnits(n) {
    var k = 1000;
    var sizes = ["", "K", "M", "G", "T"];
    if (n === 0) return "0";
    var i = parseInt(Math.floor(Math.log(n) / Math.log(k)),10);
    var prec = 4;
    //if (n % 1 === 0) prec = 1;
    return (n / Math.pow(k, i)).toPrecision(prec) + " " + sizes[i];
}

//humanReadableNumber: function( num ) {
//    num = parseInt(num);
//    var suffix = "";
//    if( num >= 1e12 ) {
//        num /= 1e12;
//        suffix = "T";
//    } else if( num >= 1e9 ) {
//        num /= 1e9;
//        suffix = "G";
//    } else if( num >= 1e6 ) {
//        num /= 1e6;
//        suffix = "M";
//    } else if( num >= 1000 ) {
//        num /= 1000;
//        suffix = "K";
//    }
//
//    return (num.toFixed(2)+" "+suffix).replace(/0+ /," ").replace(/\. /," ");
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

function saveSelection(context, x, y, width, height) {
    this.selectionBuffer = [x, y, context.getImageData(x, y, width, height)];
}

function clearSelection() {
    this.selectionBuffer = undefined;
}

function drawRect(context, x, y, width, height, alpha, colors, noBorder) {
    if (typeof(alpha) === "undefined")
        alpha = 1;

    //NOTE: parseInt required due to issues with getImageData
    //      getting an incorrect selection
    var image = context.getImageData(parseInt(x, 10), parseInt(y, 10), width, height);
    for (var i = 0, pos = 0; i < width*height; i++, pos += 4) {
        if (!noBorder && (i < width || i > width * (height - 1) || i % width === 0 || i % width === width - 1))
            image.data[pos+3] = 60;
        else
            image.data[pos+3] = Math.max(image.data[pos+3],alpha * 255);

        if (colors) {
            image.data[pos] = colors[0];
            image.data[pos+1] = colors[1];
            image.data[pos+2] = colors[2];
        }
    }
    context.putImageData(image, x, y);
}

function drawText(context, text, x, y, options) {
    context.save();
    if (options && (options.align || options.valign)) {
        var metrics = context.measureText(text);
        if (options.align === "center")
            x -= metrics.width/2;
        else if (options.align === "right")
            x -= metrics.width+1;
        //if (options.valign === "middle")
        //  y -= metrics.height/2;
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
* Measures text by creating a DIV in the document and adding the relevant text to it.
* Then checking the .offsetWidth and .offsetHeight. Because adding elements to the DOM is not particularly
* efficient in animations (particularly) it caches the measured text width/height.
* Source: http://www.rgraph.net/blog/2013/january/measuring-text-height-with-html5-canvas.html
*
* @param  string text   The text to measure
* @param  bool   bold   Whether the text is bold or not
* @param  string font   The font to use
* @param  size   number The size of the text (in pts)
* @return array         A two element array of the width and height of the text
*/
function measureText(text, bold, font, size) {
    var new_size;

    // This global variable is used to cache repeated calls with the same arguments
    var str = text + ":" + bold + ":" + font + ":" + size;
    if (typeof(__measuretext_cache__) === "object" && __measuretext_cache__[str]) {
        return __measuretext_cache__[str];
    }

    var div = document.createElement("DIV");
        div.innerHTML = text;
        div.style.position = "absolute";
        div.style.top = "-100px";
        div.style.left = "-100px";
        div.style.fontFamily = font;
        div.style.fontWeight = bold ? "bold" : "normal";
        div.style.fontSize = size + "pt";
    document.body.appendChild(div);

    new_size = [div.offsetWidth, div.offsetHeight];

    document.body.removeChild(div);

    // Add the sizes to the cache as adding DOM elements is costly and can cause slow downs
    if (typeof(__measuretext_cache__) !== "object") {
        __measuretext_cache__ = [];
    }
    __measuretext_cache__[str] = new_size;

    return new_size;
}

function applyProperties(element, properties) {
    for (var prop in properties) {
        element[prop] = properties[prop];
    }
}

function applyStyles(element, styles) {
    applyProperties(element.style, styles);
}

function createCanvas(parent, id) {
    var element = document.createElement("canvas");
    element.innerHTML = "Oops ... your web browser does not support HTML5!";
    if (id)
        element.id = id;
    if (!parent)
        parent = document.body;
    parent.appendChild(element);
    return element;
}

function createDiv(parent, id) {
    var element = document.createElement("div");
    if (id)
        element.id = id;
    if (!parent)
        parent = document.body;
    parent.appendChild(element);
    return element;
}

function constrainTo(val, min, max) {
    if (val <= min)
        return min;
    if (val >= max)
        return max;
    return val;
}

var id = 1;
function generateID() {
    return id++;
}

//Array.prototype.clipTo=(function(r2) {
//    var r1 = Array.prototype.push;
//    return function() {
//      r1[0] = Math.min(r1[0], r2[2]);
//      r1[0] = Math.max(r1[0], r2[0]);
//      r1[1] = Math.min(r1[1], r2[3]);
//      r1[1] = Math.max(r1[1], r2[1]);
//      r1[2] = Math.min(r1[2], r2[2]);
//      r1[2] = Math.max(r1[2], r2[0]);
//      r1[3] = Math.min(r1[3], r2[3]);
//      r1[3] = Math.max(r1[3], r2[1]);
//        return original.apply(this,arguments);
//    };
//})();
