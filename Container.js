class Container extends DraggableElement {
    constructor(table, key, saveData){
        super();
        this.dom = document.createElement("div");
        this.dom.classList.add("container");
        this.dom.classList.add("container-" + this.constructor.name);
        this.dom.parentWidget = this;
        this.editable = false;
        this.saveData = saveData || {};
        this.editing = false;
        var self = this;
        this.dom.ondblclick = function(e){
            return self.doubleClickHandler(e);
        };
        this.table = {
            getTablePath: function(){
                return "";
            }
        };
        this.key = "";
        this.restoreSave();
    }
    
    restoreSave(){
        
    }
    
    getDragMode(){
        return "position";
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
        function removeChildren(el){
            SmartDashboard.removeWidget(el);
            if(el.getChildren){
                for(var child of el.getChildren()){
                    removeChildren(child);
                }
            }
        }
        
        removeChildren(this);
    }
    
    setEditable(flag){
        this.setEditing(false);
        super.setEditable(flag);
    }
    
    mouseDownHandler(){
    }
    mouseUpHandler(){
    }
    
    render(){
        
    }
    
    doubleClickHandler(e){
        if(e.target != this.dom || !SmartDashboard.editable) return;
        this.setEditing(!this.editing);
        e.preventDefault();
        return false;
    }
    
    setEditing(flag){
        this.editing = flag;
        this.dom.dataset.editing = "" + flag;
        DomUtils.resetClass("not-editing");
        if(flag){
            for(var item of SmartDashboard.widgets){
                if(item != this && item.editing)
                    item.setEditing(false);
            }
            
            var el = this.dom.parentElement;
            do {
                el.classList.add("not-editing");
                el = el.parentElement;
            } while(el != document.body && el != null);
        }
        if(SmartDashboard.editable){
            super.setEditable(!flag);
        }
    }
    
    getChildren(){
        return Array.prototype.map.call(this.dom.children, function(el){
            return el.parentWidget;
        });
    }
    
    addChild(child, positionIsCorrect){
        var childPos = child.getPosition();
        var thisPos = this.getPosition();
        if(!positionIsCorrect){
            childPos.x -= thisPos.x;
            childPos.y -= thisPos.y;
            if(childPos.x < 0) childPos.x = 0;
            if(childPos.y < 0) childPos.y = 0;
        }
        child.dom.remove();
        child.parent = this;
        WidgetUtils.onWidgetInserted(child);
        try {
            this.dom.appendChild(child.dom);
        } catch (e) {
            SmartDashboard.handleError(e);
        }
        child.setPosition(childPos.x, childPos.y, childPos.w, childPos.h);
    }
    
    removeChild(child, positionIsCorrect){
        var childPos = child.getPosition();
        var thisPos = this.getPosition();
        childPos.x += thisPos.x;
        childPos.y += thisPos.y;
        child.dom.remove();
        if(this.parent){
            this.parent.dom.appendChild(child.dom);
            child.parent = this.parent;
        } else {
            document.querySelector("#dashboard").appendChild(child.dom);
            delete child.parent;
        }
        child.setPosition(childPos.x, childPos.y, childPos.w, childPos.h);
        this.restoreSaveFromParent(child);
    }
    
    getPropertiesFromParent(win, self){
        
    }
    
    restoreSaveFromParent(self){
        
    }
    
    destroy(){
        
    }
}
global.Container = Container;
SmartDashboard.registerWidget(Container, "container");