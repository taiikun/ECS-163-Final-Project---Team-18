function init_bar_chart_layoffs_by_company() {
    const svg = d3.select("#barChartLayoffsByCompany"),
        margin = { top: 40, right: 20, bottom: 100, left: 60 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#tooltip");

    const x = d3.scaleBand().padding(0.2).range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    const xAxisGroup = chart.append("g").attr("transform", `translate(0,${height})`);
    const yAxisGroup = chart.append("g");

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

    d3.dsv(";", "tech_layoffs_combined.csv").then(data => {
        data.forEach(d => {
            d.Laid_Off = +d.Laid_Off;
            d.Year = +d.Year;
        });

        data = data.filter(d => d.Year > 2019 && d.Year < 2025);

        const years = [...new Set(data.map(d => d.Year))].sort();
        const select = d3.select("#yearSelectLayoffsByCompany");

        select.selectAll("option")
            .data(years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        select.on("change", () => updateChart(+select.node().value));

        const buttonContainer = d3.select("#yearButtonsLayoffsByCompany");
        years.forEach(year => {
            buttonContainer.append("button")
                .text(year)
                .attr("class", "year-button")
                .on("click", () => updateChart(year));
        });

        d3.select(buttonContainer.selectAll("button").nodes()[0])
            .classed("active", true);

        function updateChart(selectedYear) {
            buttonContainer.selectAll("button").attr("disabled", true);

            const filtered = data.filter(d => d.Year === selectedYear);
            const topCompanies = d3.rollups(filtered, v => d3.sum(v, d => d.Laid_Off), d => d.Company)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            x.domain(topCompanies.map(d => d[0]));
            y.domain([0, d3.max(topCompanies, d => d[1])]);

            xAxisGroup
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-30)")
                .style("text-anchor", "end")
                .style("font-family", "sans-serif")
                .style("font-size", "12px");

            yAxisGroup.call(d3.axisLeft(y))
                .selectAll("text")
                .style("font-family", "sans-serif")
                .style("font-size", "12px");

            const bars = chart.selectAll(".bar-company").data(topCompanies, d => d[0]);

            bars.exit()
                .transition().duration(800)
                .attr("y", y(0))
                .attr("height", 0)
                .style("opacity", 0)
                .remove();

            bars.transition().duration(800)
                .attr("x", d => x(d[0]))
                .attr("y", d => y(d[1]))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d[1]));

            const barsEnter = bars.enter()
                .append("rect")
                .attr("class", "bar-company")
                .style("fill", "#1f77b4")
                .attr("x", d => x(d[0]))
                .attr("width", x.bandwidth())
                .attr("y", y(0))
                .attr("height", 0)
                .style("opacity", 0)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    d3.select(this)
                        .raise()
                        .transition()
                        .duration(150)
                        .attr("width", x.bandwidth() + 4)
                        .attr("x", x(d[0]) - 2)
                        .attr("y", y(d[1]) - 5)
                        .attr("height", height - y(d[1]) + 5);

                    tooltip.transition().duration(150).style("opacity", 1);
                    tooltip.html(`<strong>${d[0]}</strong><br>Layoffs: ${d[1].toLocaleString()}`)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px");
                })
                .on("mousemove", event => {
                    tooltip
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px");
                })
                .on("mouseout", function (event, d) {
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr("width", x.bandwidth())
                        .attr("x", x(d[0]))
                        .attr("y", y(d[1]))
                        .attr("height", height - y(d[1]));

                    tooltip.transition().duration(200).style("opacity", 0);
                });

            barsEnter.transition().duration(1000)
                .attr("y", d => y(d[1]))
                .attr("height", d => height - y(d[1]))
                .style("opacity", 1)
                .end()
                .then(() => {
                    buttonContainer.selectAll("button").attr("disabled", null);
                });

            buttonContainer.selectAll("button")
                .classed("active", false);

            buttonContainer.selectAll("button")
                .filter(function () {
                    return +this.textContent === selectedYear;
                })
                .classed("active", true);
        }

        updateChart(years[0]);
    });
}
