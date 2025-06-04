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
            .attr("transform", `translate(0,${height - 25})`)
            .call(xAxisYears)
            .selectAll("text")
            .attr("dy", "1.75em")
            .style("text-anchor", "middle")
            .style("font-weight", "bold");

        chart.append("g")
            .attr("class", "grid")
            .call(yGrid)
            .selectAll("line")
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "2,2");

        chart.append("g").call(yAxis);

        chart.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("font-size", "12px")
            .text("Date");

        chart.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .style("font-size", "12px")
            .text("Job Openings (Thousands)");

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.value));

        chart.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);

        chart.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.value))
            .attr("r", 4)
            .attr("fill", "steelblue")
            .on("mouseover", (event, d) => {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .style("opacity", 1)
                    .html(`${d3.timeFormat("%B %Y")(d.date)}<br><b>${d.value}</b>k openings`);
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);
            });
    });
}
