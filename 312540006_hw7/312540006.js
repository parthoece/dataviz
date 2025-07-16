const data_path = "http://vis.lab.djosix.com:2024/data/air-pollution.csv"; //load dataset

// Define a color mapping for pollutants
const pollutantColors = {
    "SO2": "#1f77b4",  // Blue
    "NO2": "#ff7f0e",  // Orange
    "O3": "#2ca02c",   // Green
    "CO": "#d62728",   // Red
    "PM10": "#9467bd", // Purple
    "PM2.5": "#8c564b" // Brown
}

// Load CSV data
d3.csv(data_path).then(function (data) { 
    const roundTo = (num, decimal) => 
        Math.round((num + Number.EPSILON) * Math.pow(10, decimal)) / Math.pow(10, decimal);

    // Function to aggregate data by day and station for a selected pollutant type
    function aggregate(data, type, year) {
        const filteredData = data.filter(d => d["Measurement date"].startsWith(year));
        const sums = filteredData.reduce((acc, obj) => {
            const date = obj["Measurement date"].split(" ")[0];
            const station = obj["Station code"];
            if (!acc[date]) acc[date] = {};
            if (!acc[date][station]) acc[date][station] = { sum: 0, count: 0 };
            
            acc[date][station].sum += +obj[type];
            acc[date][station].count++;
            return acc;
        }, {});

        // Format data for horizon chart input
        return Object.keys(sums).map(date =>
            Object.keys(sums[date]).map(station => ({
                ts: new Date(date),
                series: station,
                val: roundTo(sums[date][station].sum / sums[date][station].count, 4),
            }))
        );
    }

    // Get selected year and pollutant type
    const yearSelect = document.getElementById("year-select");
    const radioButtons = document.querySelectorAll('input[name="type"]');

    yearSelect.addEventListener('change', () => render(yearSelect.value, getSelectedType()));
    for (const radioButton of radioButtons) {
        radioButton.addEventListener('change', () => render(yearSelect.value, getSelectedType()));
    }

    function getSelectedType() {
        return Array.from(radioButtons).find(radio => radio.checked).value;
    }

    // Render the horizon chart for a given pollutant type and year
    function render(year, type) {
        const aggregatedData = aggregate(data, type, year);
        const flattenedData = [].concat(...aggregatedData);

        // Get color based on pollutant type
        const color = pollutantColors[type] || "#000000";  // Default to black if color not found

        HorizonTSChart()(document.getElementById('horizon-chart'))
            .data(flattenedData)
            .series('series')
            .colors([color]);  // Apply color for the selected pollutant
    }

    // Initial render with default year and pollutant type
    render("2017", "SO2");
}).catch(error => {
    console.error("Error loading or processing data:", error);
});
