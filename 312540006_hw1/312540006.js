d3.csv("http://vis.lab.djosix.com:2024/data/iris.csv", function (data) {
    data = data.slice(0, -1);

    var margin = { top: 20, right: 20, bottom: 90, left: 50 },
        width = 520 - margin.left - margin.right,
        height = 560 - margin.top - margin.bottom;

    let x_label = "sepal length";
    let y_label = "sepal width";

    // Add tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    function scatter() {
        // Remove any existing SVG for new plots
        d3.select("#my_dataviz").select('svg').remove();

        // Create SVG area
        var svg = d3.select("#my_dataviz")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Set up the scales for x and y axes
        let x_max = d3.max(data, d => +d[x_label]);
        let y_max = d3.max(data, d => +d[y_label]);
        let x_min = d3.min(data, d => +d[x_label]);
        let y_min = d3.min(data, d => +d[y_label]);

        var x = d3.scaleLinear()
            .domain([Math.floor(x_min), Math.ceil(x_max)])
            .range([0, width]);

        var y = d3.scaleLinear()
            .domain([Math.floor(y_min), Math.ceil(y_max)])
            .range([height, 0])
            .nice();

        // Add gridlines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(10)
                .tickSize(-height)
                .tickFormat("")
            );

        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).ticks(10)
                .tickSize(-width)
                .tickFormat("")
            );

        // Draw the axes
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(10));

        svg.append("g")
            .call(d3.axisLeft(y).ticks(10));

        // Add labels for the x and y axes
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.top + 40)
            .text(x_label);

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .text(y_label);

        // Color and shape scale
        var color = d3.scaleOrdinal()
            .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
            .range(["#ff7f0e", "#2ca02c", "#1f77b4"]);

        var shape = d3.scaleOrdinal()
            .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
            .range([d3.symbolCircle, d3.symbolSquare, d3.symbolTriangle]);

        // Add scatter plot circles
        var symbolGenerator = d3.symbol();

        svg.selectAll(".symbol")
            .data(data)
            .enter()
            .append("path")
            .attr("d", d => symbolGenerator.type(shape(d["class"]))())
            .attr("transform", function (d) {
                return "translate(" + x(d[x_label]) + "," + y(d[y_label]) + ")";
            })
            .style("fill", d => color(d["class"]))
            .style("stroke", "black")
            .style("stroke-width", 0.5)
            .on("mouseover", function (event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html("Class: " + d["class"] + "<br>X: " + d[x_label] + "<br>Y: " + d[y_label])
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add legend
        var legend = svg.selectAll(".legend")
            .data(color.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", color);

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(d => d.replace("Iris-", ""));
    }

    // Handle radio button changes for axis updates
    const radioButtons = document.querySelectorAll('input[name="X_axis"], input[name="Y_axis"]');
    for (const radioButton of radioButtons) {
        radioButton.addEventListener('change', showSelected);
    }

    function showSelected(e) {
        if (this.checked) {
            if (this.name == "X_axis") {
                x_label = this.value;
            } else if (this.name == "Y_axis") {
                y_label = this.value;
            }
            scatter();
        }
    }

    // Initial scatter plot
    scatter();
});
