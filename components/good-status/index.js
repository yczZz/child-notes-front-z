Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    babyName: {
      type: String,
      value: '宝宝',
    },
    dailyTips: {
      type: Array,
      value: [],
    },
    growthStage: {
      type: Object,
      value: null,
    },
    sleeping: {
      type: Boolean,
      value: false,
    },
    sleepStatusText: {
      type: String,
      value: '',
    },
  },

  data: {
    expanded: false,
  },

  methods: {
    onToggleDetail() {
      this.setData({ expanded: !this.data.expanded })
    },
  },
})
