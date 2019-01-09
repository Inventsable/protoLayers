function init() {
    console.log('Hello');
    return 'there';
}
function getLayerCount() {
    return app.activeDocument.layers.length;
}
function getPageItemCount() {
    return app.activeDocument.pageItems.length;
}
function getTotalLayerList() {
    var mirror = [];
    for (var i = 0; i < app.activeDocument.layers.length; i++) {
        var layer = app.activeDocument.layers[i];
        mirror.push(getLayerDetails(layer, 0));
    }
    return JSON.stringify(mirror);
}
function getLayerDetails(layer, depth) {
    var master = {
        name: layer.name,
        locked: layer.locked,
        selected: layer.selected,
        hidden: !layer.visible,
        children: [],
        depth: depth,
        type: layer.typename
    };
    if (layer.layers) {
        for (var l = 0; l < layer.layers.length; l++)
            master.children.push(getLayerDetails(layer.layers[l], depth + 1));
    }
    if (layer.pageItems.length) {
        for (var i = 0; i < layer.pageItems.length; i++) {
            var item = layer.pageItems[i];
            var child = {
                name: item.name,
                type: item.typename,
                locked: item.locked,
                selected: item.selected,
                hidden: item.hidden,
                depth: depth + 1
            };
            if (!child.name.length)
                child.name = '\<' + item.typename.replace(/Item/, '') + '\>';
            if (/group/i.test(item.typename))
                child['children'] = getLayerDetails(item, depth + 1);
            else
                child['children'] = [];
            master.children.push(child);
        }
    }
    return master;
}
