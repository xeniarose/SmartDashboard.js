class WidgetUtils {
    static getDefaultWidget(type){
        var entry = SmartDashboard.options["default-" + type];
        if(typeof entry == "undefined" || entry == ""){
            var first = null;
            for(var widgetType in SmartDashboard.widgetTypes){
                if(first == null) first = widgetType;
                if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetType)) continue;
                if(SmartDashboard.widgetTypes[widgetType].dataType == type){
                    return SmartDashboard.widgetTypes[widgetType];
                }
            }
            return SmartDashboard.widgetTypes[first];
        } else {
            return SmartDashboard.widgetTypes[entry];
        }
    }
    
    static positionWidget(widget){
        var screen = document.querySelector("#place-screen");
        screen.onclick = function(e){
            if(e.target.classList.contains("place-cancel") || e.target.parentElement.classList.contains("place-cancel")){
                return;
            }
            SmartDashboard.addWidget(widget);
            var pos = widget.getPosition();
            widget.setPosition(e.clientX + document.querySelector("#dashboard").scrollLeft - pos.w / 2, e.clientY + document.querySelector("#dashboard").scrollTop - pos.h / 2);
            screen.classList.remove("active");
            widget.onInserted();
        };
        document.querySelector("#place-screen .place-cancel").onclick = function(e){
            screen.classList.remove("active");
            widget.destroy();
            e.preventDefault();
            return false;
        };
        screen.classList.add("active");
    }
    
    static promptNewWidget(widgetType){
        var isUnlinked = SmartDashboard.widgetTypes[widgetType].dataType == "container"
            || SmartDashboard.widgetTypes[widgetType].widget.prototype instanceof UnlinkedWidget;
        if(!isUnlinked){
            document.querySelector("#input-screen input").setAttribute("list", "entry-search-items");
            SmartDashboard.prompt("SmartDashboard variable:", function(nameRaw){
                document.querySelector("#input-screen input").setAttribute("list", null);
                if (nameRaw != null && nameRaw.trim() != ""){
                    WidgetUtils.newWidget(SmartDashboard.widgetTypes[widgetType].widget, nameRaw);
                }
            });
        } else {
            WidgetUtils.newWidget(SmartDashboard.widgetTypes[widgetType].widget, "");
        }
    }
    
    static defaultNewWidget(widgetType, nameRaw, position){
        WidgetUtils.newWidget(WidgetUtils.getDefaultWidget(widgetType).widget, nameRaw, position);
    }
    
    static newWidget(widgetClass, nameRaw, position){
        try {
            var widget = new widgetClass(nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                                         nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
            if(widget.onNew)
                widget.onNew();
            SmartDashboard.setEditable(true);
            if(!position){
                WidgetUtils.positionWidget(widget);
            } else {
                SmartDashboard.addWidget(widget);
                widget.setPosition(position.left, position.top);
                widget.onInserted();
            }
        } catch (e) {
            SmartDashboard.handleError(e);
        }
    }
    
    static getTypeForEntry(nameRaw){
        var val = ntcore.getTable("").get(nameRaw);
        var widgetType = typeof val;
        if(widgetType == "undefined") widgetType = "object";
        if(Array.isArray(val)) widgetType = "array";
        return widgetType;
    }
    
    static forwardEvent(name, e){
        for (var widget of SmartDashboard.widgets) {
            if (widget._dragging && widget.dom[name]) {
                widget.dom[name](e);
            }
        }
        
        if(name == "onmousemove"){
            var x = e.clientX;
            var y = e.clientY;
            var trash = document.querySelector(".widget-trash");
            var rect = trash.getBoundingClientRect();
            if(x > rect.left && x < rect.right && y > rect.top && y < rect.bottom){
                trash.classList.add("hover");
            } else {
                trash.classList.remove("hover");
            }
        }
    }
    
    static onWidgetInserted(widget){
        widget.dom.classList.add("inserted-element");
        setTimeout((function(widget){
            widget.dom.classList.remove("inserted-element");
        }).bind(null, widget), 400);
    }
    
    static onWidgetRemoved(widget){
        widget.dom.classList.add("removed-element");
        setTimeout((function(widget){
            widget.dom.remove();
        }).bind(null, widget), 250);
    }
}

global.WidgetUtils = WidgetUtils;