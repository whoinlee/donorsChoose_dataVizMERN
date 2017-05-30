import React, { Component } from 'react'
import {ChartContainer, DataCount, BarChart, RowChart, LineChart, PieChart} from 'dc-react'
import PropTypes from 'prop-types'

import {csv} from 'd3-request';
import {scaleTime} from 'd3-scale';
import {timeParse} from 'd3-time-format'

import dc from 'dc'
import crossfilter from 'crossfilter'
import axios from 'axios'

import config from '../../config';
import '../stylesheets/App.scss'


var minDate, maxDate;
// var maxState;
// var stateDimension;

class CrossfilterContext {
	constructor(data) {
		this.data = data

		//-- crossfilter instance
		this.crossfilter = crossfilter(data)
		this.groupAll = this.crossfilter.groupAll()
		
		//-- dimensions
		this.datePostedDimension = this.crossfilter.dimension(d => d.date_posted)
		this.stateDimension  = this.crossfilter.dimension(d => d.school_state)
		this.fundingStatusDimension  = this.crossfilter.dimension(d => d.funding_status)
		this.resourceTypeDimension  = this.crossfilter.dimension(d => d.resource_type)
		this.povertyLevelDimension  = this.crossfilter.dimension(d => d.poverty_level)
		this.gradeLevelDimension  = this.crossfilter.dimension(d => d.grade_level)
		this.totalDonationsDimension   = this.crossfilter.dimension(d => d.total_donations)

		//-- # of projects by group
		this.projectsByDate = this.datePostedDimension.group()
		this.projectsByState = this.stateDimension.group()
		this.projectsByFundingStatus = this.fundingStatusDimension.group()
		this.projectsByResourceType = this.resourceTypeDimension.group()
		this.projectsByPovertyLevel = this.povertyLevelDimension.group()
		this.projectsByGradeLevel = this.gradeLevelDimension.group()
		
		//-- calculate groups
		this.totalDonationsByState = this.projectsByState.reduceSum(d => d.total_donations)
		this.totalDonationsByGrade = this.projectsByGradeLevel.reduceSum(d => d.total_donations)
		this.totalDonationsByFundingStatus = this.projectsByFundingStatus.reduceSum(d => d.total_donations)
		this.netTotalDonations = this.groupAll.reduceSum(d => d.total_donations)

		//-- threshold values to be used in charts
		minDate = this.datePostedDimension.bottom(1)[0].date_posted
		maxDate = this.datePostedDimension.top(1)[0].date_posted
		// maxState = this.totalDonationsByState.top(1)[0].value
		// stateDimension = this.stateDimension

		// console.log("stateDimension, array??:", stateDimension)
		// console.log("this.stateDimension, array??:", this.stateDimension)
		// console.log("maxState: ", maxState)

		// stateParam = d3.scaleOrdinal().domain(["CA", "IL", "NC", "NY", "SC", "TX"])
	}
}


class App extends Component {

	constructor(props) {
	    super(props);

	    this._crossfilterContext = null;
	    this.crossfilterContext = this.crossfilterContext.bind(this);
	    this.resetAll = this.resetAll.bind(this);
	 }

	crossfilterContext = (callBack) => {
		console.log("APP :: crossfilterContext")
		console.log('APP :: crossfilterContext, config.NODE_ENV:', config.node_env)

		if (!callBack) {
	      return this._crossfilterContext;
	    }

	    if (config.node_env === 'development') {
	    	//-- development
		    axios.get(`/api/data`)
		    .then(resp => {
		    	let data = resp.data 	
	    	 	const dateParse = timeParse('%m/%d/%Y')
	    	 	data.forEach((d, i) => {
					d.date_posted = dateParse(d.date_posted);
					d.date_posted.setDate(1)	//set to the 1st day of the month
					d.total_donations = +d.total_donations;
				});

	    	 	this._crossfilterContext = new CrossfilterContext(data)
	    	 	callBack(this._crossfilterContext)
		    })
		} else {
			//-- production
			csv('./data/sampledata.csv', (data) => {
				const dateParse = timeParse('%m/%d/%Y')
	    	 	data.forEach((d, i) => {
					d.date_posted = dateParse(d.date_posted);
					d.date_posted.setDate(1)	//set to the 1st day of the month
					d.total_donations = +d.total_donations;
				});

	    	 	this._crossfilterContext = new CrossfilterContext(data)
	    	 	callBack(this._crossfilterContext)
			})
		}
	}

	resetAll() {
		console.log("APP :: resetAll")

	    dc.filterAll()
	    dc.redrawAll()
	}

	render() {
		return (
		    <div className="app">

		    	<div className="appHeader">
		            <h2>Donors Choose Dashboard</h2>
		        </div>

		        <div className="appContent">
			        <ChartContainer className="container"
			        				crossfilterContext={this.crossfilterContext} >
			        	<div className="row" style={{marginLeft:'50px', width: '1024px'}}>
				          <DataCount 
			                className="dc-data-count"
			                dimension={ctx => ctx.crossfilter}
			                group={ctx => ctx.groupAll} />
				          <div className="dc-data-count">
				          	<a className="reset" style={{fontWeight: 'bold', textDecoration: 'underline', cursor:'pointer', color:'#3182bd'}} onClick={this.resetAll}>Reset All</a>
				          </div>
				        </div>

				        <div className="row">
				        	<div className='chartTitle' style={{marginTop: '25px'}}>
					        	<span style={{marginLeft: '75px'}}>Number of Donations</span>
					        	<span style={{marginLeft: '500px'}}>Funding Status</span>
				        	</div>
				        </div>

			        	<div className="row">
				          <LineChart
				            id="byDateChart"
				            dimension={ctx => ctx.datePostedDimension}
				            group={ctx => ctx.projectsByDate}
				            width={600}
				            height={220}
				            transitionDuration={500}
				            margins={{top: 10, right: 0, bottom: 20, left: 50}}
				            elasticY={true}
				            renderArea={true}
				            renderHorizontalGridLines={true}
				            renderVerticalGridLines={true}
				            mouseZoomable={true}
				            x={scaleTime().domain([new Date(2002, 9, 1), new Date(2008, 8, 1)])}
				            yAxis={axis => axis.ticks(6)} /> 
				          <PieChart
				          	id="byFundingStatusChart"
			                dimension={ctx => ctx.fundingStatusDimension}
			                group={ctx => ctx.projectsByFundingStatus}
			                width={350} 
			                height={220}
			                transitionDuration={1000}
			                radius={90} 
			                innerRadius={40} />
				        </div>

				        <div className="row">
				        	<div className='chartTitle'>
					        	<span style={{marginLeft: '75px'}}>Resource Type</span>
					        	<span style={{marginLeft: '220px'}}>Poverty Level</span>
					        	<span style={{marginLeft: '220px'}}>Grade</span>
				        	</div>
				        </div>

			        	<div className="row">
				          <RowChart
				            id="byReourceTypeChart"
				            dimension={ctx => ctx.resourceTypeDimension}
				            group={ctx => ctx.projectsByResourceType}
				            width={315}
				            height={220}
				            transitionDuration={500}
				            elasticX={true}
				            xAxis={axis => axis.ticks(5)} />
				          <RowChart
				            id="byPovertyLevelChart"
				            dimension={ctx => ctx.povertyLevelDimension}
				            group={ctx => ctx.projectsByPovertyLevel}
				            width={315}
				            height={220}
				            transitionDuration={500}
				            elasticX={true}
				            xAxis={axis => axis.ticks(4)} /> 
				          <RowChart
				            id="byGradeLevelChart"
				            dimension={ctx => ctx.gradeLevelDimension}
				            group={ctx => ctx.projectsByGradeLevel}
				            width={315}
				            height={220}
				            transitionDuration={500}
				            elasticX={true}
				            xAxis={axis => axis.ticks(4)} /> 
				        </div>
			        </ChartContainer>
			    </div>
		    </div>
		)
    }
}

export default App