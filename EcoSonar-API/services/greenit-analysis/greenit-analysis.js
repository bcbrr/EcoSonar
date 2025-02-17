/* eslint-disable no-undef */
const PuppeteerHar = require('puppeteer-har')
const path = require('path')
const userJourneyService = require('../userJourneyService')

module.exports = {
  async createGreenITReports (browser, urlList, autoscroll) {
  // Timeout for an analysis
    const TIMEOUT = 880000
    // Concurent tab
    const MAX_TAB = 40
    // Nb of retry before dropping analysis
    const RETRY = 2

    const asyncFunctions = []
    let results
    let index = 0
    const reports = []

    const convert = []

    for (let i = 0; i < MAX_TAB; i++) {
      convert[i] = i
    }

    // Asynchronous analysis with MAX_TAB open simultaneously to json
    for (let i = 0; i < MAX_TAB && index < urlList.length; i++) {
      asyncFunctions.push(
        analyseURL(
          browser,
          urlList[index],
          {
            timeout: TIMEOUT,
            tabId: i
          },
          autoscroll
        )
      )
      index++
    }

    while (asyncFunctions.length !== 0) {
      results = await Promise.race(asyncFunctions)
      if (!results.success && results.tryNb <= RETRY) {
        asyncFunctions.splice(
          convert[results.tabId],
          1,
          analyseURL(
            browser,
            results.url,
            {
              timeout: TIMEOUT,
              tabId: results.tabId,
              tryNb: results.tryNb + 1
            },
            autoscroll
          )
        ) // convert is NEEDED, variable size array
      } else {
        reports.push(results)
        if (index === urlList.length) {
          asyncFunctions.splice(convert[results.tabId], 1) // convert is NEEDED, variable size array
          for (let i = results.tabId + 1; i < convert.length; i++) {
            convert[i] = convert[i] - 1
          }
        } else {
          asyncFunctions.splice(
            results.tabId,
            1,
            analyseURL(
              browser,
              urlList[index],
              {
                timeout: TIMEOUT,
                tabId: results.tabId
              },
              autoscroll
            )
          ) // No need for convert, fixed size array
          index++
        }
      }
    }
    return reports
  }
}

// Analyse a webpage
async function analyseURL (browser, url, options, autoscroll) {
  let result = {}
  const TAB_ID = options.tabId
  const TRY_NB = options.tryNb || 1

  try {
    let page
    let harObj
    let userJourney
    await userJourneyService.getUserFlow(url)
      .then((userflow) => {
        userJourney = userflow
      }).catch((error) => {
        console.log(error.message)
      })
    if (userJourney) {
      ({ page, harObj } = await userJourneyService.playUserJourney(url, browser, userJourney))
      console.log('GREENIT Analysis - Page requires user journey')
    } else {
      ({ page, harObj } = await launchPageWithoutUserJourney(browser, page, url, harObj, autoscroll))
      console.log('GREENIT Analysis - Page does not require user journey')
    }

    try {
      // get ressources
      const client = await page.target().createCDPSession()
      await client.send('Page.enable')
      const ressourceTree = await client.send('Page.getResourceTree')
      ressourceTree.frameTree.resources = await Promise.all(
        ressourceTree.frameTree.resources.map(async function (resource) {
          try {
            const contentScript = await client.send('Page.getResourceContent', {
              frameId: page.mainFrame()._id,
              url: resource.url
            })
            resource.content = contentScript.content
          } catch (error) {
            console.error('\x1b[33m%s\x1b[0m', resource.url)
            console.error('\x1b[33m%s\x1b[0m', error.message)
          }
          return resource
        })
      )
      await client.detach()

      // get rid of chrome.i18n.getMessage not declared
      await page.evaluate(
        (_x) =>
          (chrome = {
            i18n: {
              getMessage: function () {
                return undefined
              }
            }
          })
      )
      // add script, get run, then remove it to not interfere with the analysis
      const script = await page.addScriptTag({ path: path.join(__dirname, './dist/bundle.js') })

      await script.evaluate((x) => x.remove())
      // pass node object to browser
      await page.evaluate((x) => (har = x), harObj.log)
      await page.evaluate((x) => (resources = x), ressourceTree.frameTree.resources)
      // launch analyse
      console.log('Launch GreenIT analysis for url ' + url)
      result = await page.evaluate(async () => await launchAnalyse())
      console.log('GreenIT analysis ended for url ' + url)
      page.close()
      result.success = true
    } catch (error) {
      console.log('\x1b[31m%s\x1b[0m', 'Error on URL ' + url)
      console.error('\x1b[31m%s\x1b[0m', error)
      result.success = false
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', error)
    result.success = false
  } finally {
    result.url = url
    result.tryNb = TRY_NB
    result.tabId = TAB_ID
  }
  return result
}

async function launchPageWithoutUserJourney (browser, page, url, harObj, autoscroll) {
  page = await browser.newPage()

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
  if (autoscroll) { await autoScroll(page) }
  harObj = await pptrHar.stop()
  return { page, harObj }
}

async function autoScroll (page) {
  console.log('AUTOSCROLL - autoscroll has started')
  await page.evaluate(async () => {
    await new Promise((resolve, _reject) => {
      let totalHeight = 0
      const distance = 100
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer)
          setTimeout(() => {
            resolve()
          })
        }
      }, 100)
    })
  })
  console.log('AUTOSCROLL - Autoscroll has ended ')
}
