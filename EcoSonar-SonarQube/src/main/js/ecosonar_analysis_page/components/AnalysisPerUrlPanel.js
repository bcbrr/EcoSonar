import * as React from 'react'
import { getAnalysisUrlConfiguration } from '../../services/ecosonarService'
import GraphPanelForUrl from './GraphPanel/GraphPanelForUrl'
import GreenItPanelPerUrl from './GreenItPanel/GreenItPanelPerUrl'
import LightHousePanelPerUrl from './LighthousePanel/LighthousePanelPerUrl'
import AccessibilityAlert from '../../utils/AccessibilityAlert'
import W3cPanelPerUrl from './W3cPanel/W3cPanelPerUrl'
export default class AnalysisPerUrlPanel extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      allowW3c: this.props.allowW3c,
      loading: false,
      error: this.props.errorUrl,
      projectName: this.props.project,
      urls: this.props.urls,
      foundUrl: this.props.foundUrl,
      foundAnalysis: false,
      selectedUrl: this.props.selectedUrl,
      greenItAnalysis: {},
      lighthouseAnalysis: {},
      ecoUrl: [],
      reqUrl: [],
      pageUrl: [],
      domUrl: [],
      performanceUrl: [],
      accessibilityUrl: [],
      cumulativeLayoutShiftUrl: [],
      firstContentfulPaintUrl: [],
      largestContentfulPaintUrl: [],
      interactiveUrl: [],
      speedIndexUrl: [],
      totalBlockingTimeUrl: [],
      selectedGraph: '',
      reqSelected: false,
      ecoindexSelected: false,
      domSelected: false,
      pageSelected: false,
      performanceSelected: false,
      accessibilitySelected: false,
      cumulativeLayoutShiftSelected: false,
      firstContentfulPaintSelected: false,
      largestContentfulPaintSelected: false,
      interactiveSelected: false,
      speedIndexSelected: false,
      totalBlockingTimeSelected: false,
      ariaAlertForAccessibility: false
    }
  }

  componentDidMount () {
    if (this.state.foundUrl) {
      this.getAnalysis()
    }
  }

  getAnalysis = () => {
    this.setState({
      greenItAnalysis: {},
      lighthouseAnalysis: {},
      error: '',
      foundAnalysis: false,
      reqUrl: [],
      pageUrl: [],
      domUrl: [],
      ecoUrl: [],
      performanceUrl: [],
      accessibilityUrl: [],
      cumulativeLayoutShiftUrl: [],
      firstContentfulPaintUrl: [],
      largestContentfulPaintUrl: [],
      interactiveUrl: [],
      speedIndexUrl: [],
      totalBlockingTimeUrl: [],
      loading: true
    })
    getAnalysisUrlConfiguration(this.state.projectName, this.state.selectedUrl)
      .then((res) => {
        if (res !== undefined) {
          this.setState({
            greenItLastAnalysis: res.lastAnalysis.greenit,
            lighthouseLastAnalysis: res.lastAnalysis.lighthouse,
            w3cLastAnalysis: res.lastAnalysis.w3c,
            foundAnalysis: true,
            loading: false,
            w3cAnalysis: res.deployments.w3c.map((analysis) => [analysis.dateAnalysis, analysis.score]),
            reqUrl: res.deployments.greenit.map((analysis) => [analysis.dateAnalysis, analysis.nbRequest]),
            domUrl: res.deployments.greenit.map((analysis) => [analysis.dateAnalysis, Math.trunc(analysis.domSize)]),
            pageUrl: res.deployments.greenit.map((analysis) => [analysis.dateAnalysis, Math.trunc(analysis.responsesSize)]),
            ecoUrl: res.deployments.greenit.map((analysis) => [analysis.dateAnalysis, analysis.ecoIndex]),
            performanceUrl: res.deployments.lighthouse.map((analysis) => [analysis.dateAnalysis, analysis.performanceScore]),
            accessibilityUrl: res.deployments.lighthouse.map((analysis) => [analysis.dateAnalysis, analysis.accessibilityScore]),
            cumulativeLayoutShiftUrl: res.deployments.lighthouse.map((analysis) => [analysis.dateAnalysis, analysis.cumulativeLayoutShift]),
            firstContentfulPaintUrl: res.deployments.lighthouse.map((analysis) => [analysis.dateAnalysis, analysis.firstContentfulPaint]),
            largestContentfulPaintUrl: res.deployments.lighthouse.map((analysis) => [analysis.dateAnalysis, analysis.largestContentfulPaint]),
            interactiveUrl: res.deployments.lighthouse.map((analysis) => [analysis.dateAnalysis, analysis.interactive]),
            speedIndexUrl: res.deployments.lighthouse.map((analysis) => [analysis.dateAnalysis, analysis.speedIndex]),
            totalBlockingTimeUrl: res.deployments.lighthouse.map((analysis) => [analysis.dateAnalysis, analysis.totalBlockingTime])
          })
          if (res.deployments.greenit && res.deployments.greenit.length > 0) {
            this.setState({ selectedGraph: 'ecoindex', ecoindexSelected: true, performanceSelected: false })
          } else {
            this.setState({ selectedGraph: 'performance', performanceSelected: true, ecoindexSelected: false })
          }
        }
      })
      .catch((result) => {
        if (result instanceof Error) {
          this.setState({ error: result.message, loading: false })
        }
      })
  };

  handleAccessibilityAlert = () => {
    this.setState({ ariaAlertForAccessibility: false })
    this.setState({ ariaAlertForAccessibility: true })
  };

  handleChange = async (event) => {
    await this.setState({ selectedUrl: event.target.value })

    this.getAnalysis()
    this.handleAccessibilityAlert()
  };

  handleAccessibilityAlert = () => {
    this.setState({ ariaAlertForAccessibility: false })
    this.setState({ ariaAlertForAccessibility: true })
  };

  render () {
    return (
      <div role='tabpanel'>
        {this.state.ariaAlertForAccessibility && <AccessibilityAlert />}
        <GreenItPanelPerUrl
          error={this.state.error}
          loading={this.state.loading}
          greenItLastAnalysis={this.state.greenItLastAnalysis}
          projectName={this.state.projectName}
          foundAnalysis={this.state.foundAnalysis}
          foundUrl={this.state.foundUrl}
          selectedUrl={this.state.selectedUrl}
          handleChange={this.handleChange}
          urls={this.state.urls}

        />
        <LightHousePanelPerUrl error={this.state.error} loading={this.state.loading} lighthouseLastAnalysis={this.state.lighthouseLastAnalysis} projectName={this.state.projectName} urlName={this.state.selectedUrl} />
        {this.state.allowW3c === 'true' && <W3cPanelPerUrl error={this.state.error} loading={this.state.loading} w3cLastAnalysis={this.state.w3cLastAnalysis} projectName={this.state.projectName} urlName={this.state.selectedUrl}/>}
        <GraphPanelForUrl
          allowW3c = {this.state.allowW3c}
          loading={this.state.loading}
          foundAnalysis={this.state.foundAnalysis}
          error={this.state.error}
          selectedGraph={this.state.selectedGraph}
          ecoUrl={this.state.ecoUrl}
          reqUrl={this.state.reqUrl}
          domUrl={this.state.domUrl}
          pageUrl={this.state.pageUrl}
          performanceUrl={this.state.performanceUrl}
          accessibilityUrl={this.state.accessibilityUrl}
          cumulativeLayoutShiftUrl={this.state.cumulativeLayoutShiftUrl}
          firstContentfulPaintUrl={this.state.firstContentfulPaintUrl}
          largestContentfulPaintUrl={this.state.largestContentfulPaintUrl}
          interactiveUrl={this.state.interactiveUrl}
          speedIndexUrl={this.state.speedIndexUrl}
          totalBlockingTimeUrl={this.state.totalBlockingTimeUrl}
          reqSelected={this.state.reqSelected}
          domSelected={this.state.domSelected}
          pageSelected={this.state.pageSelected}
          ecoindexSelected={this.state.ecoindexSelected}
          performanceSelected={this.state.performanceSelected}
          accessibilitySelected={this.state.accessibilitySelected}
          cumulativeLayoutShiftSelected={this.state.cumulativeLayoutShiftSelected}
          firstContentfulPaintSelected={this.state.firstContentfulPaintSelected}
          largestContentfulPaintSelected={this.state.largestContentfulPaintSelected}
          interactiveSelected={this.state.interactiveSelected}
          speedIndexSelected={this.state.speedIndexSelected}
          totalBlockingTimeSelected={this.state.totalBlockingTimeSelected}
          handleChangeGraphs={this.handleChangeGraphs}
          w3cAnalysis={this.state.w3cAnalysis}
        />
      </div>
    )
  }
}
