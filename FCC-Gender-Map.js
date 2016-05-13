/* CONFIGURABLE VARIABLES */
var surveyData = 'https://raw.githubusercontent.com/FreeCodeCamp/2016-new-coder-survey/master/data/2016%20New%20Coders%20Part%202.csv';
var worldJSON = 'https://raw.githubusercontent.com/krisgesling/d3-play/master/world-geo2-min.json';
// Title of fields in dataset
var countryField = "Which country are you a citizen of?";
var genderField = "What's your gender?";
var emField = "Are you an ethnic minority in your country?";
var mapFillInc = [15,25,35,45]; // defines the breakpoints between colors for map fill
// Color assignment - remember to also change sass variables
var colorFemale = '#FF1493';
var colorATQ = '#FFFF00';
var colorMale = '#000050';
var colorWater = '#add8e6';
var colorNR = '#fff';
var colorPath = ['#333','0.2px']; // Set color and width of lines between countries
var pieColor = [colorATQ,colorFemale,colorMale,colorNR];
var colorGender = ['#c9df8a','#77ab59','#36802d','#234d20', '#112610'];

/* OTHER VARIABLE ASSIGNMENT */
var graphData = {};
var liArr = ['NR','ATQ','female','male'];
var liArrDesc = ['No response', 'Trans*, Genderqueer or Agender', 'Female', 'Male'];
var globalStats = {
  ATQ: 0,
  female: 0,
  male: 0,
  ethnicMinority: 0,
  NR: 0
};

/* FUNCTIONS */
function loadData(data) {
  // Pulls in statistics and counts them per country, as well as globally.
    // Country constructor
    function Country(female,ATQ,male,NR,EM,displayName) {
      this.female = female;
      this.ATQ = ATQ;
      this.male = male;
      this.NR = NR;
      this.displayName = displayName;
      this.ethnicMinority = EM;
    }

    function countGenderByCountry(e,i,arr) {
      // Remove white spaces from Country names - required to match with worldJSON data
      var countryLookup = {
        'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
        'Korea South': 'South Korea',
        'Korea North': 'North Korea',
        'Netherlands (Holland, Europe)': 'Netherlands',
        'Congo': 'Democratic Republic of the Congo',
        'Tanzania': 'United Republic of Tanzania',
        'Nambia': 'Namibia',
        'Cote D\'Ivoire': 'Ivory Coast',
        'Republic of Montenegro': 'Montenegro'
      };
      var countryNameDisplay = countryLookup[data[i][countryField]] ? countryLookup[data[i][countryField]] : data[i][countryField];
      var countryName = countryNameDisplay.replace(/\s/g, '');
      // Create new country object if not already present in graphData
      if (!graphData[countryName]) {
        graphData[countryName] = new Country(0,0,0,0,0,countryNameDisplay);
      }
      // Increment relevant gender field
      switch (data[i][genderField]) {
        case 'female':
          graphData[countryName].female ++;
          break;
        case 'male':
          graphData[countryName].male ++;
          break;
        case 'trans':
        case 'agender':
        case 'genderqueer':
          graphData[countryName].ATQ ++;
          break;
        default:
          graphData[countryName].NR ++;
      }

      // Count ethnic minority status
      if (data[i][emField] == 1) {
        graphData[countryName].ethnicMinority ++;
      }
    }

    data.forEach(countGenderByCountry);
    // Calculate non-male:male gender ratio for each country
    for (var key in graphData) {
      graphData[key].ratio = (graphData[key].female+graphData[key].ATQ)/graphData[key].male;
      for (var j in graphData[key]) {
        if (globalStats[j] !== 'undefined') {
          globalStats[j] += graphData[key][j];
        }
      }
    }
}
// END FUNCTION loadData

function mergeData(e,i,arr) {
  // pull all relevant data fields into worldJSON for display
  for (var key in graphData[e.properties.name]) {
    e.properties[key] = graphData[e.properties.name][key];
  }
}
// END FUNCTION mergData

function pieChart(dataSet,selector) {
  // General use function to create a pie chart
  // config variables
  var pieWidth = 100;
  var outerRadius = pieWidth / 2;
  var innerRadius = 0;
  var color = d3.scale.category10();

  // drawing the chart
  var pie = d3.layout.pie();
  var arc = d3.svg.arc()
                  .innerRadius(innerRadius)
                  .outerRadius(outerRadius);
  var svg = d3.select(selector)
              .append('svg')
              .attr({
                width: pieWidth,
                height: pieWidth
              });
  var arcs = svg.selectAll('g.arc')
                .data(pie(dataSet))
                .enter()
                .append('g')
                .attr('class','arc')
                .attr('transform','translate(' + outerRadius + ', ' + outerRadius + ')');
  arcs.append('path')
      .attr('fill', function(d,i) {
        return pieColor[i];
      })
      .attr('d',arc);
} // END pieChart function

function percentify(num,total) {
  // Just returns a number as a percentage oftype string
  var percent = Math.round( num / total * 100);
  if (percent < 10) {
    percent = Math.round( num / total * 1000) / 10;
  }
  return percent + '%';
}
// END FUNCTION percentify

function sizeChange() {
  var graphWidth = document.getElementById('gender-map').offsetWidth;
  d3.select('g').attr('transform', 'scale(' + graphWidth/900 + ")");
  d3.select('svg')
    .attr('height', graphWidth/7*4);
}
// END FUNCTION sizeChange

function renderMap(json) {
  function zoomed() {
    svg.attr('transform','translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
  }
  var totalRespondents = 0;
  // Rendering and display
  var projection = d3.geo.miller()
                         .scale(width/6)
                         .center([0,30])
  ;
  var path = d3.geo.path()
                   .projection(projection);

  var color = d3.scale.quantize()
                      .range([colorFemale, colorATQ, colorMale]);

  var zoom = d3.behavior.zoom()
               .scale(1)
               .scaleExtent([1,12])
               .on('zoom', zoomed);

  var svg = d3.select('#gender-map')
					  	.append('svg')
					  	.attr('width', '100%')
					  	.attr('height', height)
              .attr('id','gender-map-svg')
              .style('background', colorWater)
              .append('g')
              .call(zoom)
              .append('g');
  var legend = d3.select('#gender-map')
                 .append('div')
                 .attr('width', width + 'px')
                 .attr('id', 'map-legend')
                 .html('<p class="description">Proportion of female, trans*, agender and genderqueer respondents.</p>')

  // Create map legend colors and labels
  var legendColors = legend.append('div')
                 .attr('class','legend-colors');
  var legendText = ['0-' + mapFillInc[0] + '%', mapFillInc[0]+1 + '-' + mapFillInc[1] + '%', mapFillInc[1]+1 + '-' + mapFillInc[2] + '%', mapFillInc[2]+1 + '-' + mapFillInc[3] + '%', mapFillInc[3]+1 + '-100%'];
  for (var i = 0; i < colorGender.length; i++) {
    legendColors.append('div')
          .style('background', colorGender[i])
          .text(legendText[i]);
  }

  var globalTotal = globalStats.ATQ + globalStats.female + globalStats.male + globalStats.NR;
  legend.append('h3')
        .text('Global statistics');
  var legendTotal = legend.append('div')
        .attr('class','legend-total');

  var totalStats = [['male', colorMale], ['female', colorFemale], ['ATQ', colorATQ], ['NR', colorNR]];
  for (var k = 0; k < totalStats.length; k++) {
    legendTotal.append('div')
        .style('background', totalStats[k][1])
        .style('width', percentify(globalStats[totalStats[k][0]], globalTotal));
  }

  var globalLegend = legend.append('ul');
  for (var i = 0; i < liArr.length; i++) {
    globalLegend.append('li')
                .attr('class', 'legend-color ' + liArr[i])
                .html('<span>' + percentify(globalStats[liArr[i]],globalTotal) + ' ' + liArrDesc[i] + '</span>');
  }
  globalLegend.append('li')
              .attr('class', 'legend-color total')
              .html('<span>' + globalTotal + ' Total</span>');

  svg.append('rect')
     .attr({
        class: 'overlay',
        width: width,
        height: height
     });

        svg.selectAll('path')
           .data(json.features)
           .enter()
           .append('path')
           .attr('d', path)
           .attr('stroke', colorPath[0])
           .attr('stroke-width',colorPath[1])
           .attr('id', function(d) {
             return d.id;
           })
            // Define country fill rules
           .style('fill', function(d){
              totalRespondents = d.properties.ATQ + d.properties.female + d.properties.male + d.properties.NR;
              var nonMale = (d.properties.female + d.properties.ATQ);
              if (nonMale/totalRespondents <= mapFillInc[0]/100) {
                 return colorGender[0];
              } else if (nonMale/totalRespondents <= mapFillInc[1]/100) {
                 return colorGender[1];
              } else if (nonMale/totalRespondents <= mapFillInc[2]/100) {
                 return colorGender[2];
              } else if (nonMale/totalRespondents <= mapFillInc[3]/100) {
                 return colorGender[3];
              } else if (nonMale/totalRespondents > mapFillInc[3]/100) {
                 return colorGender[4];
              } else {
                  return 'white';
              }
        })
        // Everything for tooltips
        .on('mouseover',function(d) {
          var graph = d3.select('#gender-map').node();
          var mousePos = d3.mouse(graph);
          mousePos[0] = (window.innerWidth-width)/2 + mousePos[0]
          mousePos[0] = mousePos[0] < (window.innerWidth/1.5) ? mousePos[0] : mousePos[0] - 340;

          var displayName = d.properties.displayName ? d.properties.displayName : d.properties.name.replace(/([A-Z])/g, ' $1').trim();
          if (typeof d.properties.ratio === "undefined") {
            // then custom message for no data
            var tooltipData = 'No respondents from '+displayName;
            totalRespondents = 0;
            d3.select('#em-graph')
              .style('display','none');
          } else {
            // create pie chart and legend
            pieChart([d.properties.ATQ, d.properties.female, d.properties.male, d.properties.NR],'#gender-graph');
            totalRespondents = d.properties.ATQ + d.properties.female + d.properties.male + d.properties.NR;
            var femaleText = '<li class="legend-color female"><span>' + percentify(d.properties.female,totalRespondents) + ' Female</span></li>';
            var maleText = '<li class="legend-color male"><span>' + percentify(d.properties.male,totalRespondents) + ' Male</span></li>';
            var atqText = '<li class="legend-color ATQ"><span>' + percentify(d.properties.ATQ,totalRespondents) + ' Genderqueer, <br>Trans* or Agender</span></li>';
            var noResponseText = d.properties.NR ? '<li class="legend-color NR"><span>' + percentify(d.properties.NR,totalRespondents) + ' no response</span></li>' : '';
            if (d.properties.male > d.properties.female) {
              var orderedText = maleText + femaleText + atqText;
            } else {
              var orderedText = femaleText + maleText + atqText;
            }
            var tooltipData = '<ul>' + orderedText + noResponseText + '<li class="legend-color"><span>' + totalRespondents + ' Total</span></li></ul>';

          // Create ethnic minority stacked bar graph
          // text positioning
          var percentage = parseInt(d.properties.ethnicMinority / totalRespondents * 100 );
          var percSide = 'left';
          if (percentage > 50) {
            percentage -= percentage*1.5;
            percSide = 'right';
          }
          d3.select('#em-graph')
            .style('display','block')
            .append('div')
            .style('width', function(){
              if (d.properties.ethnicMinority / totalRespondents > 0.94) {
                return '94%';
              }
              return percentify( d.properties.ethnicMinority, totalRespondents );
            })
            .html('<p>' + percentify( d.properties.ethnicMinority, totalRespondents) + '</p>')
            .select('p')
            .style(percSide, ( percentage + 5 + 'px' ));
          d3.select('#em-data')
            .html('<ul><li class="legend-color em"><span>Ethnic minority</span></li></ul>');
          }

          d3.select('#tooltip-title')
              .text(displayName + ' (' + totalRespondents + ')');
          d3.select('#gender-data')
            .html(tooltipData);
          d3.select('#tooltip').style('left', mousePos[0]+'px')
            .style('top', mousePos[1]+'px');
          // Show tooltip
          d3.select('#tooltip').classed('hidden', false);
        })
        .on('mouseout', function() {
          // Hide tooltip
          d3.select('#tooltip').classed('hidden', true);
          d3.select('#gender-graph').select('svg').remove();
          d3.select('#em-graph').select('div').remove();
          d3.select('#em-data').select('ul').remove();
        });
}
// END FUNCTION renderMap


/* PRIMARY CALLS */
d3.csv(surveyData, function(data) {
  loadData(data); // pulls survey data, counts gender and calculates gender ratio per country.
  d3.json(worldJSON,function(json) {
    // pulls loaded data into worldJSON
    json.features.forEach(mergeData);
    renderMap(json);
    sizeChange();
  });
});
d3.select(window)
  .on("resize", sizeChange);
