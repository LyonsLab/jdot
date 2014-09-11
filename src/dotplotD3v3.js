function MultiDotPlot(id) {
    var size, genomeIds, fetchDataHandler, axisSizeRatio,
        dotplots = [],
        parentSel = d3.select("#" + id);

    var main = parentSel.append("main").classed("multiDot", true)
        .style({ position: "relative", border: "1px solid black" });

    var controls = parentSel.insert("div", "main.multiDot").classed("controls", true)
        .style("border", "1px solid black");

    this.size = function(s) { if (! arguments.length) return size; size = s; return this; };
    this.genomeIds = function(g) { if (! arguments.length) return genomeIds; genomeIds = g; return this; };
    this.fetchDataHandler = function(f) { fetchDataHandler = f; return this; };
    this.axisSizeRatio = function(a) { if (! arguments.length) return axisSizeRatio; axisSizeRatio = a; return this; };

    this.dotPlots = function() { return dotplots; };

    this.build = function() {
        /** We shouldn't really have to explicitly set the height for the main element,
         * but for some reason it doesn't size correctly if we don't */
        main.style({ width: size.width, height: size.height });

        // FIXME: Remove all this and let the children figure it out.
        var numGenomesX = genomeIds.x.length;
        var numGenomesY = genomeIds.y.length;

        this.dpWidth = size.width / numGenomesX;
        this.dpHeight = size.height / numGenomesY;

        dotplots = makeDotPlots.bind(this)();
        setNeighbors();

        var controlFuncs = [toggleInnerControl]; // , toggleAllControl];
        addControls(controlFuncs);

        return this
    };

    function makeDotPlots() {
        var dps = [];
        genomeIds.x.forEach(function(xId, gridCol) {
            genomeIds.y.forEach(function(yId, gridRow) {
                var newPlot = makeDotPlot.bind(this)(xId, yId, gridCol, gridRow);
                dps.push( newPlot );
            }, this)
        }, this);
        return dps
    }

    var my = this;
    function makeDotPlot(xId, yId, gridCol, gridRow) {
        return new DotPlot({
            parent: main,
            genomeIds: { x: xId, y: yId },
            size: { width: my.dpWidth, height: my.dpHeight },
            axisSizeRatio: axisSizeRatio,
            fetchDataHandler: fetchDataHandler.bind(undefined, xId, yId)
        })
            .parent(this)
            .genomeIds({ x: xId, y: yId })
            .gridPosition({ row: gridRow, column: gridCol })
            .build();
    }

    function setNeighbors() {
        dotplots.forEach(function(d) {
            var grid = d.gridPosition(),
                row = grid.row, col = grid.column;
            var left = [row, col - 1]; var top = [row - 1, col];
            var leftNeighbor = dotplots.filter(function(p) {
                return p.gridPosition().row === left[0] && p.gridPosition().column === left[1]
            })[0];
            var topNeighbor = dotplots.filter(function(p) {
                return p.gridPosition().row === top[0] && p.gridPosition().column === top[1]
            })[0];
            if (leftNeighbor) d.setNeighbor("left", leftNeighbor);
            if (topNeighbor) d.setNeighbor("top", topNeighbor);
        })
    }

    function addControls(controlFuncs) {
        controls.style({
                width: size.width,
                height: size.height * 0.10
            });

        controlFuncs.forEach(function(f) { f(controls); })
    }

    function toggleAllControl(controls) {
        controls.append("button")
            .text("Toggle All Axes")
            .on("mousedown", function() {
                var anyOn = dotplots.some(function(d) {
                    var ax = d.axes();
                    return ax.x.exists() || ax.y.exists();
                });
                dotplots.forEach(function(p) {
                    if (anyOn) {
                        p.setAxis("x", "off").setAxis("y", "off");
                    } else {
                        p.setAxis("x", "on").setAxis("y", "on");
                    }
                });
                positionAll();
            });
    }

    function toggleInnerControl(controls) {
        controls.append("button")
            .text("Toggle Inner Axes")
            .on("mousedown", function() {
                var innerOn = dotplots.some(function(d) {
                    var grid = d.gridPosition();
                    return grid.row !== 0 && d.axes()["x"].exists();
                });
                console.log(innerOn);
                dotplots.forEach(function(d) {
                    var grid = d.gridPosition(), ax = d.axes();
                    if (innerOn) {
                        d.setAxis("x", grid.row === 0 ? "on" : "off")
                            .setAxis("y", grid.column === 0 ? "on" : "off");
                    } else {
                        d.setAxis("x", "on").setAxis("y", "on");
                    }
                });
                positionAll();
            })
    }

    this.positionAll = positionAll;
    function positionAll() {
        var anyMoved = false;
        dotplots.forEach(function(d) {
            var oldPos = d.position();
            var newPos = d.positionToNeighbors().position();
            if (! _.isEqual(oldPos, newPos)) anyMoved = true;
        });
        if (anyMoved) positionAll();
    }
}

function DotPlot(config) {
    var parent,
        genomeIds = {x: null, y: null},
        gridPosition;

    this.parent = function(p) { parent = p; return this };

    this.genomeIds = function(g) { if (! arguments.length) return genomeIds; genomeIds = g; return this};
    this.gridPosition = function(g) { if (! arguments.length) return gridPosition; gridPosition = g; return this};

    this.build = function() {
        console.log(parent.size());
        console.log(parent.genomeIds());
        console.log(parent.axisSizeRatio());

        this.configure(config);

        this.xId = this.config.genomeIds.x; this.yId = this.config.genomeIds.y;
        fetchDataHandler = this.config.fetchDataHandler;

        var axisSizeRatio = this.config.axisSizeRatio;

        plotSize = {
            width: this.config.size.width * (1 - axisSizeRatio.y),
            height: this.config.size.height * (1 - axisSizeRatio.x)
        };
        var axisSize = {
            x: this.config.size.height * axisSizeRatio.x,
            y: this.config.size.width * axisSizeRatio.y
        };

        figure = this.makeFigure();

        plot = new Plot().parent(this).size(plotSize).build(figure);
        axes = {
            x: new Axis().parent(this).coordinate("x").size(axisSize.x),
            y: new Axis().parent(this).coordinate("y").size(axisSize.y)
        };

        return this;
    };






    var plot, extent, plotSize,
        fetchDataHandler, figure,
        neighbors = [],
        axes,
        scale = {x: d3.scale.linear(), y: d3.scale.linear()},
        zoom,
        hasData = false,
        chromosomes, chromeScale;

    this.constructor = function() {

//        this.configure(config);
//
//        this.xId = this.config.genomeIds.x; this.yId = this.config.genomeIds.y;
//        this.gridPosition = this.config.gridPosition;
//        fetchDataHandler = this.config.fetchDataHandler;
//
//        var axisSizeRatio = this.config.axisSizeRatio;
//
//        plotSize = {
//            width: this.config.size.width * (1 - axisSizeRatio.y),
//            height: this.config.size.height * (1 - axisSizeRatio.x)
//        };
//        var axisSize = {
//            x: this.config.size.height * axisSizeRatio.x,
//            y: this.config.size.width * axisSizeRatio.y
//        };
//
//        figure = this.makeFigure();
//
//        plot = new Plot().parent(this).size(plotSize).build(figure);
//        axes = {
//            x: new Axis().parent(this).coordinate("x").size(axisSize.x),
//            y: new Axis().parent(this).coordinate("y").size(axisSize.y)
//        };
    };

    this.redraw = function() {
        draw();
    };

    function draw() {
        if (typeof plot.quadtree() === "undefined") {
            // console.info("Quadtree not defined.");
            $.when(getData())
                .then(setup)
                .then(plot.makeTree)
                .then(zoom.event(plot.div()));
        } else {
            /** Constrained zoom */
            var t = d3.event.translate, s = d3.event.scale,
                w = scale.x.range()[1], h = scale.y.range()[0];
            t[0] = Math.min(0, Math.max(- ((w * s) - w), t[0]));
            t[1] = Math.min(0, Math.max(- (h * s) + h, t[1]));
            zoom.translate(t);
            plot.redraw();
        }
    }

    function getData() {
        var dfd = $.Deferred();
        var data = fetchDataHandler();

        dfd.resolve(data);

        return dfd.promise();
    }

    function setup(dat) {
        // TODO: More than just lines
        var lines = dat[0].lines;

        extent = getDataExtent(lines);
        scale = getScale(extent, plotSize.width, plotSize.height);

        zoom = d3.behavior.zoom()
            .x(scale.x).y(scale.y)
            .scaleExtent([1,50])
            .on("zoom", draw);

        plot.div().call(zoom);

        plot.extent(extent).scale(scale);

        hasData = true;

        return lines;
    }

    this.hasData = function() { return hasData };

    function getDataExtent(d) {
        var xMin = d3.min(d, function(d) { return d3.min([d.x1, d.x2]); }),
            xMax = d3.max(d, function(d) { return d3.max([d.x1, d.x2]); }),
            yMin = d3.min(d, function(d) { return d3.min([d.y1, d.y2]); }),
            yMax = d3.max(d, function(d) { return d3.max([d.y1, d.y2]); });

        var xExt = [xMin, xMax],
            yExt = [yMin, yMax];

        return {x: xExt, y: yExt};
    }

    function getScale(ext, wid, hi) {
        var x = d3.scale.linear().domain(ext.x).range([0, wid]),
            y = d3.scale.linear().domain(ext.y).range([hi, 0]);

        return {x: x, y: y};
    }

    this.position = position;
    function position(side, value) {
        if (! arguments.length) {
            var t = figure.style("top"), l = figure.style("left");
            return {
                top: t === "auto" ? 0 : parseInt(t),
                left: l === "auto" ? 0 : parseInt(l)
            };
        }
        figure.style(side, parseInt(value) + "px");
    }

    this.positionToNeighbors = function() {
        neighbors.forEach(function(neighbor) {
            var dimension = neighbor.direction === "top" ? "height" : "width";
            var neighborSize = neighbor.dotplot.divSize();
            var neighborPos = neighbor.dotplot.position();
            var value = neighborSize[dimension] + neighborPos[neighbor.direction];
            position(neighbor.direction, value);
        });
        return this;
    };
    this.makeFigure = function() {
        var figure = this.config.parent.append("figure")
            .style({ margin: 0, position: "relative" });

        return figure;
    };
    // FIXME: Rename to axisState
    this.setAxis = function(a, state) {
        var exists = axes[a].exists();
        if (state === "on") {
            if (! exists) this.toggleAxis(a)
        }
        if (state === "off") {
            if (exists) this.toggleAxis(a)
        }
        return this;
    };
    function toggleAxis(a) {
        if (! hasData) return;
        var existing = figure.selectAll(".plot, .axis"),
            side = a === "x" ? "top" : "left",
            axis = axes[a];

        var move = axis.exists() ? - axis.size() : + axis.size();

        existing.style(side, function() {
            var prev = parseInt( d3.select(this).style(side) );
            return prev + move + "px";
        });

        if (axis.exists()) {
            axis.remove();
        } else {
            axis.addTo(figure).attachZoom(zoom);
        }

        return this;
    }
    this.toggleAxis = toggleAxis;
    this.toggleAxes = function() {
        toggleAxis("x"); toggleAxis("y");
    };
    this.scale = function() { return scale; };
    this.figure = function() { return figure; };
    this.setNeighbor = function(direction, dotplot) {
        neighbors.push({direction: direction, dotplot: dotplot});
        return this;
    };
    this.axes = function() { return axes; };
    this.chromosomes = function(c) {
        if (! arguments.length) return chromosomes;
        var mapF = function(c, i, a) {
            var chrom = {};
            chrom.name = c.name;
            chrom.position = a.slice(0, i).reduce(function(prev, curr) {
                return prev + curr.length;
            }, 0);

            return chrom;
        };
        var parsed = {
            x: c.x.map(mapF),
            y: c.y.map(mapF)
        };
        // chromosomes = parsed;
        // console.log(parsed);
        var labelScale = {
            x: d3.scale.threshold()
                .domain(parsed.x.map(function(d) { return d.position }))
                .range(["NA"].concat(parsed.x.map(function(d) { return d.name }))),
            y: d3.scale.threshold()
                .domain(parsed.y.map(function(d) { return d.position }))
                .range(["NA"].concat(parsed.y.map(function(d) { return d.name })))
        };
        chromosomes = labelScale;
//        console.log(scale.x.ticks());
//        chromeHist = d3.layout.histogram()
//            .bins(axes.x)

        // console.log(chromosomes);
        return this;
    };
    this.divSize = function() {
        var p = plot.divSize(),
            x = axes["x"].divSize(),
            y = axes["y"].divSize();
        var width = p.width + y.width;
        var height = p.height + x.height;
        return { width: width, height: height }
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
    this.zoom = function() { return zoom; }

    this.constructor();
}

function Plot() {
    var size, extent, scale, quadtree, context,
        radius, div, parent, svg;

    this.build = function() {
        div = parent.figure().append("div").classed("plot", true)
            .style({
                width: size.width, height: size.height,
                position: "absolute", top: 0, left: 0
            });

        var canvas = div.append("canvas")
            .attr({width: size.width, height: size.height})
            .style({border: "1px solid #ccc"});

        svg = div.append("svg")
            .style({
                width: size.width, height: size.height,
                top: 0, left: 0, position: "absolute"
            });

        context = canvas.node().getContext("2d");

        context.strokeStyle = "rgba(0, 0, 0, 0.3)";
        context.fillStyle = "rgba(0, 0, 0, 0.7)";

        return this;
    };
    var chromoAxis;
    this.redraw = function() {
        context.clearRect(0, 0, size.width, size.height);
        context.beginPath();
        visitTree(quadtree);
        context.stroke();

        if (parent.chromosomes()) {
            var z = parent.zoom();
            if (! z.on("zoom.chromos")) {
                z.on("zoom.chromos", function() {
                    // console.log("zoom.chromos");
                    // console.log(parent.chromosomes().x.domain());
                    var s = getDiv().select("svg");
                    if (s.select("g.chromos.x").empty()) {
                        chromoAxis = {
                            x: d3.svg.axis()
                                .scale(parent.scale().x)
                                .tickValues(parent.chromosomes().x.domain())
                                .tickSize(-parseInt(getDiv().style("height")))
                                .orient("top")
                        };
                        var g = s.append("g").attr("class", "chromos x").call(chromoAxis.x);
                        g.selectAll("line, path")
                            .style({fill: "none", stroke: "#111", "shape-rendering": "crispEdges"});
                    } else {
                        var g = s.select("g.chromos.x").call(chromoAxis.x);
                        g.selectAll("line, path")
                            .style({fill: "none", stroke: "#111", "shape-rendering": "crispEdges"});
                    }
                })
            }
        }
    };

    function chromLines() {
        console.log(zoom.on("zoom.chroms"))
    }

    function visitTree(quadtree) {
        // console.info("Called visitTree");
        var threshold = 1;
        radius = threshold / 2;
        var scaledThresh = scale.x.invert(threshold) - scale.x.invert(0);
        var r = 1;

        quadtree.visit(function(node, x1, y1, x2, y2) {
            if (inBounds(r, x1, y1, x2, y2)) return true;

            var p = node.point;
            if (p) {
                var arr = [p.x1, p.y1, p.x2, p.y2];
                drawOne(arr);
                return true;
            }

            var wid = x2 - x1;

            if (wid < scaledThresh) {
                if (! node.leaf) {
                    var mid = [(x2 + x1) / 2, (y2 + y1) / 2];
                    drawOne(mid);
                }
                return true;
            }
        })
    }

    function drawOne(d) {
        context.moveTo(scale.x(d[0]), scale.y(d[1]));
        if (d.length > 2) {
            context.lineTo(scale.x(d[2]), scale.y(d[3]));
        } else {
            context.arc(scale.x(d[0]), scale.y(d[1]), radius, 0, 2 * Math.PI);
        }
    }

    function inBounds(r, x1, y1, x2, y2) {
        var w = size.width, h = size.height;
        return x1 > scale.x.invert(w + w * r)
            || x2 < scale.x.invert( - w * r)
            || y1 > scale.y.invert( - h * r)
            || y2 < scale.y.invert(h + h * r)
    }

    this.quadtree = function() {
        if (!arguments.length) return quadtree;
    };

    this.makeTree = function(dat) {

        var dfd = $.Deferred();

        var q = d3.geom.quadtree()
            .x(function(d) { return (d.x1 + d.x2) / 2})
            .y(function(d) { return (d.y1 + d.y2) / 2});

        quadtree = q(dat);

        dfd.resolve("Quadtree ready.");

        return dfd.promise();
    };

    this.scale = function(s) {
        if (!arguments.length) return scale;
        scale = s;
        return this;
    };
    this.extent = function(e) {
        if (!arguments.length) return extent;
        extent = e;
        return this;
    };
    this.size = function(s) {
        if (!arguments.length) return size;
        size = s;
        return this;
    };
    this.div = function() {
        return div;
    };
    function getDiv() {
        return parent.figure().select(".plot");
    }
    this.getDiv = getDiv;
    this.parent = function(p) {
        if (!arguments.length) return parent;
        parent = p;
        return this;
    }
}
Plot.prototype = new FigureComponent();

function Axis() {
    var parent,
        coordinate, size = 100,
        numTicks = 10,
        format = ",.1s",
        zoom,
        title;

    this.addTo = function(figure) {

        var plot = figure.select(".plot");
        var top =  coordinate === "x" ? "0px" : plot.style("top");
        var left = coordinate === "y" ? "0px" : plot.style("left");
        var width =  coordinate === "y" ? size + "px" : plot.style("width");
        var height = coordinate === "x" ? size + "px" : plot.style("height");
        var trans = coordinate === "x" ? [0, size] : [size, 0];

        var svg = figure.insert("div", "div.plot")
            .classed("axis", true).classed(coordinate, true)
            .style({position: "absolute"})
            .style("top", top)
            .style("left", left)
            .style("width", width)
            .style("height", height)
            .append("svg")
            .style({width: width, height: height});

        if (title) {
            svg.append("text")
                .text(title)
                .attr("text-anchor", "middle")
                .attr("x", parseInt(width) / 2)
                .attr("y", parseInt(height) / 2);
        }

        svg.append("g")
            .attr("transform", "translate(" + trans[0] + "," + trans[1] + ")");

        return this;
    };
    this.remove = function() {
        var div = getDiv();
        if (! div.empty()) div.remove();
        zoom.on("zoom." + coordinate, null);
    };
    this.attachZoom = function(z) {
        var handler = eventHandler(),
            format = getFormatFunc();
        zoom = z;
        zoom.on("zoom." + coordinate, function() {
            handler(axisG()); /** Call the axis */
            format();
        });
        zoom(getDiv());
        zoom.on("zoom." + coordinate)();

        return this;
    };
    function eventHandler() {
        return d3.svg.axis()
            .scale(parent.scale()[coordinate])
            .ticks(numTicks, format)
            .orient(coordinate === "x" ? "top" : "left");
    }
    function getFormatFunc() {
        var theta =  coordinate === "x" ? -50 : -30,
            dx =     coordinate === "x" ? 1 : -0.5,
            dy =     coordinate === "x" ? 0 : 0,
            anchor = coordinate === "x" ? "start" : "end";
        return function() {
            var g = axisG();
            g.selectAll("text")
                .style({font: "10px sans-serif", "text-anchor": anchor})
                .attr("dy", dy)
                .attr("dx", dx + "em")
                .attr("transform", "rotate(" + theta + ")");
            g.selectAll("line, path")
                .style({fill: "none", stroke: "#111", "shape-rendering": "crispEdges"});
        };
    }
    function axisG() {
        return getDiv().select("g");
    }
    function getDiv() {
        return parent.figure().select("." + coordinate + ".axis");
    }
    this.getDiv = getDiv;
    this.title = function(t) {
        if (! arguments.length) return parent;
        title = t;
        return this;
    };
    this.parent = function(p) {
        if (! arguments.length) return parent;
        parent = p;
        return this;
    };
    this.coordinate = function(c) {
        if (! arguments.length) return coordinate;
        coordinate = c;
        return this;
    };
    this.size = function(s) {
        if (! arguments.length) return size;
        size = s;
        return this;
    };
    /** FIXME: Rename to "active"? */
    this.exists = function() {
        return ! getDiv().empty();
    }
}
Axis.prototype = new FigureComponent();

function FigureComponent() {
    function divSize() {
        var d = this.getDiv();
        var width = d.empty() ? 0 : d.style("width");
        var height = d.empty() ? 0 : d.style("height");
        return { width: parseInt(width), height: parseInt(height) }
    }
    this.divSize = divSize;
//    this.size = function(s) {
//        if (! arguments.length) return size;
//        size = s;
//        return this;
//    };
//    this.size = size;
}

function applyProperties(element, properties) {
    for (var prop in properties) {
        element[prop] = properties[prop];
    }
}

function applyStyles(element, styles) {
    applyProperties(element.style, styles);
}