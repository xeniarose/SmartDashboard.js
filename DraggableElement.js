/**
 * The base class for both Widget and Container. Contains common code for dragging, resizing, and positioning
 */
class DraggableElement {
    constructor(){
        
    }
    
    _registerDom(dom){
        dom.parentWidget = this;
        this._applyStyles(dom, this.saveData.style);
    }
    
    _applyStyles(dom, styleText){
        var rules = DomUtils.getCssRules("p{" + styleText + "}");
        if(rules.length < 1) return;
        var style = rules[0].style;
        for(var key in style){
            if(style.hasOwnProperty(key) && parseInt(key) != key
                    && ["top", "left", "width", "height"].indexOf(key) < 0){
                this.dom.style[key] = style[key];
            }
        }
    }
    
    _createContextMenu(){
        
    }
    
    createPropertiesView(win){
        
    }
    
    createContextMenu(menu){
        
    }
    
    remove() {
        if(this._propsWindow){
            this._propsWindow.close();
        }
    }
    
    changeOrder(which){
        var parent = this.dom.parentElement;
        if(which == "forward"){
            var next = this.dom.nextElementSibling;
            if(typeof next != "undefined" && next != null)
                next = next.nextElementSibling;
            this.dom.remove();
            parent.insertBefore(this.dom, next);
        } else if(which == "backward") {
            var prev = this.dom.previousElementSibling;
            this.dom.remove();
            parent.insertBefore(this.dom, prev);
        } else if(which == "to front"){
            this.dom.remove();
            parent.appendChild(this.dom);
        } else if(which == "to back"){
            this.dom.remove();
            parent.insertBefore(this.dom, parent.children[0]);
        }
    }
    
    _propertyMenuCallback(){
        var self = this;
        if(this._propsWindow){
            this._propsWindow.close();
        }
        var c = SmartDashboard.createWindowCoordinates(350, 400);
        gui.Window.open("blank.html", {
            width: 350,
            height: 400,
            x: c.x,
            y: c.y,
            frame: false
        }, function (w) {
            var win = w.window;
            self._propsWindow = win;
            w.on("loaded", function () {
                var cb = function (k, v) {
                    var pos = self.getPosition();
                    pos[k] = parseFloat(v);
                    self.setPosition(pos.x, pos.y, pos.w, pos.h);
                    self._w = self.dom.offsetWidth;
                    self._h = self.dom.offsetHeight;
                };
                var pos = self.getPosition();
                win.addField({ value: "x", display: "X" }, "number", pos.x, cb);
                win.addField({ value: "y", display: "Y" }, "number", pos.y, cb);
                win.addField({ value: "w", display: "Width" }, "number", pos.w, cb);
                win.addField({ value: "h", display: "Height" }, "number", pos.h, cb);
                win.addField("Style", "textarea", self.saveData.style || "", function(k, v){
                    self.saveData.style = v;
                    self._applyStyles(self.dom, v);
                });
                if(self.parent){
                    win.addSeparator();
                    win.addSectionHeader("Properties added by " + self.parent.constructor.name);
                    self.parent.getPropertiesFromParent(win, self);
                    win.addSeparator();
                }
                
                self._createPropertiesView(win);
            });
        });
    }
    
    _createPropertiesView(win){
        win.addSeparator();
        this.createPropertiesView(win);
    }
    
    onInserted(){
        
    }
    
    setEditable(flag){
        var self = this;
        this.editable = flag;
        this.dom.dataset.editable = "" + flag;
        if (flag) {
            this._dragging = false;
            this._dragSize = false;
            var sx, sy, ox, oy, ow, oh;
            this.dom.onmouseover = this.dom.onmouseout = function (e) {
                e.preventDefault();
                return false;
            }
            this.dom.onmousedown = function (e) {
                if(e.which == 2){
                    if (e.clientX - self.dom.offsetLeft > self.dom.offsetWidth - 10
                            && e.clientY - self.dom.offsetTop > self.dom.offsetHeight - 10) {
                        self.resetSize();
                    }
                    e.preventDefault();
                    return false;
                }
                
                if(e.which != 1) return;
                if(e.detail > 1) return;
                if(self.dom.classList.contains("not-editing")) return;
                self._dragging = true;
                self.dom.classList.add("drag");
                if(!self.parent || (self.parent && self.parent.getDragMode() == "position")){
                    var parent = self.dom.parentElement;
                    self.dom.remove();
                    parent.appendChild(self.dom);
                } else if(self.parent.getDragMode() == "order"){
                    self.dom.classList.add("hl");
                }
                
                sx = e.clientX;
                sy = e.clientY;
                ox = parseInt(self.dom.style.left);
                oy = parseInt(self.dom.style.top);
                ow = self.dom.offsetWidth;
                oh = self.dom.offsetHeight;
                if (isNaN(ox)) ox = 0;
                if (isNaN(oy)) oy = 0;

                var rect = self.dom.getBoundingClientRect();
                
                if (e.clientX - rect.left > rect.width - 10 && e.clientY - rect.top > rect.height - 10) {
                    self._dragSize = true;
                } else {
                    self._dragSize = false;
                }

                self.mouseDownHandler();
                
                e.preventDefault();
                return false;
            }

            this.dom.onmouseup = function (e) {
                self._dragging = false;
                self.dom.classList.remove("drag");
                
                DomUtils.resetClass("drop-target");
                DomUtils.resetClass("remove-target");
                DomUtils.resetClass("hl");
                
                if(!self._dragSize && e.which == 1 && !e.shiftKey){
                    var hoverContainer = self._widgetIntersect();
                    if(hoverContainer){
                        hoverContainer.addChild(self);
                    } else if(self.parent) {
                        var pRect = self.parent.dom.getBoundingClientRect();
                        if((e.clientX < pRect.left || e.clientX > pRect.right) || (e.clientY < pRect.top || e.clientY > pRect.bottom)){
                            self.parent.removeChild(self);
                        }
                    }
                }
                
                self.mouseUpHandler();
                
                if(!e.shiftKey){
                    DomUtils.checkHoverOnTrash(e, self);
                }
                
                e.preventDefault();
                return false;
            }

            this.dom.onmousemove = function (e) {
                if (self._dragging) {
                    //console.log(e.screenX, e.screenY, e.clientX, e.clientY);
                    if (self._dragSize) {
                        this.style.width = (e.clientX - sx + ow + 5) + "px";
                        if(self.aspectRatio){
                            this.style.height = ((e.clientX - sx + ow + 5) / self.aspectRatio) + "px";
                        } else {
                            this.style.height = (e.clientY - sy + oh + 5) + "px";
                        }
                        self._w = this.offsetWidth;
                        self._h = this.offsetHeight;
                    } else {
                        if(!self.parent || (self.parent && self.parent.getDragMode() == "position")){
                            this.style.left = ((e.clientX - sx) + ox) + "px";
                            this.style.top = ((e.clientY - sy) + oy) + "px";
                        } else if(self.parent.getDragMode() == "order") {
                            var children = self.parent.getChildren();
                            var closestChild = null;
                            var closestDist = Number.MAX_VALUE;
                            var closestChildRect;
                            for(var child of children){
                                var cRect = child.dom.getBoundingClientRect();
                                
                                var dx = Math.abs(e.clientX - (cRect.left + cRect.width / 2));
                                var dy = Math.abs(e.clientY - (cRect.top + cRect.height / 2));
                                var dist = dx * dx + dy * dy;
                                if(dist > 0){
                                    if(dist < closestDist){
                                        closestDist = dist;
                                        closestChild = child;
                                        closestChildRect = cRect;
                                    }
                                }
                            }
                            if(closestChild != null && closestChild != self){
                                var parentEl = self.dom.parentElement;
                                if(parentEl != null){
                                    var dx = e.clientX - (closestChildRect.left + closestChildRect.width / 2);
                                    var dy = e.clientY - (closestChildRect.top + closestChildRect.height / 2);
                                    if(dx < 0){
                                        self.dom.remove();
                                        parentEl.insertBefore(self.dom, closestChild.dom);
                                    } else {
                                        self.dom.remove();
                                        parentEl.insertBefore(self.dom, closestChild.dom.nextElementSibling);
                                    }
                                }
                            }
                        }
                    }
                
                    if(!self._dragSize && !e.shiftKey){
                        var hoverContainer = self._widgetIntersect();
                        DomUtils.resetClass("drop-target");
                        DomUtils.resetClass("remove-target");
                        if(hoverContainer){
                            hoverContainer.dom.classList.add("drop-target");
                        } else if(self.parent) {
                            var pRect = self.parent.dom.getBoundingClientRect();
                            if((e.clientX < pRect.left || e.clientX > pRect.right) || (e.clientY < pRect.top || e.clientY > pRect.bottom)){
                                self.parent.dom.classList.add("remove-target");
                            }
                        }
                    }
                }
                
                e.preventDefault();
                return false;
            }
        } else {
            this.dom.onmousedown = null;
            this.dom.onmouseup = null;
            this.dom.onmousemove = null;
            this.dom.onmouseover = null;
            this.dom.onmouseout = null;
        }
    }
    
    _widgetIntersect(){
        var blacklist = [];
        function addChildren(node){
            if(!node.getChildren) return;
            for(var child of node.getChildren()){
                blacklist.push(child);
                addChildren(child);
            }
        }
        addChildren(this);
        var parent = this.parent;
        while(parent){
            blacklist.push(parent);
            parent = parent.parent;
        }
        return CoordinateUtils.findIntersectingContainer(this, blacklist);
    }
    
    resetSize(){
        this.dom.style.width = this.dom.style.height = null;
        this._w = this.dom.offsetWidth;
        this._h = this.dom.offsetHeight;
    }
    
    getPosition() {
        var ox = parseInt(this.dom.style.left);
        var oy = parseInt(this.dom.style.top);
        if (isNaN(ox)) ox = 0;
        if (isNaN(oy)) oy = 0;
        return {
            x: ox,
            y: oy,
            w: this._w,
            h: this._h
        };
    }

    setPosition(x, y, w, h) {
        this.dom.style.left = x + "px";
        this.dom.style.top = y + "px";
        this.dom.style.width = w + "px";
        this.dom.style.height = h + "px";
    }
    
    mouseDownHandler(){
    }
    
    mouseUpHandler(){
    }
    
    render(){
        
    }
    
    destroy(){
        
    }
}

global.DraggableElement = DraggableElement;