// Initialize interactive bar chart showing layoffs by location with year filtering
function init_bar_chart_layoffs_by_location() {
    const svg = d3.select("#barChartLayoffsByLocation"),
        margin = { top: 40, right: 20, bottom: 100, left: 70 },
        width = 650 - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Create gradient definitions for visual appeal
    const defs = svg.append("defs");

    // Default gradient for normal bar state
    const defaultGradient = defs.append("linearGradient")
        .attr("id", "barGradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
    defaultGradient.append("stop").attr("offset", "0%").attr("stop-color", "#6CA6CD");
    defaultGradient.append("stop").attr("offset", "100%").attr("stop-color", "#1f77b4");

    // Hover gradient for interactive feedback
    const hoverGradient = defs.append("linearGradient")
        .attr("id", "barGradientHover")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
    hoverGradient.append("stop").attr("offset", "0%").attr("stop-color", "#6a5acd");
    hoverGradient.append("stop").attr("offset", "100%").attr("stop-color", "#8b008b");

    // Set up scales and tooltip
    const x = d3.scaleBand().padding(0.2).range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
    const tooltip = d3.select("#tooltip");

    // Create persistent axis groups for smooth transitions
    const xAxisGroup = chart.append("g").attr("transform", `translate(0,${height})`);
    const yAxisGroup = chart.append("g");

    // Add axis labels
    chart.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("font-size", "13px")
        .style("font-family", "sans-serif")
        .style("font-weight", "500")
        .text("Location");

    chart.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .style("font-size", "13px")
        .style("font-family", "sans-serif")
        .style("font-weight", "500")
        .text("Number of Layoffs");

    // Load and process layoff data
    d3.dsv(";", "data/tech_layoffs_combined.csv").then(data => {
        // Clean and standardize data
        data.forEach(d => {
            d.Laid_Off = +d.Laid_Off;
            d.Year = +d.Year;
            d.Location_HQ = d.Location_HQ.trim();
            // Standardize San Francisco variations to single name
            if (d.Location_HQ.toLowerCase().includes("san francisco")) {
                d.Location_HQ = "San Francisco";
            }
        });

        // Filter to focus on recent years (2020-2024)
        data = data.filter(d => d.Year > 2019 && d.Year < 2025);
        const years = [...new Set(data.map(d => d.Year))].sort();

        // Create interactive year filter buttons
        const buttonContainer = d3.select("#yearButtonsLayoffsByLocation");
        years.forEach(year => {
            buttonContainer.append("button")
                .text(year)
                .attr("class", "year-button")
                .on("click", function () {
                    // Disable buttons during transition to prevent rapid clicking
                    buttonContainer.selectAll("button").attr("disabled", true);
                    const clicked = d3.select(this);
                    const year = +clicked.text();
                    updateChart(year).then(() => {
                        buttonContainer.selectAll("button").attr("disabled", null);
                    });
                });
        });

        // Main chart update function - called when year selection changes
        function updateChart(selectedYear) {
            // Filter data for selected year and aggregate by location
            const filtered = data.filter(d => d.Year === selectedYear);
            const topLocations = d3.rollups(filtered, v => d3.sum(v, d => d.Laid_Off), d => d.Location_HQ)
                .sort((a, b) => b[1] - a[1])  // Sort by layoff count descending
                .slice(0, 10);                // Show top 10 locations

            // Update scales with new data
            x.domain(topLocations.map(d => d[0]));
            y.domain([0, d3.max(topLocations, d => d[1])]);

            // Update axes with smooth transitions
            xAxisGroup.call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-30)")  // Rotate labels to prevent overlap
                .style("text-anchor", "end")
                .style("font-family", "sans-serif")
                .style("font-size", "12px");

            yAxisGroup.call(d3.axisLeft(y))
                .selectAll("text")
                .style("font-family", "sans-serif")
                .style("font-size", "12px");

            // Handle bar updates with enter/update/exit pattern
            const bars = chart.selectAll(".bar-location").data(topLocations, d => d[0]);

            // Exit: animate disappearing bars
            bars.exit().transition().duration(800)
                .attr("y", height)
                .attr("height", 0)
                .style("opacity", 0)
                .remove();

            // Update: animate existing bars to new positions
            bars.transition().duration(800)
                .attr("x", d => x(d[0]))
                .attr("y", d => y(d[1]))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d[1]));

            // Enter: create new bars with animation from bottom
            const barsEnter = bars.enter().append("rect")
                .attr("class", "bar-location")
                .style("fill", "url(#barGradient)")
                .attr("x", d => x(d[0]))
                .attr("width", x.bandwidth())
                .attr("y", height)                    // Start from bottom
                .attr("height", 0)                    // Start with zero height
                .style("opacity", 0)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    // Enhanced hover effect with size and color change
                    d3.select(this)
                        .raise()                      // Bring to front
                        .transition()
                        .duration(150)
                        .attr("width", x.bandwidth() + 4)
                        .attr("x", x(d[0]) - 2)
                        .attr("y", y(d[1]) - 5)
                        .attr("height", height - y(d[1]) + 5)
                        .style("fill", "url(#barGradientHover)");

                    // Show detailed tooltip
                    tooltip.html(`<strong>${d[0]}</strong><br>Layoffs: ${d[1].toLocaleString()}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 15) + "px")
                        .style("opacity", 1);
                })
                .on("mouseout", function (event, d) {
                    // Reset to normal appearance
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr("width", x.bandwidth())
                        .attr("x", x(d[0]))
                        .attr("y", y(d[1]))
                        .attr("height", height - y(d[1]))
                        .style("fill", "url(#barGradient)");

                    tooltip.style("opacity", 0);
                });

            // Animate new bars growing from bottom
            const enterTransition = barsEnter.transition().duration(1000)
                .attr("y", d => y(d[1]))
                .attr("height", d => height - y(d[1]))
                .style("opacity", 1);

            // Update button states to show active year
            buttonContainer.selectAll("button")
                .classed("active", false);
            buttonContainer.selectAll("button")
                .filter(function () {
                    return +this.textContent === selectedYear;
                })
                .classed("active", true);

            return enterTransition.end();
        }

        // Initialize chart with first year
        updateChart(years[0]);
    });
}