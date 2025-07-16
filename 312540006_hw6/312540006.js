// set the dimensions and margins of the graph
const margin = { top: 20, right: 30, bottom: 0, left: 50 };  // Increase left margin
    width = 560 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// append the svg object to the body of the page
const svg = d3.select("#dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const data_path = "http://vis.lab.djosix.com:2024/data/ma_lga_12345.csv";

// Parse the Data
d3.csv(data_path).then(function (data) {
    var data_1 = {};
    for (let i = 0; i < data.length; i++) {
        if (!(data[i]["saledate"] in data_1)) {
            data_1[data[i]["saledate"]] = {
                "house with 2 bedrooms": 0,
                "house with 3 bedrooms": 0,
                "house with 4 bedrooms": 0,
                "house with 5 bedrooms": 0,
                "unit with 1 bedrooms": 0,
                "unit with 2 bedrooms": 0,
                "unit with 3 bedrooms": 0,
            };
        }
        const class_str = data[i]["type"] + " with " + data[i]["bedrooms"] + " bedrooms";
        data_1[data[i]["saledate"]][class_str] = +data[i]["MA"];
    }

    var data_2 = [];
    for (const [key, value] of Object.entries(data_1)) {
        value["date"] = moment(key, "DD/MM/YYYY").toDate();
        data_2.push(value);
    }

    data_2.sort(function (a, b) {
        return a["date"] - b["date"];
    });
    data = data_2;

    // List of groups = header of the csv files
    const keys = Object.keys(data[0]).slice(0, -1);

    // color palette
    const color = d3.scaleOrdinal()
        .domain(keys)
        //.range(d3.schemeTableau10);
        .range(d3.schemeCategory10);

    // Create interactive reordering blocks
    var blocks = document.getElementById('blocks');
    let html = "";
    for (let i = 0; i < keys.length; i++) {
        html += `<div class="list-group-item" style="background-color:${color(keys[i])}">${keys[i]}</div>`;
    }
    blocks.innerHTML = html;

    var sortable = new Sortable(blocks, {
        animation: 150,
        onChange: function (evt) {
            let blocks_divs = blocks.getElementsByTagName("div");
            let keys = [];
            for (let i = 0; i < blocks_divs.length; i++) {
                keys.push(blocks_divs[i].textContent);
            }
            render(keys);
        }
    });

    render(keys);

    function render(keys) {
        svg.selectAll('*').remove();
        let new_keys = Array.from(keys).reverse();
        //let new_keys = Array.from(keys);

        // Stack the data
        const stackedData = d3.stack()
            //.offset(d3.stackOffsetWiggle)  // Use wiggle for smoother streams
            .offset(d3.stackOffsetSilhouette)
            .keys(new_keys)
            (data);

        // X axis
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d["date"]))
            .nice()  // Adds padding to the axis
            .range([0, width]);


        svg.append("g")
            .attr("transform", `translate(0, ${height * 0.8})`)
            .call(d3.axisBottom(x)
                .ticks(5)  // Adjust the number of ticks as needed
                .tickFormat(d3.utcFormat("%B %d, %Y")))
            .selectAll("text")  // Select the tick labels
            .attr("transform", "rotate(-45)")  // Rotate the labels by 45 degrees
            .style("text-anchor", "end");  // Align the labels to the end
        
        // Customization for date ticks    
        svg.selectAll(".tick line").attr("stroke", "#b8b8b8");

        // Y axis
        const yDomain = [
            d3.min(stackedData, layer => d3.min(layer, d => d[0])),
            d3.max(stackedData, layer => d3.max(layer, d => d[1]))
        ];

        const y = d3.scaleLinear()
            .domain(yDomain)
            .nice()  // Adds a bit of padding to the Y-axis range
            .range([height, 0]);

        // create a tooltip
        const Tooltip = svg
            .append("text")
            .attr("x", 10)  // Adjust the starting x position
            .attr("y", 30)  // Adjust the starting y position
            .style("opacity", 0)
            .style("font-size", 17);

        // Three functions that change the tooltip when user hovers / moves / leaves a stream
        const mouseover = function(event, d) {
            Tooltip.style("opacity", 1);
            d3.selectAll(".myArea").style("opacity", 0.2);  // Dims other paths
            d3.select(this)
                .style("stroke", "#ffffff")  // Highlights the hovered stream
                .style("opacity", 1);  // Keeps hovered stream at full opacity
        };

        const mousemove = function(event, d) {
            const grp = d.key;  // Get the house type or unit type
            const [mouseX, mouseY] = d3.pointer(event);  // Get the mouse coordinates relative to the svg
            Tooltip.text(grp)  // Display the house/unit type in the tooltip
                .attr("x", mouseX + 15)  // Position the tooltip 15px to the right of the mouse
                .attr("y", mouseY - 15);  // Position the tooltip above the mouse pointer
        };

        const mouseleave = function(event, d) {
            Tooltip.style("opacity", 0);  // Hide the tooltip
            d3.selectAll(".myArea").style("opacity", 1).style("stroke", "none");  // Reset all streams
        };




        // Area generator
        const area = d3.area()
            .x(d => x(d.data["date"]))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveBasis);  // Use curveCardinal for smooth transitions

        // Show the areas
        svg.selectAll("mylayers")
            .data(stackedData)
            .join("path")
            .attr("class", "myArea")
            .style("fill", d => color(d.key))
            .attr("d", area)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);
    }
});
