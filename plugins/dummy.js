class DummyNumber extends Widget {
    render() {
        this.root.innerHTML = "dummy";
    }

    update() {
    }
}

SmartDashboard.registerWidget(DummyNumber, "number");

class DummyRaw extends Widget {
    render() {
        this.root.innerHTML = "dummy";
    }

    update() {
    }
}

SmartDashboard.registerWidget(DummyRaw, "raw");

exports.info = {
    name: "Dummy Plugin",
    version: "0.1.0",
    description: "A dummy plugin"
};