class ObjectDetector extends Widget {
    render(){
        this._status = document.createTextNode("Detecting object type...");
        this.root.appendChild(this._status);
    }
    
    onInserted(){
        outer:
        for(var widgetTypeName in SmartDashboard.widgetTypes){
            var widgetType = SmartDashboard.widgetTypes[widgetTypeName];
            if(widgetType.dataType == "object" && widgetType.data && widgetType.data.objectDetect){
                for(var key of widgetType.data.objectDetect){
                    if(typeof this.table.get(this.key + "/" + key) == "undefined"){
                        continue outer;
                    }
                }
                this.replaceWith(widgetType.widget);
                return;
            }
        }
        this._status.textContent = "Can't detect object type";
        this.dom.classList.add("no-detect");
    }
    
    replaceWith(widgetType){
        var pos = this.getPosition();
        var widget = new widgetType(this.table.getTablePath(), this.key);
        widget.setPosition(pos.x, pos.y, pos.w, pos.h);
        SmartDashboard.removeWidget(this);
        SmartDashboard.addWidget(widget);
        widget.resetSize();
        widget.setPosition(pos.x + pos.w / 2 - widget._w / 2, pos.y + pos.h / 2 - widget._h / 2, widget._w, widget._h);
        if(this.parent){
            this.parent.addChild(widget, true);
        }
    }
}
SmartDashboard.registerWidget(ObjectDetector, "object");

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
        
        if(!this.saveData.maxNumPoints){
            this.saveData.maxNumPoints = 100;
        }

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
    
    createPropertiesView(win){
        var self = this;
        this._propCb = function(k, v){
            self.saveData.maxNumPoints = parseInt(v);
        }
        win.addField("Points to keep", "number", self.saveData.maxNumPoints || 100, this._propCb);
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
        try {
            this.graph2d.setOptions({height: '1px'});
            this.graph2d.setOptions({height: this.graph.offsetHeight+'px'});
        } catch(e){
            console.error(e);
        }
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
        while(this.dataset.length > this.saveData.maxNumPoints && this.dataset.length > 0){
            this.dataset.remove(this.dataset.get()[0].id);
        }
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
        return [
            { value: "min", display: "Minimum" },
            { value: "max", display: "Maximum" },
            { value: "step", display: "Step" }
        ];
    }
    
    render() {
        var el = this.createMainElement();
        el.type = "range";
        el.classList.add("widget-input");
        el.id = this._dom_id;
        
        for (var item of this.getEditableProperties()) {
            el[item.value] = this.saveData[item.value];
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
        var self = this;
        var cb = function (k, v) {
            self.saveData[k] = v;
            self.root.querySelector(".widget-input")[k] = v;
            self.update();
        };
        for (var item of this.getEditableProperties()) {
            win.addField(item, "number", this.root.querySelector(".widget-input")[item.value], cb);
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

class Meter extends Widget {
    render() {
        var el = document.createElement("div");
        el.classList.add("widget-input");
        el.id = this._dom_id;
        var inner = document.createElement("div");
        el.appendChild(inner);
        
        if(!this.saveData.hasOwnProperty("min")){
            this.saveData.min = 0;
        }
        if(!this.saveData.hasOwnProperty("max")){
            this.saveData.max = 100;
        }
        
        this.root.appendChild(el);
        this._valLabel = document.createElement("label");
        this._valLabel.style.width = this._valLabel.style.minWidth = "4em";
        this.root.appendChild(this._valLabel);
    }
    
    update() {
        this._valLabel.textContent = this.val;
        var meter = this.root.querySelector(".widget-input");
        
        var min = parseFloat(this.saveData.min);
        var max = parseFloat(this.saveData.max);
        var percent = 100 * (this.val - min) / (max - min);
        this.root.querySelector(".widget-input div").style.width = percent + "%";
    }
    
    createPropertiesView(win){
        var self = this;
        var cb = function (k, v) {
            self.saveData[k] = v;
            self.update();
        };
        for (var item of [{ value: "min", display: "Minimum" }, { value: "max", display: "Maximum" }]) {
            win.addField(item, "number", this.saveData[item.value], cb);
        }
    }
}

SmartDashboard.registerWidget(Meter, "number");

class Dial extends Widget {
    render() {
        var container = document.createElement("div");
        container.id = this._dom_id;
        container.classList.add("dial-container");
        
        var el = document.createElement("div");
        el.classList.add("widget-input");
        
        for(var i = 0; i < 360; i += 45){
            var tick = document.createElement("div");
            tick.classList.add("tick");
            tick.classList.add("tick-" + i);
            
            var label = document.createElement("div");
            label.classList.add("tick-label");
            tick.appendChild(label);
            el.appendChild(tick);
        }
        
        var inner = document.createElement("div");
        inner.classList.add("needle");
        el.appendChild(inner);
        container.appendChild(el);
        
        if(!this.saveData.hasOwnProperty("min")){
            this.saveData.min = 0;
        }
        if(!this.saveData.hasOwnProperty("max")){
            this.saveData.max = 100;
        }
        
        this.root.appendChild(container);
        this.updateLabels();
    }
    
    updateLabels() {
        var min = parseFloat(this.saveData.min);
        var max = parseFloat(this.saveData.max);
        for(var i = 0; i < 360; i += 45){
            var label = this.root.querySelector(".tick-" + i + " .tick-label");
            label.textContent = min + (i / 360) * (max - min);
        }
    }
    
    update() {
        var min = parseFloat(this.saveData.min);
        var max = parseFloat(this.saveData.max);
        var degrees = 360 * (this.val - min) / (max - min);
        this.root.querySelector(".widget-input .needle").style.transform = "rotate(" + degrees + "deg)";
    }
    
    createPropertiesView(win){
        var self = this;
        var cb = function (k, v) {
            self.saveData[k] = v;
            self.update();
            self.updateLabels();
        };
        for (var item of [{ value: "min", display: "Minimum" }, { value: "max", display: "Maximum" }]) {
            win.addField(item, "number", this.saveData[item.value], cb);
        }
    }
}
SmartDashboard.registerWidget(Dial, "number");

class StringInput extends Widget {
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

SmartDashboard.registerWidget(StringInput, "string");

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
                if(self.saveData.clientOverride && self.valSelected != ""){
                    self._valTable.put("selected", self.valSelected);
                    return;
                } else {
                    self.valSelected = v;
                }
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
        this.valSelected = evt.target.value;
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
SmartDashboard.registerWidget(Chooser, "object", {objectDetect: ["options", "selected"]});

class MultilineInput extends Widget {
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

SmartDashboard.registerWidget(MultilineInput, "string");

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

SmartDashboard.registerWidget(Command, "object", {objectDetect: ["running"]});

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
        this.givesProperties = true;
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
            "flex-direction": [
                {"value":"row","display":"Row"},
                {"value":"column","display":"Column"},
                {"value":"row-reverse","display":"Reverse row"},
                {"value":"column-reverse","display":"Reverse column"}
            ],
            "justify-content":[
                {"value":"flex-start","display":"Layout axis start"},
                {"value":"flex-end","display":"Layout axis end"},
                {"value":"center","display":"Center"},
                {"value":"space-between","display":"Space between (align to edges)"},
                {"value":"space-around","display":"Space between"}
            ],
            "align-items":[
                {"value":"flex-start","display":"Other axis start"},
                {"value":"flex-end","display":"Other axis end"},
                {"value":"center","display":"Center"},
                {"value":"baseline","display":"Widget baseline"},
                {"value":"stretch","display":"Stretch to fill other axis"}
            ],
            "flex-wrap":[
                {"value":"nowrap","display":"Don't wrap"},
                {"value":"wrap","display":"Wrap"},
                {"value":"wrap-reverse","display":"Wrap (reverse)"}
            ],
            "align-content":[
                {"value":"flex-start","display":"Layout axis start"},
                {"value":"flex-end","display":"Layout axis end"},
                {"value":"center","display":"Center"},
                {"value":"space-between","display":"Space between (align to edges)"},
                {"value":"space-around","display":"Space between"},
                {"value":"stretch","display":"Stretch to fill line"}
            ]
        };
        var display = {
            "flex-direction":  "Layout axis",
            "justify-content": "Layout axis align",
            "align-items":     "Other axis align",
            "flex-wrap":       "Wrap",
            "align-content":   "Wrap align"
        }
        function cb(k, v){
            self.dom.style[k] = v;
            self.saveData[k] = v;
        }
        for(var prop of props){
            win.addField({value: prop, display: display[prop]}, "select", window.getComputedStyle(this.dom)[prop], cb, helpers[prop]);
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
        var display = {
            "flex": "Flex Property",
            "align-self": "Align"
        }
        function cb(k, v){
            self.dom.style[k] = v;
            self.saveData[k] = v;
        }
        for(var prop of props){
            win.addField({value: prop, display: display[prop]}, prop == "flex" ? "text" : "select", window.getComputedStyle(self.dom)[prop], cb, helpers[prop]);
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