class ObjectDetector extends Widget {
    render(){
        this._status = document.createTextNode("Detecting object type...");
        this.root.appendChild(this._status);
    }
    
    onInserted(){
        outer:
        for(var widgetTypeName in SmartDashboard.widgetTypes){
            var widgetType = SmartDashboard.widgetTypes[widgetTypeName];
            if(widgetType.dataType == "object" && widgetType.data && (widgetType.data.objectDetect || widgetType.data.objectDetectName)){
                if(widgetType.data.objectDetectName){
                    if(widgetType.data.objectDetectName == this.key){
                        this.replaceWith(widgetType.widget);
                        return;
                    }
                } else {
                    for(var key of widgetType.data.objectDetect){
                        if(typeof this.table.get(this.key + "/" + key) == "undefined"){
                            continue outer;
                        }
                    }
                    this.replaceWith(widgetType.widget);
                    return;
                }
            }
        }
        this._status.textContent = "Can't detect object type. Use the morph menu";
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
SmartDashboard.registerWidget(ObjectDetector, "object", {display: {hidden: true}});

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
		this._dataBuffer = [];
		this._lastUpdateTime = 0;
		
		var div = document.createElement("div");
		div.classList.add("widget-graph-div");
		this.root.appendChild(div);
		
        this.webview = document.createElement("webview");
		this.webview.setAttribute("partition", "trusted");
		this.webview.setAttribute("src", "graph-frame.html");
        this.webview.classList.add("widget-graph-webview");
        div.appendChild(this.webview);
        
		this._om = this.onMessage.bind(this);
		window.addEventListener('message', this._om);
    }
	
	sendMessage(msg) {
		if(this.webview && this.webview.contentWindow && this.webview.contentWindow.postMessage)
			this.webview.contentWindow.postMessage(msg, "*");
	}
	
	onMessage(e) {
		if (e.source != this.webview.contentWindow) return;
		
		//console.log(e.data);
	}
	
	destroy() {
		window.removeEventListener('message', this._om);
	}

    update() {
		var now = new Date();
        this._dataBuffer.push({
			x: now,
			y: this.val
		});
		var nowTime = now.getTime();
		if(now - this._lastUpdateTime > 1000) {
			this.sendMessage({type:"update",data:this._dataBuffer});
			this._lastUpdateTime = new Date().getTime();
		}
    }
    
    chooseFile() {
        var self = this;
        var chooser = document.createElement("input");
        chooser.type = "file";
        chooser.setAttribute("nwsaveas", "");
        chooser.accept = ".csv";
        chooser.addEventListener("change", function(evt) {
            try {
                var contents = "Timestamp," + self.key + "\n";
                var data = self._dataBuffer;
				for(var i = 0; i < data.length; i++) {
					contents += `${data[i].x.getTime()},${data[i].y}\n`;
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
            label: "Re-center",
            click: function () {
                self.sendMessage({type:"reset"});
            }
        }));
        menu.append(new gui.MenuItem({
            label: "Export Data",
            click: function () {
                self.chooseFile();
            }
        }));
        menu.append(new gui.MenuItem({
            label: "Clear data",
            click: function () {
				self._dataBuffer = [];
				self.sendMessage({type:"update",data:this._dataBuffer});
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
    onNew() {
        this._w = this._h = 300;
        this.dom.style.width = this.dom.style.height = "300px";
    }
    
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
                if(self.saveData.clientOverride && self.valSelected != ""){
                    self._valTable.put("selected", self.valSelected);
                }
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
SmartDashboard.registerWidget(Chooser, "object", {objectDetect: ["options"]});

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
}

SmartDashboard.registerWidget(FlowContainer, "container");

class FlexContainer extends Container {
    getDragMode(){
        return "order";
    }
    
    onNew(){
        this.dom.style.width = this.dom.style.height = "100px";
    }
    
    restoreSave(){
        this.givesProperties = true;
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
            
            this.alt = "Lost connection; please reconnect";
            
            if(!self.streaming){
                self.streaming = true;
                var pos = self.getPosition();
                self.setPosition(pos.x, pos.y, width, height);
            }
        });
        this._img.alt = "Connecting...";
        this._img.addEventListener('error', function(){
            this.alt = "Failed to connect";
            this.removeAttribute("src");
            self.streaming = false;
            clearTimeout(self.retryTimeout);
            self.retryTimeout = setTimeout(function(){
                self._img.alt = "Connecting...";
                self._img.src = self.saveData.mjpegUrl;
            }, 5000);
        });
        
        this.streaming = false;
        
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
    
    createContextMenu(menu){
        var self = this;
        menu.append(new gui.MenuItem({
            label: "Reconnect",
            click: function () {
                self._img.alt = "Connecting...";
                self._img.src = self.saveData.mjpegUrl;
            }
        }));
    }
}

SmartDashboard.registerWidget(MjpegStream, "unlinked");

class USBCameraStream extends UnlinkedWidget {
    render(){
        this._img = document.createElement("img");
        this._img.classList.add("stream");
        this.dom.appendChild(this._img);
        var self = this;
        this._img.addEventListener('load', function() {
            var width = this.naturalWidth;
            var height = this.naturalHeight;
            self.aspectRatio = width / height;
            this.style.removeProperty("min-width");
            this.style.removeProperty("min-height");
            var pos = self.getPosition();
            if(!self.streaming){
                self.streaming = true;
                
                self.setPosition(pos.x, pos.y, width, height);
            }
            var realAspectRatio = pos.w / pos.h;
            if (realAspectRatio < self.aspectRatio - 0.01 || realAspectRatio > self.aspectRatio + 0.01) {
              self.setPosition(pos.x, pos.y, pos.h * self.aspectRatio, pos.h);
            }
        });
        
        this.streaming = false;
        
        this.saveData.port = this.saveData.port || 1180;
        this.saveData.resolution = this.saveData.resolution || "480x360";
        this.saveData.fps = this.saveData.fps || 30;
        this.saveData.mode = this.saveData.mode || USBCameraStream.MODE.TCP;
        
        this.listenTimeout = setTimeout(this.listen.bind(this), 1);
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
            self.saveData[k] = v;
            self._img.src = "";
            self._img.alt = "Settings changed, reconnecting";
            try {
                if(self.sock){
                    self.sock.end();
                    self.sock.destroy();
                    self.sock = null;
                }
                if(self.ds && (k == "port" || k == "mode")) {
                    self.ds.close();
                    self.ds = null;
                }
                self.udpLastTime = 0; // make sure to resend the settings packet with new settings
            } catch(e) {}
        }
        
        var modes = Object.keys(USBCameraStream.MODE).map(e=>({display:e,value:USBCameraStream.MODE[e]}));
        var resolutions = Object.keys(USBCameraStream.RESOLUTIONS);
        win.addField({ value: "mode", display: "Mode" }, "select", self.saveData.mode, cb, modes);
        win.addField({ value: "port", display: "Port" }, "number", self.saveData.port, cb);
        win.addField({ value: "resolution", display: "Resolution" }, "select", self.saveData.resolution, cb, resolutions);
        win.addField({ value: "fps", display: "FPS" }, "number", self.saveData.fps, cb);
    }
    
    createContextMenu(menu){
        var self = this;
        menu.append(new gui.MenuItem({
            label: "Reconnect",
            click: function () {
                clearTimeout(this.listenTimeout);
                self.listen();
            }
        }));
    }
    
    destroy(){
        this._destroyed = true;
        try {
            if(this.sock) {
                this.sock.destroy();
                this.sock = null;
            }

            if(this.ds) {
                this.ds.close();
                this.ds = null;
            }
        } catch(e) {}
    }
    
    connError(err){
        // todo: catch when an error happens because the robot suddenly disconnects. Currently that's not happening and the client sits there, not trying to reconnect
        console.error("USBCameraStream: ", err);
        this._img.src = "";
        if(err && err.message) this._img.alt = "Stream error: " + err.message;
        clearTimeout(this.listenTimeout);
        this.listenTimeout = setTimeout(this.listen.bind(this), 5000); // wait a bit before trying again
    }
    
    listen(){
        try {
            if(this.sock) {
                this.sock.destroy();
                this.sock = null;
            }
            if(this.ds) {
                this.ds.close();
                this.ds = null;
            }
        } catch(e) {} // means it was already closed
        
        if(this._destroyed) return;
        
        if (parseInt(this.saveData.mode) == USBCameraStream.MODE.TCP) {
            // MODE: TCP
            this.sock = new net.Socket();
            this.sock.on('data', this.onData.bind(this));
            this.sock.on('end', this.connError.bind(this));
            this.sock.on('close', this.connError.bind(this));
            this.sock.on('error', this.connError.bind(this));
            this.sock.on('connect', this.initStream.bind(this));
            this.sock.connect(parseInt(this.saveData.port), SmartDashboard.options.ip);
        } else {
            // MODE: UDP
            this.ds = dgram.createSocket({
                type: "udp4",
                reuseAddr: true
            });
            this.ds.on('listening', this.initStream.bind(this));
            this.ds.on('message', this.onData.bind(this));
            this.ds.on('close', this.connError.bind(this));
            this.ds.on('error', this.connError.bind(this));
            this.ds.bind(parseInt(this.saveData.port));
            this.udpLastTime = 0;
            this.frameCounter = 0;
            this.byteCounter = 0;
        }
        
        this.state = USBCameraStream.STATE_READ_HEADER;
        this.headerOffset = 0;
        this.frameOffset = 0;
        this.frameHeader = new Buffer(8);
        this._img.src = "";
        this._img.alt = "Connecting";
    }
    
    _writeInt(int){
        if(!this.sock) return;
        var buf = new Buffer(4);
        // DataOutputStream is big-endian
        buf.writeInt32BE(int);
        this.sock.write(buf);
    }
    
    initStream(){
        console.info("USBCameraStream: connected/listening");
        this._img.src = "";
        if (parseInt(this.saveData.mode) == USBCameraStream.MODE.TCP) {
            this._img.alt = "Connected, waiting for stream";
            // write header
            this._writeInt(parseInt(this.saveData.fps));
            this._writeInt(USBCameraStream.HW_COMPRESSION);
            this._writeInt(USBCameraStream.RESOLUTIONS[this.saveData.resolution] || 0);
        } else {
            this._img.alt = "Waiting for stream";
            this.ds.setBroadcast(true);
        }
    }
    
    onData(data, rinfo) {
        if (parseInt(this.saveData.mode) == USBCameraStream.MODE.UDP &&
                this.udpLastTime < Date.now() - 10 * 1000) {
            console.log("FPS", this.frameCounter / 10);
            console.log("BPS", this.byteCounter / 10);
            this.frameCounter = 0;
            this.byteCounter = 0;
        }
        
        this.frameCounter++;
        this.byteCounter += data.length;
        
        this.updateLoop(data, rinfo);
    }
    
    udpSendSettings(addr, port) {
        console.log("UDP: sending settings");
        var len = 4 * 3;
        var buf = new Buffer(len);
        buf.writeInt32BE(parseInt(this.saveData.fps), 0);
        buf.writeInt32BE(USBCameraStream.HW_COMPRESSION, 4);
        buf.writeInt32BE(USBCameraStream.RESOLUTIONS[this.saveData.resolution] || 0, 8);
        
        this.ds.send(buf, 0, len, port, addr);
    }
    
    // repeatedly calls itself until data is consumed
    // switches between 2 states
    updateLoop(data, rinfo){
        if (parseInt(this.saveData.mode) == USBCameraStream.MODE.UDP &&
                this.udpLastTime < Date.now() - 10 * 1000) {
            // we're not sure if this packet will get dropped or something bad will happen
            // because it's UDP, so we just repeatedly send it to be sure
            if(rinfo && rinfo.address && rinfo.port) this.udpSendSettings(rinfo.address, rinfo.port);
            this.udpLastTime = Date.now();
        }
        
        if(this.state == USBCameraStream.STATE_READ_HEADER){
            var numIters = Math.min(data.length, 8 - this.headerOffset);
            for(var i = 0; i < numIters; i++) {
                this.frameHeader[this.headerOffset] = data[i];
                this.headerOffset++;
            }
            if(this.headerOffset >= 8){
                if(this.frameHeader.slice(0, 4).compare(USBCameraStream.MAGIC_NUMBERS) !== 0){
                    console.warn("USBCameraStream: out of sync (didn't see magic numbers)");
                    try {
                        if (this.sock) {
                            this.sock.end();
                            this.sock.destroy();
                            this.sock = null;
                        }
                        if(this.ds){
                            this.ds.close();
                            this.ds = null;
                        }
                    } catch(e) {}
                    return;
                }
                this.frameSize = this.frameHeader.readInt32BE(4);
                this.frame = new Buffer(this.frameSize + USBCameraStream.HUFFMAN_TABLE.length);
                this.frameOffset = 0;
                this.state = USBCameraStream.STATE_READ_FRAME;
                if(i < data.length) this.updateLoop(data.slice(i));
            }
        } else if(this.state == USBCameraStream.STATE_READ_FRAME){
            var framePiece = data.slice(0, Math.min(data.length, this.frameSize - this.frameOffset));
            framePiece.copy(this.frame, this.frameOffset);
            this.frameOffset += framePiece.length;
            
            if(this.frameOffset >= this.frameSize){
                var res = this.parseFrame(this.frame);
                if(res !== true){
                    try {
                        if (this.sock) {
                            this.sock.end();
                            this.sock.destroy();
                            this.sock = null;
                        }
                        if(this.ds){
                            this.ds.close();
                            this.ds = null;
                        }
                    } catch(e) {}
                    console.warn("USBCameraStream: ", res);
                    return;
                }
                
                this.state = USBCameraStream.STATE_READ_HEADER;
                this.headerOffset = 0;
            }
            
            if(framePiece.length < data.length){
                this.updateLoop(data.slice(framePiece.length));
            }
        }
    }
    
    parseFrame(data){
        var size = this.frameSize;
        // I have no idea what any of this does ¯\_(ツ)_/¯
        // I just ported it to node.js
        if (!(size >= 4 && (data[0] & 255) == 255
              && (data[1] & 255) == 216
              && (data[size - 2] & 255) == 255
              && (data[size - 1] & 255) == 217)) {
            return "Data is not valid";
        }
        var pos = 2;
        var has_dht = false;
        while (!has_dht) {
            if (!(pos + 4 <= size)) {
                return "pos doesn't match size";
            }
            if (!((data[pos] & 255) == 255)) {
                return "pos is not 255";
            }
            if ((data[pos + 1] & 255) == 196) {
                has_dht = true;
            } else if ((data[pos + 1] & 255) == 218)
                break;
            var marker_size = ((data[pos + 2] & 255) << 8)
                + (data[pos + 3] & 255);
            pos += marker_size + 2;
        }
        if (!has_dht) {
            data.copy(data, pos + USBCameraStream.HUFFMAN_TABLE.length, pos, size - pos);
            USBCameraStream.HUFFMAN_TABLE.copy(data, pos, 0, USBCameraStream.HUFFMAN_TABLE.length);
            size += huffman_table.length;
        }
        
        var imgUrl = "data:image/jpeg;base64," + data.slice(0, size).toString('base64');
        this.updateImg(imgUrl);
           
        return true;
    }
}
USBCameraStream.STATE_READ_HEADER = 0;
USBCameraStream.STATE_READ_FRAME = 1;
USBCameraStream.MAGIC_NUMBERS = new Buffer([1, 0, 0, 0]);
USBCameraStream.HUFFMAN_TABLE = new Buffer([255, 196, 1, 162, 0, 0, 1, 5, 1, 1, 1,
				1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
				11, 1, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 2,
				3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5,
				4, 4, 0, 0, 1, 125, 1, 2, 3, 0, 4, 17, 5, 18, 33, 49, 65, 6, 19,
				81, 97, 7, 34, 113, 20, 50, 129, 145, 161, 8, 35, 66, 177, 193,
				21, 82, 209, 240, 36, 51, 98, 114, 130, 9, 10, 22, 23, 24, 25,
				26, 37, 38, 39, 40, 41, 42, 52, 53, 54, 55, 56, 57, 58, 67, 68,
				69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100,
				101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121,
				122, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149,
				150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169,
				170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196,
				197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216,
				217, 218, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 241,
				242, 243, 244, 245, 246, 247, 248, 249, 250, 17, 0, 2, 1, 2, 4,
				4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119, 0, 1, 2, 3, 17, 4, 5, 33, 49,
				6, 18, 65, 81, 7, 97, 113, 19, 34, 50, 129, 8, 20, 66, 145, 161,
				177, 193, 9, 35, 51, 82, 240, 21, 98, 114, 209, 10, 22, 36, 52,
				225, 37, 241, 23, 24, 25, 26, 38, 39, 40, 41, 42, 53, 54, 55,
				56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87,
				88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116,
				117, 118, 119, 120, 121, 122, 130, 131, 132, 133, 134, 135, 136,
				137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163,
				164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183,
				184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210,
				211, 212, 213, 214, 215, 216, 217, 218, 226, 227, 228, 229, 230,
				231, 232, 233, 234, 242, 243, 244, 245, 246, 247, 248, 249,
				250]);
USBCameraStream.RESOLUTIONS = {
    "640x480": 0,
	"320x240": 1,
	"160x120": 2
};
USBCameraStream.HW_COMPRESSION = -1;
USBCameraStream.MODE = {
    "TCP": 0,
    "UDP": 1
};


SmartDashboard.registerWidget(USBCameraStream, "unlinked");

class Scheduler extends Widget {
    render() {
        this.view = document.createElement("div");
        this.view.classList.add("running-commands");
        this.renderCommands();
        
        this.cancel = document.createElement("button");
        this.cancel.classList.add("cancel");
        this.cancel.appendChild(DomUtils.createIcon("stop"));
        this.cancel.appendChild(document.createTextNode(" Stop Commands"));
        this.cancel.disabled = true;
        this.cancel.onclick = this.cancelSelected.bind(this);
        
        var cont = document.createElement("div");
        cont.appendChild(this.view);
        cont.appendChild(this.cancel);
        cont.classList.add("scheduler-container");
        this.root.appendChild(cont);
    }
    
    cancelSelected(){
        var selectedIds = [].map.call(this.root.querySelectorAll("input:checked"), function(el){
            return parseFloat(el.parentElement.parentElement.dataset.commandid);
        });
        this._valTable.put("Cancel", selectedIds);
        [].forEach.call(this.root.querySelectorAll("input:checked"), function(el){
            el.checked = false;
        });
        this.cancel.disabled = true;
    }
    
    createCommandItem(name, id, selectedIds){
        var item = document.createElement("div");
        item.classList.add("command");
        var check = document.createElement("input");
        check.type = "checkbox";
        if(selectedIds.indexOf(id) > -1){
            check.checked = true;
        }
        check.onchange = (function(){
            this.cancel.disabled = this.root.querySelectorAll("input:checked").length == 0;
        }).bind(this);
        var label = document.createElement("label");
        label.appendChild(check);
        label.appendChild(document.createTextNode(name));
        item.dataset.commandid = id;
        item.appendChild(label);
        this.view.appendChild(item);
    }

    renderCommands() {
        var selectedIds = [].map.call(this.root.querySelectorAll("input:checked"), function(el){
            return parseFloat(el.parentElement.parentElement.dataset.commandid);
        });
        
        this.view.innerHTML = "";
        var names = this._valTable.get("Names");
        var ids = this._valTable.get("Ids");
        
        if(typeof names == "undefined" || names == null || names.length == 0){
            var item = document.createElement("div");
            item.textContent = "(no running commands)";
            this.view.appendChild(item);
            return;
        }
        
        var commands = {};
        for(var i = 0; i < names.length; i++){
            commands[names[i]] = ids[i];
        }
        names.sort();
        for(var name of names){
            this.createCommandItem(name, commands[name], selectedIds);
        }
        
        if(this.cancel) this.cancel.disabled = selectedIds.length == 0;
    }
    
    _update(k, v) {}

    attachListeners() {
        var tableRoot = this.table.getTablePath() + "/" + this.key;
        this._valTable = ntcore.getTable(tableRoot);
        var self = this;
        this._mainListener = function (k, v) {
            self.update();
        };
        this._valTable.onChange("Names", this._mainListener);
        this._valTable.onChange("Ids", this._mainListener);
        this._valTable.onChange("Cancel", this._mainListener);
    }

    update() {
        this.renderCommands();
    }
}

SmartDashboard.registerWidget(Scheduler, "object", {objectDetect: ["Names", "Ids"]});

class RobotCodeLog extends UnlinkedWidget {
    render(){
        this._text = document.createElement("textarea");
        this._text.setAttribute("readonly", "true");
        this._text.style.width = '100%';
        this._text.style.height = '100%';
        this._text.style.resize = 'none';
        this.dom.appendChild(this._text);
        
        this._destroyed = false;
        
        this.reconnect(1);
    }
    
    reconnect(ms) {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(this.connect.bind(this), ms);
    }
    
    close() {
        if(this.conn) {
            this.conn.end();
            this.conn = null;
        }
    }
    
    connect() {
        this.close();
        if(this._destroyed) return;
        
        var self = this;
        var Client = require('ssh2').Client;
        this.conn = new Client();
        self._text.value = "Connecting...";
        
        this.conn.on('ready', function() {
            console.log('RobotCodeLog connected');
            self._text.value += "\nConnected to robot";
            self.conn.exec('tail -f /home/lvuser/FRCUserProgram.log', function(err, stream) {
                if (err) {
                    self._text.value += "\nSSH error";
                    console.error('RobotCodeLog error', err);
                    
                    self.close();
                    self.reconnect(5000);
                    return;
                }
                stream.on('close', function(code, signal) {
                    console.log('RobotCodeLog close code=' + code + ', signal=' + signal);
                    
                    self.close();
                    self.reconnect(5000);
                }).on('data', function(data) {
                    self._text.value += data;
                }).stderr.on('data', function(data) {
                    self._text.value += data;
                });
              });
        }).on('error', function(err) {
            self._text.value += "\nSSH error";
            console.error('RobotCodeLog error', err);
           
            self.close();
            self.reconnect(5000);
        }).connect({
          host: SmartDashboard.options.ip,
          port: RobotCodeLog.SSH_PORT,
          username: RobotCodeLog.SSH_USER,
          password: RobotCodeLog.SSH_PASS
        });
    }
    
    destroy() {
        this._destroyed = true;
        this.close();
    }
    
    chooseFile() {
        var self = this;
        var chooser = document.createElement("input");
        chooser.type = "file";
        chooser.setAttribute("nwsaveas", "");
        chooser.accept = ".log";
        chooser.addEventListener("change", function(evt) {
            try {
                fs.writeFileSync(this.value, self._text.value);
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
            label: "Export Log",
            click: function () {
                self.chooseFile();
            }
        }));
        menu.append(new gui.MenuItem({
            label: "Reconnect",
            click: function () {
                self.close();
                self.reconnect(1);
            }
        }));
    }
}
RobotCodeLog.SSH_PORT = 22;
RobotCodeLog.SSH_USER = 'admin';
RobotCodeLog.SSH_PASS = '';
SmartDashboard.registerWidget(RobotCodeLog, "unlinked");

class Preferences extends Widget {
    render() {
        if(this.key != "Preferences"){
            this.remove();
        }
        this.view = document.createElement("iframe");
        this.view.src = "preference-editor.html#in-frame";
        this.view.classList.add("preferences-frame");
        this.root.appendChild(this.view);
    }
    
    _update(k, v) {}

    attachListeners() {}

    update() {}
}

// glitchy
//SmartDashboard.registerWidget(Preferences, "object", {objectDetectName: "Preferences", preferredKey: "Preferences"});