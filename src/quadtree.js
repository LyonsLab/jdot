function identity(value) {
    return value;
}

function rectangle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.contains = function(that) {
        if (that.dataType === "line") return this._containsLine(that);
        if (that.dataType === "point") return this._containsPoint(that);

        return (that.x >= this.x &&
                that.y >= this.y &&
                (that.x + that.width) <= (this.x + this.width) &&
                (that.y + that.height) <= (this.y + this.height));
    };

    this._containsLine = function(line) {
        return (this._containsPoint({ x: line.x1, y: line.y1})
                && this._containsPoint({ x: line.x2, y: line.y2}));
    };

    this._containsPoint = function(point) {
        return (point.x >= this.x &&
                point.y >= this.y &&
                point.x <= (this.x + this.width) &&
                point.y <= (this.y + this.height));
    };

    this.toString = function() {
        return "[x=" + this.x  + ", y=" + this.y + ", width=" + this.width + ", height=" + this.height + "]";
    };

    this.intersects = function(that) {
        if (that.dataType === "line") return this._intersectsLine(that);
        if (that.dataType === "point") return this._containsPoint(that);

        return !(that.x > (this.x + this.width) ||
                 (that.x + that.width) < this.x ||
                 that.y > (this.y + this.height) ||
                 (that.y + that.height) < this.y);
    };

    this._intersectsLine = function(line) {
        var x2 = this.x + this.width;
            y2 = this.y + this.height;

        var lines = [
            {x1: this.x, x2: x2, y1: this.y, y2: this.y},
            {x1: this.x, x2: x2, y1: y2, y2: y2},
            {x1: this.x, x2: this.x, y1: this.y, y2: y2},
            {x1: x2, x2: x2, y1: this.y, y2: y2}
        ];

        var a = Math.round(line.y2 - line.y1);
        var b = Math.round(line.x1 - line.x2);
        var c = Math.round(a * this.x + b * this.y);

        var checkIntersection = function(line) {
            var a2 = Math.round(line.y2 - line.y1);
            var b2 = Math.round(line.x1 - line.x2);
            var c2 = Math.round(a2 * line.x1 + b2 * line.y1);

            var det = (a * b2) - (a2 * b);

            if (det === 0) return false;

            var x = ((b2 * c) - (b * c2)) / det;
            var y = ((a * c2) - (a2 * c)) / det;

            var xmin = Math.min(line.x1, line.x2);
            var xmax = Math.max(line.x2, line.x1);

            var ymin = Math.min(line.y1, line.y2);
            var ymax = Math.max(line.y2, line.y1);

            return (xmin <= x && x <= xmax) && (ymin <= y && y <= ymax);
        };

        // Check if any line intersects
        return lines.map(checkIntersection).filter(identity).length > 0;
    };
}

function quadtree(boundary, level) {
    this.capacity = 10;
    this.level = level || 0;
    this.boundary = boundary;
    this.points = [];
    var concat = Array.prototype.concat,
        MAX_LEVELS = 10;

    this._split = function() {
        var width = parseInt(this.boundary.width / 2),
            height = parseInt(this.boundary.height / 2),
            l = this.level + 1,
            x = this.boundary.x,
            y = this.boundary.y,
            x2 = x + width,
            y2 = y + height;

        this.northWest = new quadtree(new rectangle(x, y2, width, height), l);
        this.northEast = new quadtree(new rectangle(x2, y2, width, height), l);
        this.southEast = new quadtree(new rectangle(x2, y, width, height), l);
        this.southWest = new quadtree(new rectangle(x, y, width, height), l);
    };

    this.clear = function() {
        if (this.northWest !== undefined) this.northWest.clear();
        if (this.northEast !== undefined) this.northEast.clear();
        if (this.southWest !== undefined) this.southWest.clear();
        if (this.southEast !== undefined) this.southEast.clear();

        this.northWest = undefined;
        this.northEast = undefined;
        this.southWest = undefined;
        this.southEast = undefined;
        this.points.length = 0;
    };

    this.insert = function(data) {
        if (!this.boundary.contains(data)) return false;

        if (this.northWest === undefined && this.level <= MAX_LEVELS) {
            this._split();
        }

        if (this.northWest !== undefined) {
            if (this.northWest.insert(data)) return true;
            if (this.northEast.insert(data)) return true;
            if (this.southWest.insert(data)) return true;
            if (this.southEast.insert(data)) return true;
        }

        this.points.push(data);

        return true;
    };

    this.query = function(boundingBox) {
        var points = [];
        if (!this.boundary.intersects(boundingBox)) return points;

        points = this.points.slice(0);

        if (this.northWest === undefined) return points;

        points = concat.call(points,
            this.northWest.query(boundingBox),
            this.northEast.query(boundingBox),
            this.southWest.query(boundingBox),
            this.southEast.query(boundingBox));

        return points;
    };

    this.query_with_density = function(boundingBox, pxWidth, pxHeight) {
        var points = [],
            bpPerPixelHeight = boundingBox.width / pxWidth,
            bpPerPixelWidth = boundingBox.height / pxHeight;

        if (!this.boundary.intersects(boundingBox)) return points;

        if ((this.boundary.width <= bpPerPixelWidth) &&
            (this.boundary.height <= bpPerPixelHeight) &&
            (bpPerPixelWidth >= 1) &&
            (bpPerPixelHeight >= 1)) {

            return { x: this.boundary.x, y: this.bondary.y };
        }

        points = this.points.slice(0);

        if (this.northWest === undefined) return points;


        points = concat.call(points,
            this.northWest.query_with_density(boundingBox, pxWidth, pxHeight),
            this.northEast.query_with_density(boundingBox, pxWidth, pxHeight),
            this.southWest.query_with_density(boundingBox, pxWidth, pxHeight),
            this.southEast.query_with_density(boundingBox, pxWidth, pxHeight));

        return points;
    };
}
