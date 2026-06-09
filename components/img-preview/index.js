// components/img-preview/index.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    src: {
      type: String,
      value: '',
    },
  },

  methods: {
    onClose() {
      this.triggerEvent('close')
    },

    onTouchMove() {
      return false
    },
  },
})
