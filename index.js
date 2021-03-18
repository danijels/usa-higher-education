const educationURL = "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json";
const countyURL = "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json";

const eduPromise = fetch(educationURL).then(response => response.json());
const countyPromise = fetch(countyURL).then(response => response.json());

Promise.all([eduPromise, countyPromise]).then(([edu, map]) => {
  const eduPercent = edu.map(obj => obj.bachelorsOrHigher);
  const colors = d3.schemeBlues[9];
  const min = d3.min(eduPercent);
  const max = d3.max(eduPercent);
  const step = (max - min) / colors.length;
  const dom = colors.map((v, i) => min + (i + 1) * step);
  /*A threshold scale that allows access to the correct color representation for each temperature value.
  Everything less than min gets the same color as min. The same goes for values bigger than max.*/
  const threshold = d3
    .scaleThreshold()
    .domain(dom)
    .range(colors);
  
  makeLegend(min, max, threshold);
  makeChart(edu, map, threshold);
  
});
/*--------------------------THE LEGEND-----------------------*/
function makeLegend(min, max, threshold) {
  const w = 300;
  const h = 50;
  const padding = 20;
  
  //THE SVG
  const svg = d3
    .select("#legend-container")
    .append("svg")
    .attr("id", "legend")
    .attr("width", w)
    .attr("height", h);
  //THE SCALE
  const scale = d3
    .scaleLinear()
    .domain([min, max])
    .range([padding, w-padding]);
  
  const axis = d3
    .axisBottom(scale)
  //Making the legend axis symetrical.
    .tickValues(threshold.domain().slice(0, threshold.domain().length - 1))
    .tickFormat(d => parseInt(d, 10) + "%");
  
  svg.append("g")
     .attr("transform", `translate(0, ${h-padding})`)
     .call(axis);
  /*Reminder: .invertExtent() works like this in this case: you provide it a color from your range and it returns you the extent of values which would get that color.*/
  const colorData = threshold.range().map(c => {
    const d = threshold.invertExtent(c);
    if (d[0] === undefined) d[0] = scale.domain()[0];
    return d;
  });
  
  svg.selectAll("rect")
     .data(colorData)
     .enter()
     .append("rect")
     .attr("x", d => scale(d[0]))
     .attr("y", h - padding - 20)
     .attr("width", d => scale(d[1]) - scale(d[0]))
     .attr("height", 20)
     .attr("fill", d => threshold(d[0]));
}

/*---------------------------THE MAP-------------------------*/
function makeChart(eduData, mapData, threshold) {
  const countiesData = mapData.objects.counties;
  const statesData = mapData.objects.states;
  /*I have two arrays of objects and the thing connecting them is the .id i.e. .fips. 
  In order to be able to access all the data for a county when I only have access to the fips 
  I created the following object.*/
  const fipsToData = {};
  eduData.forEach(obj => {
    fipsToData[obj.fips] = {
      area: obj.area_name,  
      degrees: obj.bachelorsOrHigher,
      iD: obj.fips,
      state: obj.state
    }
  });
  
  const w = 1000;
  const h = 630;
  
  const svg = d3
    .select("#container")
    .append("svg")
    .attr("width", w)
    .attr("height", h);
  
  //THE MAP
  //All code in this file connected to the geoPaths and topojson is thanks to the fCC example (https://codepen.io/freeCodeCamp/full/EZKqza).
  const path = d3.geoPath();
  
  //Counties
  const counties = svg
    .append("g")
    .selectAll("path")
    .data(topojson.feature(mapData, countiesData).features)
    .enter()
    .append("path")
    .attr("class", "county")   
    .attr("data-fips", d => d.id)
    .attr("data-education", d => fipsToData[d.id].degrees)
    .attr("d", path)
    .attr("fill", d => threshold(fipsToData[d.id].degrees));
  
  //States 
  svg.append("path")
     .data(topojson.mesh(mapData, statesData, (a, b) => a !== b))
     .attr("class", "states")
     .attr("d", path);
  
  //THE TOOLTIPS
  const tooltip = d3.select("#container")
    .append("div")
    .attr("id", "tooltip");
    
  function handleMouseOver(evt, d) {
    const data = fipsToData[d.id];
    tooltip
      .attr("data-education", data.degrees)
      .style("opacity", 1)
      .style("left", `${evt.pageX}px`)
      .style("top", `${evt.pageY}px`)
      .text(`${data.area}, ${data.state}: ${data.degrees}%`)
  }
  
  function handleMouseOut() {
    tooltip.style("opacity", 0);
  }
  counties
    .on("mouseover", handleMouseOver)
    .on("mouseout", handleMouseOut);
}