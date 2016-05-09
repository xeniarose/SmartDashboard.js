class NumberBox extends Widget {
    render() {
        var el = document.createElement("input");
        el.type = "number";
        el.classList.add("widget-input");
        el.id = this._dom_id;
        this.root.appendChild(el);
        var self = this;
        el.onchange = function (evt) {
            self.change(evt);
        }
    }

    change(evt) {
        this.val = parseFloat(evt.target.value);
        this.table.put(this.key, this.val);
    }

    update() {
        this.root.querySelector(".widget-input").value = this.val;
    }
}

SmartDashboard.registerWidget(NumberBox, "number");

class Graph extends Widget {
    render() {
        this.graph = document.createElement("div");
        this.graph.classList.add("widget-graph");
        this.root.appendChild(this.graph);
        
        this.items = [];

        this.dataset = new vis.DataSet(this.items);
        this.visOptions = {
            start: vis.moment().add(-30, 'seconds'), // changed so its faster
            end: vis.moment(),
            drawPoints: {
                style: 'circle' // square, circle
            },
            dataAxis: {
                left: {
                    format: function(e){
                        return '' + e;
                    }
                }
            },
            //moveable: false,
            //zoomable: true,
            interpolation: false,
            shaded: {
                orientation: 'bottom' // top, bottom
            }
        };
        var self = this;
        this.graph2d = new vis.Graph2d(this.graph, this.dataset, this.visOptions);
        setTimeout(function(){
            self.mouseUpHandler();
        }, 1000);
    }
    
    setEditable(editable){
        super.setEditable(editable);
        this.mouseUpHandler();
    }
    
    setPosition(x, y, w, h){
        super.setPosition(x, y, w, h);
        this.mouseUpHandler();
    }
    
    mouseUpHandler(){
        this.graph2d.setOptions({height: '1px'});
        this.graph2d.setOptions({height: this.graph.offsetHeight+'px'})
    }

    update() {
        var now = vis.moment();
        var range = this.graph2d.getWindow();
        var interval = range.end - range.start;
        if (now > range.end) {
            this.graph2d.setWindow(now - 0.1 * interval, now + 0.9 * interval);
        }
        
        var now = vis.moment();
        this.dataset.add({
            x: now,
            y: this.val
        });
    }
    
    destroy(){
        this.graph2d.destroy();
    }
    
    chooseFile() {
        var self = this;
        var chooser = document.createElement("input");
        chooser.type = "file";
        chooser.setAttribute("nwsaveas", "");
        chooser.accept = ".csv";
        chooser.addEventListener("change", function(evt) {
            try {
                var contents = "Unix Timestamp," + self.key + "\n";
                for(var key in self.dataset._data){
                    var item = self.dataset._data[key];
                    contents += item.x.unix() + "," + item.y + "\n";
                }
                fs.writeFileSync(this.value, contents);
                gui.Shell.openItem(this.value);
            } catch(e){
                SmartDashboard.handleError(e);
            }
        }, false);
        chooser.style.display = "none";
        chooser.click();
    }
    
    createContextMenu(menu) {
        var self = this;
        menu.append(new gui.MenuItem({
            label: "Export Data",
            click: function () {
                self.chooseFile();
            }
        }));
        menu.append(new gui.MenuItem({
            label: "Reset",
            click: function () {
                self.dataset.clear();
            }
        }));
    }
}

SmartDashboard.registerWidget(Graph, "number");

class Slider extends Widget {
    createMainElement(){
        return document.createElement("input");
    }
    
    getEditableProperties(){
        return ["min", "max", "step"];
    }
    
    render() {
        var el = this.createMainElement();
        el.type = "range";
        el.classList.add("widget-input");
        el.id = this._dom_id;
        
        for (var item of this.getEditableProperties()) {
            el[item] = this.saveData[item];
        }
        
        this.root.appendChild(el);
        this._valLabel = document.createElement("label");
        this._valLabel.style.width = this._valLabel.style.minWidth = "4em";
        this.root.appendChild(this._valLabel);
        var self = this;
        el.onchange = function (evt) {
            self.change(evt);
        }
        el.onmousemove = function (evt) {
            self._valLabel.textContent = this.value;
        }
    }

    createPropertiesView(win){
        var cb = function (k, v) {
            self.saveData[k] = v;
            self.root.querySelector(".widget-input")[k] = v;
            self.update();
        };
        for (var item of self.getEditableProperties()) {
            win.addField(item, "number", self.root.querySelector(".widget-input")[item], cb);
        }
    }

    change(evt) {
        this.val = parseFloat(evt.target.value);
        this.table.put(this.key, this.val);
        this._valLabel.textContent = this.val;
    }

    update() {
        this._valLabel.textContent = this.val;
        this.root.querySelector(".widget-input").value = this.val;
    }
}

SmartDashboard.registerWidget(Slider, "number");

class Meter extends Slider {
    createMainElement(){
        var el = document.createElement("progress");
        el.max = 1;
        el.style.alignSelf = "center";
        return el;
    }
    
    change(evt) {
    }
    
    update() {
        this._valLabel.textContent = this.val;
        var inp = this.root.querySelector(".widget-input");
        inp.onchange = null;
        if(!inp.minimum) inp.minimum = "0";
        if(!inp.maximum) inp.maximum = "100";
        var min = parseFloat(inp.minimum);
        var max = parseFloat(inp.maximum);
        inp.value = (this.val - min) / (max - min);
    }
    
    getEditableProperties(){
        return ["minimum", "maximum"];
    }
}

SmartDashboard.registerWidget(Meter, "number");

class StringBox extends Widget {
    render() {
        var el = document.createElement("input");
        el.type = "text";
        el.classList.add("widget-input");
        el.id = this._dom_id;
        this.root.appendChild(el);
        var self = this;
        el.onchange = function (evt) {
            self.change(evt);
        }
    }

    change(evt) {
        this.val = evt.target.value;
        this.table.put(this.key, this.val);
    }

    update() {
        this.root.querySelector(".widget-input").value = this.val;
    }
}

SmartDashboard.registerWidget(StringBox, "string");

class Checkbox extends Widget {
    render() {
        var el = document.createElement("input");
        el.type = "checkbox";
        el.classList.add("widget-input");
        el.id = this._dom_id;
        this.root.appendChild(el);
        var self = this;
        el.onchange = function (evt) {
            self.change(evt);
        }
    }

    change(evt) {
        this.val = evt.target.checked;
        this.table.put(this.key, this.val);
    }

    update() {
        this.root.querySelector(".widget-input").checked = this.val;
    }
}

SmartDashboard.registerWidget(Checkbox, "boolean");

class RedGreen extends Checkbox {
    render(){
        super.render();
        this.root.querySelector(".widget-input").classList.add("redgreen");
    }
}

SmartDashboard.registerWidget(RedGreen, "boolean");

class ArrayView extends Widget {
    render() {
        var sel = document.createElement("select");
        sel.classList.add("widget-array-type-selector");
        for (var t of["boolean", "number", "string"]) {
            var opt = document.createElement("option");
            opt.value = t;
            opt.textContent = t;
            sel.appendChild(opt);
        }
        if (typeof this.saveData.type == "undefined") {
            this.saveData.type = "string";
        }
        sel.value = this.saveData.type;
        var el = document.createElement("ul");
        el.classList.add("widget-array");
        el.id = this._dom_id;
        var container = document.createElement("div");
        container.classList.add("widget-array-container");
        container.appendChild(sel);
        container.appendChild(el);
        this.root.appendChild(container);
        this.view = el;
        this.typeSelector = sel;
        this.renderArray();
    }

    renderArray() {
        this.view.innerHTML = "";
        if (this.val == null || this.val.length == 0) {
            this.view.innerHTML = "(empty)";
            return;
        }
        var first = this.val[0];
        this.typeSelector.value = typeof first;
        this.saveData.type = typeof first;
        for (var i = 0; i < this.val.length; i++) {
            var item = this.val[i];
            var el = document.createElement("li");
            el.textContent = item;
            this.view.appendChild(el);
        }
    }

    change(evt) {
        this.val = [];
        this.table.put(this.key, this.val);
    }

    update() {
        this.renderArray();
    }
}
SmartDashboard.registerWidget(ArrayView, "array");

class Chooser extends Widget {
    render() {
        this._select = document.createElement("select");
        this._select.classList.add("widget-input");
        this._select.id = this._dom_id;;
        var self = this;
        this._select.onchange = function (evt) {
            self.change(evt);
        };
        this.root.appendChild(this._select);
        this.update();
    }

    _update(k, v) {}

    attachListeners() {
        var chooserRoot = this.table.getTablePath() + "/" + this.key;
        this._valTable = ntcore.getTable(chooserRoot);
        var self = this;
        this._mainListener = function (k, v) {
            if (k == "options") {
                self.val = v;
            } else if (k == "selected") {
                self.valSelected = v;
            }
            self.update();
        };
        // ignores default for now
        this._valTable.onChange("options", this._mainListener);
        this._valTable.onChange("selected", this._mainListener);

        this.val = this._valTable.get("options", []);
        this.valSelected = this._valTable.get("selected", "");
    }

    change(evt) {
        this.table.put(this.key + "/selected", evt.target.value);
    }

    update() {
        this._select.innerHTML = "";
        for (var val of this.val) {
            var opt = document.createElement("option");
            opt.val = val;
            opt.textContent = val;
            this._select.appendChild(opt);
        }
        this._select.value = this.valSelected;
    }
}
SmartDashboard.registerWidget(Chooser, "object");

class TextBox extends Widget {
    render() {
        var el = document.createElement("textarea");
        el.classList.add("widget-input");
        el.id = this._dom_id;
        this.root.appendChild(el);
        var self = this;
        el.onchange = function (evt) {
            self.change(evt);
        }
    }

    change(evt) {
        this.val = evt.target.value;
        this.table.put(this.key, this.val);
    }

    update() {
        this.root.querySelector(".widget-input").value = this.val;
    }
}

SmartDashboard.registerWidget(TextBox, "string");

class Command extends Widget {
    render() {
        this._commandRunning = false;
        
        this._button = document.createElement("button");
        this._button.classList.add("widget-input");
        this._button.textContent = "Start";
        this._button.id = this._dom_id;;
        var self = this;
        this._button.onclick = function (evt) {
            self.change(evt);
        };
        this.root.appendChild(this._button);
        this.update();
    }

    _update(k, v) {}

    attachListeners() {
        var commandRoot = this.table.getTablePath() + "/" + this.key;
        this._valTable = ntcore.getTable(commandRoot);
        var self = this;
        this._mainListener = function (k, v) {
            if (k == "running") {
                self._commandRunning = v;
            }
            self.update();
        };
        // ignores default for now
        this._valTable.onChange("running", this._mainListener);

        this.val = this._valTable.get("options", []);
        this.valSelected = this._valTable.get("selected", "");
    }

    change(evt) {
        this._commandRunning = !this._commandRunning;
        this.table.put(this.key + "/running", this._commandRunning);
        this.update();
    }

    update() {
        this._button.textContent = this._commandRunning ? "Stop" : "Start";
        if(this._commandRunning){
            this._button.classList.add("command-running");
        } else {
            this._button.classList.remove("command-running");
        }
    }
}

SmartDashboard.registerWidget(Command, "object");

class FlowContainer extends Container {
    getDragMode(){
        return "order";
    }
    
    onNew(){
        this.dom.classList.add("drag-order");
    }
}

SmartDashboard.registerWidget(FlowContainer, "container");

class FlexContainer extends Container {
    getDragMode(){
        return "order";
    }
    
    onNew(){
        this.dom.style.width = this.dom.style.height = "100px";
        this.dom.classList.add("drag-order");
    }
    
    restoreSave(){
        var props = ["flex-direction", "justify-content", "align-items", "flex-wrap", "align-content"];
        for(var k of props){
            this.dom.style[k] = this.saveData[k];
        }
    }
    
    createPropertiesView(win){
        var self = this;
        var props = ["flex-direction", "justify-content", "align-items", "flex-wrap", "align-content"];
        var helpers = {
            "flex-direction":  ["row",        "column",   "row-reverse", "column-reverse"                          ],
            "justify-content": ["flex-start", "flex-end", "center",      "space-between", "space-around"           ],
            "align-items":     ["flex-start", "flex-end", "center",      "baseline",      "stretch"                ],
            "flex-wrap":       ["nowrap",     "wrap",     "wrap-reverse"                                           ],
            "align-content":   ["flex-start", "flex-end", "center",      "space-between", "space-around", "stretch"]
        };
        function cb(k, v){
            self.dom.style[k] = v;
            self.saveData[k] = v;
        }
        for(var prop of props){
            win.addField(prop, "text", window.getComputedStyle(this.dom)[prop], cb, helpers[prop]);
        }
    }
    
    restoreSaveFromParent(self){
        var props = ["flex", "align-self"];
        for(var k of props){
            self.dom.style[k] = self.saveData[k];
        }
    }
    
    getPropertiesFromParent(win, self){
        var props = ["flex", "align-self"];
        var helpers = {
            "flex": ["none"],
            "align-self": ["auto", "flex-start", "flex-end", "center", "baseline", "stretch"]
        };
        function cb(k, v){
            self.dom.style[k] = v;
            self.saveData[k] = v;
        }
        for(var prop of props){
            win.addField(prop, "text", window.getComputedStyle(self.dom)[prop], cb, helpers[prop]);
        }
    }
}

SmartDashboard.registerWidget(FlexContainer, "container");

class StaticImage extends UnlinkedWidget {
    render(){
        this._img = document.createElement("div");
        this._img.classList.add("image");
        this.dom.appendChild(this._img);
        
        this._fakeImg = document.createElement("img");
        var self = this;
        this._fakeImg.addEventListener('load', function() {
            var width = this.naturalWidth;
            var height = this.naturalHeight;
            //self._img.style.minWidth = width + "px";
            //self._img.style.minHeight = height + "px";
            self.aspectRatio = width / height;
        });
        
        this.updateImg(this.saveData.imagePath || "");
    }
    
    onNew(){
        this._img.style.minWidth = "100px";
        this._img.style.minHeight = "100px";
    }
    
    updateImg(path){
        var src = this._fakeImg.src = "file:///" + path.replace(/\\/g, "/");
        this._img.style.backgroundImage = "url(\"" + src + "\")";
    }
    
    createPropertiesView(win){
        var self = this;
        function cb(k, v){
            self.saveData.imagePath = v;
            self.updateImg(self.saveData.imagePath);
        }
        
        win.addField("image", "file", self.saveData.imagePath || "", cb);
    }
}
SmartDashboard.registerWidget(StaticImage, "unlinked");

class MjpegStream extends UnlinkedWidget {
    render(){
        this._img = document.createElement("img");
        this._img.classList.add("stream");
        this.dom.appendChild(this._img);
        var self = this;
        this._img.addEventListener('load', function() {
            var width = this.naturalWidth;
            var height = this.naturalHeight;
            //self._img.style.minWidth = width + "px";
            //self._img.style.minHeight = height + "px";
            self.aspectRatio = width / height;
        });
        
        this.saveData.mjpegUrl = this.saveData.mjpegUrl || "http://10.te.am.11/mjpg/video.mjpg";
        
        this.updateImg(this.saveData.mjpegUrl);
    }
    
    onNew(){
        this._img.style.minWidth = "100px";
        this._img.style.minHeight = "100px";
    }
    
    updateImg(path){
        this._img.src = path;
    }
    
    createPropertiesView(win){
        var self = this;
        function cb(k, v){
            self.saveData.mjpegUrl = v;
            self.updateImg(self.saveData.mjpegUrl);
        }
        
        win.addField("url", "text", self.saveData.mjpegUrl, cb);
    }
}

SmartDashboard.registerWidget(MjpegStream, "unlinked");