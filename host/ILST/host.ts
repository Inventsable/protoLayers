function init() {
    console.log('Hello')
    return 'there'
}

function getPIN() {
    return Math.floor(Math.random() * 16777215).toString(16);
}

function getLayerCount() {
    return app.activeDocument.layers.length;
}

function getPageItemCount() {
    return app.activeDocument.pageItems.length;
}

function getTotalLayerList() {
    let mirror = [];
    for (let i = 0; i < app.activeDocument.layers.length; i++) {
        const layer = app.activeDocument.layers[i];
        mirror.push(getLayerDetails(layer, 0, i, 0))
    }
    return JSON.stringify(mirror);
}

function getLayerDetails(layer, depth, index, parent) {
    parent = parent||null;
    let master = {
        parent: parent,
        name: layer.name,
        index: index,
        locked: layer.locked,
        selected: false,
        active: false,
        open: false,
        hidden: !layer.visible,
        children: [],
        depth: depth,
        type: layer.typename,
        label: toHex(layer.color),
        pin: getPIN(),
    }
    if (layer.layers) {
        for (let l = 0; l < layer.layers.length; l++)
            master.children.push(getLayerDetails(layer.layers[l], depth + 1, l, layer.index));
    }
    if (layer.pageItems.length) {
        for (let i = 0; i < layer.pageItems.length; i++) {
            const item = layer.pageItems[i];
            let child = {
                index: i,
                name: item.name,
                type: item.typename,
                locked: item.locked,
                selected: item.selected,
                label: toHex(layer.color),
                active: false,
                open: false,
                hidden: item.hidden,
                depth: depth + 1,
                parent: index,
                pin: getPIN(),
            }
            if (!child.name.length)
                child.name = '\<' + item.typename.replace(/Item/, '') + '\>';
            if (/group/i.test(item.typename))
                child['children'] = getLayerDetails(item, depth + 1, i, index);
            else   
                child['children'] = [];
            master.children.push(child);
        }
    }
    return master;
}