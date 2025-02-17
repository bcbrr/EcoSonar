const greenits = require('./models/greenits')
const urlsprojects = require('./models/urlsprojects')
const SystemError = require('../utils/systemError')
const formatGreenItAnalysis = require('../services/format/formatGreenItAnalysis')

const GreenItRepository = function () {
  /**
   * insertion of one or more analysis
   * @param {arrayToInsert} reports
   * @returns
   */
  this.insertAll = async function (arrayToInsert) {
    if (arrayToInsert.length > 0) { arrayToInsert = await checkValues(arrayToInsert) }

    return new Promise((resolve, reject) => {
      if (arrayToInsert.length > 0) {
        greenits
          .insertMany(arrayToInsert)
          .then(() => {
            resolve()
          })
          .catch((error) => {
            console.error('\x1b[31m%s\x1b[0m', error)
            console.log('GREENIT - error during insertion of analysis')
            const systemError = new SystemError()
            reject(systemError)
          })
      } else {
        console.log('GREENIT - None of the urls analysed could be inserted')
        reject(new Error('GREENIT - None of the urls analysed could be inserted'))
      }
    })
  }

  /**
   * find analysis for one url : OK
   * @param {project Name} projectNameReq
   * @param {url Name} urlNameReq
   * @returns
   */
  this.findAnalysisUrl = async function (projectNameReq, urlNameReq) {
    let res
    let allAnalysis
    let stringErr = null
    let systemError = null
    try {
      res = await urlsprojects.find({ projectName: projectNameReq, urlName: urlNameReq }, { idKey: 1 })
      if (res.length === 0) {
        stringErr = 'url : ' + urlNameReq + ' or project : ' + projectNameReq + ' not found'
      } else {
        allAnalysis = await greenits
          .find({ idUrlGreen: res[0].idKey }, { domSize: 1, nbRequest: 1, responsesSize: 1, dateGreenAnalysis: 1, ecoIndex: 1, grade: 1 })
          .sort({ dateGreenAnalysis: 1 })
        if (allAnalysis.length === 0) {
          stringErr = 'no greenit analysis found for ' + urlNameReq
          console.log(stringErr)
        }
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', error)
      console.log('An error occured while retrieving analysis')
      systemError = new SystemError()
    }
    return new Promise((resolve, reject) => {
      if (systemError !== null) {
        reject(systemError)
      } else if (stringErr !== null) {
        reject(new Error(stringErr))
      } else {
        const lastAnalysis = {
          domSize: allAnalysis[allAnalysis.length - 1].domSize,
          nbRequest: allAnalysis[allAnalysis.length - 1].nbRequest,
          responsesSize: allAnalysis[allAnalysis.length - 1].responsesSize,
          ecoIndex: allAnalysis[allAnalysis.length - 1].ecoIndex,
          grade: allAnalysis[allAnalysis.length - 1].grade
        }
        let i = 0
        let element
        const deployments = []
        while (i < allAnalysis.length) {
          element = {
            dateGreenAnalysis: allAnalysis[i].dateGreenAnalysis,
            domSize: allAnalysis[i].domSize,
            nbRequest: allAnalysis[i].nbRequest,
            responsesSize: allAnalysis[i].responsesSize,
            ecoIndex: allAnalysis[i].ecoIndex
          }
          deployments.push(element)
          i++
        }
        const formattedDeployments = formatGreenItAnalysis.formatDeploymentsForGraphs(deployments)
        const analysis = { deployments: formattedDeployments, lastAnalysis }
        resolve(analysis)
      }
    })
  }

  /**
   * find analysis for one Project
   * @param {project Name} projectNameReq
   * @param {all deployment = true} alldeployment
   * @returns
   */
  this.findAnalysisProject = async function (projectNameReq) {
    let stringErr = null
    let systemError = null
    let deployments, lastAnalysis, resultats
    try {
      const resList = await urlsprojects.find({ projectName: projectNameReq }, { idKey: 1 })
      if (resList.length === 0) {
        stringErr = 'url or project :' + projectNameReq + ' not found'
      } else {
        // create a list of idKey
        let i = 0
        const listIdKey = []
        while (i < resList.length) {
          listIdKey[i] = resList[i].idKey
          i++
        }
        deployments = await greenits.find({ idUrlGreen: listIdKey }, { ecoIndex: 1, nbRequest: 1, domSize: 1, responsesSize: 1, dateGreenAnalysis: 1 }).sort({ dateGreenAnalysis: 1 })
        if (deployments.length !== 0) {
          lastAnalysis = await greenits.find({ idUrlGreen: listIdKey, dateGreenAnalysis: deployments[deployments.length - 1].dateGreenAnalysis })
          resultats = { deployments, lastAnalysis }
        } else {
          console.log('no greenit analysis found for ' + projectNameReq)
          resultats = { deployments: [], lastAnalysis: null }
        }
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', error)
      console.log('error during generation of ' + projectNameReq + ' analysis')
      systemError = new SystemError()
    }
    return new Promise((resolve, reject) => {
      if (systemError !== null) {
        reject(systemError)
      } else if (stringErr !== null) {
        reject(new Error(stringErr))
      } else {
        resolve(resultats)
      }
    })
  }
}

/**
 *
 * @param {Array} arrayToInsert
 * @returns an array cleaned of analysis containing undefined and NaN to avoid mongoose rejecting every GreenIt analysis insertion
 */
async function checkValues (arrayToInsert) {
  const arrayToInsertSanitized = []
  for (const analysis of arrayToInsert) {
    if (!Object.values(analysis).includes(undefined) || !Object.values(analysis).includes(NaN)) {
      arrayToInsertSanitized.push(analysis)
    } else {
      const urlInfos = await urlsprojects.find({ idKey: analysis.idUrlGreen })
      console.log(`GREENIT INSERT - Url  ${urlInfos[0].urlName} cannot be inserted due to presence of NaN or undefined values`)
    }
  }
  return arrayToInsertSanitized
}

const greenItRepository = new GreenItRepository()
module.exports = greenItRepository
