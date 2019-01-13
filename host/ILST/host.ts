let pinList = [];

function getPIN() {
    return checkPIN(Math.floor(Math.random() * 16777215).toString(16));
}

function checkPIN(pin) {
    var err = 0;
    for (var i = 0; i < pinList.length; i++) {
        var target = pinList[i];
        if (pin === target)
            err++;
    }
    if (err < 1) {
        pinList.push(pin);
        return pin;
    } else {
        return getPIN();
    }
}

function getLayerCount() {
    return app.activeDocument.layers.length;
}

function getPageItemCount() {
    return app.activeDocument.pageItems.length;
}

function getTotalLayerList() {
    let mirror = [];
    pinList = [];
    for (let i = 0; i < app.activeDocument.layers.length; i++) {
        const layer = app.activeDocument.layers[i];
        mirror.push(getLayerDetails(layer, 0, i, 0))
    }
    return JSON.stringify(mirror);
}

function getLayerDetails(layer, depth, index, parent) {
    parent = parent || null;
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

function getPageItemDepth(item) {
    findPageItemInLayers(item);
}

function newPageItemDetails(item) {
    let child = {
        index: getPageItemDepth(item)[1],
        name: item.name,
        type: item.typename,
        locked: item.locked,
        selected: item.selected,
        label: toHex(item.layer.color),
        active: false,
        open: false,
        hidden: item.hidden,
        depth: getPageItemDepth(item)[0],
        parent: item.layer.index,
        pin: getPIN(),
    };
}

function findPageItemInLayers(item) {
    for (let i = 0; i < app.activeDocument.layers.length; i++) {
        const layer = app.activeDocument.layers[i];
        searchForPageItem(layer, 0, item)
    }
}

function searchForPageItem(group, depth, item) {
    if (group.layers) {
        for (let i = 0; i < group.layers.length; i++) {
            const layer = group.layers[i];
            searchForPageItem(layer, depth + 1, item)
        }
    }
    if (group.pageItems.length) {
        for (var p = 0; p < group.pageItems.length; p++) {
            var pItem = group.pageItems[p];
            if (pItem == item)
                return [depth, p];
        }
        if (/group/i.test(group.typename))
            searchForPageItem(group, depth + 1, item);
    }
}