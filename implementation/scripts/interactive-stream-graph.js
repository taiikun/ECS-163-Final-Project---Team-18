async function createStoryStreamGraph() {
    if (d3.select("#story-stream-chart svg").size() > 0) return;

    if (typeof processSalaryData === 'function') {
        const data = await processSalaryData('quarterly');
        if (data && data.length > 0) {
            createStreamGraphForStory(data, "#story-stream-chart", "#story-stream-legend");
        }
    }
}

function createStreamGraphForStory(data, containerSelector, legendSelector) {
    const container = d3.select(containerSelector);
    container.html('');

    const margin = {top: 30, right: 40, bottom: 60, left: 40};
    const width = 650 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const periods = [...new Set(data.map(d => d.period))].sort();
    const categories = [...new Set(data.map(d => d.category))].slice(0, 8);

    const stackData = periods.map(period => {
        const periodData = {period: period};
        categories.forEach(cat => {
            const record = data.find(d => d.period === period && d.category === cat);
            periodData[cat] = record ? record.value : 0;
        });
        return periodData;
    });

    const stack = d3.stack()
        .keys(categories)
        .offset(d3.stackOffsetWiggle);

    const series = stack(stackData);

    const xScale = d3.scalePoint()
        .domain(periods)
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([
            d3.min(series, layer => d3.min(layer, d => d[0])),
            d3.max(series, layer => d3.max(layer, d => d[1]))
        ])
        .range([height, 0]);

    const area = d3.area()
        .x(d => xScale(d.data.period))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveCardinal);

    const colorScale = d3.scaleOrdinal(d3.schemePaired);
    const tooltip = d3.select("#tooltip");

    g.selectAll(".stream-area")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "stream-area")
        .attr("d", area)
        .attr("fill", d => colorScale(d.key))
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            g.selectAll(".stream-area").transition().duration(150).attr("opacity", 0.3);
            d3.select(this).transition().duration(150).attr("opacity", 1);
            tooltip.style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
            const [mouseX] = d3.pointer(event, this);
            const invertedX = periods.reduce((prev, curr) => {
                const prevX = xScale(prev);
                const currX = xScale(curr);
                return Math.abs(currX - mouseX) < Math.abs(prevX - mouseX) ? curr : prev;
            });

            const periodDataPoint = d.find(dataPoint => dataPoint.data.period === invertedX);
            const value = periodDataPoint ? periodDataPoint.data[d.key] : 'N/A';

            tooltip.html(`
                <strong>${d.key}</strong><br>
                Period: ${invertedX}<br>
                Average Salary: $${value.toLocaleString()}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            g.selectAll(".stream-area").transition().duration(150).attr("opacity", 0.8);
            tooltip.style("opacity", 0);
        });

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat((d, i) => periods.indexOf(d) % 2 === 0 ? d : ""))
        .selectAll("text")
        .style("fill", "white")
        .style("font-size", "12px")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    const legend = d3.select(legendSelector);
    legend.html('');

    categories.forEach(category => {
        const item = legend.append("div")
            .attr("class", "story-legend-item");

        item.append("div")
            .attr("class", "story-legend-color")
            .style("background-color", colorScale(category));

        item.append("span")
            .text(category.length > 20 ? category.substring(0, 17) + "..." : category)
            .style("font-size", "11px");
    });
}