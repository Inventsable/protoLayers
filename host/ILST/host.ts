let pinList = [];
let extRoot;

function getPIN() {
    return checkPIN(Math.floor(Math.random() * 16777215).toString(16));
}

function assignExtensionPath(path) {
    extRoot = path;
    console.log(`Path assigned to ${path}`);
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

function scanSelection() {
    var doc = app.activeDocument;
    var result = [];
    if (doc.pageItems.length) {
        for (var i = 0; i < doc.pageItems.length; i++) {
            var child = doc.pageItems[i];
            if (child.selected)
                result.push(i)
        }
    }
    if (doc.textFrames.length) {
        for (var i = 0; i < doc.textFrames.length; i++) {
            var child = doc.textFrames[i];
            if (child.selected)
                result.push(i)
        }
    }
    // console.log(result)
    return result;
}

function scanActiveLayer() {
    let hasActive = -1;
    for (var i = 0; i < app.activeDocument.layers.length; i++) {
        var layer = app.activeDocument.layers[i];
        if (layer == app.activeDocument.activeLayer) {
            hasActive = i;
        }
    }
    return hasActive;
}

function getLayerCount() {
    return app.activeDocument.layers.length;
}

function getPageItemCount() {
    return app.activeDocument.pageItems.length;
}

function setActiveLayer(index) {
    app.activeDocument.activeLayer = app.activeDocument.layers[index];
}


// let fake = {
//     geometricBounds: [2.22, 3.77, 17.77, -5.00],
// }
// testPreview(fake, '66eeff');

function testPreview(item, pin) {
    let result = app.activeDocument.imageCapture(new File(`${extRoot}/preview/${pin}.png`), item.visibleBounds);
}

function findAllVisibility() {
    let mirror = [];
    for (var i = 0; i < app.activeDocument.layers.length; i++) {
        var layer = app.activeDocument.layers[i];
        // console.log(`Collecting visibility for ${layer.name}`);
        // mirror.push(getLayerVisibility(layer))
    }
    return mirror;
}


function getLayerVisibility(layer) {
    let master = {
        hidden: !layer.visible,
        children: [],
    }
    // console.log('Hello')
    if (layer.layers) {
        for (let l = 0; l < layer.layers.length; l++)
            master.children.push(getLayerVisibility(layer.layers[l]));
    }
    if (layer.pageItems.length) {
        for (let i = 0; i < layer.pageItems.length; i++) {
            let item = layer.pageItems[i];
            let child = {
                hidden: item.hidden,
            }
            if (/group/i.test(item.typename))
                child['children'] = getLayerVisibility(item);
            else
                child['children'] = [];
            master.children.push(child);
            // item.hidden = true;
        }
    }
    // if (/layer/i.test(layer.type))
    //     layer.visible = false;
    // else
    //     layer.hidden = true;
    return master;
}

function getPreview(item, pin) {
    // console.log(`${pin} @ ${item.visibleBounds}`)
    // let result = app.activeDocument.imageCapture(new File(`${extRoot}/preview/${pin}.png`), item.visibleBounds);
    // console.log(`${extRoot}/preview/${item.pin}.png`)
    // let file = ;
    // let isOpen = file.open('w');
    // let isClose = file.close();
    // if (isClose)
        // return true;
    // console.log(extRoot);
    // file.path = app.ex
    // return `${}`
    // app.activeDocument.
}

function getTotalLayerList() {
    // let visibilities = findAllVisibility();
    // console.log(visibilities.join(','))
    let mirror = [];
    pinList = [];
    for (let i = 0; i < app.activeDocument.layers.length; i++) {
        const layer = app.activeDocument.layers[i];
        mirror.push(getLayerDetails(layer, 0, i, 0))
    }
    return JSON.stringify(mirror);
}

function isActiveLayer(layer) {
    let result = false;
    if (/layer/i.test(layer.typename)) {
        if (app.activeDocument.activeLayer == layer) {
            result = true;
        }
    }
    return result;
}

function renameLayer(index, name) {
    app.activeDocument.layers[index].name = name;
}

function renamePageItem(index, name) {
    // alert(app.activeDocument.pageItems[index])
    app.activeDocument.pageItems[index].name = name;
}

function getLayerDetails(layer, depth, index, parent) {
    parent = parent || null;
    let master = {
        parent: parent,
        name: layer.name,
        placeholder: layer.name,
        index: index,
        locked: layer.locked,
        selected: false,
        active: false,
        activeLayer: isActiveLayer(layer),
        open: false,
        hidden: !layer.visible,
        children: [],
        depth: depth,
        type: layer.typename,
        label: toHex(layer.color),
        status: '',
        pin: getPIN(),
        // preview: getPreview(layer),
    }
    if (layer.layers) {
        for (let l = 0; l < layer.layers.length; l++)
            master.children.push(getLayerDetails(layer.layers[l], depth + 1, l, layer.index));
    }
    if (layer.pageItems.length) {
        for (let i = 0; i < layer.pageItems.length; i++) {
            const item = layer.pageItems[i];
            if (item.selected) {
                master.active = true;
                master.selected = true;
            }
            let child = {
                index: i,
                name: item.name,
                placeholder: item.name,
                type: item.typename,
                locked: item.locked,
                selected: false,
                label: toHex(layer.color),
                active: item.selected,
                open: false,
                status: '',
                hidden: item.hidden,
                depth: depth + 1,
                parent: index,
                pin: getPIN(),
            }
            child['preview'] = getPreview(item, child.pin);

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

// function getPageItemDepth(item) {
//     findPageItemInLayers(item);
// }

// function newPageItemDetails(item) {
//     let child = {
//         index: getPageItemDepth(item)[1],
//         name: item.name,
//         type: item.typename,
//         locked: item.locked,
//         selected: item.selected,
//         label: toHex(item.layer.color),
//         active: false,
//         open: false,
//         hidden: item.hidden,
//         depth: getPageItemDepth(item)[0],
//         parent: item.layer.index,
//         pin: getPIN(),
//     };
// }

// function findPageItemInLayers(item) {
//     for (let i = 0; i < app.activeDocument.layers.length; i++) {
//         const layer = app.activeDocument.layers[i];
//         searchForPageItem(layer, 0, item)
//     }
// }

// function searchForPageItem(group, depth, item) {
//     if (group.layers) {
//         for (let i = 0; i < group.layers.length; i++) {
//             const layer = group.layers[i];
//             searchForPageItem(layer, depth + 1, item)
//         }
//     }
//     if (group.pageItems.length) {
//         for (var p = 0; p < group.pageItems.length; p++) {
//             var pItem = group.pageItems[p];
//             if (pItem == item)
//                 return [depth, p];
//         }
//         if (/group/i.test(group.typename))
//             searchForPageItem(group, depth + 1, item);
//     }
// }



// function getNewLayerList() {
//     let mirror = [];
//     pinList = [];
//     for (let i = 0; i < app.activeDocument.layers.length; i++) {
//         const layer = app.activeDocument.layers[i];
//         mirror.push(getLayerNewDetails(layer, 0, i, 0))
//     }
//     return JSON.stringify(mirror);
// }

// function getLayerNewDetails(layer, depth, index, parent) {
//     parent = parent || null;
//     let master = {
//         parent: parent,
//         name: layer.name,
//         index: index,
//         locked: layer.locked,
//         active: false,
//         hidden: !layer.visible,
//         children: [],
//         depth: depth,
//         type: layer.typename,
//         label: toHex(layer.color),
//         pin: getPIN(),
//     }
//     if (layer.layers) {
//         for (let l = 0; l < layer.layers.length; l++)
//             master.children.push(getLayerNewDetails(layer.layers[l], depth + 1, l, layer.index));
//     }
//     if (layer.pageItems.length) {
//         for (let i = 0; i < layer.pageItems.length; i++) {
//             const item = layer.pageItems[i];
//             if (item.selected) {
//                 // master.open = true;
//                 master.active = true;
//             }
//             let child = {
//                 index: i,
//                 name: item.name,
//                 type: item.typename,
//                 locked: item.locked,
//                 label: toHex(layer.color),
//                 active: item.selected,
//                 hidden: item.hidden,
//                 depth: depth + 1,
//                 parent: index,
//                 pin: getPIN(),
//             }
//             if (!child.name.length)
//                 child.name = '\<' + item.typename.replace(/Item/, '') + '\>';
//             if (/group/i.test(item.typename))
//                 child['children'] = getLayerNewDetails(item, depth + 1, i, index);
//             else
//                 child['children'] = [];
//             master.children.push(child);
//         }
//     }
//     return master;
// }