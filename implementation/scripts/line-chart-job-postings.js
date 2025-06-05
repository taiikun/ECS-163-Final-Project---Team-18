// Initialize line chart for job openings data - supports both story and interactive modes
function init_line_chart_jolts_information(mode) {
    // Determine which chart container to use based on mode (story vs interactive)
    const chartId = mode === 'story' ? "#StoryLineChartJOLTS" : "#InteractiveLineChartJOLTS";

    const svgEl = document.querySelector(chartId);
    if (!svgEl) {
        console.warn(`Element ${chartId} not found in DOM.`);
        return;
    }

    const svg = d3.select(chartId),
        margin = { top: 40, right: 60, bottom: 60, left: 60 },
        width = 650 - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#tooltip");

    // Load and process JOLTS (Job Openings and Labor Turnover Survey) data
    d3.csv("data/jolts_information_job_openings.csv").then(rawData => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const parseDate = d3.timeParse("%Y-%b");

        // Transform wide-format CSV (columns for each month) into long format for D3
        const data = [];
        rawData.forEach(row => {
            months.forEach(month => {
                const value = +row[month];
                if (!isNaN(value)) {
                    data.push({ date: parseDate(`${row.Year}-${month}`), value });
                }
            });
        });

        // Sort chronologically to ensure proper line drawing
        data.sort((a, b) => a.date - b.date);

        // Set up scales for time series visualization
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)]).nice()
            .range([height, 0]);

        // Configure axes - show only years on x-axis to avoid overcrowding
        const xAxisYears = d3.axisBottom(x)
            .ticks(d3.timeYear.every(1))
            .tickFormat(d3.timeFormat("%Y"))
            .tickSize(15)
            .tickPadding(30);

        const yAxis = d3.axisLeft(y);
        const yGrid = d3.axisLeft(y).tickSize(-width).tickFormat("");

        // Dynamic color scheme based on context (story vs interactive)
        const textColor = mode === 'story' ? 'white' : 'black';
        const axisColor = mode === 'story' ? 'white' : '#000';
        const lineColor = mode === 'story' ? 'white' : '#1f77b4';
        const dotColor = mode === 'story' ? '#ff7f0e' : '#1f77b4';
        const hoverDotColor = mode === 'story' ? '#ffa500' : '#ff7f0e';
        const gridColor = mode === 'story' ? 'white' : '#ccc';

        // Draw axes with appropriate styling
        chart.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxisYears)
            .call(g => g.selectAll("text")
                .style("fill", textColor)
                .style("font-family", "sans-serif")
                .style("font-size", "12px"))
            .call(g => g.selectAll("path, line").attr("stroke", axisColor));

        chart.append("g")
            .call(yAxis)
            .call(g => g.selectAll("text")
                .style("fill", textColor)
                .style("font-family", "sans-serif")
                .style("font-size", "12px"))
            .call(g => g.selectAll("path, line").attr("stroke", axisColor));

        // Add background grid for easier reading
        chart.append("g")
            .attr("class", "grid")
            .call(yGrid)
            .selectAll("line")
            .attr("stroke", gridColor)
            .attr("stroke-dasharray", "2,2");

        // Add axis labels
        chart.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("font-size", "13px")
            .style("font-family", "sans-serif")
            .style("fill", textColor)
            .text("Date");

        chart.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .style("font-size", "13px")
            .style("font-family", "sans-serif")
            .style("fill", textColor)
            .text("Job Openings (Thousands)");

        // Create smooth line path using monotone interpolation
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        // Draw the main trend line
        chart.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", 2.5)
            .attr("d", line);

        // Add interactive data points with hover effects
        chart.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.value))
            .attr("r", 4)
            .attr("fill", dotColor)
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                // Enlarge and highlight hovered point
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 7)
                    .attr("fill", hoverDotColor);

                // Show detailed tooltip with formatted date and value
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .style("opacity", 1)
                    .html(`<strong>${d3.timeFormat("%B %Y")(d.date)}</strong><br>${d.value.toLocaleString()}k openings`);
            })
            .on("mouseout", function () {
                // Reset point to normal size and color
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 4)
                    .attr("fill", dotColor);

                tooltip.style("opacity", 0);
            });
    });
}