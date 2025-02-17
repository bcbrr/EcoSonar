const lighthouseUserFlow = require('lighthouse/lighthouse-core/fraggle-rock/api.js')
const PuppeteerHar = require('puppeteer-har')
const { clickOnElement, waitForSelectors, applyChange } = require('../utils/playSelectors')
const urlsProjectRepository = require('../dataBase/urlsProjectRepository')

class UserJourneyService { }

UserJourneyService.prototype.playUserJourney = async function (url, browser, userJourney) {
  const page = await browser.newPage()
  await page.setViewport({
    width: 1920,
    height: 1080
  })
  // disabling cache
  await page.setCacheEnabled(false)

  // get har file
  const pptrHar = new PuppeteerHar(page)
  await pptrHar.start()
  page.setBypassCSP(true)

  // go to url
  await page.goto(url, { timeout: 0, waitUntil: 'networkidle2' })
  const steps = userJourney.steps
  const timeout = 10000
  let step; let element; let promises
  for (step of steps) {
    switch (step.type) {
      case 'navigate':
        promises = []
        promises.push(page.waitForNavigation())
        await page.goto(step.url)
        await Promise.all(promises)
        break
      case 'click':
        element = await waitForSelectors(step.selectors, page, { timeout, visible: true })
        if (step.offsetX && step.offsetY) {
          await element.click({
            offset: {
              x: step.offsetX,
              y: step.offsetY
            }
          })
        } else {
          await element.click({})
        }

        break
      case 'change':
        element = await waitForSelectors(step.selectors, page, { timeout, visible: true })
        await applyChange(step.value, element)
        break
      default:
        break
    }
  }
  await page.waitForNavigation()
  const harObj = await pptrHar.stop()
  return {
    page,
    harObj
  }
}

UserJourneyService.prototype.playUserFlowLighthouse = async function (url, browser, userJourney) {
  const timeout = 10000
  const targetPage = await browser.newPage()
  await targetPage.setViewport({
    width: 1920,
    height: 1080
  })
  const flow = await lighthouseUserFlow.startFlow(targetPage, { name: url })
  const steps = userJourney.steps
  let step; let element
  for (step of steps) {
    switch (step.type) {
      case 'navigate':
        await flow.navigate(step.url, {
          stepName: step.url
        })
        await targetPage.setViewport({
          width: 1920,
          height: 1080
        })
        break
      case 'click':
        element = await waitForSelectors(step.selectors, targetPage, { timeout, visible: true })
        await clickOnElement(element, step)
        break
      case 'change':
        element = await waitForSelectors(step.selectors, targetPage, { timeout, visible: true })
        await applyChange(step.value, element)
        break
      default:
        break
    }
  }
  await targetPage.waitForNavigation()
  targetPage.close()
  const lighthouseResults = await flow.createFlowResult()
  return lighthouseResults.steps[0]
}

UserJourneyService.prototype.insertUserFlow = async function (url, userFlow) {
  const urlsProject = await urlsProjectRepository.getUserFlow(url)
  if (urlsProject === null) {
    console.log('UPDATE USER FLOW - Url not found')
    throw new Error('Url not found')
  } else {
    await urlsProjectRepository.insertUserFlow(urlsProject, userFlow)
      .then(() => {
        console.log('UPDATE USER FLOW - Success')
      })
  }
}

UserJourneyService.prototype.getUserFlow = async function (url) {
  const urlsProject = await urlsProjectRepository.getUserFlow(url)
  return new Promise((resolve, reject) => {
    if (urlsProject === null || urlsProject.userFlow === undefined) {
      console.log('GET USER FLOW - Url flow not found')
      reject(new Error('Your project does not have user flow saved into database.'))
    } else {
      resolve(Object.fromEntries(urlsProject.userFlow))
    }
  })
}

UserJourneyService.prototype.deleteUserFlow = async function (url) {
  const urlsProject = await urlsProjectRepository.getUserFlow(url)
  if (urlsProject === null) {
    console.log('UPDATE USER FLOW - Url not found')
    throw new Error('Url not found')
  } else {
    urlsProjectRepository.deleteUserFlow(url)
  }
}

const userJourneyService = new UserJourneyService()
module.exports = userJourneyService
