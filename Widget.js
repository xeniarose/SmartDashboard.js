/**
 * The base class for all widgets. Handles common things such as NetworkTables and the right click menu
 * Import functions to override:
 * - render() - creates the DOM for the widget. Append to this.root. this.saveData is an object that gets
 *       saved and restored to the layout file and can be used to store widget properties
 * - update() - called whenever a NT update is recieved. Use this.key and this.val
 * - destroy() - handle cleanup actions here
 * - createContextMenu(menu) - Add items to the right click menu here
 * - createPropertiesView(win) - Add items to the properties page for the widget here. See blank.html
 * - _update(key, value) and attachListeners() - Use these to override the default NT listener behavior.
 *       this.table is the NetworkTable object. All listener functions must also be widget object properties
 *       otherwise node will garbage collect them.
 */
class Widget extends DraggableElement {
    constructor(table, key, saveData) {
        super();
        this.dom = document.createElement("div");
        this.dom.classList.add("widget");
        this.dom.classList.add("widget-" + this.constructor.name);
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
        super._registerDom(this.dom);
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
            label: "Reset Size",
            click: function () {
                self.resetSize();
            }
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
                            widget.resetSize();
                            widget.setPosition(pos.x + pos.w / 2 - widget._w / 2, pos.y + pos.h / 2 - widget._h / 2, widget._w, widget._h);
                            if(self.parent){
                                self.parent.addChild(widget, true);
                            }
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
                SmartDashboard.prompt("New name:", self.table.getTablePath() + "/" + self.key, function(nameRaw){
                        
                    if (nameRaw == null || nameRaw == "")
                        return;
                    var pos = self.getPosition();
                    var widget = new SmartDashboard.widgetTypes[self.constructor.name].widget(nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                        nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
                    SmartDashboard.removeWidget(self);
                    widget.setPosition(pos.x, pos.y, pos.w, pos.h);
                    widget.saveData = self.saveData;
                    SmartDashboard.addWidget(widget);
                    if(self.parent){
                        self.parent.addChild(widget, true);
                    }
                });
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
        
        ContextMenu.append(menu, [
            {
                label: "To Front",
                click: this.changeOrder.bind(this, "to front")
            },
            {
                label: "Forward",
                click: this.changeOrder.bind(this, "forward")
            },
            {
                label: "Backward",
                click: this.changeOrder.bind(this, "backward")
            },
            {
                label: "To Back",
                click: this.changeOrder.bind(this, "to back")
            }
        ]);
        
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        this.createContextMenu(menu);
        
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        menu.append(new gui.MenuItem({
            label: "Properties",
            click: this._propertyMenuCallback.bind(this)
        }));
        
        return menu;
    }
    
    _createPropertiesView(win){
        var self = this;
        win.addField("Override Robot", "checkbox", self.saveData.clientOverride || false, function(k, v){
            self.saveData.clientOverride = v;
        });
        win.addSeparator();
        this.createPropertiesView(win);
    }
    
    createPropertiesView(win){
        
    }

    createContextMenu(menu) {

    }

    remove() {
        super.remove();
        SmartDashboard.removeWidget(this);
    }

    attachListeners() {
        // get around the ntcore addon losing context on callbacks
        var self = this;
        this._mainListener = function (k, v) {
            if(self.saveData.clientOverride){
                // prevent robot connect from overwriting values
                self.table.put(k, self.val);
            } else {
                self._update(k, v);
            }
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
        
        var inputs = this.root.querySelectorAll("input[type=text],input[type=number],textarea");
        for(var i = 0; i < inputs.length; i++){
            inputs[i].addEventListener("focus", function(e){
                DomUtils.showUpdateButton(e.target);
            });
            inputs[i].addEventListener("blur", function(){
                DomUtils.hideUpdateButton();
            });
        }
    }

    render() {
        this.root.textContent = this.key + ": " + this.val;
    }
    
    destroy(){
        
    }
}
global.Widget = Widget;