class UnlinkedWidget extends DraggableElement {
    constructor(table, key, saveData){
        super();
        this.dom = document.createElement("div");
        this.dom.classList.add("widget");
        this.dom.classList.add("widget-unlinked");
        this.dom.classList.add("widget-" + this.constructor.name);
        this.editable = false;
        this.unlinked = true;
        this.saveData = saveData || {};
        this.editing = false;
        var self = this;
        this.table = {
            getTablePath: function(){
                return "";
            }
        };
        this.key = "";
        this.restoreSave();
        this.render();
        super._registerDom(this.dom);
    }
    
    restoreSave(){
        
    }
    
    _createContextMenu(){
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

        /*var morphMenu = new gui.Menu();
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
        }));*/

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
                label: "Backwaord",
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
    
    createPropertiesView(win){
        
    }
    
    createContextMenu(menu){
        
    }
    
    remove() {
        super.remove();
        SmartDashboard.removeWidget(this);
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
global.UnlinkedWidget = UnlinkedWidget;