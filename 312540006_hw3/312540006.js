// Graph dimension
const margin = { top: 20, right: 20, bottom: 20, left: 20 },
    width = 600 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

const data_path = "http://vis.lab.djosix.com:2024/data/abalone.data";

d3.text(data_path).then(function (data) {

    const features = ["Length", "Diameter", "Height", "Whole weight", "Shucked weight", "Viscera weight", "Shell weight", "Rings"];
    let data_M = [], data_F = [], data_I = [];

    // Parse the data into separate datasets for male, female, and infant
    const rows = data.split("\n");
    rows.forEach((row) => {
        const cols = row.split(",");
        if (cols.length < 9) return; // Skip empty or incomplete rows
        const abaloneData = cols.slice(1, 9).map(d => +d); // Get numeric features
        if (cols[0] === "M") data_M.push(abaloneData);
        if (cols[0] === "F") data_F.push(abaloneData);
        if (cols[0] === "I") data_I.push(abaloneData);
    });

    // Compute correlation matrices
    const cm_M = correlation_matrix(data_M);
    const cm_F = correlation_matrix(data_F);
    const cm_I = correlation_matrix(data_I);

    // Define color scales for male, female, and infant
    const maleColorScale = d3.scaleLinear().domain([-1, 0, 1]).range(["#FF5733", "#ffffff", "#3375FF"]);
    const femaleColorScale = d3.scaleLinear().domain([-1, 0, 1]).range(["#FFC300", "#ffffff", "#8E44AD"]);
    const infantColorScale = d3.scaleLinear().domain([-1, 0, 1]).range(["#28B463", "#ffffff", "#E74C3C"]);

    // Initial rendering (Male)
    render_cm(cm_M, maleColorScale);
    update_radio_label_color("male", maleColorScale); // Update radio button label color for male

    // Event listeners for radio buttons
    document.querySelectorAll('input[name="sex"]').forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === "male") {
                render_cm(cm_M, maleColorScale);
                update_radio_label_color("male", maleColorScale); // Update radio button label color for male
            }
            if (this.value === "female") {
                render_cm(cm_F, femaleColorScale);
                update_radio_label_color("female", femaleColorScale); // Update radio button label color for female
            }
            if (this.value === "infant") {
                render_cm(cm_I, infantColorScale);
                update_radio_label_color("infant", infantColorScale); // Update radio button label color for infant
            }
        });
    });

    // Custom correlation function
    function correlation_matrix(data) {
        const matrix = d3.transpose(data);
        const correlations = [];
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix.length; j++) {
                const corr = compute_correlation(matrix[i], matrix[j]);
                correlations.push({ x: features[i].trim(), y: features[j].trim(), value: +corr });  // Trim spaces from feature names
            }
        }
        return correlations;
    }

    // Compute correlation
    function compute_correlation(x, y) {
        const meanX = d3.mean(x);
        const meanY = d3.mean(y);
        const numerator = d3.sum(x.map((d, i) => (d - meanX) * (y[i] - meanY)));
        const denominator = Math.sqrt(d3.sum(x.map(d => Math.pow(d - meanX, 2))) * d3.sum(y.map(d => Math.pow(d - meanY, 2))));
        return numerator / denominator;
    }

    // Function to update radio button labels' colors based on selected abalone type
    function update_radio_label_color(selected, colorScale) {
        const labels = {
            male: document.querySelector('label[for="male"]'),
            female: document.querySelector('label[for="female"]'),
            infant: document.querySelector('label[for="infant"]')
        };

        // Reset all labels to black
        Object.values(labels).forEach(label => {
            label.style.color = "black";
        });

        // Update selected label's color based on colorScale
        if (selected === "male") {
            labels.male.style.color = colorScale(0);  // Apply male color
        } else if (selected === "female") {
            labels.female.style.color = colorScale(0);  // Apply female color
        } else if (selected === "infant") {
            labels.infant.style.color = colorScale(0);  // Apply infant color
        }
    }

    // Function to render the correlation matrix
    function render_cm(cm, colorScale) {
        d3.select("#cm").selectAll("*").remove(); // Clear previous matrix

        const domain = Array.from(new Set(cm.map(d => d.x)));

        // Create SVG
        const svg = d3.select("#cm").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Scales
        const x = d3.scalePoint().range([0, width]).domain(domain);
        const y = d3.scalePoint().range([0, height]).domain(domain);

        // Draw elements
        const cor = svg.selectAll(".cor")
            .data(cm)
            .enter().append("g")
            .attr("class", "cor")
            .attr("transform", d => `translate(${x(d.x)}, ${y(d.y)})`);

        // Add text (correlation values) and color based on correlation value
        cor.filter(d => domain.indexOf(d.x) <= domain.indexOf(d.y))
            .append("text")
            .attr("y", 5)
            .text(d => d.x === d.y ? d.x : d.value.toFixed(2))  // Properly render diagonal feature names
            .attr("text-anchor", "middle")
            .style("fill", d => colorScale(d.value))
            .style("font-size", "12px");  // Adjust font size if needed

        // Add circles for upper triangle correlations
        cor.filter(d => domain.indexOf(d.x) > domain.indexOf(d.y))
            .append("circle")
            .attr("r", d => Math.abs(d.value) * 12)
            .style("fill", d => colorScale(d.value))
            .style("opacity", 0.8);
    }
});
