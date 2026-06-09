// components/record-drawer/index.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    title: {
      type: String,
      value: '',
    },
  },

  methods: {
    stopTouchMove() {},

    onClose() {
      this.triggerEvent('close')
    },
  },
})
