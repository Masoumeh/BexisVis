 
//    String.prototype.replaceAt=function(character) {
//    return character + this.substr(2, this.length);
//    };
//    Date.prototype.yyyymmdd = function() {
//      var yyyy = this.getFullYear().toString();
//      var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
//      //var dd  = "01";
//      return yyyy + "-" + (mm[1]?mm:"0"+mm[0]) + "-" + "01"; 
//    };
/***       Step0: Load data ****/	
       var dataStr= [];
       var dateFormat = d3.time.format("%Y-%m-%d");
       var numberFormat = d3.format('.2f');
       var dataSet = {};//new Object;//{word: "", frequency: 0, datasetIds: ""};
       var words = [];
       var cnt = 0;
       d3.json("data/testData2.json", function (data) {
         data.forEach(function (d){
        d.STARTDATE = moment(d.STARTDATE, ['D.MM.YY','D.M.YY','DD.MM.YY','DD.M.YY','DD:MM:YY','D/M/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY', 
            'DD/MM/YYYY', 'DD/MM/YYYY HH:MM', 'DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'YYYY-MM-DD', 'YYYY.MM.DD', 'YYYY DD MM', 
            'DD:MM:YYYY', 'DD.MM.YYYY', 'YYYY', 'YYYY MM', 'YYYY-MM', 'YYYY:MM', 'YYYY/MM']);
         var date = new Date(d.STARTDATE);
         
         var y = date.getFullYear();
         var m = date.getMonth() + 1
         // For invalid year values like "200" or those which don't have aany value (i.e. STARTDATE = "")
         d.STARTDATE = moment((isNaN(y) || y < 1997 || y > moment())? "1996" : y + "-" + m + "-01" ).format("YYYY-MM-DD");
         d.STARTDATE = dateFormat.parse(d.STARTDATE);
         d.year = d3.time.year(d.STARTDATE);
         d.month = d3.time.month(d.STARTDATE);
//         d.STARTDATE = new Date(d.STARTDATE);
         d.DATASETID = +d.DATASETID;
         d.KEYWORDS = d.KEYWORDS.split(",");
         d.PROSERVICE = d.PROSERVICE.split(",");
         d.ENVDESCR = d.ENVDESCR.split(",");
         d.BIODATATYPE = d.BIODATATYPE.split(",");
         d.wordNet = d.KEYWORDS.concat(d.PROSERVICE, d.ENVDESCR, d.BIODATATYPE);
         d.dataSet = dataSet;
        for (var i = 0; i < d.wordNet.length; i++) {
             if (d.wordNet[i].toLowerCase() === "other" || d.wordNet[i].toLowerCase() === "none" 
                     || d.wordNet[i].toLowerCase() === "") {
                d.wordNet.splice(i, 1);
                i--;
            }
             else {
//                 console.log("valid: ", d.wordNet[i]);
                d.wordNet[i] = d.wordNet[i].replace(/[^\w]/gi, '');
                if (!dataSet.hasOwnProperty(d.wordNet[i])) {
                  dataSet[d.wordNet[i]] = {
                    'frequency': 1,
                    'datasetIds': d.DATASETID
                  };
                } else {
//                    console.log("tekrari: ", d.wordNet[i]);
                  dataSet[d.wordNet[i]] = {
                    'frequency': dataSet[d.wordNet[i]]['frequency'] + 1, 
                    'datasetIds': dataSet[d.wordNet[i]]["datasetIds"].toString() + ", " + d.DATASETID.toString()
                  }
                }
            }
         };
//         d.words = dataSet.keys();

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
//         console.log("dataSet: ", JSON.stringify(dataSet));

        /****     Step1: Create the dc.js chart objects to div   ****/
       var timeChart = dc.barChart(".content");
       var monthChart = dc.lineChart("#monthChart");
//       var dataTable = dc.dataTable("#table_view");
//       var bubbleChart = dc.bubbleChart("#bubble-chart");
              /*********  Step2:	Run data through crossfilter	  ***/   
      var ndx = crossfilter(data);
      var all = ndx.groupAll();
      dc.dataCount("#dc-data-count")
    .dimension(ndx)
    .group(all);
      /******   Step3: 	Create Dimension that we'll need   ******/
      var timeline = ndx.dimension(function(d){/*console.log("id: ", d.DATASETID,"sdate:  ",d.STARTDATE, "year: ", d.year);*/ return d.year;});
      var timelinegp = timeline.group().reduceCount(function(d) {/*console.log("dsID:  ", d.DATASETID);*/ return d.DATASETID;});
      var months = ndx.dimension(function (d) { return d.month;});
      var monthlyGroup = months.group().reduceCount(function (d) {
        return d.DATASETID;
      });
      var wordDimension = ndx.dimension(function (d) {
        return Object.keys(dataSet);
      });
      var wordGroup = wordDimension.group().reduceCount(//add
                    function(p, v) {
                        ++p.count;
                        p.datasetCount += +v.key()['datasetIds'];
                        p.frequency = +v.key()['frequency'];
                        return p;
                    },
                    //remove
                    function(p, v) {
                        --p.count;
                        p.datasetCount -= +v.key()['datasetIds'];
                        p.frequency = +v.key()['frequency'];
                        return p;
                    },
                    //init
                    function() {
                        return {count:0, frequency:0, datasetCount:0};
                    }
                 );
      var minDate = timeline.bottom(1)[0];
      minDate = new Date(minDate.STARTDATE);
      var maxDate = timeline.top(1)[0];
      maxDate = new Date(maxDate.STARTDATE);
      
      var runMin = +timeline.bottom(1)[0];
      
      var runMax = +timeline.top(1)[0];
//////////////////////////////////////////////////
// word cloud
/////////////////////////////////////////////////
      var fill = d3.scale.category20();
      var rscale = d3.scale.linear()
      .domain([1, 500]).range([10,50]);
      d3.layout.cloud()
              .size([700, 700])
              .words(Object.keys(dataSet).map(function(d) {
                 var freq = parseInt(dataSet[d]['frequency']);
                 freq = rscale(freq);
                 var obj = {text: d, size: freq, ids: dataSet[d]['datasetIds']};
                 //console.log("obj: ", JSON.stringify(obj));
                 return {text: d, size: freq, ids: dataSet[d]['datasetIds']};
              }))
              .padding(5)
              .rotate(function() { return ~~(Math.random() * 2) * 90; })
              .font("Impact")
              .fontSize(function(d) { return d.size; })
              .on("end", draw)
              .start();
      function draw(words) {
        d3.select("#cloud").append("svg")
        .attr("width", 800)
        .attr("height", 800)
        .append("g")
        .attr("transform", "translate(400,400)")
        .selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        
        .style("fill", function(d, i) { return fill(i); })
        .style("display", "inline-block")
        .style("margin-right", "10px" )
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; })
        .on("mouseover", function (d, i){
         d3.select(this).style("font-weight", "Bold");
         var ids = dataSet[d.text]['datasetIds'];
         ids = ids.toString().split(", ");
         console.log("ids ", JSON.stringify(ids));
         var table = document.createElement('table');
         table.setAttribute('id',d.text);
         
         var tbHead = document.createElement('th');
         var header = document.createTextNode("dataset IDs");
         tbHead.appendChild(header);
         table.appendChild(tbHead);
//         if (ids.length < 10) {
            for (var i = 0; i < ids.length; i++){
                var tr = document.createElement('tr');
               var td1 = document.createElement('td');

               var text1 = document.createTextNode(ids[i]);
               td1.appendChild(text1);
               tr.appendChild(td1);
               table.appendChild(tr);
           }
        document.getElementById("idList").appendChild(table);
//         }
//         else ()
        })
      .on("mouseout", function (d, i){
         d3.select(this).style("font-weight", "normal");
         var tbId = d.text;
         var tb = document.getElementById(tbId);
         if (tb) 
            tb.parentNode.removeChild(tb);
      });
      }
////////////////////////////////////////////////////////////////////////////////
/////////////Bubble Chart///////////////////////////////////////////////////////
//        bubbleChart.width(990)
//                    .height(250)
//                    .margins({top: 10, right: 50, bottom: 30, left: 40})
//                    .dimension(wordDimension)
//                    .group(wordGroup)
//                    .transitionDuration(1500)
////                    .colors(["#a60000", "#ff0000", "#ff4040", "#ff7373", "#67e667", "#39e639", "#00cc00"])
//                    .colorDomain([-12000, 12000])
//                    .colorAccessor(function (d) {
//                        return d.value.count;
//                    })
////                    .keyAccessor(function (p) {
////                        return p.value.absGain;
////                    })
////                    .valueAccessor(function (p) {
////                        return p.value.percentageGain;
////                    })
//                    .radiusValueAccessor(function (p) {
//                        return p.value.frequency;
//                    })
//                    .maxBubbleRelativeSize(0.3)
////                    .x(d3.scale.linear().domain([-2500, 2500]))
////                    .y(d3.scale.linear().domain([-100, 100]))
//                    .r(d3.scale.linear().domain([0, 4000]))
////                    .elasticY(true)
////                    .yAxisPadding(100)
////                    .elasticX(true)
////                    .xAxisPadding(500)
////                    .renderHorizontalGridLines(true)
////                    .renderVerticalGridLines(true)
////                    .renderLabel(true)
////                    .renderTitle(true)
//                    .label(function (p) {
//                       // return p.key.getFullYear();
//                    })
//                    .title(function (p) {
////                        return p.key.getFullYear()
////                                + "\n"
////                                + "Index Gain: " + numberFormat(p.value.absGain) + "\n"
////                                + "Index Gain in Percentage: " + numberFormat(p.value.percentageGain) + "%\n"
////                                + "Fluctuation / Index Ratio: " + numberFormat(p.value.fluctuationPercentage) + "%";
//                    });

      

            // For datatable
      /********* Step4: Create the Visualisations ****/
      timeChart
              .width(1000)
              .height(100)
              .x(d3.time.scale().domain([minDate, maxDate]))
              .xAxis(d3.svg.axis()
                     //.scale(d3.time.scale().domain([new Date(minDate), new Date(maxDate)]))
                     .orient("bottom"))
                     //.tickFormat(d3.time.format("%Y")))
            
              //.brushOn(false)
              //.yAxis().ticks(8)
              .margins({top: 10, right: 20, bottom: 30, left: 40})
              .dimension(timeline)
             // .mouseZoomable(true)
              .rangeChart(monthChart)
              .group(monthlyGroup)
              //.elasticY(true)
              //.colors(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
              //.colorDomain([0,maxDate])
//                .on("renderlet", function(timeChart)
//             {
//                 timeChart.SelectAll("rect").on("click", function(d){
//                     console.log("click!", d);
//                 });
//             });
//         .transitionDuration(500)
//        .centerBar(true);
//           timeChart.yAxis().ticks(10);   
//        .rangeChart(monthChart)
//        .brushOn(false)      
       .render();
    
    monthChart
        .renderArea(true)
        .width(990)
        .height(400)
        //.transitionDuration(1000)
        //.mouseZoomable(true)
        .margins({top: 10, right: 20, bottom: 30, left: 40})
        .dimension(timeline)
        .brushOn(false)
//        .elasticY(true)
//        .elasticX(true)
        .group(timelinegp)
        .rangeChart(timeChart)
        .x(d3.time.scale().domain([minDate, maxDate]))
        .elasticY(true)
        .renderHorizontalGridLines(true)
        //.y(d3.scale.linear().domain([dsNumMin, dsNumMax]))
        .round(d3.time.month.round)
        .xUnits(d3.time.months)
        //.xAxis().ticks(20)

//        .yAxis(d3.svg.axis()
//        .ticks(10));
          .xAxis(d3.svg.axis()
                //.scale(d3.time.scale().domain([new Date(minDate), new Date(maxDate)]))
                .orient("bottom")
                .tickFormat(d3.time.format("%b %Y")))
        
        // Title can be called by any stack layer.
        .title(function (d) {
            var value = d.value;// ? d.value.avg : d.value;
            if (isNaN(value)) {
                value = 0;
            }
            return dateFormat(d.key) + '\n' + numberFormat(d.value);
        })
        .renderTitle(true);
        
        //monthChart.yAxis().ticks(16);
        monthChart.render();
        //timeChart.render();
        
////        var dataview = ndx.dimension(timeline).group(function() { return "Dataset ID"
////            })
////            .size(data.length)
////        .columns([
////            function(d) { return d.DATASETID; }
////    ]);
////    
////        console.log("dataview: ", JSON.stringify(dataview));
//        // Table of  data
//       dataTable.width(200).height(200)
//       .dimension(timeline)
//            .group(function() { return "Dataset ID"
//            })
//            .size(data.length)
//        .columns([
//            function(d) { console.log("length ", data.length);return d.DATASETID; }
//    ]);
    dc.renderAll();
        
    });
       