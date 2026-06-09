// components/baby-status-bar/index.js
Component({
  properties: {
    baby: {
      type: Object,
      value: {},
    },
    stats: {
      type: Object,
      value: {},
    },
  },
  methods: {
    onStatsTap() {
      this.triggerEvent('stats')
    },
    onSignInTap() {
      this.triggerEvent('signin')
    },
    onBabyTap() {
      this.triggerEvent('switchbaby')
    },
    onDiaperTap() {
      this.triggerEvent('record', { type: 'diaper' })
    },
    onGrowthTap() {
      this.triggerEvent('record', { type: 'growth' })
    },
  },
})
