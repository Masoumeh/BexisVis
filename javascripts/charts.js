 
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
       var dataSet2 = {};
       var dateObj = {};
       var words = [];
       var cnt = 0;
       d3.json("data/testData2.json", function (data) {
         data.forEach(function (d){
        d.STARTDATE = moment(d.STARTDATE, ['D.MM.YY','D.M.YY','DD.MM.YY','DD.M.YY','DD:MM:YY','D/M/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY', 
            'DD/MM/YYYY', 'DD/MM/YYYY HH:MM', 'DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'YYYY-MM-DD', 'YYYY.MM.DD', 'YYYY DD MM', 
            'DD:MM:YYYY', 'DD.MM.YYYY', 'YYYY', 'YYYY MM', 'YYYY-MM', 'YYYY:MM', 'YYYY/MM']);
         var date = new Date(d.STARTDATE);
         
         var y = date.getFullYear();
         var m = date.getMonth() + 1;
         // For invalid year values like "200" or those which don't have aany value (i.e. STARTDATE = "")
         d.STARTDATE = moment((isNaN(y) || y < 1997 || y > moment())? "1996" : y + "-" + m + "-01" ).format("YYYY-MM-DD");
         d.STARTDATE = dateFormat.parse(d.STARTDATE);
         d.year = d3.time.year(d.STARTDATE);
         d.month = d3.time.month(d.STARTDATE);
         var wordNet = d.KEYWORDS.split(",");
         wordNet = wordNet.concat(d.PROSERVICE.split(','), d.ENVDESCR.split(','), d.BIODATATYPE.split(','));
        
         
        for (var i = 0; i < wordNet.length; i++) {
            //console.log('wordnet',JSON.stringify(wordNet));
             if (wordNet[i].toLowerCase() === "other" || wordNet[i].toLowerCase() === "none" 
                     || wordNet[i].toLowerCase() === "") {
                wordNet.splice(i, 1);
                i--;
            }
             else {
                wordNet[i] = wordNet[i].replace(/[^\w]/gi, '');
                if (!dataSet.hasOwnProperty(wordNet[i])) {
                  dataSet[wordNet[i]] = {
                    'frequency': 1,
                    'datasetIds': d.DATASETID
                   // 'startDates': d.STARTDATE
                  };
                } else {
                    var dates = [];
                            dates = dataSet[wordNet[i]]['startDates'];
                  dataSet[wordNet[i]] = {
                    'frequency': dataSet[wordNet[i]]['frequency'] + 1, 
                    'datasetIds': dataSet[wordNet[i]]['datasetIds'].toString() + ", " + d.DATASETID.toString()
                    //'startDate': dates.push(d.STARTDATE)
                  };
                }
                
                
            }
         };
         
          
         if(dateObj[d.STARTDATE] === undefined) {
             dateObj[d.STARTDATE] = wordNet;
         } else {
             var tmp = dateObj[d.STARTDATE];
             wordNet.forEach(function(str) {
           
                 if(tmp.indexOf(str) === -1) {
                     dateObj[d.STARTDATE].push(str);
                 }
             
         });
         }
         
//         if (!dateObj.hasOwnProperty(d.STARTDATE)) {
//             dateObj[d.STARTDATE] = {
//                 'words': wordNet
//             };
//         }
//         else {
//             dateObj[d.STARTDATE] = {
//                 'words': dateObj[d.STARTDATE]['words'].concat(wordNet)
//             };
//         }
         
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
      var minDate = timeline.bottom(1)[0];
      minDate = new Date(minDate.STARTDATE);
      var maxDate = timeline.top(1)[0];
      maxDate = new Date(maxDate.STARTDATE);
      
      var runMin = +timeline.bottom(1)[0];
      var runMax = +timeline.top(1)[0];
      var value;;

      console.log("dataset: ", JSON.stringify(dataSet));
//////////////////////////////////////////////////
// word cloud
/////////////////////////////////////////////////
      var fill = d3.scale.category20();
      var rscale = d3.scale.linear()
             .domain([0, d3.max(Object.keys(dataSet), function(d) {
                return parseInt(dataSet[d]['frequency']);
              })
             ]).range([10,40]);
      
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
        .rotate(function() { return ~~(Math.random() * 2) ; })
        .font("Impact")
        .fontSize(function(d) { return d.size; })
        .on("end", draw)
        .start();
      
      function draw( words) {
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
        .on("click", function (d, i){
            d3.select(this).style("font-weight", "Bold");
            var ids = dataSet[d.text]['datasetIds'];
            document.getElementById("dsIdList").innerHTML=ids;
         //var br = document.createElement("br");
         //var idList = document.createTextNode(ids);
         //d.appendChild(idList);
         //d.appendChild(br);

//         ids = ids.toString().split(", ");
//         console.log("ids ", JSON.stringify(ids));
//         var table = document.createElement('table');
//         table.setAttribute('id',d.text);
//         
//         var tbHead = document.createElement('th');
//         var header = document.createTextNode("dataset IDs");
//         tbHead.appendChild(header);
//         table.appendChild(tbHead);
////         if (ids.length < 10) {
//            for (var i = 0; i < ids.length; i++){
//                var tr = document.createElement('tr');
//               var td1 = document.createElement('td');
//
//               var text1 = document.createTextNode(ids[i]);
//               td1.appendChild(text1);
//               tr.appendChild(td1);
//               table.appendChild(tr);
//           }
//        document.getElementById("idList").appendChild(table);
//         }
//         else ()
        });
//      .on("mouseout", function (d, i){
//         d3.select(this).style("font-weight", "normal");
//          document.getElementById("dsIdList").innerHTML="";

//         var tbId = d.text;
//         var d = document.getElementById("dsIdList");
//         var b = document.getElementByTagName("br");
//         if (b) b.parentNode.removeChild(b);
//         if (d) 
//            d.parentNode.removeChild(d);
//      });
      }
////////////////////////////////////////////////////////////////////////////////
/////////////Bubble Chart///////////////////////////////////////////////////////
            // For datatable
      /********* Step4: Create the Visualisations ****/
      var cacheFilter = [];
      var cacheTimeLine = timeline;
      timeChart
              .width(1000)
              .height(100)
              .x(d3.time.scale().domain([minDate, maxDate]))
//              .xAxis(d3.svg.axis()
//                     //.scale(d3.time.scale().domain([new Date(minDate), new Date(maxDate)]))
//                     .orient("bottom"))
//                     //.tickFormat(d3.time.format("%Y")))
            
              //.brushOn(false)
              //.yAxis().ticks(8)
//              .xAxis().tickFormat(function() {
//         //function triggered onClick by element from DOM
//             $(".contents").unbind().click(function() {
////                  download(d3.csv.format(depthValue.top(500))."exportedData.csv")
//                console.log("filtered: ", JSON.stringify(timelinegp.top(10)));
//              });
//        })
              .margins({top: 10, right: 20, bottom: 30, left: 40})
              .dimension(timeline)
             // .mouseZoomable(true)
              .rangeChart(monthChart)
              .group(monthlyGroup)
              .renderlet(function(chart) {
                  if(cacheFilter.length!==0) {
                       var cloud = document.getElementById("cloud");
                       var texts = cloud.getElementsByTagName("text");
                       for(var i = 0; i<texts.length; i++) {
                           texts[i].style.fontWeight = "normal";
                       };
                      for(var key in dateObj) {
                          var d1 = new Date(key).getTime();
                          var d2 = new Date(cacheFilter[0][1]).getTime();
                          var d3 = new Date(cacheFilter[0][0]).getTime();
                          if(d1<d2 && d1>d3) {
                              dateObj[key].forEach(function(d){
                                 
                                  for(var i = 0; i<texts.length; i++) {
                                     if (texts[i].innerHTML === d) {
//                                         console.log("true");
                                         texts[i].style.fontWeight = "bold";
                                     } 
                                     //else texts[i].style.fontWeight = "normal"; 
                                         
                                     };
                              });
                          }
                      }
                  //console.log("tet " + JSON.stringify(cacheTimeLine.top(10)));
      }
//                  chart.selectAll("rect").on("click", function(d) {
//                      alert("mamad");
//                  });
               })
              //.elasticY(true)
              //.colors(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
              //.colorDomain([0,maxDate])
              
              
//                .on("renderlet", function(timeChart)
//             {
//                 timeChart.SelectAll("rect").on("click", function(d){
//                     console.log("click!");
//                 })
//             })
//          .renderlet(function(timeChart) {
//              dc.events.trigger(function() {
////                console.log(timeChart.filters());
////console.log("filter: ", JSON.stringify(timelinegp.top(2)));
//            });
//        })
//         .transitionDuration(500)
//        .centerBar(true)
//           timeChart.yAxis().ticks(10);   
//        .rangeChart(monthChart)
//        .brushOn(false)
//      .valueAccessor(function(p) { console.log(p); return p.value; })
        .filterHandler(function(dimension, filter){ cacheFilter = filter; })
//             dimension.filter(null);   
//             if (filter.length !== 0) {
//           
//               dimension.filter(filter);
//             }
//        
//            if(filter.length !== 0) {
//              //  dimension.filter(filter);
//            console.log(JSON.stringify(filter) + " " + JSON.stringify(timeline.top(10)));
//            }
//    	    return filter; // return the actual filter value
//	})
//
       .render();
//    console.log("filtered: ", JSON.stringify(timeline.top(10)));
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
//         .on("renderlet", function(monthChart)
//             {
//                 monthChart.SelectAll("path").on("click", function(d){
//                     console.log("click!");
//                 })
//             })
//        .on("click", function(d) {
//                alert("click");
//              })
        // Title can be called by any stack layer.
        .title(function (d) {
            value = d.value;// ? d.value.avg : d.value;
//            console.log("d: ", JSON.stringify(d));
            if (isNaN(value)) {
                value = 0;
            }
            return dateFormat(d.key) + '\n' + numberFormat(d.value);
        })
        .renderTitle(true);
        monthChart.onclick
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
       