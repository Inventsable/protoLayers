var csInterface = new CSInterface();
loadUniversalJSXLibraries();
loadJSX(csInterface.hostEnvironment.appName + '/host.jsx');
window.Event = new Vue();

const EventList = [
  { listenTo: 'debug.on', sendTo: 'debugModeOn', package: false, },
  { listenTo: 'debug.off', sendTo: 'debugModeOff', package: false, },
  { listenTo: 'console', sendTo: 'internalConsole', package: false, },
];

// let masterEdit = false;
// document.body.addEventListener('keydown', function(evt) {
//   if ((!masterEdit) && (/arrow/i.test(evt.key))) {
//     console.log(evt);
//     console.log(`${evt.key} was pressed outside Vue`)
//     evt.preventDefault();
//   }
// })


for (let e = 0; e < EventList.length; e++) {
  let event = EventList[e];
  csInterface.addEventListener(event.listenTo, function (evt) {
    if (/debug/.test(evt.type)) {
      if (evt.type == 'debug.on')
        Event.$emit('debugModeOn');
      if (evt.type == 'debug.off')
        Event.$emit('debugModeOff');
    } else if (/console/.test(evt.type)) {
      console.log(`HOST: ${evt.data}`)
    } else {
      if (event.package) {
        // 
      } else {
        Event.$emit(event.sendTo);
      }
    }
  });
}

Vue.component('protolayers', {
  template: `
    <extension 
      @mouseenter="wakeApp" 
      @mouseleave="sleepApp"
      :style="styleDebug()">
      <event-manager />
      <stylizer />
      <timers />
      <bottom>
        <foot :model="info" />
      </bottom>
      <panel>
        <center>
          <layers-list :model="layerlist"/>
        </center>
        <panel-mask />
      </panel>
    </extension>
  `,
  data() {
    return {
      wakeOnly: true,
      info: {
        layercount: 0,
      },
      layerlist: [],
      pageItems: [],
      target: {},
      lastTarget: {},
      parent: {},
      navigator: {},
      parentIndex: 0,
      ancestors: [],
    }
  },
  computed: {
    debugMode: function () { return this.$root.debugMode },
    isWake: function () { return this.$root.isWake },
    selection: function () { return this.$root.master.selection },
    hasSelection: function () { return (this.$root.master.selection.length) ? true : false },
    autoParent: function () {
      return this.getParent();
    },
    autoTarget: function () {
      return this.getTarget();
    },
    
  },
  mounted() {
    this.$root.screen = this.$el.children[3];
    this.$root.screenInner = this.$el.children[3].children[0];
    Event.$on(`buildNumber`, this.setBuild);
    Event.$on(`portNumber`, this.setPort);
    csInterface.evalScript(`getLayerCount()`, this.setLayercount);
    csInterface.evalScript(`getTotalLayerList()`, this.getLayerList);
    Event.$on('selectionChange', this.changeSelection);
    Event.$on('addToSelection', this.addToSelection);
    Event.$on(`layerCount`, this.setLayercount);
    Event.$on('fullSelectionChange', this.getActiveStatus);
    Event.$on('fullActiveLayerChange', this.getActiveLayer);
    Event.$on('checkActiveLayer', this.setActiveLayer);
    Event.$on('findParentActiveLayer', this.findParentActiveLayer);
    Event.$on('renameInput', this.renameInput);

    Event.$on('globalEditBounce', this.setEditFocusOnElt);
    Event.$on('navigateSelection', this.navigateSelection);
    Event.$on('recheckSelection', this.recheckSelection);
    this.getPageItems();
  },
  methods: {
    recheckSelection() {
      console.log('Rechecking selection');
      console.log(this.selection[0].index)
    },
    setEditFocusOnElt() {
      console.log('Found')
      if (this.hasSelection) {
        console.log(`Bounced for setFocusInput${this.selection[0].pin}`);
        Event.$emit(`setFocusInput${this.selection[0].pin}`);
      }
    },
    setSelection(target) {
      Event.$emit('clearAllSelected');
      target.selected = true;
      this.lastTarget = target;
      console.log(`Last index was ${target.index}`);
      const child = {
        pin: target.pin,
        depth: target.depth,
        index: target.index,
      }
      this.$root.master.selection = [child];
      Event.$emit(`setFocusOnRow${target.pin}`);
      // console.log(`${this.selection[0].depth} :: ${this.selection[0].index} :: ${this.selection[0].pin}`);
    },
    getTarget() {
      if (this.hasSelection) {
        return this.altFindPIN(this.layerlist, this.selection[0].pin);
      } else {
        return null;
      }
    },
    getParent() {
      let sParent = this.layerlist;
      if (this.selection[0].depth > 0) {
        let index = this.selection[0].index;
        sParent = this.findPINParent(this.layerlist, 'root', this.selection[0].pin, 's')
        sParent = this.findPIN(this.layerlist, this.$root.sParent);
        return sParent.children;
      } else {
        return this.layerlist;
      }
    },
    navigateSelection(dir) {
      // console.log(`Navigating ${dir}`);
      let pathfinder = this.findPIN(this.layerlist, this.selection[0].pin);
      this.target = this.findPIN(this.layerlist, this.selection[0].pin);
      if (this.hasSelection) {
        let sParent = this.layerlist, sPin;
        if (this.selection[0].depth > 0) {
          let index = this.selection[0].index;
          sParent = this.findPINParent(this.layerlist, 'root', this.selection[0].pin, 's')
          sParent = this.findPIN(this.layerlist, this.$root.sParent);
          this.parent = sParent.children;
          this.target = sParent.children[index];
        }
      }
      if (/up|down/i.test(dir)) {
        let offset;
        if (/up/i.test(dir))
          offset = -1;
        else if (/down/i.test(dir))
          offset = 1;
        this.navigateParent(offset);
      } else {
        this.navigateFold(dir);
      }
    },

    getParentIndex(list, parent) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item == parent)
          return i;
      }
    },
    navigateParent(num) {
      let list, target;
      list = this.getParent();
      target = this.getTarget();
      try {
        if (num > 0) {
          console.log(`RR: Moving down ${target.index} to ${target.index + num}`)
          if (target.index + num < list.length) {
            if ((target.open) && (target.children.length)) {
              this.parentIndex = target.index;
              this.ancestors = list;
              target = target.children[0];
            } else {
              target = list[target.index + num];
            }
          } else {
            console.log('Logic not yet written')
            if ((target.open) && (target.children.length)) {
              // console.log(`Move into child`)
              this.parentIndex = target.index;
              this.ancestors = list;
              target = target.children[0];
            } else {
              target = list[0];
            }
          }
        } else {
          console.log(`Moving up from ${target.index} to ${target.index + num}`)
          if (target.index + num >= 0) {
            console.log(`Move from ${target.index} to ${target.index + num}`)
            target = list[target.index + num];
            if ((target.open) && (target.children.length)) {
              console.log('Queen')
              console.log(`Move into child above`)
              this.parentIndex = target.index;
              this.ancestors = list;
              target = target.children[target.children.length - 1]
            }
          } else {
            target = list[list.length - 1];
            if ((target.open) && (target.children.length)) {
              this.parentIndex = target.index;
              this.ancestors = list;
              target = target.children[target.children.length - 1]
            }
            // console.log(`Reset to ${list.length - 1}`)
          }
        }
        this.setSelection(target);
      } catch (err) {
        console.log('Backdoor for target undefined')
        target = this.lastTarget;
        list = this.parent;
        console.log(`${target.index} of ${list.length}`)
        if (num > 0) {
          if (this.target.index + num < list.length) {
            if ((target.open) && (target.children.length)) {
              // console.log(`Move into child`)
              this.parentIndex = target.index;
              this.ancestors = list;
              target = target.children[0];
              console.log(`RR: ${target.index}`)
            } else {
              console.log(`${target.index} + ${num}`)
              let newpos = target.index + num;
              console.log(`RRS: Move from ${target.index} to ${newpos}`)
              target = list[newpos];
              console.log(newpos)
              console.log(list);
              console.log(target);
              this.target = target;
              this.lastTarget = target;
              // this.setSelection(target);
              // return this.setSelection(target);
            }
          } else {
            console.log('NN: Logic not yet written')
            if (this.parentIndex + 1 < this.ancestors.length)
              target = this.ancestors[this.parentIndex + 1];
            else
              target = this.ancestors[0];
          }
          console.log('Rook')
          this.setSelection(target);
        } else {
          console.log(`NN: Move from ${target.index} to ${target.index + num}`)
          if (this.target.index + num >= 0) {
            console.log('Bishop')
            target = list[target.index + num];
          } else {
            console.log(`NN: Step back to parent`)
            target = this.ancestors[this.parentIndex];
            if ((target.open) && (target.children.length)) {
              this.parentIndex = target.index;
              this.ancestors = list;
              target = target.children[target.children.length - 1]
            }
          }
          console.log('Bishops')
          this.setSelection(target);
        }
      } finally {
        console.log('Complete')
      }
    },
    navigateFold(direction) {
      if ((/left/i.test(direction)) && (/layer|group/i.test(this.target.type)) && (this.target.children.length)) {
        this.target.open = false;
      } else if ((/right/i.test(direction)) && (/layer|group/i.test(this.target.type)) && (this.target.children.length)) {
        this.target.open = true;
      }
    },
    altFindPIN(list, pin) {
      const self = this;
      for (let i = 0; i < list.length; i++) {
        const layer = list[i];
        if (layer.pin == pin) {
          this.$root.temp = layer;
          return layer;
        } else {
          if (layer.children.length) {
            for (let c = 0; c < layer.children.length; c++)
              self.altFindPIN(layer.children, pin);
          }
        }
      }
    },
    renameInput(msg) {
      msg = JSON.parse(msg);
      let target = this.targetPIN(this.layerlist, msg.pin);
      target = this.$root.inputTarget;
      // console.log(target)
      target.name = msg.name;
      let details = this.findJSXPosition(this.layerlist, msg.pin, -1, -1);
      details = this.$root.inputPosition;
      this.getPageItems();
      if (details[1] < 0) {
        this.renameLayer(details[0], msg.name);
      } else {
        let index = this.findPageItemMasterIndex(msg.pin);
        this.renamePageItem(index, msg.name);
      }
      // console.log(details);
    },
    findPageItemMasterIndex(pin) {
      for (let i = 0; i < this.pageItems.length; i++) {
        const pageItem = this.pageItems[i];
        if (pageItem.pin == pin) {
          return i;
        }
      }
    },
    findInPageItems(pin) {
      for (let i = 0; i < this.pageItems.length; i++) {
        const pageItem = this.pageItems[i];
        if (pageItem.pin == pin) {
          return pageItem;
        }
      }
    },
    getPageItems() {
      this.pageItems = [];
      for (let i = 0; i < this.layerlist.length; i++) {
        const layer = this.layerlist[i];
        this.searchForPageItems(layer.children);
      }
    },
    searchForPageItems(list) {
      // let mirror = [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!/group|layer/i.test(item.type)) {
          this.pageItems.push(item);
        } else {
          if (item.children.length) {
            this.searchForPageItems(item.children);
          }
        }
      }
    },
    renamePageItem(index, name) {
      csInterface.evalScript(`renamePageItem(${index}, '${name}')`)
    },
    renameLayer(index, name) {
      csInterface.evalScript(`renameLayer(${index}, '${name}')`)
    },
    findJSXPosition(list, pin, layerindex, itemindex) {
      for (let i = 0; i < list.length; i++) {
        const major = list[i];
        if (/layer/i.test(major.type))
          layerindex = i;
        else
          itemindex = i;
        if (major.pin == pin) {
          this.$root.inputPosition = [layerindex, itemindex];
          return [layerindex, itemindex];
        } else {
          if (/group|layer/i.test(major.type)) {
            // console.log('is group or layer')
            if (major.children.length) {
              // console.log('has children')
              this.findJSXPosition(major.children, pin, layerindex, itemindex);
            }
          }
        }
        // if (layer.pin == pin)
          // return ;
      }
    },
    findParentActiveLayer(msg) {
      msg = JSON.parse(msg);
      let parent = this.findPINParent(this.layerlist, 'root', msg.pin, 'ab');
      parent = this.findPIN(this.layerlist, this.$root.abParent);
      parent.activeLayer = true;
    },
    findActiveLayer() {
      for (let i = 0; i < this.layerlist.length; i++) {
        const layer = this.layerlist[i];
        if (layer.activeLayer) {
          return i;
        }
      }
    },
    setActiveLayer() {
      let index = this.findActiveLayer();
      // console.log(`New active layer is ${index}`);
      csInterface.evalScript(`setActiveLayer(${index})`);
    },
    getActiveLayer() {
      Event.$emit('clearAllActiveLayers');
      csInterface.evalScript(`scanActiveLayer()`, this.getNewActiveLayer);
      this.getPageItems();
    },
    getNewActiveLayer(msg) {
      if (msg >= 0)
        this.layerlist[msg].activeLayer = true;
    },
    getActiveStatus() {
      Event.$emit('clearPreviousPINs');
      console.log('Clearing previous pins')
      csInterface.evalScript(`getTotalLayerList()`, this.getNewLayerList);
    },
    setLayercount(msg) { this.info.layercount = msg; },
    smartReplaceValues(parent, layer, index, keywords) {
      // isn't recursive-tested and has issues with assigning new pins
      // @@ Events with pin numbers can't be set on mounted() and must be recalled every change
      if (keywords.length)
        keywords = keywords.join('\|')
      let reg = new RegExp(keywords);
      for (let [key, value] of Object.entries(layer)) {
        if (!reg.test(key)) {
          parent[index][key] = value;
        } else if (/children/.test(key)) {
          for (let i = 0; i < value.length; i++) {
            const child = value[i];
            this.smartReplaceValues(parent.children[i], child, i, keywords);
          }
        }
      }
    },
    getNewLayerList(msg) {
      let index = -1;
      let keywords = ['open', 'status']; // @@ pin was here
      if (msg.length) {
        msg = JSON.parse(msg);
        for (let [root,layer] of Object.entries(msg)) {
          index++;
          this.smartReplaceValues(this.layerlist, layer, index, keywords);
        }
      }
      console.log('Assigning new pins')
      Event.$emit('assignNewPINs');
    },
    getLayerList(msg) {
      msg = JSON.parse(msg);
      this.layerlist = msg;
      console.log(this.layerlist);
      this.getPageItems();
    },
    findPINParent(list, parent, pin, which) {
      const self = this;
      for (let i = 0; i < list.length; i++) {
        const target = list[i];
        // console.log(`${target.pin} :: ${pin}`)
        if (target.pin == pin) {
          // console.log(`${target.pin} from ${target.depth} at ${target.index}`);
          if (typeof parent !== 'String') {
            this.$root[`${which}Parent`] = parent.pin;
            // console.log(`Match is ${parent.pin}`)
            return parent.pin;
          } else {
            return parent;
          }
        } else {
          if (target.children.length) {
            for (let c = 0; c < target.children.length; c++)
              self.findPINParent(target.children, target, pin, which);
          }
        }
      }
      // return parent.pin;
    },
    selectRangeOfChildren(list, min, max) {
      for (let i = min; i <= max; i++)
        list[i].selected = true;
    },
    selectFromPIN(a, b) {
      let sameParent = false;
      let aParent = this.layerlist, bParent = this.layerlist;
      if (a.depth > 0) {
        aParent = this.findPINParent(this.layerlist, 'root', a.pin, 'a')
        aParent = this.findPIN(this.layerlist, this.$root.aParent);
        aParent = aParent.children;
      }
      if (b.depth > 0) {
        bParent = this.findPINParent(this.layerlist, 'root', b.pin, 'b');
        bParent = this.findPIN(this.layerlist, this.$root.bParent);
        bParent = bParent.children;
      }
      if (aParent === bParent)
        sameParent = true;
      if ((a.depth == 0) || (b.depth == 0)) {
        // console.log('This is at root level')
      }
      if (sameParent) {
        if (a.index > b.index) {
          this.selectRangeOfChildren(aParent, b.index, a.index);
        } else {
          this.selectRangeOfChildren(aParent, a.index, b.index);
        }
      }
    },
    findPIN(list, pin, override=false) {
      const self = this;
      for (let i = 0; i < list.length; i++) {
        const layer = list[i];
        if (layer.pin == pin) {
          return layer;
        } else {
          if (layer.children.length) {
            for (let c = 0; c < layer.children.length; c++)
              self.findPIN(layer.children, pin);
          }
        }
      }
    },
    targetPIN(list, pin) {
      const self = this;
      for (let i = 0; i < list.length; i++) {
        const layer = list[i];
        if (layer.pin == pin) {
          this.$root.inputTarget = layer;
          return layer;
        } else {
          if (layer.children.length) {
            for (let c = 0; c < layer.children.length; c++)
              self.targetPIN(layer.children, pin);
          }
        }
      }
    },
    addToSelection(msg) {
      msg = JSON.parse(msg);
      if (this.$root.master.selection.length) {
        if (msg.depth == this.$root.master.selection[0].depth) {
            this.selectFromPIN(this.$root.master.selection[0], msg);
        } else {
          console.log('Exists on different depth level')
        }
      } else {
        console.log('No selection')
      }
    },
    changeSelection(msg) {
      msg = JSON.parse(msg);
      Event.$emit('clearAllSelected');
      let result = this.findInLayers(this.layerlist, 'start', msg, 'select');
      const child = {
        pin: result.pin,
        depth: result.depth,
        index: result.index,
      }
      this.$root.selection = [child];
      // console.log('Selection changed to...')
      // console.log(result);
    },
    findInLayers(group, heritage, obj, action) {
      // console.log(group)
      const self = this;
      for (let i = 0; i < group.length; i++) {
        const layer = group[i];
        if (layer.pin == obj.pin) {
          if (action == 'select') {
            layer.selected = true;
            // if (heritage !== 'start') {
            //   for (let h = 0; h < heritage.length; h++) {
            //     const ancestor = heritage[h];
            //     ancestor.selected = true;
            //   }
            //   console.log('Selecting heritage')
            // }
          }
          return layer;
        } else {
          if (layer.children.length) {
            for (let c = 0; c < layer.children.length; c++)
              self.findInLayers(layer.children, layer, obj, action);
          }
        }
      }
    },
    styleDebug() { return ((this.debugMode) && (this.isWake)) ? `border-color: ${this.$root.getCSS('color-selection')}` : `border-color: transparent`; },
    wakeApp() {
      this.$root.wake();
      this.$root.dispatchEvent('debug.target', this.$root.name);
      if (this.debugMode) {
        this.$root.dispatchEvent('debug.link', 'Can start to read')
      } else {
        // Not in debug mode
      }
      Event.$emit('startStats');
    },
    sleepApp() {
      if (this.wakeOnly) {
        this.wakeApp();
        Event.$emit('clearStats');
      } else {
        this.$root.sleep();
        if (this.debugMode) {
          this.$root.dispatchEvent('debug.target', '');
          this.$root.dispatchEvent('debug.unlink', 'Can no longer read')
        } else {
          // Not in debug mode
        }
        Event.$emit('clearStats');
      }
    },
    setBuild(msg) { this.info.buildNumber = msg; },
    setPort(msg) { this.info.localhost = msg; },
  },
})

Vue.component('panel-mask', {
  template: `
    <div class="screen-mask" @click="clickOutOfBounds()"></div>
  `,
  methods: {
    clickOutOfBounds() {
      Event.$emit('clearAllSelected');
    }
  }
})

Vue.component('timers', {
  template: `
    <div class="scanner"></div>
  `,
  data() {
    return {
      last: {
        selection: [],
        activeLayer: -1,
      },
      timers: [
        {
          name: 'selection',
          timer: null,
          interval: 200,
          // callforward: function() {
          //   csInterface.evalScript('scanSelection', this.getMsg)
          // },
          // getMsg: function(msg) {
          //   console.log(msg);
          // }
        },
        {
          name: 'activeLayer',
          timer: null,
          interval: 200,
        },

      ],
      callList: ['selectionCheck']
    }
  },
  mounted() {
    const self = this;
    this.startTimer(this.timers[0]);
    this.startTimer(this.timers[1]);
  },
  methods: {
    selectionCheck() { csInterface.evalScript('scanSelection()', this.selectionRead); },
    selectionRead(msg) {
      if (this.last.selection !== msg) {
        this.last.selection = msg;
        Event.$emit('fullSelectionChange');
      }
    },
    activeLayerCheck() { csInterface.evalScript('scanActiveLayer()', this.activeLayerRead); },
    activeLayerRead(msg) {
      if (this.last.activeLayer !== msg) {
        this.last.activeLayer = msg;
        Event.$emit('fullActiveLayerChange');
      }
    },
    findTimer(target) {
      for (let i = 0; i < this.timers.length; i++) {
        const timer = this.timers[i];
        if (timer.name == target)
          return timer;
      }
    },
    startTimer(target) {
      const self = this;
      if (/selection/.test(target.name)) {
        target.timer = setInterval(self.selectionCheck, target.interval);
      } else if (/activeLayer/.test(target.name)) {
        target.timer = setInterval(self.activeLayerCheck, target.interval);
      }
      target.isScanning = true;
    },
    stopTimer(target) {
      clearInterval(target.timer);
      target.isScanning = false;
    }
  }
})

Vue.component('extension', { template: `<div class="appGrid"><slot></slot></div>` })
Vue.component('panel', { template: `<div class="screen"><slot></slot></div>` })
Vue.component('top', { template: `<div class="appTop"><slot></slot></div>` })
Vue.component('center', { template: `<div class="appMiddle"><slot></slot></div>` })
Vue.component('bottom', { template: `<div class="appBottom"><slot></slot></div>` })
Vue.component('foot', {
  props: {
    model: Object,
  },
  template: `
    <div class="appFooter">
      <div class="appFooterL">
        <div>{{fullcount}}</div>
        <toggle-edit></toggle-edit>
      </div>
      <adobe-toolbar-buttons />
    </div>
  `,
  mounted() {
    console.log(`Layer count is ${this.model.layercount}`)
  },
  computed: {
    fullcount: function() {
      if (this.model.layercount > 1)
        return `${this.model.layercount} Layers`
      else if (this.model.layercount == 0)
        return `${this.model.layercount} Layers`
      else
        return `${this.model.layercount} Layer`
    } 
  }
})

Vue.component('adobe-toolbar-buttons', {
  template: `
    <div class="appFooterR">
      <div 
        v-for="button in buttons" 
        class="footer-button" 
        :style="getButtonStyle(button.name)"
        :title="button.title">
        <toolbar-icon :type="button.name" />
      </div>
    </div>  
  `,
  data() {
    return {
      msg: 'Hello world',
      contexts: [ 
        {
          name: 'all',
          available: ['export', 'find', 'mask', 'newsublayer', 'newlayer', 'trash'],
        },
        {
          name: 'onlayer',
          available: ['export', 'mask', 'newsublayer', 'newlayer', 'trash'],
        },
        {
          name: 'noselect',
          available: ['newlayer'],
        },

      ],

      buttons: [
        {
          name: 'export',
          title: 'Collect For Export'
        },
        {
          name: 'find',
          title: 'Locate Object'

        },
        {
          name: 'mask',
          title: 'Make/Release Clipping Mask'

        },
        {
          name: 'newsublayer',
          title: 'Create New Sub Layer'

        },
        {
          name: 'newlayer',
          title: 'Create New Layer'

        },
        {
          name: 'trash',
          title: 'Delete Selection'

        },
      ]
    }
  },
  methods: {
    getButtonStyle(name) {
      let style = '';

      return style;
    },
  }
}) 

Vue.component('toggle-edit', {
  template: `
    <div class="toggle-edit-wrap" @click="toggle">
      {{label}}
    </div>
  `,
  // data() {
  //   return {
  //     editMode: false,
  //   }
  // },
  computed: {
    editMode: function() { return this.$root.globalEditMode },
    label: function() {
      return `Toggle to ${this.editMode ? 'Default' : 'Edit'}`
    }
  },
  methods: {
    toggle() {
      this.$root.globalEditMode = !this.$root.globalEditMode;
      if (this.editMode) {
        Event.$emit('setEditOn');
        Event.$emit('globalEditOn');
      } else {
        Event.$emit('setEditOff');
        Event.$emit('globalEditOff');
      }
    }
  },
})

Vue.component('placeholder', {
  template: `
    <div class="placeholder">Test</div>
  `
})

Vue.component('layer-drop', {
  props: {
    model: Object,
    // parentindex: Number,
    // refer: String,
  },
  template: `
    <div v-if="model.open" class="layer-droplist-wrap">
      <layer v-for="(layer,key) in model.children" :key="key" :index="key" :model="layer" />
    </div>
  `,
  // computed: {
  //   newIndex: function() { return this.parentindex; },
  //   modifier: function() { return this.cipher[(this.newIndex % this.cipher.length)]; },
  // },
  // methods: {
  //   getReference(key) { return `${this.refer}${key}` }
  // },
  // data() {
  //   return {
  //     cipher: ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
  //   }
  // },  
  mounted() {
    // console.log('list is online')
    // console.log(this.modifier);
  }
})

Vue.component('layers-list', {
  props: {
    model: Array,
  },
  template: `
    <div class="layer-screen-wrap">
      <div class="layer-list-wrap">
        <layer v-for="(layer,key) in model" :key="key" :index="key" :model="layer" />
      </div>
    </div>
  `,
  // methods: {
  //   getCipher(num) {
  //     if (num % this.cipher.length > 1)
  //       num = Number('' + 0 + num % this.cipher.length)
  //     // console.log(num);
  //     // console.log(num % this.cipher.length)
  //     return this.cipher[num];
  //   }
  // },
  // data() {
  //   return {
  //     cipher: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
  //   }
  // },
  // methods
})

//     <layer-icon @click="toggleOpenStatus" @mouseover="checker" :type="getLayerStatusType()" />


Vue.component('fake-focus', {
  template: `
    <input :style="getStyle()" class="fake-focus" />
  `,
  methods: {
    getStyle() {
      return '';
    }
  }
})

Vue.component('layer', {
  props: {
    model: Object,
    // index: String,
    index: Number,
    // refer: String,
  },
  template: `
    <div class="layer-subwrap">
      <div class="layer-wrap" :style="getLayerStyle()">
        <div class="layer-head">
          <layer-icon :type="(model.hidden) ? 'hidden' : 'visible'" />
          <layer-icon :type="(model.locked) ? 'lock' : 'blank'" />
          <layer-label :color="model.label" :select="false" />
          <layer-tab v-for="(tab,key) in depth" :key="key" />
          <div class="layer-icon" @click="toggleOpenStatus">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path v-if="hasChildren && !model.open" class="layer-icon-contents" :style="getSVGStyle()" d="M4.56,16.53a1,1,0,0,1-.64-.23,1,1,0,0,1-.13-1.41L8.11,9.72,3.83,5.15A1,1,0,0,1,5.29,3.78L9.72,8.51a1.77,1.77,0,0,1,.06,2.33L5.33,16.17A1,1,0,0,1,4.56,16.53Zm3.7-6.66h0Z"/>
              <path v-if="hasChildren && model.open" class="layer-icon-contents" :style="getSVGStyle()" d="M3.47,9.07a1,1,0,0,1,.23-.64A1,1,0,0,1,5.11,8.3l5.17,4.32,4.57-4.28A1,1,0,0,1,16.22,9.8l-4.73,4.43a1.77,1.77,0,0,1-2.33.06L3.83,9.84A1,1,0,0,1,3.47,9.07Zm6.66,3.7h0Z"/>
            </svg>
          </div>
        </div>
        <div class="layer-body" @click="onSelection">
          <layer-preview :model="model" />
          <layer-input v-show="editMode" :model="model" :index="index" />
          <layer-name v-show="!editMode" :model="model" :index="index" />
          <fake-focus v-show="!editMode" />
          <div class="layer-blank" :style="getLayerStyle()"></div>
        </div>
        <div class="layer-tail" :style="getTailStyle()">
          <layer-icon :type="(model.active) ? 'radio-on' : 'radio-off'" />
          <layer-selectbox :color="model.label" :status="getStatus()" />
          <layer-active-icon :truth="model.activeLayer" />
        </div>
      </div>
      <layer-drop v-if="hasChildren" :model="model" :parentindex="index" />
    </div>
  `,
  data() {
    return {
      depth: [],
      overflowing: false,
      editMode: false,
      elt: {},
      fakeElt: {},
    }
  },
  computed: {
    cipher: function() {
      if (/\w/.test(this.index)) {
        return true;
      } else {
        return false;
      }
    },
    hasChildren: function() {
      if (/group|layer/i.test(this.model.type))
        return (this.model.children.length) ? true : false;
      else 
        return false;
    },
    iconColor: function () { return `fill: ${this.$root.getCSS('color-icon')}` }
  },
  mounted() {
    this.buildDepth();
    this.elt = this.$el.children[0];
    this.fakeElt = this.elt.children[1].children[3];
    // console.log(this.fakeElt);
    // console.log(`Building setEditOnInput${this.model.pin}`)
    // console.log(this.elt);
    Event.$on('setEditOn', this.editModeOn);
    Event.$on('setEditOff', this.editModeOff);
    Event.$on('overflowingTrue', this.overflowingTrue);
    Event.$on('overflowingFalse', this.overflowingFalse);
    Event.$on('clearAllSelected', this.clearAllSelected);
    Event.$on('clearAllActiveLayers', this.clearAllActiveLayers);
    
    Event.$on('assignNewPINs', this.setDynamicEvents);
    Event.$on('clearPreviousPINs', this.eraseDynamicEvents);
  },
  methods: {
    setFocus() {
      this.$nextTick(() => this.fakeElt.focus({ preventScroll: false }));
      document.activeElement = this.fakeElt;
      // console.log(document.activeElement);
    },
    clearFocus() {
      this.$nextTick(() => this.elt.blur());
    },
    setDynamicEvents() {
      // console.log(`Assigning new layer event`);
      Event.$on(`setFocusOnRow${this.model.pin}`, this.setFocus);
      Event.$on(`clearFocusOnRow${this.model.pin}`, this.clearFocus);
      Event.$on(`setEditOnInput${this.model.pin}`, this.editModeOnSingle);
      Event.$on(`setEditOffInput${this.model.pin}`, this.editModeOffSingle);
    },
    eraseDynamicEvents() {
      // console.log(`Deleting layer events`);
      Event.$on(`setFocusOnRow${this.model.pin}`, this.setFocus);
      Event.$on(`clearFocusOnRow${this.model.pin}`, this.clearFocus);
      Event.$off(`setEditOnInput${this.model.pin}`, this.editModeOnSingle);
      Event.$off(`setEditOffInput${this.model.pin}`, this.editModeOffSingle);
    },
    clearAllActiveLayers() {
      if (/layer/i.test(this.model.type))
      this.model.activeLayer = false;
    },
    getStatus() {
      let err = 0;
      if (this.hasChildren) {
        for (let i = 0; i < this.model.children.length; i++) {
          const child = this.model.children[i];
          if (child.active)
            err++;
        }
        if ((err > 0) && (this.model.active))
          return 'major';
        else if (err == this.model.children.length + 1)
          return 'major';
        else if (err > 0)
          return 'minor';
        else
          return 'none';
      } else {
        if (this.model.active)
          return 'major';
        else
          return 'none';
      }
      
    },
    editModeOnSingle() {
      this.editMode = true;
      console.log(`Edit received for ${this.model.pin}, sending to focus`);
      Event.$emit(`setFocusInput${this.model.pin}`);
    },
    editModeOffSingle() {
      console.log('Edit requested off')
      this.editMode = false;
      Event.$emit(`resetLayerName${this.model.pin}`)
    },  
    editModeOn() { this.editMode = true; },
    editModeOff() { this.editMode = false; },
    clearAllSelected() { this.model.selected = false; },
    getSVGStyle() { return `width: ${this.$root.getCSS('icon-height')};${this.iconColor};`; },
    onSelection() {
      // console.log('Hello')
      // console.log(this.$root.Shift)
      const child = {
        pin: this.model.pin,
        depth: this.model.depth,
        index: this.model.index,
      }
      if (!this.$root.Shift) {
        Event.$emit('clearAllSelected')
        Event.$emit('clearAllActiveLayers')
        if (!this.model.selected) {
          if (/layer/i.test(this.model.type)) {
            this.model.activeLayer = true;
          } else {
            Event.$emit('findParentActiveLayer', JSON.stringify(child))
          }
          this.model.selected = true;
          this.$root.master.selection = [child]
        }
      } else {
        Event.$emit('addToSelection', JSON.stringify(child));
        if (/layer/i.test(this.model.type)) {
          Event.$emit('clearAllActiveLayers');
          this.model.activeLayer = true;
        }
        // Event.$emit('findParentActiveLayer', JSON.stringify(child))
      }
      Event.$emit('checkActiveLayer');
    },
    toggleOpenStatus() { this.model.open = !this.model.open; },
    getLayerStatusType() { return (/layer|group/i.test(this.model.type)) ? true : false; },
    overflowTrue() {
      this.overflowing = true;
      this.$root.setCSS('tail-offset', '3.75rem');
    },
    overflowFalse() {
      this.overflowing = false;
      this.$root.setCSS('tail-offset', '3.5rem');
    },
    buildDepth() {
      let mirror = [];
      this.depth = [];
      for (let i = 0; i < this.model.depth; i++)
        mirror.push({ key: i })
      this.depth = mirror;
    },
    getLayerStyle() {
      let style = ``;
      if (this.model.selected) {
        style += `background-color: ${this.$root.getCSS('color-selected-layer')};`
      } else {
        style += `background-color: ${this.$root.getCSS('color-bg')};`
      }
      return style;
    },
    getTailStyle() {
      let style = ``;
      if (this.model.selected) {
        style += `background-color: ${this.$root.getCSS('color-selected-layer')};`
      } else {
        style += `background-color: ${this.$root.getCSS('color-bg')};`
      }
      return style;
    }
  }

})

Vue.component('layer-tab', { template: `<div class="layer-tab"></div>` })
Vue.component('layer-preview', {
  props: {
    model: Object,
  },
  template: `
    <div class="layer-preview" :style="getStyle()"></div>
  `,
  methods: {
    getStyle() {
      let style = '';


      return style;
    }
  }
})

Vue.component('layer-name', {
  props: {
    model: Object,
    index: Number,
    // refer: String,
    // index: String,
  },
  template: `
    <div class="name-wrap">
      <span 
        v-on:dblclick="toggleEdit"
        v-if="!isEdit"
        class="layer-name">{{model.name}}</span>
    </div>
  `,
      // <layer-input v-else :model="model" :index="index" />
  data() {
    return {
      isEdit: false,
    }
  },
  mounted() {
    Event.$on('assignNewPINs', this.setDynamicEvents);
    Event.$on('clearPreviousPINs', this.eraseDynamicEvents);
  },
  methods: {
    setDynamicEvents() {
      // console.log('Creating new layer-name events')
      Event.$on(`resetLayerName${this.model.pin}`, this.editModeOff);
    },
    eraseDynamicEvents() {
      // console.log('Deleting layer-name events')
      Event.$off(`resetLayerName${this.model.pin}`, this.editModeOff);
    },
    editModeOff() {
      this.isEdit = false;
    },
    toggleEdit() {
      this.isEdit = !this.isEdit;
      if (this.isEdit) {
        console.log(`sending setEditOnInput${this.model.pin}`)
        // Event.$emit(`setFocusInput${this.model.pin}`)
        Event.$emit(`setEditOnInput${this.model.pin}`);
      } else {
        // Event.$emit(`clearFocusInput${this.model.pin}`)
        Event.$emit(`setEditOffInput${this.model.pin}`);
      }
    }
  }
})

Vue.component('layer-label', {
  props: {
    color: String,
    select: Boolean,
  },
  template: `
    <div :style="getLabelColor()" class="layer-label"></div>
  `,
  methods: {
    getLabelColor() {
      let style = `background-color:${this.color};`;
      if (this.select)
        style += 'width:6px;height:6px;border-color: black;'
      return style;
    }
  }
})

Vue.component('layer-selectbox', {
  props: {
    color: String,
    status: String,
  },
  template: `
    <div :style="getLabelColor()" class="layer-selectlabel"></div>
  `,
  methods: {
    getLabelColor() {
      let style = `background-color:${this.color};`;
      if (/major/.test(this.status))
        style += 'width:7px;height:6px;'
      else if (/minor/.test(this.status))
        style += 'width:5px;height:4px;'
      else
        style = `width: 0px;height:0px;border-width:0px;`
      return style;
    }
  }
})


// Vue.component('layer-arrow', {
//   template: `
//     <div class="layer-icon">
//       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
//         <path v-if="type == 'arrow-right'" :class="getSVGClass()" :style="getSVGStyle()" d="M4.56,16.53a1,1,0,0,1-.64-.23,1,1,0,0,1-.13-1.41L8.11,9.72,3.83,5.15A1,1,0,0,1,5.29,3.78L9.72,8.51a1.77,1.77,0,0,1,.06,2.33L5.33,16.17A1,1,0,0,1,4.56,16.53Zm3.7-6.66h0Z"/>
//         <path v-if="type == 'arrow-down'" :class="getSVGClass()" :style="getSVGStyle()" d="M3.47,9.07a1,1,0,0,1,.23-.64A1,1,0,0,1,5.11,8.3l5.17,4.32,4.57-4.28A1,1,0,0,1,16.22,9.8l-4.73,4.43a1.77,1.77,0,0,1-2.33.06L3.83,9.84A1,1,0,0,1,3.47,9.07Zm6.66,3.7h0Z"/>
//       </svg>
//     </div>
//   `,
// })

Vue.component('toolbar-icon', {
  props: {
    type: String,
  },
  template: `
    <div 
      class="toolbar-icon"
      :style="getWrapStyle()" 
      v-if="type !== 'none'">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path v-if="type == 'newlayer'" :class="getSVGClass()" :style="getSVGStyle()" d="M17.82,2.18V17.82H9.69v-7.5H2.18V2.18ZM8,12v5.29L2.73,12Z"/>
        <path v-if="type == 'find'" :class="getSVGClass()" :style="getSVGStyle()" d="M12.17.66A7.15,7.15,0,0,0,6.45,12.13L1,17.63A1,1,0,0,0,1,19a1,1,0,0,0,1.41,0l5.5-5.49A7.16,7.16,0,1,0,12.17.66Zm0,12.34a5.17,5.17,0,1,1,5.17-5.17A5.18,5.18,0,0,1,12.17,13Z"/>
        <path v-if="type == 'trash'" :class="getSVGClass()" :style="getSVGStyle()" d="M18.17,3.38H14A3.56,3.56,0,0,0,10.53.75H9.43A3.58,3.58,0,0,0,6,3.38H1.83a1,1,0,0,0,0,2h.84V17.54a1.71,1.71,0,0,0,1.71,1.71h11.2a1.71,1.71,0,0,0,1.71-1.71V5.38h.88a1,1,0,0,0,0-2ZM9.43,2.75h1.1a1.52,1.52,0,0,1,1.24.63H8.18A1.56,1.56,0,0,1,9.43,2.75Zm5.86,14.5H4.67V5.38H15.29ZM7.35,7v9.28a.5.5,0,0,1-.5.5.5.5,0,0,1-.5-.5V7a.51.51,0,0,1,.5-.5A.5.5,0,0,1,7.35,7Zm2.9,0v9.28a.5.5,0,0,1-1,0V7a.5.5,0,1,1,1,0Zm2.9,0v9.28a.5.5,0,0,1-.5.5.5.5,0,0,1-.5-.5V7a.5.5,0,0,1,.5-.5A.51.51,0,0,1,13.15,7Z"/>
        <path v-if="type == 'export'" :class="getSVGClass()" :style="getSVGStyle()" d="M19.2.8V8.57h-2V4.22L12.45,9,11,7.55,15.78,2.8H11.43V.8ZM13.72,17.2H2.8V6.28H8.72v-2H.8V19.2H15.72v-8h-2Z"/>
        <path v-if="type == 'mask'" :class="getSVGClass()" :style="getSVGStyle()" d="M17,17.85H7.25A.87.87,0,0,1,6.38,17V7.23a.88.88,0,0,1,.87-.88H17a.89.89,0,0,1,.88.88V17A.88.88,0,0,1,17,17.85Zm-9.62-1h9.5V7.35H7.38Z"/>
        <path v-if="type == 'mask'" :class="getSVGClass()" :style="getSVGStyle('mask')" d="M12.75,2.15H3A.87.87,0,0,0,2.13,3v9.75a.88.88,0,0,0,.87.88h9.75a.89.89,0,0,0,.88-.88V3A.88.88,0,0,0,12.75,2.15Zm-9.62,1h9.5V6.4H7.25a.87.87,0,0,0-.87.87v5.38H3.13Z"/>
      </svg>
    </div>
  `,
  data() {
    return {
      hover: false,
    }
  },
  computed: {
    iconColor: function () {
      return `fill: ${this.$root.getCSS('color-icon')}` 
    }
  },
  methods: {
    doAction() {
      // console.log(`Clicked on ${this.type}`)
    },
    getSVGStyle(name) {
      name = name|false;
      let style = `width: ${this.$root.getCSS('icon-height')};${this.iconColor};`;
      if (name) {
        style += `opacity: .5;`
      }
      return style;
    },
    getSVGClass() {
      return `toolbar-icon-contents`
    },
    getWrapStyle() {
      let style = ``

      return style;
    }
  }

})

Vue.component('layer-active-icon', {
  props: {
    truth: Boolean,
  },
  template: `
    <div class="active-layer-icon" v-show="truth">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <polyline :class="getSVGClass()" :style="getSVGStyle()" points="10 0 20 0 20 10"/>
      </svg>
    </div>
  `,
  computed: {
    iconColor: function () { return `fill: ${this.$root.getCSS('color-icon')}` }
  },
  methods: {
    doAction() {
      // console.log(`Clicked on ${this.type}`)
    },
    getSVGStyle() {
      let style = `${this.iconColor};`;
      return style;
    },
    getSVGClass() {
      return `layer-icon-contents`
    },
  }
})

Vue.component('layer-icon', {
  props: {
    type: String,
  },
  template: `
    <div 
      class="layer-icon"
      :style="getWrapStyle()" 
      v-if="type !== 'none'">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path v-if="type == 'visible'" :class="getSVGClass()" :style="getSVGStyle()" d="M16.75,8.18a8.82,8.82,0,0,0-13.5,0l-1,1.23a.93.93,0,0,0,0,1.18l1,1.23a8.82,8.82,0,0,0,13.5,0l1-1.23a.93.93,0,0,0,0-1.18ZM10,13.23A3.23,3.23,0,1,1,13.23,10,3.22,3.22,0,0,1,10,13.23Zm1.58-3.47a1.94,1.94,0,0,1,0,.24A1.6,1.6,0,1,1,10,8.4l.24,0A1.61,1.61,0,0,0,11.58,9.76Z"/>
        <path v-if="type == 'hidden'" :class="getSVGClass()" :style="getSVGStyle()"/>
        <path v-if="type == 'lock'" :class="getSVGClass()" :style="getSVGStyle()" d="M11.07,14v0a.25.25,0,0,0,.09-.09Zm4.85-5.53h-.65V7A5.27,5.27,0,0,0,4.73,7V8.47H4.08a.9.9,0,0,0-.91.9V17.7a.56.56,0,0,0,.57.56H16.27a.56.56,0,0,0,.56-.56V9.37A.9.9,0,0,0,15.92,8.47Zm-4.76,5.46a.25.25,0,0,1-.09.09v2.19H8.93V14s0,0,0-.06a1.76,1.76,0,0,1-.72-1.43,1.84,1.84,0,1,1,3.68,0A1.78,1.78,0,0,1,11.16,13.93Zm2-5.46H6.87V7a3.13,3.13,0,0,1,6.26,0Zm-2,5.46a.25.25,0,0,1-.09.09v0Z"/>
        <path v-if="type == 'arrow-right'" :class="getSVGClass()" :style="getSVGStyle()" d="M4.56,16.53a1,1,0,0,1-.64-.23,1,1,0,0,1-.13-1.41L8.11,9.72,3.83,5.15A1,1,0,0,1,5.29,3.78L9.72,8.51a1.77,1.77,0,0,1,.06,2.33L5.33,16.17A1,1,0,0,1,4.56,16.53Zm3.7-6.66h0Z"/>
        <path v-if="type == 'arrow-down'" :class="getSVGClass()" :style="getSVGStyle()" d="M3.47,9.07a1,1,0,0,1,.23-.64A1,1,0,0,1,5.11,8.3l5.17,4.32,4.57-4.28A1,1,0,0,1,16.22,9.8l-4.73,4.43a1.77,1.77,0,0,1-2.33.06L3.83,9.84A1,1,0,0,1,3.47,9.07Zm6.66,3.7h0Z"/>
        <path v-if="type == 'radio-on'" :class="getSVGClass()" :style="getSVGStyle()" d="M10,1.38A8.63,8.63,0,1,0,18.63,10,8.62,8.62,0,0,0,10,1.38Zm0,16A7.38,7.38,0,1,1,17.38,10,7.38,7.38,0,0,1,10,17.38ZM10,4.25A5.75,5.75,0,1,0,15.75,10,5.76,5.76,0,0,0,10,4.25Zm0,10A4.25,4.25,0,1,1,14.25,10,4.26,4.26,0,0,1,10,14.25Z"/>
        <path v-if="type == 'radio-off'" :class="getSVGClass()" :style="getSVGStyle()" d="M10,15.75A5.75,5.75,0,1,1,15.75,10,5.76,5.76,0,0,1,10,15.75Zm0-10A4.25,4.25,0,1,0,14.25,10,4.26,4.26,0,0,0,10,5.75Z"/>
        <polyline v-if="type == 'activeLayer'" :class="getSVGClass()" :style="getSVGStyle()" points="10 0 20 0 20 10"/>
      </svg>
    </div>
  `,
  data() {
    return {
      hover: false,
    }
  },
  computed: {
    // iconColor: function () { return (this.$root.isWake) ? `fill: ${this.$root.getCSS('color-icon')}` : `fill: ${this.$root.getCSS('color-text-disabled')}`; }
    iconColor: function () { return `fill: ${this.$root.getCSS('color-icon')}` }
  },
  methods: {
    doAction() {
      // console.log(`Clicked on ${this.type}`)
    },
    getSVGStyle() {
      let style = `width: ${this.$root.getCSS('icon-height')};${this.iconColor};`;
      return style;
    },
    getSVGClass() {
      return `layer-icon-contents`
    },
    getWrapStyle() {
      let style = ``
      if (/visible|hidden/.test(this.type))
        style += `border-width: 0px 1.35px 0px 0px;`
      else if (/arrow/.test(this.type))
        style += `border-width: 0px;margin:0px .25rem;`
      else
        style += `border-width: 0px;`
      if (!/arrow/.test(this.type))
        style += `cursor:pointer;`
      return style;
    }
  }
})

Vue.component('layer-input', {
  props: {
    model: Object,
    index: Number,
    // refer: String,
  },
  template: `
    <div class="wrap-input">
      <input 
        :ref="model.pin"
        :class="getClass()"
        :style="checkStyle()"
        @keyup.enter="submitTest()"
        @keyup="submitName()"
        v-model="msg" 
        :placeholder="model.name"/>
    </div>
  `,
  data() {
    return {
      msg: '',
      elt: {},
      // globalEditMode: false,
    }
  },
  computed: {
    globalEditMode: function () {
      return this.$root.globalEditMode;
    },
    isWake: function () {
      return this.model.isActive;
    },
  },
  mounted() {
    this.msg = this.model.placeholder;
    this.elt = this.$el.children[0];
    this.elt.addEventListener('blur', this.eraseEdit);
    this.elt.addEventListener('focus', this.isFocused);
    // console.log(this.$refs);
    // Event.$on('globalEditOn', this.setGlobalOn);
    // Event.$on('globalEditOff', this.setGlobalOff);
    Event.$on('assignNewPINs', this.setDynamicEvents);
    Event.$on('clearPreviousPINs', this.eraseDynamicEvents);
  },
  methods: {
    setDynamicEvents() {
      // console.log('Creating new input events')
      Event.$on(`setFocusInput${this.model.pin}`, this.setFocus);
      Event.$on(`clearFocusInput${this.model.pin}`, this.clearFocus)
    },
    eraseDynamicEvents() {
      // console.log('Deleting input events')
      Event.$off(`setFocusInput${this.model.pin}`, this.setFocus);
      Event.$off(`clearFocusInput${this.model.pin}`, this.clearFocus)
    },
    submitName() {
      // console.log(`${this.model.pin} : ${this.msg}`);
      const self = this;
      if (this.msg.length) {
        let message = {
          name: self.msg,
          pin: self.model.pin
        }
        Event.$emit('renameInput', JSON.stringify(message));
      }
    },
    // setGlobalOff() { this.$root.globalEditMode = false; },
    // setGlobalOn() { this.$root.globalEditMode = true; },
    isFocused() {
      console.log(this.model.pin);
      Event.$emit('recheckSelection');
      Event.$emit(`selectionChange`, JSON.stringify(this.model));
    },
    eraseEdit() {
      if (this.msg.length) {
        // console.log('clearing input')
        this.msg = ''
      } else {
        this.model.name = this.model.placeholder;
      }
      if (!this.globalEditMode) {
        console.log(`Sending request off for ${this.model.pin}`)
        Event.$emit(`setEditOffInput${this.model.pin}`);
      }
    },
    setFocus() {
      // console.log('Setting focus to:');

      // this.$root.master.selection
      const child = {
        pin: this.model.pin,
        depth: this.model.depth,
        index: this.model.index,
      }
      this.$root.master.selection = [child];
      Event.$emit('recheckSelection');
      Event.$emit(`selectionChange`, JSON.stringify(this.model));
      this.$nextTick(() => this.elt.focus());
    },
    clearFocus() {
      this.$nextTick(() => this.elt.blur());
    },
    checkStyle() {
      let style = '';
      if (this.model.selected) {
        style += `background-color: ${this.$root.getCSS('color-selected-layer')};`
      } else {
        style += `background-color: transparent;`
      }
      return style;
    },
    getClass() {
      return this.isWake ? 'input-active' : 'input-idle'
    },
    submitTest() {
      if (this.msg.length) {
        Event.$emit(`resetLayerName${this.model.pin}`);
        this.clearFocus();
      }
    }
  }
})


Vue.component('toolbar', {
  template: `
    <div class="appToolbar">
      <div class="identity">{{name}}</div>
      <div class="rightHand">
        <app-button v-for="(button,key) in buttonList" :key="key" :label="button.name"/>
      </div>
    </div>
  `,
  data() {
    return {
      buttonList: [
        {
          name: 'new'
        },
        {
          name: 'test'
        },
      ]
    }
  },
  computed: {
    name: function () { return this.$root.name },
  }
})

Vue.component('app-button', {
  props: {
    label: String,
  },
  template: `
    <div @click="checkAction" 
      :style="getStyle()" 
      class="appButton"
      @mouseenter="hasHover"
      @mouseleave="noHover">{{displayText}}</div>
  `,
  data() {
    return {
      isHover: false,
      isActive: false,
    }
  },
  computed: {
    displayText: function () {
      return this.label.charAt(0);
    },
  },
  mounted() {
    // console.log(`Toolbar mounted`)
  },
  methods: {

    getData(msg) {
      msg = JSON.parse(msg);
      let mirror = [];
      for (let i = 0; i < msg.colors.length; i++) {
        const arr = msg.colors[i];
        mirror = [].concat(mirror, arr);
      }
      mirror = this.$root.removeDuplicatesInArray(mirror);
      this.createNodeList(mirror);
    },
    createNodeList(mirror) {
      // this.$root.nodeList = [], this.$root.nodeNames = [], this.$root.nodeColors = [];
      // for (let i = 0; i < mirror.length; i++) {
      //   const child = {
      //     color: mirror[i],
      //     name: '',
      //     key: i,
      //   };
      //   this.$root.nodeList.push(child);
      //   this.$root.nodeNames.push(`Color ${i + 1}`);
      //   this.$root.nodeColors.push(mirror[i]);
      // }
    },
    hasHover() {
      this.isHover = true;
      this.$root.intuition = this.label;
      Event.$emit('overrideIntuition', this.label);
    },
    noHover() {
      this.isHover = false;
      this.$root.intuition = '';
      Event.$emit('resetIntuition');
    },
    getStyle() {
      let style = '';
      if (this.isActive) {
        return style += `border-color: ${this.$root.getCSS('color-selection')};color: ${this.$root.getCSS('color-selection')}`;
      } else if (this.isHover) {
        return style += `border-color: ${this.$root.getCSS('color-icon')};color: ${this.$root.getCSS('color-text-default')}`;
      } else {
        return style += `border-color: ${this.$root.getCSS('color-button-disabled')};color: ${this.$root.getCSS('color-button-disabled')}`;
      }
      // return style;
    },
    checkAction() {
      console.log(`${this.label} was pressed.`)
    }
  }
})



Vue.component('event-manager', {
  template: `
    <div 
      v-keydown-outside="onKeyDownOutside"
      v-keyup-outside="onKeyUpOutside"
      v-mousemove-outside="onMouseMove"
      v-mouseup-outside="onMouseUp"
      v-mousedown-outside="onMouseDown"
      v-click-outside="onClickOutside">
    </div>
  `,
  data() {
    return {
      activeList: [
        { name: 'Ctrl' },
        { name: 'Shift' },
        { name: 'Alt' },
      ],
      Shift: false,
      Ctrl: false,
      Alt: false,
      wasDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      overflowing: false,
    }
  },
  mounted() {
    var self = this;
    this.activeMods();
    this.handleResize(null);
    window.addEventListener('resize', this.handleResize);
    csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, self.appThemeChanged);
    csInterface.addEventListener('documentAfterActivate', this.reset);
    this.appThemeChanged();
    Event.$on('newAction', this.checkDebugAction);
    Event.$on('keypress', this.checkDebugKeypress);
  },
  computed: {
    isDefault: function () { return this.$root.isDefault },
    mouseX: function () { return this.$root.mouseX; },
    mouseY: function () { return this.$root.mouseY; },
    hasCtrl: function () { return this.$root.Ctrl ? 'Ctrl' : false; },
    hasShift: function () { return this.$root.Shift ? 'Shift' : false; },
    hasAlt: function () { return this.$root.Alt ? 'Alt' : false; },
  },
  methods: {
    reset() { location.reload(); },
    checkDebugAction(msg) {
      if (this.$root.debugMode) {
        console.log(`Debug action is ${msg}`)
        this.$root.lastAction = msg;
        this.$root.dispatchEvent('debug.listen', JSON.stringify(this.$root.clone));
      }
    },
    checkDebugKeypress(e) {
      if (this.$root.debugMode) {
        console.log(`Debug keypress is ${e.key}`)
        this.getLastKey(e.key);
        this.$root.dispatchEvent('debug.listen', JSON.stringify(this.$root.clone));
      }
    },
    setPanelCSSHeight() {
      this.$root.setCSS('evt-height', `${this.$root.panelHeight - 50}px`);
      this.$root.setCSS('panel-height', `${this.$root.panelHeight - 20}px`);
    },
    appThemeChanged(event) {
      var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
      console.log('Detected theme change')
      Event.$emit('findTheme', skinInfo);
    },
    handleResize(evt) {
      if (this.$root.activeApp == 'AEFT') {
        this.$root.panelWidth = document.documentElement.clientWidth;
        this.$root.panelHeight = document.documentElement.clientHeight;
      } else {
        this.$root.panelWidth = document.documentElement.clientWidth;
        this.$root.panelHeight = document.documentElement.clientHeight;
        this.setPanelCSSHeight();
        if (this.$root.debugMode) {
          this.$root.dispatchEvent('debug.listen', JSON.stringify(this.$root.clone));
        }
      }
      // console.log(`${this.$root.screen.clientHeight} : ${this.$root.screen.scrollY}`)
      let parent = this.$root.screen;
      let child = this.$root.screenInner;
      // let child = parent.children[0];
      // console.log(parent.children);
      // console.log(`${parent.clientHeight} : ${child.clientHeight}`)

      if ((parent.clientHeight < child.clientHeight) && (!this.overflowing)) {
        this.overflowing = true;
        // console.log('Overflowing')
        Event.$emit('overflowTrue');
      } else if ((parent.clientHeight > child.clientHeight) && (this.overflowing)) {
        this.overflowing = false;
        // console.log('Not overflowing')
        Event.$emit('overflowFalse');
      }
    },
    activeMods() {
      var mirror = [], child = {};
      if (this.Ctrl)
        child = { name: 'Ctrl', key: 0 }, mirror.push(child);
      if (this.Shift) {
        child = { name: 'Shift', key: 1 }
        mirror.push(child);
      }
      if (this.Alt) {
        child = { name: 'Alt', key: 2 }
        mirror.push(child);
      }
      this.activeList = mirror;
    },
    clearMods() {
      this.Shift = false, this.Alt = false, this.Ctrl = false;
      this.activeList = [];
    },
    updateMods() {
      this.Ctrl = this.$root.Ctrl, this.Shift = this.$root.Shift, this.Alt = this.$root.Alt;
      this.activeMods();
    },
    onMouseDown(e, el) {
      this.$root.isDragging = true, this.wasDragging = false;
      this.lastMouseX = this.$root.mouseX, this.lastMouseY = this.$root.mouseY;
      Event.$emit('newAction', 'Mouse click');
    },
    onMouseUp(e, el) {
      if (this.$root.isDragging) {
        if (((this.lastMouseX <= this.$root.mouseX + 6) && (this.lastMouseX >= this.$root.mouseX - 6)) && ((this.lastMouseY <= this.$root.mouseY + 6) && (this.lastMouseY >= this.$root.mouseY - 6))) {
          this.wasDragging = false;
        } else {
          Event.$emit('newAction', 'Click/Drag');
          this.wasDragging = true;
        }
        this.$root.isDragging = false;
      } else {
        // Event.$emit('newAction', 'Drag release');
      }
    },
    onMouseMove(e, el) {
      this.$root.mouseX = e.clientX, this.$root.mouseY = e.clientY;
      if (this.$root.isDragging) {
        Event.$emit('newAction', 'Click-drag')
      } else {
        if (((this.lastMouseX <= this.$root.mouseX + 6) && (this.lastMouseX >= this.$root.mouseX - 6)) && ((this.lastMouseY <= this.$root.mouseY + 6) && (this.lastMouseY >= this.$root.mouseY - 6))) {
          //
        } else {
          Event.$emit('newAction', 'Mouse move');
        }
      }
      this.$root.parseModifiers(e);
      // console.log(`${this.$root.mouseX}, ${this.$root.mouseY}`)
    },
    onClickOutside(e, el) {
      if (!this.wasDragging) {
        Event.$emit('newAction', 'Mouse click');
      }
    },
    onKeyDownOutside(e, el) {
      this.$root.parseModifiers(e);
      this.checkDebugKeypress(e);
      if ((/arrow/i.test(e.key)) && (!this.$root.globalEditMode)) {
        if (!this.$root.Alt) {
          e.preventDefault();
          Event.$emit('navigateSelection', e.key.substring(5, e.key.length))
        }
      };
      Event.$emit('newAction', 'keyDown');
    },
    onKeyUpOutside(e, el) {
      if (/enter/i.test(e.key)) {
        if (this.$root.Alt) {
          console.log('Alt enter was pressed');
          if (this.$root.globalEditMode) {
            console.log('Turn edit off')
            Event.$emit('setEditOff');
            Event.$emit('globalEditOff');
          } else {
            console.log('Turn edit on')
            Event.$emit('setEditOn');
            Event.$emit('globalEditOn');
          }
          // this.$root.globalEditMode = !this.$root.globalEditMode;
        }
      }
      this.$root.parseModifiers(e);
      this.checkDebugKeypress(e);
      Event.$emit('newAction', 'keyUp');
    },
    getLastKey(msg) {
      if (/Control/.test(msg)) {
        msg = 'Ctrl'
      }
      if (msg !== this.lastKey) {
        if (((this.$root.isDefault) && (msg !== 'Unidentified')) || ((msg == 'Ctrl') || (msg == 'Shift') || (msg == 'Alt'))) {
          if ((msg == 'Ctrl') || (msg == 'Shift') || (msg == 'Alt')) {
            var stack = []
            if (this.hasCtrl)
              stack.push(this.hasCtrl)
            if (this.hasShift)
              stack.push(this.hasShift)
            if (this.hasAlt)
              stack.push(this.hasAlt)
            if (stack.length) {
              this.lastKey = stack.join('+')
            } else {
              this.lastKey = msg;
            }
          } else {
            this.lastKey = msg;
          }
        } else if (msg == 'Unidentified') {
          this.lastKey = 'Meta'
        } else {
          var stack = []
          if (this.hasCtrl)
            stack.push(this.hasCtrl)
          if (this.hasShift)
            stack.push(this.hasShift)
          if (this.hasAlt)
            stack.push(this.hasAlt)
          stack.push(msg);
          this.lastKey = stack.join('+')
        }
        this.$root.lastKey = this.lastKey;
      }
    },
  },
})


Vue.component('stylizer', {
  template: `
    <div class="stylizer"></div>
  `,
  data() {
    return {
      cssOrder: ['bg', 'icon', 'border', 'toolbar-btn-hover', 'toolbar-btn-border-hover', 'button-hover', 'button-active', 'button-disabled', 'text-active', 'text-default', 'text-disabled', 'input-focus', 'input-idle', 'scrollbar', 'scrollbar-thumb', 'scrollbar-thumb-hover', 'scrollbar-thumb-width', 'scrollbar-thumb-radius'],
      activeStyle: [],
      styleList: {
        ILST: {
          lightest: ['#f0f0f0', '#535353', '#dcdcdc', '#f9f9f9', '#bdbdbd', '#e6e6e6', '#484848', '#484848', '#c6c6c6', '#ffffff', '#ffffff', '#fbfbfb', '#dcdcdc', '#a6a6a6', '20px', '20px'],
          light: ['#b8b8b8', '#404040', '#5f5f5f', '#dcdcdc', '#969696', '#b0b0b0', '#101010', '#101010', '#989898', '#e3e3e3', '#e3e3e3', '#c4c4c4', '#a8a8a8', '#7b7b7b', '20px', '10px'],
          dark: ['#535353', '#c2c2c2', '#5f5f5f', '#4a4a4a', '#404040', '#5a5a5a', '#d8d8d8', '#d5d5d5', '#737373', '#ffffff', '#474747', '#4b4b4b', '#606060', '#747474', '20px', '10px'],
          darkest: ['#323232', '#b4b4b4', '#3e3e3e', '#3e3e3e', '#525252', '#292929', '#1f1f1f', '#393939', '#1b1b1b', '#a1a1a1', '#525252', '#fcfcfc', '#262626', '#2a2a2a', '#383838', '#525252', '20px', '10px',],
        },
      }
    }
  },
  mounted() {
    csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, self.appThemeChanged);
    this.appThemeChanged();
    Event.$on('findTheme', this.findTheme);
  },
  methods: {
    appThemeChanged(event) {
      var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
      this.findTheme(skinInfo);
    },
    setGradientTheme(appSkin) {
      // console.log('After Effects needs stylizer work.');
      this.$root.setCSS('color-bg', toHex(appSkin.panelBackgroundColor.color));
      this.$root.setCSS('color-icon', toHex(appSkin.panelBackgroundColor.color, 30));
      this.$root.setCSS('color-button-disabled', toHex(appSkin.panelBackgroundColor.color, 20));
      this.$root.setCSS('color-scrollbar', toHex(appSkin.panelBackgroundColor.color, -20));
      this.$root.setCSS('color-scrollbar-thumb', toHex(appSkin.panelBackgroundColor.color, 5));
      this.$root.setCSS('color-scrollbar-thumb-hover', toHex(appSkin.panelBackgroundColor.color, 10));
    },
    // detectTheme() {
    // let app = this.$root.activeApp, theme = this.$root.activeTheme;
    // },
    assignTheme() {
      let app = this.$root.activeApp, theme = this.$root.activeTheme;
      console.log(`${app} : ${theme}`)
      for (var i = 0; i < this.cssOrder.length; i++) {
        let prop = this.cssOrder[i], value = this.styleList[app][theme][i];
        if (!/width|radius/.test(prop)) {
          this.$root.setCSS(`color-${prop}`, value);
        } else {
          this.$root.setCSS(prop, value);
        }
      }
      // console.log()
    },
    getCSSName(str) {
      if (/\_/gm.test(str))
        str = str.replace(/\_/gm, '-');
      return str;
    },
    findTheme(appSkin) {
      console.log(appSkin);
      if (this.$root.activeApp !== 'AEFT') {
        if (appSkin.panelBackgroundColor.color.red > 230)
          this.$root.activeTheme = 'lightest';
        else if (appSkin.panelBackgroundColor.color.red > 170)
          this.$root.activeTheme = 'light';
        else if (appSkin.panelBackgroundColor.color.red > 80)
          this.$root.activeTheme = 'dark';
        else
          this.$root.activeTheme = 'darkest';
        this.assignTheme();
        this.$root.updateStorage();
      } else {
        this.setGradientTheme(appSkin);
      }
      console.log(`${this.$root.activeTheme}`)
    },
  }
})

var app = new Vue({
  el: '#app',
  data: {
    macOS: false,
    buildNumber: 0,
    localhost: '',
    screen: {},
    screenInner: {},
    debugMode: false,
    name: 'none',
    panelWidth: null,
    panelHeight: null,
    mouseX: null,
    mouseY: null,
    lastKey: null,
    lastAction: 'No action',
    isDragging: false,
    winW: null,
    winH: null,
    homepage: 'https://www.inventsable.cc#protolayers',
    activeApp: csInterface.hostEnvironment.appName,
    activeTheme: 'darkest',
    showConsole: true,
    isWake: true,
    Shift: false,
    Ctrl: false,
    Alt: false,
    globalEditMode: false,
    aParent: '',
    bParent: '',
    abParent: '',
    sParent: '',
    inputPosition: [],
    inputTarget: '',
    temp: {},
    master: {
      selection: []
    },
    context: {
      menu: [
        { id: "refresh", label: "Refresh panel", enabled: true, checkable: false, checked: false, },
        { id: "test", label: "Run test", enabled: true, checkable: false, checked: false, },
        { label: "---" },
        { id: "localhost", label: "Launch DevTools", enabled: true, checkable: false, checked: false, },
        { id: "about", label: "Go to Homepage", enabled: true, checkable: false, checked: false, },
      ],
    },
  },
  computed: {
    menuString: function () { return JSON.stringify(this.context); },
    isDefault: function () {
      var result = true;
      if ((this.Shift) | (this.Ctrl) | (this.Alt))
        result = false;
      return result;
    },
    rootName: function () { return this.rootPath.substring(this.rootPath.lastIndexOf('/') + 1, this.rootPath.length); },
    rootPath: function () { return csInterface.getSystemPath(SystemPath.EXTENSION); },
    clone: function () {
      let self = this;
      let child = {
        name: self.rootName,
        mouseX: self.mouseX,
        mouseY: self.mouseY,
        panelHeight: document.documentElement.clientHeight,
        panelWidth: document.documentElement.clientWidth,
        lastKey: self.lastKey,
        lastAction: self.lastAction,
      }
      return JSON.stringify(child);
    },
    isSmall: function () { return (this.panelWidth < 120) ? true : false; },
    isMedium: function () { return ((this.panelWidth > 120) && (this.panelWidth < 200)) ? true : false; },
    isLarge: function () { return (this.panelWidth > 200) ? true : false; },
  },
  mounted() {
    var self = this;
    this.name = this.rootName;
    if (navigator.platform.indexOf('Win') > -1) { this.macOS = false; } else if (navigator.platform.indexOf('Mac') > -1) { this.macOS = true; }
    this.readStorage();
    this.setContextMenu();
    Event.$on('debugModeOn', this.startDebug);
    Event.$on('debugModeOff', this.stopDebug);
    Event.$on('updateStorage', self.updateStorage);
    Event.$on('globalEditOn', this.globalEditOn);
    Event.$on('globalEditOff', this.globalEditOff);

    csInterface.evalScript(`assignExtensionPath('${this.rootPath}')`)

    this.getVersion();
    // this.tryFetch();
    // if (this.notificationsEnabled)
    //   Event.$emit('showNotification');
    // else
    //   Event.$emit('hideNotification');
    // document.addEventListener('keydown', this.checkKey);
    // console.log(document.body);
  },
  methods: {
    globalEditOn() {
      if (!this.globalEditMode) {
        console.log('Bouncer')
        this.globalEditMode = true; 
        Event.$emit('globalEditBounce');
      }
    },
    globalEditOff() { this.globalEditMode = false; },
    // checkKey(evt) {
    //   if (/arrow/i.test(evt.key)) {
    //     evt.preventDefault();
    //     console.log(`${evt.key} was pressed and trying to prevent`)
    //   }
    // },
    getVersion() {
      const path = csInterface.getSystemPath(SystemPath.EXTENSION);
      const xml = window.cep.fs.readFile(`${path}/CSXS/manifest.xml`);
      const verID = /(\w|\<|\s|\=|\"|\.)*ExtensionBundleVersion\=\"(\d|\.)*(?=\")/;
      let match = xml.data.match(verID);
      if (match.length) {
        const str = match[0].split(' ');
        this.buildNumber = str[(str.length - 1)].replace(/\w*\=\"/, '');
      } else {
        this.buildNumber = 'unknown';
      }
      this.getDebug();
    },
    getDebug() {
      const debug = window.cep.fs.readFile(`${csInterface.getSystemPath(SystemPath.EXTENSION)}/.debug`);
      const port = new RegExp(`\\<Host\\sName\\=\\"${csInterface.hostEnvironment.appName}\\"\\sPort\\=\\"(\\d*)`);
      let hit = debug.data.match(port);
      this.localhost = `http://localhost:${hit[1]}`;
      Event.$emit('portNumber', hit[1]);
    },
    // tryFetch() {
    //   fetch('http://inventsable.cc/master.json')
    //     .then(function (response) {
    //       return response.json();
    //     })
    //     .then(function (myJson) {
    //       console.log(myJson);
    //       Event.$emit('checkHTMLData', myJson);
    //     });
    //   Event.$emit('console.full', this.buildNumber);
    // },
    // checkHTMLData(result) {
    //   for (let [key, value] of Object.entries(result.master)) {
    //     if (key == this.rootName) {
    //       if (value.version !== this.buildNumber) {
    //         Event.$emit('promptUpdate', JSON.stringify(value));
    //         Event.$emit('console.full', JSON.stringify(value))
    //         this.needsUpdate = true;
    //       } else {
    //         this.needsUpdate = false;
    //       }
    //     }
    //   }
    // },
    startDebug() {
      this.debugMode = true;
      console.log('Received')
      if (this.isWake) {
        console.log('sending clone');
        this.dispatchEvent('debug.listen', JSON.stringify(this.clone));
      }
    },
    stopDebug() { 
      this.debugMode = false; 
      console.log('Stopping debug')
    },
    dispatchEvent(name, data) {
      var event = new CSEvent(name, 'APPLICATION');
      event.data = data;
      csInterface.dispatchEvent(event);
    },
    readStorage() {
      var storage = window.localStorage;
      if (!storage.length) {
        console.log('There was no pre-existing session data');
        this.updateStorage();
      } else {
        console.log('Detected previous session data');
        this.context.menu = JSON.parse(storage.getItem('contextmenu'));
        this.rememberContextMenu(storage);
      }
      Event.$emit('rebuildEvents');
    },
    updateStorage() {
      var storage = window.localStorage, self = this;
      storage.setItem('contextmenu', JSON.stringify(self.context.menu));
      // storage.setItem('notificationsEnabled', JSON.stringify(self.notificationsEnabled));
      // this.setContextMenuMemory(storage);
      console.log(storage);
    },
    setContextMenuMemory(storage) {
      for (var i = 0; i < this.context.menu.length; i++) {
        var target = this.context.menu[i], name = target.id;
        if (target.checkable) {
          // console.log(name);
          // console.log(this[name])
          storage.setItem(name, this[name]);
        }
      }
    },
    rememberContextMenu(storage) {
      for (var i = 0; i < this.context.menu.length; i++) {
        var target = this.context.menu[i], name = target.id;
        if (target.checkable) {
          console.log(name)
          this[name] = JSON.parse(storage.getItem(name));
          this.context.menu[i].checked = this[name];
        }
      }
    },
    setContextMenu() {
      var self = this;
      csInterface.setContextMenuByJSON(self.menuString, self.contextMenuClicked);
    },
    contextMenuClicked(id) {
      var target = this.findMenuItemById(id), parent = this.findMenuItemById(id, true);
      if (id == "refresh") {
        location.reload();
      } else if (id == 'about') {
        cep.util.openURLInDefaultBrowser(this.homepage);
      } else if (id == 'localhost') {
        // alert(`localhost:${this.localhost}`)
        cep.util.openURLInDefaultBrowser(this.localhost);
      } else if (id == 'test') {
        loadJSX(csInterface.hostEnvironment.appName + '/host.jsx');
      } else {
        this[id] = !this[id];
        var target = this.findMenuItemById(id);
        target.checked = this[id];
      }
      this.updateStorage();
    },
    findMenuItemById(id, getParent = false) {
      var child, parent;
      for (var i = 0; i < this.context.menu.length; i++) {
        for (let [key, value] of Object.entries(this.context.menu[i])) {
          if (key == "menu") {
            parent = this.context.menu[i];
            for (var v = 0; v < value.length; v++) {
              for (let [index, data] of Object.entries(value[v])) {
                if ((index == "id") && (data == id))
                  child = value[v];
              }
            }
          }
          if ((key == "id") && (value == id)) {
            child = this.context.menu[i], parent = 'root';
          }
        }
      }
      return (getParent) ? parent : child;
    },
    toggleMenuItemSiblings(parent, exclude, state) {
      if (parent.length) {
        for (var i = 0; i < parent.length; i++) {
          if (parent[i].id !== exclude)
            csInterface.updateContextMenuItem(parent[i].id, true, state);
        }
      }
    },
    parseModifiers(evt) {
      // console.log('Hello')
      var lastMods = [this.Ctrl, this.Shift, this.Alt]
      if (this.isWake) {
        if (((!this.macOS) && (evt.ctrlKey)) || ((this.macOS) && (evt.metaKey))) {
          this.Ctrl = true;
        } else {
          this.Ctrl = false;
        }
        if (evt.shiftKey)
          this.Shift = true;
        else
          this.Shift = false;
        if (evt.altKey) {
          evt.preventDefault();
          this.Alt = true;
        } else {
          this.Alt = false;
        };
        var thisMods = [this.Ctrl, this.Shift, this.Alt]
        // console.log(this.Shift)
        // if (!this.isEqualArray(lastMods, thisMods)) {
          // console.log(`${thisMods} : ${lastMods}`)
        // }
        // Event.$emit('updateModsUI');
      } else {
        // Event.$emit('clearMods');
      }
    },
    flushModifiers() {
      this.Ctrl = false;
      this.Shift = false;
      this.Alt = false;
      Event.$emit('clearMods');
    },
    wake() {
      this.isWake = true;
    },
    sleep() {
      this.isWake = false;
      this.flushModifiers();
    },
    getCSS(prop) {
      return window.getComputedStyle(document.documentElement).getPropertyValue('--' + prop);
    },
    setCSS(prop, data) {
      document.documentElement.style.setProperty('--' + prop, data);
    },
    isEqualArray(array1, array2) {
      array1 = array1.join().split(','), array2 = array2.join().split(',');
      var errors = 0, result;
      for (var i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i])
          errors++;
      }
      if (errors > 0)
        result = false;
      else
        result = true;
      return result;
    },
    removeEmptyValues(keyList, mirror = []) {
      for (var i = 0; i < keyList.length; i++) {
        var targ = keyList[i];
        if ((/\s/.test(targ)) || (targ.length < 6)) {
          // no action
        } else {
          mirror.push(targ);
        }
      }
      return mirror;
    },
    removeDuplicatesInArray(keyList) {
      try {
        var uniq = keyList
          .map((name) => {
            return { count: 1, name: name }
          })
          .reduce((a, b) => {
            a[b.name] = (a[b.name] || 0) + b.count
            return a
          }, {})
        var sorted = Object.keys(uniq).sort((a, b) => uniq[a] < uniq[b])
      } catch (err) {
        sorted = keyList
      } finally {
        return sorted;
      }
    },
  }
});
