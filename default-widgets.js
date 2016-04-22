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

    createContextMenu(menu) {
        var self = this;
        menu.append(new gui.MenuItem({
            label: "Properties",
            click: function () {
                gui.Window.open("blank.html", {}, function (w) {
                    var win = w.window;
                    w.on("loaded", function () {
                        var cb = function (k, v) {
                            self.saveData[k] = v;
                            self.root.querySelector(".widget-input")[k] = v;
                            self.update();
                        };
                        for (var item of self.getEditableProperties()) {
                            win.addField(item, "number", self.root.querySelector(".widget-input")[item], cb);
                        }
                    });
                });
            }
        }));
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