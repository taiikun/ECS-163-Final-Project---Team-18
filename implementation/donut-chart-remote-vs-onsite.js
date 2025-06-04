function init_donut_chart_remote_vs_onsite(containerSelector = "#donutChartRemote") {const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(containerSelector)

        .append("svg")
        .attr("width", width + 75)
        .attr("height", height + 40)
        .append("g")
        .attr("transform", `translate(${width / 2 + 75}, ${height / 2})`);

    const color = d3.scaleOrdinal()
        .domain(["Remote", "Hybrid", "Onsite"])
        .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "#333")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("font-size", "14px")
        .style("font-family", "sans-serif")
        .style("font-weight", "500")
        .style("pointer-events", "none");

    fetch("global_tech_salary.csv")
        .then(response => response.text())
        .then(text => {
            const lines = text.split('\n').filter(d => d.trim() !== '');
            const workTypeCounts = { Remote: 0, Hybrid: 0, Onsite: 0 };

            for (let i = 0; i < lines.length; i++) {
                let parts = lines[i].replace(/^"|"$/g, '').split(',').map(p => p.replace(/^"|"$/g, '').trim());
                if (parts.length >= 9 && !isNaN(parts[8])) {
                    const ratio = parseInt(parts[8]);
                    if (ratio === 100) workTypeCounts.Remote++;
                    else if (ratio === 50) workTypeCounts.Hybrid++;
                    else if (ratio === 0) workTypeCounts.Onsite++;
                }
            }

            const pie = d3.pie()
                .sort(null)
                .value(d => d[1]);

            const arc = d3.arc()
                .innerRadius(radius * 0.5)
                .outerRadius(radius * 0.9);

            const arcHover = d3.arc()
                .innerRadius(radius * 0.5)
                .outerRadius(radius);

            const data_ready = pie(Object.entries(workTypeCounts));

            const paths = svg.selectAll("path")
                .data(data_ready)
                .enter()
                .append("path")
                .attr("d", arc)
                .attr("fill", d => color(d.data[0]))
                .attr("stroke", "white")
                .style("stroke-width", "1px")
                .on("mouseover", function (event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("d", arcHover);

                    tooltip.html(`<strong>${d.data[0]}</strong><br>${d.data[1]} jobs`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 25) + "px")
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                })
                .on("mousemove", function (event) {
                    tooltip.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 25) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("d", arc);

                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0);
                });

            d3.select(containerSelector)

                .style("position", "relative");

            const legend = d3.select(containerSelector)

                .append("div")
                .attr("class", "legend")
                .style("position", "absolute")
                .style("top", "10px")
                .style("left", "10px")
                .style("display", "flex")
                .style("flex-direction", "column")
                .style("gap", "6px")
                .style("font-size", "14px")
                .style("font-family", "sans-serif")
                .style("font-weight", "500")
                .style("background", "rgba(255,255,255,0.9)")
                .style("padding", "5px 8px")
                .style("border-radius", "5px")
                .style("box-shadow", "0 0 5px rgba(0,0,0,0.1)");

            Object.entries(workTypeCounts).forEach(([key, value]) => {
                const item = legend.append("div")
                    .style("display", "flex")
                    .style("align-items", "center")
                    .style("gap", "6px");

                item.append("div")
                    .style("width", "12px")
                    .style("height", "12px")
                    .style("background", color(key))
                    .style("border-radius", "3px");

                item.append("span").text(`${key}`);
            });

        })
        .catch(err => {
            console.error("Failed to load or parse CSV:", err);
            d3.select(containerSelector)

                .append("div")
                .attr("class", "error")
                .text("Error loading donut chart data.");
        });
}
