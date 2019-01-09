var csInterface = new CSInterface();
loadUniversalJSXLibraries();
loadJSX(csInterface.hostEnvironment.appName + '/host.jsx');
window.Event = new Vue();

const EventList = [
  { listenTo: 'debug.on', sendTo: 'debugModeOn', package: false, },
  { listenTo: 'debug.off', sendTo: 'debugModeOff', package: false, },
  { listenTo: 'console', sendTo: 'internalConsole', package: false, },
];

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
      @mouseover="wakeApp" 
      @mouseout="sleepApp"
      :style="styleDebug()">
      <event-manager />
      <stylizer />
      <top v-if="showTop">
        <toolbar />
      </top>
      <bottom>
        <foot :model="info" />
      </bottom>
      <panel>
        <center>
          <layers-list />
        </center>
      </panel>
    </extension>
  `,
  data() {
    return {
      wakeOnly: false,
      showTop: true,
      info: {
        buildNumber: 0,
        localhost: 0,
      }
    }
  },
  computed: {
    debugMode: function () { return this.$root.debugMode },
    isWake: function () { return this.$root.isWake },
  },
  methods: {
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
      // this.checkDebug();
    },
    setBuild(msg) {
      this.info.buildNumber = msg;
    },
    setPort(msg) {
      this.info.localhost = msg;
    },
    getLayerList(msg) {
      // console.log(`msg is ${msg}`)
      msg = JSON.parse(msg);
      console.log(`layerlist is:`)
      console.log(msg);
    },
    getData(msg) {
      // msg = JSON.parse(msg);
      console.log(`msg is ${msg}`)
      
      // let mirror = [];
      // for (let i = 0; i < msg.colors.length; i++) {
      //   const arr = msg.colors[i];
      //   mirror = [].concat(mirror, arr);
      // }
      // mirror = this.$root.removeDuplicatesInArray(mirror);
      // // this.createNodeList(mirror);
      // console.log(`Data result is:`)
      // console.log(mirror);
    },
  },
  mounted() {
    this.$root.screen = this.$el.children[4];
    this.$root.screenInner = this.$el.children[4].children[0];
    csInterface.evalScript(`getLayerCount()`, this.getData);
    csInterface.evalScript(`getTotalLayerList()`, this.getLayerList);
    Event.$on(`buildNumber`, this.setBuild);
    Event.$on(`portNumber`, this.setPort);
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
      <div>{{model.buildNumber}}</div>
      <div>{{'localhost:' + model.localhost}}</div>
    </div>`,
})

Vue.component('placeholder', {
  template: `
    <div class="placeholder">Test</div>
  `
})

Vue.component('layers-list', {
  template: `
    <div class="layer-list-wrap">
      <layer v-for="(layer,key) in total" :key="key" :model="layer" />
    </div>
  `,
  data() {
    return {
      launch: [ 
        {
          depth: 0,
          hidden: false,
          locked: false,
          name: 'Layer 1',
          type: 'Layer',
          children: [
            {
              depth: 1,
              hidden: false,
              locked: false,
              name: 'bg',
              type: 'PathItem',
              // children: []
            }
          ]
        }
      ],
      total: [
        {
          name: 'Layer 1',
          label: '#4f80ff',
          active: true,
          selected: true,
          hidden: false,
          locked: false,
          depth: 0,
          open: false,
          children: [],
        },
        {
          name: 'Layer 2',
          label: '#ff04f8',
          active: false,
          selected: false,
          hidden: false,
          locked: false,
          depth: 1,
          open: false,
          children: [],
        },
        {
          name: 'Layer 3',
          label: '#04fff8',
          active: false,
          selected: false,
          hidden: false,
          locked: false,
          depth: 2,
          open: false,
          children: [],
        },
      ]
    }
  },
  // methods
})

Vue.component('layer', {
  props: {
    model: Object,
  },
  template: `
    <div class="layer-wrap" :style="getLayerStyle()">
      <div class="layer-head" :style="getWrapWidth()">
        <layer-icon type="visible" />
        <layer-icon type="lock" />
        <layer-label :color="model.label" :select="false" />
        <layer-tab v-for="(tab,key) in depth" :key="key" />
        <layer-icon :type="(model.open) ? 'arrow-down' : 'arrow-right'" />
        <layer-preview />
        <layer-input :model="model" />
      </div>
      <div class="layer-tail" :style="getTailStyle()">
        <layer-icon :type="(model.active) ? 'radio-on' : 'radio-off'" />
        <layer-label :color="model.label" :select="true" />
      </div>
    </div>
  `,
  data() {
    return {
      depth: [],
      overflowing: false,
    }
  },
  mounted() {
    this.buildDepth();
    Event.$on('overflowingTrue', this.overflowingTrue);
    Event.$on('overflowingFalse', this.overflowingFalse);
  },
  methods: {
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
    getWrapWidth() {
      // return `max-width: ${}`
    },
    getLayerStyle() {
      // console.log(this.model.selected)
      let style = ``;
      if (this.model.selected) {
        style += `background-color: ${this.$root.getCSS('color-selected-layer')};`
      } else {
        style += `background-color: transparent;`
      }
      return style;
    },
    getTailStyle() {
      // console.log(this.model.selected)
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
Vue.component('layer-preview', { template: `<div class="layer-preview"></div>` })


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
      if (this.select) {
        style += 'width:6px;height:6px;border-color: black;'
      }
      return style;
    }
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
      @mouseover="hover = true" 
      @mouseout="hover = false" 
      @click="doAction"
      v-if="type !== 'none'">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path v-if="type == 'visible'" :class="getSVGClass()" :style="getSVGStyle()" d="M16.75,8.18a8.82,8.82,0,0,0-13.5,0l-1,1.23a.93.93,0,0,0,0,1.18l1,1.23a8.82,8.82,0,0,0,13.5,0l1-1.23a.93.93,0,0,0,0-1.18ZM10,13.23A3.23,3.23,0,1,1,13.23,10,3.22,3.22,0,0,1,10,13.23Zm1.58-3.47a1.94,1.94,0,0,1,0,.24A1.6,1.6,0,1,1,10,8.4l.24,0A1.61,1.61,0,0,0,11.58,9.76Z"/>
        <path v-if="type == 'lock'" :class="getSVGClass()" :style="getSVGStyle()" d="M11.07,14v0a.25.25,0,0,0,.09-.09Zm4.85-5.53h-.65V7A5.27,5.27,0,0,0,4.73,7V8.47H4.08a.9.9,0,0,0-.91.9V17.7a.56.56,0,0,0,.57.56H16.27a.56.56,0,0,0,.56-.56V9.37A.9.9,0,0,0,15.92,8.47Zm-4.76,5.46a.25.25,0,0,1-.09.09v2.19H8.93V14s0,0,0-.06a1.76,1.76,0,0,1-.72-1.43,1.84,1.84,0,1,1,3.68,0A1.78,1.78,0,0,1,11.16,13.93Zm2-5.46H6.87V7a3.13,3.13,0,0,1,6.26,0Zm-2,5.46a.25.25,0,0,1-.09.09v0Z"/>
        <path v-if="type == 'arrow-right'" :class="getSVGClass()" :style="getSVGStyle()" d="M4.56,16.53a1,1,0,0,1-.64-.23,1,1,0,0,1-.13-1.41L8.11,9.72,3.83,5.15A1,1,0,0,1,5.29,3.78L9.72,8.51a1.77,1.77,0,0,1,.06,2.33L5.33,16.17A1,1,0,0,1,4.56,16.53Zm3.7-6.66h0Z"/>
        <path v-if="type == 'arrow-down'" :class="getSVGClass()" :style="getSVGStyle()" d="M3.47,9.07a1,1,0,0,1,.23-.64A1,1,0,0,1,5.11,8.3l5.17,4.32,4.57-4.28A1,1,0,0,1,16.22,9.8l-4.73,4.43a1.77,1.77,0,0,1-2.33.06L3.83,9.84A1,1,0,0,1,3.47,9.07Zm6.66,3.7h0Z"/>
        <path v-if="type == 'radio-on'" :class="getSVGClass()" :style="getSVGStyle()" d="M10,1.38A8.63,8.63,0,1,0,18.63,10,8.62,8.62,0,0,0,10,1.38Zm0,16A7.38,7.38,0,1,1,17.38,10,7.38,7.38,0,0,1,10,17.38ZM10,4.25A5.75,5.75,0,1,0,15.75,10,5.76,5.76,0,0,0,10,4.25Zm0,10A4.25,4.25,0,1,1,14.25,10,4.26,4.26,0,0,1,10,14.25Z"/>
        <path v-if="type == 'radio-off'" :class="getSVGClass()" :style="getSVGStyle()" d="M10,15.75A5.75,5.75,0,1,1,15.75,10,5.76,5.76,0,0,1,10,15.75Zm0-10A4.25,4.25,0,1,0,14.25,10,4.26,4.26,0,0,0,10,5.75Z"/>
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
      if (this.type == 'visible')
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
  },
  template: `
    <div class="wrap-input">
      <input 
        :class="getClass()"
        :style="checkSize()"
        @keyup.enter="submitTest()"
        v-model="msg" 
        :placeholder="model.name""/>
    </div>
  `,
  data() {
    return {
      msg: '',
    }
  },
  computed: {
    isWake: function () {
      return this.model.isActive;
    },
  },
  mounted() {
    // console.log(this.model)
  },
  methods: {
    checkSize() {
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
        console.log(`Submitting ${this.msg}`);
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
      Event.$emit('newAction', 'keyDown');
    },
    onKeyUpOutside(e, el) {
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
      cssOrder: ['bg', 'icon', 'border', 'button-hover', 'button-active', 'button-disabled', 'text-active', 'text-default', 'text-disabled', 'input-focus', 'input-idle', 'scrollbar', 'scrollbar-thumb', 'scrollbar-thumb-hover', 'scrollbar-thumb-width', 'scrollbar-thumb-radius'],
      activeStyle: [],
      styleList: {
        ILST: {
          lightest: ['#f0f0f0', '#535353', '#dcdcdc', '#f9f9f9', '#bdbdbd', '#e6e6e6', '#484848', '#484848', '#c6c6c6', '#ffffff', '#ffffff', '#fbfbfb', '#dcdcdc', '#a6a6a6', '20px', '20px'],
          light: ['#b8b8b8', '#404040', '#5f5f5f', '#dcdcdc', '#969696', '#b0b0b0', '#101010', '#101010', '#989898', '#e3e3e3', '#e3e3e3', '#c4c4c4', '#a8a8a8', '#7b7b7b', '20px', '10px'],
          dark: ['#535353', '#c2c2c2', '#5f5f5f', '#4a4a4a', '#404040', '#5a5a5a', '#d8d8d8', '#d5d5d5', '#737373', '#ffffff', '#474747', '#4b4b4b', '#606060', '#747474', '20px', '10px'],
          darkest: ['#323232', '#b4b4b4', '#3e3e3e', '#292929', '#1f1f1f', '#393939', '#1b1b1b', '#a1a1a1', '#525252', '#fcfcfc', '#262626', '#2a2a2a', '#383838', '#525252', '20px', '10px'],
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
    localhost: 0,
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
    isWake: false,
    Shift: false,
    Ctrl: false,
    Alt: false,
    context: {
      menu: [
        { id: "refresh", label: "Refresh panel", enabled: true, checkable: false, checked: false, },
        { id: "test", label: "Run test", enabled: true, checkable: false, checked: false, },
        { label: "---" },
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
    rootName: function () {
      const str = csInterface.getSystemPath(SystemPath.EXTENSION);
      return str.substring(str.lastIndexOf('/') + 1, str.length);
    },
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
    this.getVersion();
    // this.tryFetch();
    // if (this.notificationsEnabled)
    //   Event.$emit('showNotification');
    // else
    //   Event.$emit('hideNotification');
  },
  methods: {
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
      const debug = window.cep.fs.readFile(`${path}/.debug`);
      const debugID = new RegExp('\\<host\\sname\\=\\"' + this.activeApp + '\\"\\sport\\=\\"(\\d*)', 'i');
      // console.log(debugID)
      let hit = debug.data.match(debugID);
      this.localhost = hit[1];
      Event.$emit('buildNumber', this.buildNumber);
      Event.$emit('portNumber', this.localhost);
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
        // this.notificationsEnabled = JSON.parse(storage.getItem('notificationsEnabled'));
        this.rememberContextMenu(storage);
        // console.log(storage);
        // console.log(this.notificationsEnabled);
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
        // if (!this.isEqualArray(lastMods, thisMods))
        // console.log(`${thisMods} : ${lastMods}`)
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
