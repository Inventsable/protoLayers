function init() {
    console.log('Hello')
    return 'there'
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
        mirror.push(getLayerDetails(layer, 0))
    }
    return JSON.stringify(mirror);
}

function getLayerDetails(layer, depth) {
    let master = {
        name: layer.name,
        locked: layer.locked,
        // selected: layer.selected,
        hidden: !layer.visible,
        children: [],
        depth: depth,
        type: layer.typename,
        label: toHex(layer.color),
    }
    if (layer.layers) {
        for (let l = 0; l < layer.layers.length; l++)
            master.children.push(getLayerDetails(layer.layers[l], depth + 1));
    }
    if (layer.pageItems.length) {
        for (let i = 0; i < layer.pageItems.length; i++) {
            const item = layer.pageItems[i];
            let child = {
                name: item.name,
                type: item.typename,
                locked: item.locked,
                selected: item.selected,
                hidden: item.hidden,
                depth: depth + 1,
            }
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