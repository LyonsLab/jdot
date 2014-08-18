function MultiDotPlot(id, config) {
    var controls, dotplots;

    this.constructor = function() {
        this.element = d3.select("#" + id);
        var el = element();

        if (el.empty()) {
            console.error("MultiDotPlot: error: element id '" + id + "' not found");
            return;
        }

        this.configure(config);

        if (! this.config.genomeIds)
            console.error("MultiDotPlot: no genomes specified");
        else
            var genomeIds = this.config.genomeIds;

        var numGenomesX = genomeIds.x.length;
        var numGenomesY = genomeIds.y.length;
        
        var dpPadding = 0;

        this.dpWidth = config.size.width / numGenomesX - dpPadding;
        this.dpHeight = config.size.height / numGenomesY - dpPadding;

        this.dotplots = [];

        controls = el.append("div")
            .classed("controls", true)
            .style({
                width: this.config.size.width,
                height: this.config.size.height * 0.10,
                border: "1px solid black"
            });

        var main = el.append("main")
            .style({
                position: "relative",
                width: this.config.size.width, height: this.config.size.height,
                border: "1px solid black"
            });

        console.groupCollapsed("Making DotPlots");

        genomeIds.x.forEach(function(xId, gridCol) {
            genomeIds.y.forEach(function(yId, gridRow) {

                this.makeDotPlot(xId, yId, gridCol, gridRow, main);

            }, this)
        }, this);

        dotplots = this.dotplots;

        console.groupEnd("Making DotPlots");

        this.positionAll();

        controls.append("button")
            .text("toggle All axes")
            .on("click", function() {
                var allOn = allAxesOn();
                dotplots.forEach(function(p) {
                    if (allOn) {
                        p.setAxis("x", "off"); p.setAxis("y", "off");
                    } else {
                        p.setAxis("x", "on"); p.setAxis("y", "on");
                    }
                });
                positionAll();
            });

    };

    function element() { return d3.select("#" + id) }
    function main() { return element().select("main"); }
    this.main = main;

    function allAxesOn() {
        var allOn = true;
        dotplots.forEach(function(p) {
            var axis = p.axes();
            if ((!axis.x.exists()) || (!axis.y.exists())) allOn = false;
        });
        return(allOn)
    }

    this.makeDotPlot = function(xId, yId, gridCol, gridRow, parent) {

        var dotPlot = new DotPlot({
            parent: main(),
            genomeIds: { x: xId, y: yId },
            gridPosition: { row: gridRow, column: gridCol },
            size: { width: this.dpWidth, height: this.dpHeight },
            axisSizeRatio: this.config.axisSizeRatio,
            fetchDataHandler: this.config.fetchDataHandler.bind(undefined, xId, yId)
        })
            .parent(this)
            .axisSizeRatio(this.config.axisSizeRatio)
            .makeFigure();

        this.dotplots.push(dotPlot);
    };

    function positionAll() {
        var anyMoved = false;
        console.log("dps", this.dotplots);
        dotplots.forEach(function(d) {
            console.log("d", d);
            var grid = d.gridPosition,
                row = grid.row, col = grid.column;
            var left = [row, col - 1]; var top = [row - 1, col];
            var leftN = dotplots.filter(function(p) {
                return p.gridPosition.row === left[0] && p.gridPosition.column === left[1]
            })[0];
            var topN = dotplots.filter(function(p) {
                return p.gridPosition.row === top[0] && p.gridPosition.column === top[1]
            })[0];
            if (leftN) d.setNeighbor("left", leftN);
            if (topN) d.setNeighbor("top", topN);
            var moved = d.positionToNeighbors();
            if (moved === true) anyMoved = true;
        });
        // if (anyMoved) positionAll();
    }
    this.positionAll = positionAll;

    this.configure = function(config) {
        this.config = config || {};

        this.config.size = this.config.size || { width: 800, height: 600 };

        if (this.config.style) {
            applyStyles(element(), this.config.style);
        }
    };

    this.constructor();
}

function DotPlot(config) {
    var _parent,
        axisSizeRatio,
        plot, extent, plotSize,
        fetchDataHandler, // figure,
        neighbors = [],
        axes,
        scale = {x: d3.scale.linear(), y: d3.scale.linear()},
        zoom,
        hasData = false,
        chromosomes, chromeScale;

    this.parent = parent;
    function parent(p) {
        if (! arguments.length) return _parent; _parent = p; return this;
    }
    this.axisSizeRatio = function(s) {
        if (! arguments.length) return axisSizeRatio; axisSizeRatio = s; return this;
    };
//    this.size = function(s) {
//        if (! arguments.length) return size; size = s; return this;
//    };

    this.constructor = function() {

        this.configure(config);

        this.xId = this.config.genomeIds.x; this.yId = this.config.genomeIds.y;
        this.gridPosition = this.config.gridPosition;
        fetchDataHandler = this.config.fetchDataHandler;
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

    function position(side, value) {
        var fig = figure();
        if (! arguments.length) {
            var t = fig.style("top"), l = fig.style("left");
            return {
                top: t === "auto" ? 0 : parseInt(t),
                left: l === "auto" ? 0 : parseInt(l)
            };
        }
        value = parseInt(value);

        var old = fig.style(side) === "auto" ? 0 : parseInt(fig.style(side));

        fig.style(side, value + "px");

        return old !== value
    }
    this.position = position;

    this.positionToNeighbors = function() {
        var moved = false;
        neighbors.forEach(function(n) {
            // console.log("Positioning to %s", n.direction);
            var dimension = n.direction === "top" ? "height" : "width";
            var nSize = n.dotplot.divSize()[dimension];
            var other = n.direction === "top" ? "left" : "top";
            var nPos = n.dotplot.position();
            moved = position(n.direction, nSize + nPos[n.direction]);
        });
        return moved;
    };
    this.makeFigure = function() {
        var figure = parent().main().append("figure")
            .style({ margin: 0, position: "relative" });

        // console.log(axisSizeRatio);

        plotSize = {
            width: parent.dpWidth * (1 - axisSizeRatio.y),
            height: parent.dpHeight * (1 - axisSizeRatio.x)
        };

        var axisSize = {
            x: parent.dpHeight * axisSizeRatio.x,
            y: parent.dpWidth * axisSizeRatio.y
        };

        plot = new Plot().parent(this).size(plotSize).build(figure);
        axes = {
            x: new Axis().parent(this).coordinate("x").size(axisSize.x),
            y: new Axis().parent(this).coordinate("y").size(axisSize.y)
        };

        return this
    };
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
        var fig = figure();
        var existing = fig.selectAll(".plot, .axis"),
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
            axis.addTo(fig).attachZoom(zoom);
        }

        return this;
    }
    this.toggleAxis = toggleAxis;
    this.toggleAxes = function() {
        toggleAxis("x"); toggleAxis("y");
    };
    this.scale = function() { return scale; };
    this.figure = figure;
    function figure() { return parent().main().select("figure"); }
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
        radius, div, _parent, svg;

    this.build = function() {
        console.log(parent().figure());
        div = parent().figure().append("div").classed("plot", true)
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

        if (parent().chromosomes()) {
            var z = parent().zoom();
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
        return parent().figure().select(".plot");
    }
    this.getDiv = getDiv;

    this.parent = parent;
    function parent(p) {
        if (!arguments.length) return _parent;
        _parent = p;
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