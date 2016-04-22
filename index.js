const gui = require('nw.gui');
const ntcore = require('./ntcore_node');
const fs = require('fs');
const child_process = require("child_process");

var SmartDashboard = {
    version: "0.1.0",
    widgets: [],
    widgetTypes: {},
    editable: false,
    options: {},
    plugins: []
};
SmartDashboard.handleError = function (e) {
    if (e.stack) {
        console.error(e.stack);
    } else {
        console.error(e);
    }
}

SmartDashboard.registerWidget = function (widget, dataType) {
    SmartDashboard.widgetTypes[widget.name] = {
        widget: widget,
        dataType: dataType
    };
}

SmartDashboard.populateWidgetSelect = function (select) {
    select.innerHTML = "";
    for (widgetName in SmartDashboard.widgetTypes) {
        if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetName)) continue;
        var widget = SmartDashboard.widgetTypes[widgetName];
        if (select.hasAttribute("data-filter") && widget.dataType.indexOf(select.getAttribute("data-filter")) == -1) continue;

        var opt = document.createElement("option");
        opt.value = widgetName;
        opt.textContent = widgetName;
        select.appendChild(opt);
    }
}

SmartDashboard.populateThemeSelect = function (select) {
    select.innerHTML = "";
    var opt = document.createElement("option");
    opt.value = "__default__";
    opt.textContent = "default";
    select.appendChild(opt);
    try {
        var normalizedPath = require("path").join(process.cwd(), "themes");
        fs.readdirSync(normalizedPath).forEach(function (file) {
            if(file.substring(file.length - 4) != ".css") return;
            var theme = file.substring(file, file.length - 4);
            var opt = document.createElement("option");
            opt.value = theme;
            opt.textContent = theme;
            select.appendChild(opt);
        });
    } catch (e) {
        SmartDashboard.handleError(e);
    }
}

SmartDashboard.setTheme = function(theme, link){
    if(typeof link == "undefined"){
        link = document.getElementById("theme-css");
    }
    if(theme == "__default__" || typeof theme == "undefined"){
        link.href = "";
    } else {
        link.href = "themes/" + theme + ".css";
    }
}

SmartDashboard.populatePluginList = function (list) {
    list.innerHTML = "";
    for (plugin of SmartDashboard.plugins) {
        var el = document.createElement("div");
        el.classList.add("plugin-item");
        
        for(var fieldName of ["name", "version", "file", "description"]){
            var field = document.createElement("div");
            field.classList.add(fieldName);
            field.textContent = plugin[fieldName];
            el.appendChild(field);
        }
        list.appendChild(el);
    }
    if (SmartDashboard.plugins.length == 0) {
        list.innerHTML = "No plugins";
    }
}

function createSdMenu() {
    var newMenu = new gui.Menu();
    for (var widgetType in SmartDashboard.widgetTypes) {
        if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetType)) continue;
        (function (widgetType) {
            newMenu.append(new gui.MenuItem({
                label: widgetType,
                click: function () {
                    setTimeout(function () {
                        var nameRaw = prompt("SmartDashboard variable:");
                        if (nameRaw == null || nameRaw == "")
                            return;
                        var widget = new SmartDashboard.widgetTypes[widgetType].widget(nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                            nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
                        widget.setPosition(15, 0);
                        SmartDashboard.addWidget(widget);
                    }, 1);
                }
            }));
        })(widgetType);
    }

    var sdMenu = new gui.Menu();
    sdMenu.append(new gui.MenuItem({
        label: "SmartDashboard.js " + SmartDashboard.version,
        enabled: false
    }));
    sdMenu.append(new gui.MenuItem({
        label: "Restart",
        click: function(){
            SmartDashboard.saveData();
            SmartDashboard.restart();
        }
    }));
    sdMenu.append(new gui.MenuItem({
        label: "DevTools",
        click: function(){
            gui.Window.get().showDevTools();
        }
    }));
    sdMenu.append(new gui.MenuItem({
        label: "Options",
        click: function () {
            SmartDashboard.showOptions();
        }
    }));
    sdMenu.append(new gui.MenuItem({
        type: "separator"
    }));
    sdMenu.append(new gui.MenuItem({
        label: "New",
        submenu: newMenu
    }));
    sdMenu.append(new gui.MenuItem({
        label: "Editable",
        type: "checkbox",
        checked: SmartDashboard.editable,
        click: function () {
            SmartDashboard.setEditable(this.checked);
        }
    }));
    return sdMenu;
}

SmartDashboard.showOptions = function () {
    gui.Window.open('options.html', {
        position: 'center'
    });
}

SmartDashboard.restart = function () {
    /*var child,
        win = gui.Window.get();
    child = child_process.spawn(process.execPath, [process.cwd()], {detached: true});
    child.unref();
    win.hide();
    gui.App.quit();*/
    ntcore.dispose();
    chrome.runtime.reload();
}

SmartDashboard.entriesTree = function(){
    var rawEntries = ntcore.getAllEntries();
    var root = {};
    for(var rawEntry of rawEntries){
        var parts = rawEntry.split("/");
        var ptr = root;
        for(var i = 0; i < parts.length; i++){
            if(parts[i].trim().length == 0)
                continue;
            if(!ptr.hasOwnProperty(parts[i])){
                ptr[parts[i]] = {};
            }
            ptr = ptr[parts[i]];
        }
    }
    
    return root;
}

SmartDashboard.renderEntries = function(){
    var entries = SmartDashboard.entriesTree();
    if(SmartDashboard._entries && JSON.stringify(entries) == JSON.stringify(SmartDashboard._entries)){
        return;
    }
    SmartDashboard._entries = entries;
    var root = document.querySelector("#entries .list");
    root.innerHTML = "";
    
    function render(domRoot, dataRoot, items, pathBuild){
        for(var key of items){
            var parentPath = pathBuild;
            if(pathBuild.length > 0) parentPath += "/";
            
            var el = document.createElement("li");
            var a = document.createElement("a");
            a.href = "javascript:void(0)";
            a.textContent = key;
            a.dataset.path = parentPath + key;
            a.onclick = function(){
                if(this.parentElement.classList.contains("open")){
                    this.parentElement.classList.remove("open");
                } else {
                    this.parentElement.classList.add("open");
                }
            };
            a.ondblclick = function(){
                var nameRaw = this.dataset.path;
                
                var val = ntcore.getTable("").get(nameRaw);
                var widgetType = typeof val;
                if(widgetType == "undefined") widgetType = "object";
                if(Array.isArray(val)) widgetType = "array";
                
                var widget = new SmartDashboard.widgetTypes[SmartDashboard.options["default-" + widgetType]].widget(
                    nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                    nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
                widget.setPosition(15, 0);
                SmartDashboard.addWidget(widget);
            };
            el.appendChild(a);
            domRoot.appendChild(el);
            var ul = document.createElement("ul");
            el.appendChild(ul);
            var items = [];
            for(var _key in dataRoot[key])
                if(dataRoot[key].hasOwnProperty(_key))
                    items.push(_key);
            items.sort();
            if(items.length == 0){
                el.classList.add("none");
            }
            render(ul, dataRoot[key], items, parentPath + key);
        }
    }
    
    var items = [];
    for(var key in entries)
            if(entries.hasOwnProperty(key))
                items.push(key);
    items.sort();
    render(root, entries, items, "");
}

SmartDashboard.init = function () {
    global.SmartDashboard = SmartDashboard;
    var data = {
        sdver: SmartDashboard.version,
        widgets: [],
        options: {}
    };
    try {
        var dataStr = fs.readFileSync("save.json");
        data = JSON.parse(dataStr);
    } catch (e) {
        SmartDashboard.handleError(e);
    }

    SmartDashboard.options = data.options;
   
    if (!data.options.port) {
        data.options.port = ntcore.DEFAULT_PORT;
    }
    if (!data.options.ip) {
        data.options.ip = "127.0.0.1";
    }
    
    if(!data.options.theme){
        data.options.theme = "__default__";
    }
    
    SmartDashboard.setTheme(SmartDashboard.options.theme);

    try {
        ntcore.setOptions({
            networkIdentity: "SmartDashboard.js " + SmartDashboard.version,
            port: parseInt(data.options.port)
        });
        ntcore.init(ntcore.CLIENT, data.options.ip);
    } catch (e) {
        SmartDashboard.handleError(e);
    }
    
    document.querySelector("#entries").onmouseover = SmartDashboard.renderEntries;

    document.querySelector("#dashboard").onmousemove = function (e) {
        for (var widget of SmartDashboard.widgets) {
            if (widget._dragging && widget.dom.onmousemove) {
                widget.dom.onmousemove(e);
            }
        }
    }

    document.querySelector("#dashboard").onmouseup = function (e) {
        for (var widget of SmartDashboard.widgets) {
            if (widget._dragging && widget.dom.onmouseup) {
                widget.dom.onmouseup(e);
            }
        }
    }

    document.querySelector("#dashboard").oncontextmenu = function (ev) {
        if ((ev.target.tagName.toLowerCase() == "input" || ev.target.tagName.toLowerCase() == "textarea") && !SmartDashboard.editable) {
            return true;
        }
        ev.preventDefault();
        var menu;
        var widget = null;
        var el = ev.target;
        do {
            if (el.parentWidget) {
                widget = el.parentWidget;
                break;
            }
            el = el.parentElement;
        } while (el != null);
        if (widget != null && widget.editable) {
            menu = widget._createContextMenu();
        } else {
            menu = createSdMenu();
        }
        menu.popup(ev.x, ev.y);
        return false;
    }

    console.info("Loading plugins");
    try {
        var normalizedPath = require("path").join(process.cwd(), "plugins");
        fs.readdirSync(normalizedPath).forEach(function (file) {
            console.info("Loading plugin", file);
            var plugin;
            try {
                plugin = require("./plugins/" + file);
            } catch(e){
                SmartDashboard.handleError(e);
                plugin = {
                    info: {
                        name: file,
                        version: "Plugin error",
                        description: "" + e
                    }
                };
            }
            plugin.info.file = file;
            SmartDashboard.plugins.push(plugin.info);
            console.log(plugin.info);
        });
    } catch (e) {
        SmartDashboard.handleError(e);
    }

    console.info("Loading save, save.version=", data.sdver, "sd.version=", SmartDashboard.version);
    if (data.sdver != SmartDashboard.version) {
        console.warn("Save version doesn't match SmartDashboard version");
    }

    for (var wData of data.widgets) {
        if (!SmartDashboard.widgetTypes.hasOwnProperty(wData.type)) {
            console.warn("No widget for:", wData.type);
            continue;
        }
        var widget = new SmartDashboard.widgetTypes[wData.type].widget(wData.table, wData.key, wData.data);
        widget.setPosition(wData.x, wData.y, wData.w, wData.h);
        SmartDashboard.addWidget(widget);
    }
    
    try {
        gui.Window.get().moveTo(SmartDashboard.options.window.x, SmartDashboard.options.window.y);
        gui.Window.get().resizeTo(SmartDashboard.options.window.width, SmartDashboard.options.window.height);
    } catch(e){
        SmartDashboard.handleError(e);
    }
    function windowCallback(){
        SmartDashboard.options.window = {
            x: gui.Window.get().x,
            y: gui.Window.get().y,
            width: gui.Window.get().width,
            height: gui.Window.get().height
        };
        SmartDashboard.saveData();
    }
    gui.Window.get().on("move", windowCallback);
    gui.Window.get().on("resize", windowCallback);

    window.onbeforeunload = SmartDashboard.saveData;
    process.on('exit', SmartDashboard.saveData);
}

SmartDashboard.saveData = function () {
    var data = {
        sdver: SmartDashboard.version,
        widgets: []
    }
    for (var widget of SmartDashboard.widgets) {
        var wPos = widget.getPosition();
        var wData = {
            x: wPos.x,
            y: wPos.y,
            w: wPos.w,
            h: wPos.h,
            type: widget.constructor.name,
            table: widget.table.getTablePath(),
            key: widget.key,
            data: widget.saveData || {}
        };
        data.widgets.push(wData);
    }
    data.options = SmartDashboard.options;
    data = JSON.stringify(data);
    fs.writeFileSync("save.json", data);
}

SmartDashboard.setEditable = function (flag) {
    SmartDashboard.editable = flag;
    for (var widget of SmartDashboard.widgets) {
        widget.setEditable(flag);
    }
}

SmartDashboard.addWidget = function (widget) {
    this.widgets.push(widget);
    document.querySelector("#dashboard").appendChild(widget.dom);
    // cache width and height so they can be saved on close
    widget._w = widget.dom.offsetWidth;
    widget._h = widget.dom.offsetHeight;
    widget.setEditable(SmartDashboard.editable);
}

SmartDashboard.removeWidget = function (widget) {
    widget.dom.remove();
    var index = this.widgets.indexOf(widget);
    if (index > -1) {
        this.widgets.splice(index, 1);
    }
}

function uniqueId() {
    return Math.floor(Math.random() * 0x10000000000000).toString(16);
}

class Decorator {
    constructor() {}

    decorate(widget) {}
}

class Widget {
    constructor(table, key, saveData) {
        this.dom = document.createElement("div");
        this.dom.classList.add("widget");
        this.dom.classList.add("widget-" + this.constructor.name);
        this.dom.parentWidget = this;
        var self = this;
        this.root = this.dom;
        this.table = typeof table == "string" ? ntcore.getTable(table) : table;
        this.key = key;
        this.val = null;
        this.saveData = saveData || {};
        if(!this.saveData.label){
            this.saveData.label = "left";
        }
        this.root.dataset.label = this.saveData.label;
        this.editable = false;
        this.decorators = [];
        this.attachListeners();
        this._render();
        this._update(this.key, this.table.get(this.key, null));
    }

    _createContextMenu() {
        var self = this;
        var menu = new gui.Menu();
        menu.append(new gui.MenuItem({
            label: this.constructor.name,
            enabled: false
        }));
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        menu.append(new gui.MenuItem({
            label: "Delete",
            click: function () {
                self.remove();
            }
        }));

        var morphMenu = new gui.Menu();
        var self = this;
        for (var widgetType in SmartDashboard.widgetTypes) {
            if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetType)) continue;
            if(widgetType == this.constructor.name) continue;
            if(SmartDashboard.widgetTypes[widgetType].dataType != SmartDashboard.widgetTypes[this.constructor.name].dataType) continue;
            (function (widgetType) {
                morphMenu.append(new gui.MenuItem({
                    label: widgetType,
                    click: function () {
                        setTimeout(function () {
                            var pos = self.getPosition();
                            var widget = new SmartDashboard.widgetTypes[widgetType].widget(self.table.getTablePath(), self.key);
                            widget.setPosition(pos.x, pos.y, pos.w, pos.h);
                            SmartDashboard.removeWidget(self);
                            SmartDashboard.addWidget(widget);
                        }, 1);
                    }
                }));
            })(widgetType);
        }

        menu.append(new gui.MenuItem({
            label: "Morph",
            submenu: morphMenu
        }));

        menu.append(new gui.MenuItem({
            label: "Change Variable Name",
            click: function () {
                setTimeout(function () {
                    var nameRaw = prompt("New name:", self.table.getTablePath() + "/" + self.key);
                    if (nameRaw == null || nameRaw == "")
                        return;
                    var pos = self.getPosition();
                    var widget = new SmartDashboard.widgetTypes[self.constructor.name].widget(nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                        nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
                    SmartDashboard.removeWidget(self);
                    widget.setPosition(pos.x, pos.y, pos.w, pos.h);
                    widget.saveData = self.saveData;
                    SmartDashboard.addWidget(widget);
                }, 1);
            }
        }));
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        menu.append(new gui.MenuItem({
            label: "Label",
            enabled: false
        }));
        
        
        menu.append(new gui.MenuItem({
            label: "Left",
            type: "checkbox",
            checked: this.saveData.label == "left",
            click: function () {
                self.root.dataset.label = self.saveData.label = "left";
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "Top",
            type: "checkbox",
            checked: this.saveData.label == "top",
            click: function () {
               self.root.dataset.label = self.saveData.label = "top";
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "None",
            type: "checkbox",
            checked: this.saveData.label == "none",
            click: function () {
               self.root.dataset.label = self.saveData.label = "none";
            }
        }));
        
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        this.createContextMenu(menu);
        return menu;
    }

    createContextMenu(menu) {

    }

    remove() {
        SmartDashboard.removeWidget(this);
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

    setEditable(flag) {
        var self = this;
        this.editable = flag;
        this.dom.dataset.editable = "" + flag;
        if (flag) {
            this._dragging = false;
            this._dragSize = false;
            var sx, sy, ox, oy;
            this.dom.onmouseover = this.dom.onmouseout = function (e) {
                e.preventDefault();
                return false;
            }
            this.dom.ondblclick = function (e) {
                if (e.clientX - self.dom.offsetLeft > self.dom.offsetWidth - 10 && e.clientY - self.dom.offsetTop > self.dom.offsetHeight - 10) {
                    this.style.width = this.style.height = null;
                    self._w = this.offsetWidth;
                    self._h = this.offsetHeight;
                }
            }
            this.dom.onmousedown = function (e) {
                self._dragging = true;
                sx = e.clientX;
                sy = e.clientY;
                ox = parseInt(self.dom.style.left);
                oy = parseInt(self.dom.style.top);
                if (isNaN(ox)) ox = 0;
                if (isNaN(oy)) oy = 0;

                if (sx - self.dom.offsetLeft > self.dom.offsetWidth - 10 && sy - self.dom.offsetTop > self.dom.offsetHeight - 10) {
                    self._dragSize = true;
                } else {
                    self._dragSize = false;
                }

                e.preventDefault();
                return false;
            }

            this.dom.onmouseup = function (e) {
                self._dragging = false;
                e.preventDefault();
                return false;
            }

            this.dom.onmousemove = function (e) {
                if (self._dragging) {
                    if (self._dragSize) {
                        this.style.width = (e.clientX - this.offsetLeft + 5) + "px";
                        this.style.height = (e.clientY - this.offsetTop + 5) + "px";
                        self._w = this.offsetWidth;
                        self._h = this.offsetHeight;
                    } else {
                        this.style.left = ((e.clientX - sx) + ox) + "px";
                        this.style.top = ((e.clientY - sy) + oy) + "px";
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
            this.dom.ondblclick = null;
        }
    }

    attachListeners() {
        // get around the ntcore addon losing context on callbacks
        var self = this;
        this._mainListener = function (k, v) {
            self._update(k, v);
        };
        this.table.onChange(this.key, this._mainListener);
    }

    _update(key, val) {
        if(val == null) return;
        this.val = val;
        this.update();
    }

    update() {
        this.root.textContent = this.key + ": " + this.val;
    }

    _render() {
        this.dom.innerHTML = "";
        for (var decorator of this.decorators) {
            decorator.decorate(this);
        }
        
        this._dom_id = this.constructor.name + "-" + uniqueId();
        var label = document.createElement("label");
        label.innerHTML = this.key + ":&nbsp;";
        label.setAttribute("for", this._dom_id);
        this.root.appendChild(label);
        
        this.render();
    }

    render() {
        this.root.textContent = this.key + ": " + this.val;
    }
}
global.Widget = Widget;