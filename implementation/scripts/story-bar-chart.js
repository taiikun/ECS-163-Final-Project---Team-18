// Create bar chart for story
async function createStoryBarChart() {
    if (d3.select("#story-bar-chart").selectAll("*").size() > 0) return;

    try {
        // Use the same data loading approach as the interactive bar chart
        const data = await d3.dsv(";", "data/tech_layoffs_combined.csv");

        // Process the data similar to the interactive version
        const processedData = [];
        data.forEach(d => {
            const laidOff = +d.Laid_Off;
            const company = d.Company?.trim();
            const year = +d.Year;

            if (company && laidOff > 0 && year > 2019 && year < 2025) {
                processedData.push({
                    company: company,
                    laidOff: laidOff,
                    year: year
                });
            }
        });

        if (processedData.length > 0) {
            createBarChartForStory(processedData, "#story-bar-chart");
        }
    } catch (error) {
        console.error('Error loading bar chart data:', error);
    }
}

function createBarChartForStory(data, containerSelector) {
    const svg = d3.select(containerSelector);
    const margin = { top: 30, right: 20, bottom: 100, left: 60 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    // Append group for chart content
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define gradients
    const defs = svg.append("defs");

    // Default gradient
    const gradient = defs.append("linearGradient")
        .attr("id", "barGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#6CA6CD"); // light steel blue

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#1f77b4"); // steel blue

    // Hover gradient
    const hoverGradient = defs.append("linearGradient")
        .attr("id", "barGradientHover")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

    hoverGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#6a5acd"); // slate blue

    hoverGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#8b008b"); // dark magenta

    // Title
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "500")
        .style("fill", "white")
        .text("Top Companies by Total Layoffs");

    // Axis labels
    g.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("font-size", "13px")
        .style("font-family", "sans-serif")
        .style("font-weight", "500")
        .style("fill", "white")
        .text("Company");

    g.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 10)
        .style("font-size", "13px")
        .style("font-family", "sans-serif")
        .style("font-weight", "500")
        .style("fill", "white")
        .text("Number of Layoffs");

    // Aggregate data
    const processedData = [];
    data.forEach(d => {
        if (d.company && d.laidOff > 0) {
            const companyName = d.company.trim();
            const existing = processedData.find(item => item.company === companyName);
            if (existing) {
                existing.total += d.laidOff;
            } else {
                processedData.push({ company: companyName, total: d.laidOff });
            }
        }
    });

    const topCompanies = processedData
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(topCompanies.map(d => d.company))
        .padding(0.2);

    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(topCompanies, d => d.total)]);

    const tooltip = d3.select("#tooltip");

    // Bars
    const bars = g.selectAll(".bar")
        .data(topCompanies)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.company))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.total))
        .attr("height", d => height - y(d.total))
        .attr("fill", "url(#barGradient)")
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .raise()
                .transition()
                .duration(150)
                .attr("width", x.bandwidth() + 4)
                .attr("x", x(d.company) - 2)
                .attr("y", y(d.total) - 5)
                .attr("height", height - y(d.total) + 5)
                .attr("fill", "url(#barGradientHover)");

            tooltip.transition().duration(150).style("opacity", 1);
            tooltip.html(`<strong>${d.company}</strong><br>Total Layoffs: ${d.total.toLocaleString()}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function (event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("width", x.bandwidth())
                .attr("x", x(d.company))
                .attr("y", y(d.total))
                .attr("height", height - y(d.total))
                .attr("fill", "url(#barGradient)");

            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Animated entrance
    bars
        .attr("y", height)
        .attr("height", 0)
        .transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .attr("y", d => y(d.total))
        .attr("height", d => height - y(d.total));

    // Axes
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("y", 10)
        .attr("x", -5)
        .attr("transform", "rotate(-30)")
        .style("text-anchor", "end")
        .style("fill", "white")
        .style("font-size", "12px");

    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "white")
        .style("font-size", "12px");
}
