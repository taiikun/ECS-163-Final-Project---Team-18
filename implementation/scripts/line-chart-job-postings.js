function init_line_chart_jolts_information(mode) {
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

    d3.csv("data/jolts_information_job_openings.csv").then(rawData => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const parseDate = d3.timeParse("%Y-%b");

        const data = [];
        rawData.forEach(row => {
            months.forEach(month => {
                const value = +row[month];
                if (!isNaN(value)) {
                    data.push({ date: parseDate(`${row.Year}-${month}`), value });
                }
            });
        });

        data.sort((a, b) => a.date - b.date);

        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)]).nice()
            .range([height, 0]);

        const xAxisYears = d3.axisBottom(x)
            .ticks(d3.timeYear.every(1))
            .tickFormat(d3.timeFormat("%Y"))
            .tickSize(15)
            .tickPadding(30);

        const yAxis = d3.axisLeft(y);
        const yGrid = d3.axisLeft(y).tickSize(-width).tickFormat("");

        const textColor = mode === 'story' ? 'white' : 'black';
        const axisColor = mode === 'story' ? 'white' : '#000';
        const lineColor = mode === 'story' ? 'white' : '#1f77b4';
        const dotColor = mode === 'story' ? '#ff7f0e' : '#1f77b4';
        const hoverDotColor = mode === 'story' ? '#ffa500' : '#ff7f0e';
        const gridColor = mode === 'story' ? 'white' : '#ccc';

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

        chart.append("g")
            .attr("class", "grid")
            .call(yGrid)
            .selectAll("line")
            .attr("stroke", gridColor)
            .attr("stroke-dasharray", "2,2");

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

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        chart.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", 2.5)
            .attr("d", line);

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
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 7)
                    .attr("fill", hoverDotColor);

                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .style("opacity", 1)
                    .html(`<strong>${d3.timeFormat("%B %Y")(d.date)}</strong><br>${d.value.toLocaleString()}k openings`);
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 4)
                    .attr("fill", dotColor);

                tooltip.style("opacity", 0);
            });
    });
}
