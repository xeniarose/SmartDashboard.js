class WidgetUtils {
    static getDefaultWidget(type){
        var entry = SmartDashboard.options["default-" + type];
        if(typeof entry == "undefined"){
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
            SmartDashboard.addWidget(widget);
            var pos = widget.getPosition();
            widget.setPosition(e.clientX + document.body.scrollLeft - pos.w / 2, e.clientY + document.body.scrollTop - pos.h / 2);
            screen.classList.remove("active");
        };
        screen.classList.add("active");
    }
    
    static promptNewWidget(widgetType){
        var isContainer = SmartDashboard.widgetTypes[widgetType].dataType == "container";
        var nameRaw = "";
        if(!isContainer){
            nameRaw = prompt("SmartDashboard variable:");
            if (nameRaw == null || nameRaw == "")
                return;
        }
        WidgetUtils.newWidget(SmartDashboard.widgetTypes[widgetType].widget, nameRaw);
    }
    
    static defaultNewWidget(widgetType, nameRaw){
        WidgetUtils.newWidget(WidgetUtils.getDefaultWidget(widgetType).widget, nameRaw);
    }
    
    static newWidget(widgetClass, nameRaw){
        try {
            var widget = new widgetClass(nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                                         nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
            if(widget.onNew)
                widget.onNew();
            SmartDashboard.setEditable(true);
            WidgetUtils.positionWidget(widget);
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