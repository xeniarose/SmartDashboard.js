/**
 * This is a "plugin" because it's a client for something that doesn't exist in WPILib. It can also be an example for making plugins
 */
 
 var ntcore = global.ntcore;
 var SmartDashboard = global.SmartDashboard;

class ColorRange extends Widget {
    render() {
        var self = this;
        function createSlider(min, max) {
            var section = document.createElement("section");
            section.classList.add("color-slider");
            function setupSlider(min, max) {
                var slider = document.createElement("input");
                slider.type = "range";
                slider.min = min;
                slider.max = max;
                slider.onchange = self.change.bind(self);
                return slider;
            }
            section.appendChild(setupSlider(min, max));
            section.appendChild(setupSlider(min, max));
            return section;
        }
        
        function createCanvas() {
            var canvas = document.createElement("canvas");
            canvas.width = 255;
            canvas.height = 64;
            return canvas;
        }
        
        var container = document.createElement("div");
        container.classList.add("color-range-container");
        this.dom.appendChild(container);
        
        this._enable = document.createElement("input");
        this._enable.type = "checkbox";
        this._enable.onchange = this.enableChange.bind(this);
        var enableLabel = document.createElement("label");
        enableLabel.appendChild(this._enable);
        enableLabel.appendChild(document.createTextNode(" Show histograms"));
        container.appendChild(enableLabel);
        
        for(var i = 0; i < 3; i++) {
            var min = 0;
            var max = 255;
            var canvas = createCanvas();
            var section = createSlider(min, max);
            section.appendChild(canvas);
            container.appendChild(section);
        }
        this._rangeListener();
        this._enableListener();
    }

    _update(k, v) {}

    attachListeners() {
        var self = this;
        var objectRoot = this.table.getTablePath() + "/" + this.key;
        this._valTable = ntcore.getTable(objectRoot);
        var self = this;
        this._mainListener = function (k, v) {
            self.update();
        };
        this._valTable.onChange("hist_0", this._mainListener);
        this._valTable.onChange("hist_1", this._mainListener);
        this._valTable.onChange("hist_2", this._mainListener);
        this._rangeListener = function(k, v) {
            if(self.saveData.clientOverride && Array.isArray(self._lower) && Array.isArray(self._upper)){
                self._valTable.put("lower", self._lower);
                self._valTable.put("upper", self._upper);
                return;
            }
            var sections = Array.from(self.dom.querySelectorAll("section"));
            
            var lower = self._valTable.get("lower");
            var upper = self._valTable.get("upper");
            if(!Array.isArray(lower)) lower = [0, 0, 0];
            if(!Array.isArray(upper)) upper = [255, 255, 255];
            for(var i = 0; i < sections.length; i++) {
                var ranges = Array.from(sections[i].querySelectorAll("input"));
                ranges[0].value = lower[i];
                ranges[1].value = upper[i];
            }
        };
        this._valTable.onChange("lower", this._rangeListener);
        this._valTable.onChange("upper", this._rangeListener);
        this._enableListener = function(k, v) {
            self._enable.checked = self._valTable.get("enabled");
        };
        this._valTable.onChange("enabled", this._enableListener);
    }

    change(evt) {
        var lower = [];
        var upper = [];
        var sections = Array.from(this.dom.querySelectorAll("section"));
        for(var i = 0; i < sections.length; i++) {
            var ranges = Array.from(sections[i].querySelectorAll("input"));
            var value0 = parseInt(ranges[0].value);
            var value1 = parseInt(ranges[1].value);
            if(value0 > value1) {
                lower[i] = value1;
                upper[i] = value0;
            } else {
                lower[i] = value0;
                upper[i] = value1;
            }
        }
        this._lower = lower;
        this._upper = upper;
        this._valTable.put("lower", lower);
        this._valTable.put("upper", upper);
    }
    
    enableChange() {
        this._valTable.put("enabled", this._enable.checked);
    }

    update() {
        var canvasArray = Array.from(this.dom.querySelectorAll("canvas"));
        for(var i = 0; i < canvasArray.length; i++) {
            var canvas = canvasArray[i];
            var values = this._valTable.get("hist_" + i);
            if(!Array.isArray(values) || values.length == 0) return;
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if(i != 2) ctx.strokeStyle = '#000';
            else ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(var j = 0; j < values.length; j++) {
                ctx.moveTo(j + 0.5, 64);
                ctx.lineTo(j + 0.5, 64 - (Math.log(values[j]) / 12 * 64));
            }
            ctx.stroke();
            ctx.closePath();  
        }
    }
}

SmartDashboard.registerWidget(ColorRange, "object", {objectDetect: ["colorMode", "enabled"]});

exports.info = {
    name: "ColorRange",
    version: "0.1.0",
    description: "HSV range sliders"
};
exports.assets = {
    icons: {
        "ColorRange": "ColorRange.png"
    },
    css: "ColorRange.css"
};