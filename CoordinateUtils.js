class CoordinateUtils {
    static isRectIntersecting(r1, r2){
        function isPointContained(val, left, right){
            return val > left && val < right;
        }
        return (
            isPointContained(r1.left, r2.left, r2.right) ||
            isPointContained(r1.right, r2.left, r2.right) ||
            isPointContained(r2.left, r1.left, r1.right) ||
            isPointContained(r2.right, r1.left, r1.right)
        ) && (
            isPointContained(r1.top, r2.top, r2.bottom) ||
            isPointContained(r1.bottom, r2.top, r2.bottom) ||
            isPointContained(r2.top, r1.top, r1.bottom) ||
            isPointContained(r2.bottom, r1.top, r1.bottom)
        );
    }
    
    static findIntersectingContainer(widget, blacklist){
        blacklist = blacklist || [];
        blacklist.push(widget);
        var wRect = widget.dom.getBoundingClientRect();
        for(var container of SmartDashboard.widgets){
            if(!container.addChild || blacklist.indexOf(container) > -1) continue;
            
            var cRect = container.dom.getBoundingClientRect();
            if(CoordinateUtils.isRectIntersecting(wRect, cRect)){
                return container;
            }
        }
        return null;
    }
}

global.CoordinateUtils = CoordinateUtils;