// Set the dimensions and margins of the graph
var margin = { top: 30, right: 100, bottom: 10, left: 50 },
    width = 950 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// Append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

// Parse the Data
const data_path = "./iris.csv"
d3.csv(data_path, function (data) {
    // Color scale: give me a species name, I return a color
    data.splice(150, 1);
    var color = d3.scaleOrdinal()
        .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
        .range(["#800080", "#FF8C00", "#008080"])  // Purple, Orange, Teal

    // Here I set the list of dimension manually to control the order of axis:
    dimensions = ["sepal length", "sepal width", "petal length", "petal width"]

    // For each dimension, I build a linear scale. I store all in a y object
    var y = {}
    for (d in dimensions) {
        // Find the max and min of each dimension
        let d_max = 0
        let d_min = 100
        for (let i = 0; i < data.length; i++) {
            if (data[i][dimensions[d]] > d_max) {
                d_max = data[i][dimensions[d]]
            }
            if (data[i][dimensions[d]] < d_min) {
                d_min = data[i][dimensions[d]]
            }
        }
        name = dimensions[d]
        y[name] = d3.scaleLinear()
            .domain([Math.floor(d_min), Math.ceil(d_max)]) // Same axis range for each group
            .range([height, 0])
    }

    // Build the X scale -> it finds the best position for each Y axis
    var x = {}
    var tmpx = d3.scalePoint()
        .range([0, width])
        .domain(dimensions);
    for (let i in dimensions) {
        name = dimensions[i];
        x[name] = tmpx(name);
    }

    // Add tooltip functionality
    var tooltip = d3.select("#tooltip");

    var highlight = function (d) {
        selected_specie = d.class;

        // First, every group turns grey
        d3.selectAll(".line")
            .transition().duration(200)
            .style("stroke", "lightgrey")
            .style("opacity", "0.2");

        // Second, the hovered species takes its color
        d3.selectAll("." + selected_specie)
            .transition().duration(200)
            .style("stroke", color(selected_specie))
            .style("opacity", "1");

        // Show tooltip
        tooltip
            .style("display", "block")
            .html(`<strong>Class:</strong> ${selected_specie}<br>
                <strong>Sepal Length:</strong> ${d["sepal length"]}<br>
                <strong>Sepal Width:</strong> ${d["sepal width"]}<br>
                <strong>Petal Length:</strong> ${d["petal length"]}<br>
                <strong>Petal Width:</strong> ${d["petal width"]}`)
            .style("left", d3.event.pageX + 10 + "px")
            .style("top", d3.event.pageY + "px");
    }

    var doNotHighlight = function (d) {
        d3.selectAll(".line")
            .transition().duration(200).delay(1000)
            .style("stroke", function (d) { return (color(d.class)) })
            .style("opacity", "0.5");

        // Hide tooltip
        tooltip.style("display", "none");
    }


    // The path function takes a row of the CSV as input, and returns x and y coordinates of the line to draw for this row.
    function path(d) {
        return d3.line()(dimensions.map(function (p) { return [x[p], y[p](d[p])]; }));
    }

    // Variables to store dragging information
    var dragg = [];
    var ID = [];

    // Draw the lines
    var tmp1 = svg.selectAll("myPath")
        .data(data)
        .enter()
        .append("path")
        .attr("class", function (d) { return "line " + d.class })  // 2 classes for each line: 'line' and the group name
        .attr("d", path)
        .style("fill", "none")
        .style("opacity", 0.5)
        .style("stroke", function (d) { return color(d.class); })  // Use new color scale
        .attr("stroke-width", 1.5)
        .on("mouseover", highlight)
        .on("mouseleave", doNotHighlight);

    // Draw the axes:
    var tmp = svg.selectAll("myAxis")
        .data(dimensions).enter()
        .append("g")
        .attr("class", "axis")
        .attr("transform", function (d) { return "translate(" + x[d] + ")"; })
        .each(function (d, index) {
            dragg[index] = d3.select(this).call(d3.axisLeft().ticks(5).scale(y[d]));
            ID[index] = index;
            dragg[index].call(d3.drag()
                .on("start", function () { })
                .on("drag", function (d) {
                    x[d] = Math.min(Math.max(d3.event.x, 0), width);
                    d3.select(this).attr("transform", "translate(" + x[d] + ")");

                    // Reorder dimensions based on dragging
                    for (var i = 0; i < dimensions.length; i++) {
                        for (var j = i + 1; j < dimensions.length; j++) {
                            if (x[dimensions[i]] >= x[dimensions[j]]) {
                                // Swap dimensions and adjust their positions
                                if (d == dimensions[i]) {
                                    x[dimensions[j]] = width / (dimensions.length - 1) * i;
                                    dragg[ID[j]].transition().duration(500)
                                        .attr("transform", "translate(" + x[dimensions[j]] + ")");
                                }
                                if (d == dimensions[j]) {
                                    x[dimensions[i]] = width / (dimensions.length - 1) * j;
                                    dragg[ID[i]].transition().duration(500)
                                        .attr("transform", "translate(" + x[dimensions[i]] + ")");
                                }
                                // Swap dimension order
                                [dimensions[i], dimensions[j]] = [dimensions[j], dimensions[i]];
                                [ID[i], ID[j]] = [ID[j], ID[i]];
                                break;
                            }
                        }
                    }
                    tmp1.transition().duration(500).attr("d", path);  // Update lines based on new axis positions
                })
            );
        });

    // Add axis titles
    tmp.append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function (d) { return d; })
        .style("fill", "black");

    // Add legend with new colors:
    svg.append("text")
        .attr("text-anchor", "start")
        .attr("x", width + 10)
        .attr("y", height - 40)
        .text("setosa")
        .style("fill", "#800080");  // Purple

    svg.append("text")
        .attr("text-anchor", "start")
        .attr("x", width + 10)
        .attr("y", height - 20)
        .text("versicolor")
        .style("fill", "#FF8C00");  // Orange

    svg.append("text")
        .attr("text-anchor", "start")
        .attr("x", width + 10)
        .attr("y", height)
        .text("virginica")
        .style("fill", "#008080");  // Teal
});
