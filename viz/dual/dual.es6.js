// This file must be pre-processed for Safari, as it uses arrow functions.

var totals = {};

var add_dept = (dept, tally, links) => tally[dept] = (tally[dept] || 0.0) + links

queue().defer(d3.csv, "../data-6.1,6.3.csv")
       .defer(d3.csv, "../data-6.2.csv")
       .defer(d3.csv, "../data-6.4.csv")
       .await( (err, depts, research, teaching) => {
  if(err) { throw err }

  // regularise data
  depts.forEach( (d) => { d.faculty = +d.faculty; d.research_links = +d.research_links; d.teaching_links = +d.teaching_links })
  research.forEach( (d) => d.links = +d.links )
  teaching.forEach( (d) => d.links = +d.links )

  // prepare list of nodes; should be a superset of depts list
  research.forEach( (d) => { add_dept(d.department1, totals, d.links); add_dept(d.department2, totals, d.links); })
  teaching.forEach( (d) => { add_dept(d.department1, totals, d.links); add_dept(d.department2, totals, d.links); })

  // visualization proper

  var width = 1050,
      height = 450,
      innerRadius = Math.min(width / 2.0, height) * .41,
      outerRadius = innerRadius * 1.05,
      chordRadius = innerRadius * 0.99,
      labelRadius = innerRadius * 1.1;

  var fill = d3.scale.category20c()
    .domain(d3.keys(totals))

  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", "translate(" + width / 4.0 + "," + height / 2 + ")");

  function viz() {

    var links
    var nodes
    var padding = 0.01
    var chord_width = 0.05

    function chart(elem) {

      var total_nodes = d3.values(nodes).reduce( (a, b) => a + b, 0.0 )
      var labels = d3.keys(nodes).sort(d3.ascending)

      var k = (2 * Math.PI - padding * labels.length) / total_nodes

      var angles = {}
      var arcs = labels.map( (dept) => k * nodes[dept] )
      labels.forEach( (dept,i) => {
        var cum_sum = arcs.slice(0, i).reduce( (a,b) => a+b, 0.0)
        angles[dept] = cum_sum + padding * i
      })

      // outer circle

      var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .startAngle( (d) => angles[d] )
        .endAngle( (d) => angles[d] + k * nodes[d])

      var label_arc = d3.svg.arc()
        .innerRadius(labelRadius)
        .outerRadius(labelRadius)
        .startAngle( (d) => angles[d] )
        .endAngle( (d) => angles[d] + k * nodes[d])

      var dept = elem.append("g")
          .attr("class", "dept")
        .selectAll("g")
           .data(labels)
         .enter()
           .append("g")

      dept.append("path")
          .attr("fill", fill)
          .attr("d", arc)

      dept.append("text")
          .attr("opacity", 0)
          .attr("transform", (d) => "translate(" + label_arc.centroid(d) + ")")
          .attr("text-anchor", (d) => angles[d] < Math.PI ? "start" : "end")
          .text( (d) => d )

      // chords

      var chord = d3.svg.chord()
        .radius(chordRadius)
        .source( (d) => {
          var center = (angles[d.department1] * 2 + k * nodes[d.department1]) / 2.0
          return { startAngle: Math.max(center - chord_width, angles[d.department1]),
                   endAngle: Math.min(center + chord_width, angles[d.department1] + k * nodes[d.department1]) }
        })
        .target( (d) => {
          var center = (angles[d.department2] * 2 + k * nodes[d.department2]) / 2.0
          return { startAngle: Math.max(center - chord_width, angles[d.department2]),
                   endAngle: Math.min(center + chord_width, angles[d.department2] + k * nodes[d.department2]) }
        })

      elem.append("g")
          .attr("class", "chord")
        .selectAll("path")
          .data(links)
        .enter().append("path")
          .attr("d", chord)
          .style("fill", (d) => fill(d.department1))

    }

    chart.padding = function(value) {
      if(!arguments.length) return padding
      padding = value
      return chart
    }

    chart.links = function(value) {
      if(!arguments.length) return links
      links = value
      return chart
    }

    chart.nodes = function(value) {
      if(!arguments.length) return nodes
      nodes = value
      return chart
    }

    return chart
  }

  // behaviors

  function focus(chart, dept) {
    chart.selectAll(".chord path")
           .filter( (d) => !(dept === d.department1 || dept === d.department2) )
         .transition()
           .attr("opacity", 0.05)

    var affiliated = d3.set()
    chart.selectAll(".chord path")
       .filter( (d) => dept === d.department1 || dept == d.department2)
       .each( (d) => { affiliated.add(d.department1); affiliated.add(d.department2); } )

    chart.selectAll(".dept text")
      .filter( (d) => affiliated.has(d) || d === dept )
      .transition()
      .attr("opacity", 1.0)
  }

  function defocus() {
    svg.selectAll(".chord path")
      .transition()
      .attr("opacity", 1.0)
    svg.selectAll(".dept text")
      .transition()
      .attr("opacity", 0)
  }

  // generate chord diagrams

  var research_chord = svg.append("g")
    .call(viz()
      .links(research)
      .nodes(totals))

  var teaching_chord = svg.append("g")
    .attr("transform", "translate(" + width / 2.0 + ",0)")
    .call(viz()
      .links(teaching)
      .nodes(totals))

  svg.selectAll(".dept g")
    .on("mouseover", (g) => { focus(research_chord, g); focus(teaching_chord, g); })
    .on("mouseout", defocus)

})
