 
/***       Step0: Load data ****/	
       var dataStr= [];
       var dateFormat = d3.time.format("%Y-%m-%d");
       var numberFormat = d3.format('.2f');
       var dataSet = {};
       var dataSet2 = {};
       var dateObj = {};
       var words = [];
       var cnt = 0;
       d3.json("data/testData2.json", function (data) {
         data.forEach(function (d){
             //Parse dates with moment.js formats
        d.STARTDATE = moment(d.STARTDATE, ['D.MM.YY','D.M.YY','DD.MM.YY','DD.M.YY','DD:MM:YY','D/M/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY', 
            'DD/MM/YYYY', 'DD/MM/YYYY HH:MM', 'DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'YYYY-MM-DD', 'YYYY.MM.DD', 'YYYY DD MM', 
            'DD:MM:YYYY', 'DD.MM.YYYY', 'YYYY', 'YYYY MM', 'YYYY-MM', 'YYYY:MM', 'YYYY/MM']);
        // make javascript Date object out of date string
         var date = new Date(d.STARTDATE);
         //get year and month to manipulate the invalid dates
         var y = date.getFullYear();
         var m = date.getMonth() + 1;
         // For invalid year values like "200" or those which don't have aany value (i.e. STARTDATE = "")
         d.STARTDATE = moment((isNaN(y) || y < 1997 || y > moment())? "1996" : y + "-" + m + "-01" ).format("YYYY-MM-DD");
         d.STARTDATE = dateFormat.parse(d.STARTDATE);
         d.year = d3.time.year(d.STARTDATE);
         d.month = d3.time.month(d.STARTDATE);
         // for each dataset wordNet contains "keywords", "Processec and Services", "Envirormental descriptors" 
         //"Bio data types" 
         var wordNet = d.KEYWORDS.split(",");
         wordNet = wordNet.concat(d.PROSERVICE.split(','), d.ENVDESCR.split(','), d.BIODATATYPE.split(','));
        // Making a dataSet out of clean wordNet 
        var reg = /^\d+$/;
        for (var i = 0; i < wordNet.length; i++) {
            // Delete all "other" and "none" or empty values from wordNet
             if (wordNet[i].toLowerCase() === "other" || wordNet[i].toLowerCase() === "none" 
                     || wordNet[i].toLowerCase() === "" ) {
                wordNet.splice(i, 1);
                i--;
            }
            // make dataSet object to map each word to the dataset Ids and its frequency in all datasets
             else {
                // delete the special characters from the words
                wordNet[i] = wordNet[i].replace(/[^\w]/gi, '');
                //Populate the dataSet object by making a map for new words
                if (!dataSet.hasOwnProperty(wordNet[i])) {
                  dataSet[wordNet[i]] = {
                    'frequency': 1,
                    'datasetIds': d.DATASETID
                  };
                  // updating the values for existing maps/keys (means words)
                } else {
                    var dates = [];
                            dates = dataSet[wordNet[i]]['startDates'];
                  dataSet[wordNet[i]] = {
                      // Updating frequency of a word in map by addin 1
                    'frequency': dataSet[wordNet[i]]['frequency'] + 1, 
                    // Updating dataset Ids of a word in map by joingn to the existing list
                    'datasetIds': dataSet[wordNet[i]]['datasetIds'].toString() + ", " + d.DATASETID.toString()
                  };
                }   
            }
         };
         // populating the dateObj to make a map from start dates to a list of the words (wordNet)
         if(dateObj[d.STARTDATE] === undefined) {
             dateObj[d.STARTDATE] = wordNet;
         } 
         else {
             var tmp = dateObj[d.STARTDATE];
             wordNet.forEach(function(str) {
                 if(tmp.indexOf(str) === -1) {
                     dateObj[d.STARTDATE].push(str);
                 }
             
            });
         }

//        // The next 3 lines can be skipped! 
////        var parseDate = d3.time.format("%m %Y").parse;
////         
////         var formatDate = d3.time.format("%Y");
////       
////         //d.year  =  parseDate.parse(d.year.toString());
////         parseDate((d.STARTDATE).toString());
//         
//         //d.dd = formatDate.parse(d.date);
//        // d.month = d3.time.month(d.STARTDATE);
         });

 /****     Step1: Create the dc.js chart objects to div   ****/
       // charts definition
       var timeChart = dc.barChart(".content");
       var monthChart = dc.lineChart("#monthChart");
//       var dataTable = dc.dataTable("#table_view");
//       var bubbleChart = dc.bubbleChart("#bubble-chart");
              
/*********  Step2:	Run data through crossfilter	  ***/   
      
      var ndx = crossfilter(data);
      // these line are added for datatable. To be used later
      var all = ndx.groupAll();
      dc.dataCount("#dc-data-count")
        .dimension(ndx)
        .group(all);
      /******   Step3: 	Create Dimension that we'll need   ******/
      // Dimensions definition
      var timeline = ndx.dimension(function(d){ return d.year;});
      var timelinegp = timeline.group().reduceCount(function(d) { return d.DATASETID;});
      var months = ndx.dimension(function (d) { return d.month;});
      var monthlyGroup = months.group().reduceCount(function (d) {
        return d.DATASETID;
      });
      // Min and Max dates for timeChart
      var minDate = timeline.bottom(1)[0];
      minDate = new Date(minDate.STARTDATE);
      var maxDate = timeline.top(1)[0];
      maxDate = new Date(maxDate.STARTDATE);
 
      
/********* Step4: Create the Visualisations ****/

//////////////////////////////////////////////////
// word cloud
/////////////////////////////////////////////////
      // D3 color category for wordcloud
      var fill = d3.scale.category10();
      // D3 scale for font sizes in wordcloud
      var rscale = d3.scale.linear()
        .domain([0, d3.max(Object.keys(dataSet), function(d) {
           return parseInt(dataSet[d]['frequency']);
         })
        ]).range([10,40]);
        // scale for font chages cases. Not used yet
        var fScale = d3.scale.linear()
             .domain([10,40]).range([15,30]);
      // Main SVG element
      var svg = d3.select('#cloud').append('svg')
			.attr('width', 800)
			.attr('height', 800);
      // wordcloud creation
      d3.layout.cloud()
        .size([800, 800])
        // make a key/value structure out of dataSet to be used as word could data.
        // constructs an object with text, frequency dataset Ids structure
        .words(Object.keys(dataSet).map(function(d) {
           var freq = parseInt(dataSet[d]['frequency']);
           freq = rscale(freq);
           return {text: d, size: freq, ids: dataSet[d]['datasetIds']};
        }))
        .padding(5)
        // Rotation of the words in word cloud. Now all words all horizontal
        .rotate(function() { return ~~(Math.random() * 2) ; })
        .font("Impact")
        .fontSize(function(d) { return d.size; })
        .on("end", draw)
        .start();
      
      // Wordcloud draw function
      function draw( words) {
        var vis = svg.selectAll('text');
        var text = svg.append('g')
                        .attr('transform', 'translate(400,400)')
                        .selectAll("text")
                        .data(words)
                        .enter()
                        .append("text");
        // Text element styles and attributes
        text 
            .style("font-size", function(d) { return d.size + "px"; })
            .style("fill", function(d, i) { return fill(i); })
            .style("display", "inline-block")
            .style("margin-right", "10px")
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; })
            //Text click event
            .on("click", function (d, i){
                // Firse reset the normal font weight of all texts
                d3.selectAll("text")
                   .style("font-weight", "normal")
                   .style("opacity", "1");  
               // Change font weight of the cliked text to bold and show the related dataset ids 
                d3.select(this)
                   .style("font-weight", "Bold");
                var ids = dataSet[d.text]['datasetIds'];
                var idArr = ids.toString().split(", ");
                var tb = document.createElement("TABLE");
                tb.style.backgroundColor= "lightblue";
                var rowCount = Math.floor(idArr.length / 20); // 20 is the number of columns in each row
                var cnt = 0;
                //Add the data rows.
                for (var i = 0; i <= rowCount; i++) {
                    row = tb.insertRow(i);
                    for (var j = 0; j < 30; j++) {
                        var cell = row.insertCell(j);
                        if (cnt < idArr.length) {
                            cell.innerHTML = idArr[cnt];
                            // Add left border to cells except the first one
                            if (j !== 0) cell.style.borderLeft = "1px solid black";
                            cell.style.borderBottom = "1px solid black";
                            cell.style.borderUp = "1px solid black";
                            cnt++;
                        }
                        else break;
                   }
                   // Add botom border to the rows except the last one
                     row.style.borderBottom = "1pt solid black";
                }
                var dvTable = document.getElementById("dsIdList");
                dvTable.innerHTML = "";
                dvTable.appendChild(tb);
            });
      }
////////////////////////////////////////////////////////////////////////////////
/////////////Time Chart (bar chart)///////////////////////////////////////////////////////
      // variable for holing the min/max values of brush in timeChart
      var cacheFilter = [];
      
      timeChart
              .width(500)
              .height(100)
              // define the domain of x axis
              .x(d3.time.scale().domain([minDate, maxDate]))
              .margins({top: 10, right: 20, bottom: 30, left: 40})
              // dimension
              .dimension(timeline)
              // make the month chart focusable with brush filter
              .rangeChart(monthChart)
              .group(monthlyGroup)
              // Get the min/max date values of the brush 
              // and highlight the related words in wordcloud 
              .renderlet(function(chart) {
                  if(cacheFilter.length!==0) {
                       var cloud = document.getElementById("cloud");
                       var texts = cloud.getElementsByTagName("text");
                       // reset the style of text elements
                       for(var i = 0; i<texts.length; i++) {
                          texts[i].style.opacity = "0.5";
                          texts[i].style.fontWeight = "normal";
                       };
                       // for each date in dateObj and min.max date values of brush, makes a js Date object
                      for(var key in dateObj) {
                          var d1 = new Date(key).getTime();
                          var d2 = new Date(cacheFilter[0][1]).getTime();
                          var d3 = new Date(cacheFilter[0][0]).getTime();
                          //if the dates to see if the date related to a word/dataset is in the brushed time span 
                          if(d1<d2 && d1>d3) {
                              //for each word belonging to this specific date (current key in the dateObj)
                              //changes the related text elements
                              dateObj[key].forEach(function(d){
                                  for(var i = 0; i<texts.length; i++) {
                                      // if the text element holds the word (which is in the dataset with current date)
                                     if (texts[i].innerHTML === d) {
                                         // change the text style
                                         texts[i].style.fontWeight  = "bold";
                                         texts[i].style.opacity = "1.0";
                                     }
                                  };
                              }); 
                          }
                      }
                    }
               })
        .filterHandler(function(dimension, filter){ cacheFilter = filter; })
        .render();
       
/////////////////////////////////////////////////////////////////////////////
///////Month chart (line chart)/////////////////////////////////////////////

    monthChart
        .renderArea(true)
        .width(500)
        .height(400)
        .margins({top: 10, right: 20, bottom: 30, left: 40})
        // define the dimension
        .dimension(timeline)
        // No need for brush in this chart
        .brushOn(false)
        .group(timelinegp)
        .rangeChart(timeChart)
        .x(d3.time.scale().domain([minDate, maxDate]))
        .elasticY(true)
        .renderHorizontalGridLines(true)
        .round(d3.time.month.round)
        .xUnits(d3.time.months)
        .xAxis(d3.svg.axis()
            .orient("bottom")
            // the format which should be shown on x axis labels, "Month Year"
            .tickFormat(d3.time.format("%b %Y")))
        // make a tooltip for the line chart to shoe the key(x)/value(y) of chart by mouseover
        .title(function (d) {
            var value;
            if (isNaN(value)) {
                value = 0;
            }
            // format to be shown in tooltip
            return dateFormat(d.key) + '\n' + numberFormat(d.value);
        })
        .renderTitle(true);
        monthChart.render();

    dc.renderAll();
        
    });
       