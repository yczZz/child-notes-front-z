const { get, post } = require('../api/index')

function generateAnalysis(params = {}) {
  return post('/api/smart-analysis/generate', params)
}

function getAnalysisList() {
  return get('/api/smart-analysis/list')
}

function getAnalysisDetail(id) {
  return get(`/api/smart-analysis/${id}`)
}

module.exports = {
  generateAnalysis,
  getAnalysisList,
  getAnalysisDetail,
}
