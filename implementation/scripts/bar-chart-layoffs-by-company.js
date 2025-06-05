// Initialize interactive bar chart showing layoffs by company with year filtering
function init_bar_chart_layoffs_by_company() {
    const svg = d3.select("#barChartLayoffsByCompany"),
        margin = { top: 40, right: 20, bottom: 100, left: 60 },
        width = 650 - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Create gradient definitions for enhanced visual appeal
    const defs = svg.append("defs");

    // Standard bar gradient (light to dark blue)
    const defaultGradient = defs.append("linearGradient")
        .attr("id", "barGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
    defaultGradient.append("stop").attr("offset", "0%").attr("stop-color", "#6CA6CD");
    defaultGradient.append("stop").attr("offset", "100%").attr("stop-color", "#1f77b4");

    // Hover state gradient (purple tones for contrast)
    const hoverGradient = defs.append("linearGradient")
        .attr("id", "barGradientHover")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
    hoverGradient.append("stop").attr("offset", "0%").attr("stop-color", "#6a5acd");
    hoverGradient.append("stop").attr("offset", "100%").attr("stop-color", "#8b008b");

    const tooltip = d3.select("#tooltip");

    // Set up scales for positioning and sizing bars
    const x = d3.scaleBand().padding(0.2).range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Create persistent axis groups to enable smooth transitions
    const xAxisGroup = chart.append("g").attr("transform", `translate(0,${height})`);
    const yAxisGroup = chart.append("g");

    // Add descriptive axis labels
    chart.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("font-size", "13px")
        .style("font-family", "sans-serif")
        .style("font-weight", "500")
        .text("Company");

    chart.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 10)
        .style("font-size", "13px")
        .style("font-family", "sans-serif")
        .style("font-weight", "500")
        .text("Number of Layoffs");

    // Load and process company layoff data
    d3.dsv(";", "data/tech_layoffs_combined.csv").then(data => {
        // Convert string values to numbers for calculations
        data.forEach(d => {
            d.Laid_Off = +d.Laid_Off;
            d.Year = +d.Year;
        });

        // Focus on recent years (2020-2024) for relevance
        data = data.filter(d => d.Year > 2019 && d.Year < 2025);
        const years = [...new Set(data.map(d => d.Year))].sort();
        const buttonContainer = d3.select("#yearButtonsLayoffsByCompany");

        // Create interactive year filter buttons
        years.forEach(year => {
            buttonContainer.append("button")
                .text(year)
                .attr("class", "year-button")
                .on("click", function () {
                    // Prevent rapid clicking by temporarily disabling buttons
                    buttonContainer.selectAll("button").attr("disabled", true);
                    const clicked = d3.select(this);
                    const year = +clicked.text();
                    updateChart(year).then(() => {
                        // Re-enable buttons after transition completes
                        buttonContainer.selectAll("button").attr("disabled", null);
                    });
                });
        });

        // Set first button as active on initial load
        d3.select(buttonContainer.selectAll("button").nodes()[0])
            .classed("active", true);

        // Core chart update function triggered by year selection
        function updateChart(selectedYear) {
            // Filter data for selected year and aggregate by company
            const filtered = data.filter(d => d.Year === selectedYear);
            const topCompanies = d3.rollups(filtered, v => d3.sum(v, d => d.Laid_Off), d => d.Company)
                .sort((a, b) => b[1] - a[1])  // Sort by total layoffs descending
                .slice(0, 10);                // Show only top 10 companies

            // Update scale domains based on new data
            x.domain(topCompanies.map(d => d[0]));
            y.domain([0, d3.max(topCompanies, d => d[1])]);

            // Update axes with new scales
            xAxisGroup.call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-30)")  // Angle labels to prevent overlap
                .style("text-anchor", "end")
                .style("font-family", "sans-serif")
                .style("font-size", "12px");

            yAxisGroup.call(d3.axisLeft(y))
                .selectAll("text")
                .style("font-family", "sans-serif")
                .style("font-size", "12px");

            // Implement D3's enter/update/exit pattern for smooth data transitions
            const bars = chart.selectAll(".bar-company").data(topCompanies, d => d[0]);

            // Exit: animate bars that no longer exist
            bars.exit().transition().duration(800)
                .attr("y", y(0))              // Shrink to baseline
                .attr("height", 0)
                .style("opacity", 0)
                .remove();

            // Update: animate existing bars to new positions/sizes
            bars.transition().duration(800)
                .attr("x", d => x(d[0]))
                .attr("y", d => y(d[1]))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d[1]));

            // Enter: create new bars with entrance animation
            const barsEnter = bars.enter()
                .append("rect")
                .attr("class", "bar-company")
                .style("fill", "url(#barGradient)")
                .attr("x", d => x(d[0]))
                .attr("width", x.bandwidth())
                .attr("y", y(0))               // Start at baseline
                .attr("height", 0)             // Start with no height
                .style("opacity", 0)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    // Enhanced hover effect: enlargement + color change
                    d3.select(this)
                        .raise()               // Bring to front layer
                        .transition()
                        .duration(150)
                        .attr("width", x.bandwidth() + 4)
                        .attr("x", x(d[0]) - 2)
                        .attr("y", y(d[1]) - 5)
                        .attr("height", height - y(d[1]) + 5)
                        .style("fill", "url(#barGradientHover)");

                    // Show informative tooltip
                    tooltip.transition().duration(150).style("opacity", 1);
                    tooltip.html(`<strong>${d[0]}</strong><br>Layoffs: ${d[1].toLocaleString()}`)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px");
                })
                .on("mousemove", event => {
                    // Update tooltip position as mouse moves
                    tooltip
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px");
                })
                .on("mouseout", function (event, d) {
                    // Reset bar to normal state
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr("width", x.bandwidth())
                        .attr("x", x(d[0]))
                        .attr("y", y(d[1]))
                        .attr("height", height - y(d[1]))
                        .style("fill", "url(#barGradient)");

                    // Hide tooltip
                    tooltip.transition().duration(200).style("opacity", 0);
                });

            // Animate new bars growing upward from baseline
            const enterTransition = barsEnter.transition().duration(1000)
                .attr("y", d => y(d[1]))
                .attr("height", d => height - y(d[1]))
                .style("opacity", 1);

            // Update button visual states to reflect current selection
            buttonContainer.selectAll("button").classed("active", false);
            buttonContainer.selectAll("button")
                .filter(function () {
                    return +this.textContent === selectedYear;
                })
                .classed("active", true);

            // Return promise for controlling async button states
            return enterTransition.end();
        }

        // Initialize chart with first year of data
        updateChart(years[0]);
    });
}