function init_line_chart_jolts_information() {
    const svg = d3.select("#lineChartJOLTS"),
        margin = { top: 40, right: 60, bottom: 60, left: 60 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#tooltip");

    d3.csv("jolts_information_job_openings.csv").then(rawData => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const parseDate = d3.timeParse("%Y-%b");

        const data = [];
        rawData.forEach(row => {
            months.forEach(month => {
                data.push({
                    date: parseDate(`${row.Year}-${month}`),
                    value: +row[month]
                });
            });
        });

        data.sort((a, b) => a.date - b.date);

        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)]).nice()
            .range([height, 0]);

        const yGrid = d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("");

        const xAxisYears = d3.axisBottom(x)
            .ticks(d3.timeYear.every(1))
            .tickFormat(d3.timeFormat("%Y"))
            .tickSize(15)
            .tickPadding(30);

        const yAxis = d3.axisLeft(y);

        chart.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxisYears)
            .selectAll("text")
            .style("font-family", "sans-serif")
            .style("font-size", "12px")
            .style("font-weight", "500");

        chart.append("g")
            .attr("class", "grid")
            .call(yGrid)
            .selectAll("line")
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "2,2");

        chart.append("g")
            .call(yAxis)
            .selectAll("text")
            .style("font-family", "sans-serif")
            .style("font-size", "12px");

        chart.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("font-size", "13px")
            .style("font-family", "sans-serif")
            .style("font-weight", "500")
            .text("Date");

        chart.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .style("font-size", "13px")
            .style("font-family", "sans-serif")
            .style("font-weight", "500")
            .text("Job Openings (Thousands)");

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        chart.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#1f77b4")
            .attr("stroke-width", 2.5)
            .attr("d", line);

        chart.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.value))
            .attr("r", 4)
            .attr("fill", "#1f77b4")
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 7)
                    .attr("fill", "#ff7f0e");

                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .style("opacity", 1)
                    .html(`
                        <strong>${d3.timeFormat("%B %Y")(d.date)}</strong><br>
                        ${d.value.toLocaleString()}k openings
                    `);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 4)
                    .attr("fill", "#1f77b4");

                tooltip.style("opacity", 0);
            });
    });
}
