// Map data and functions
const regionMap = {
    "Maine": "Northeast", "New Hampshire": "Northeast", "Vermont": "Northeast",
    "Massachusetts": "Northeast", "Rhode Island": "Northeast", "Connecticut": "Northeast",
    "New York": "Northeast", "New Jersey": "Northeast", "Pennsylvania": "Northeast",
    "Ohio": "Midwest", "Michigan": "Midwest", "Indiana": "Midwest", "Wisconsin": "Midwest",
    "Illinois": "Midwest", "Minnesota": "Midwest", "Iowa": "Midwest", "Missouri": "Midwest",
    "North Dakota": "Midwest", "South Dakota": "Midwest", "Nebraska": "Midwest", "Kansas": "Midwest",
    "Delaware": "South", "Maryland": "South", "Virginia": "South", "West Virginia": "South",
    "Kentucky": "South", "North Carolina": "South", "South Carolina": "South",
    "Georgia": "South", "Florida": "South", "Alabama": "South", "Tennessee": "South",
    "Mississippi": "South", "Arkansas": "South", "Louisiana": "South", "Texas": "South",
    "Oklahoma": "South",
    "Montana": "West", "Idaho": "West", "Wyoming": "West", "Colorado": "West",
    "New Mexico": "West", "Arizona": "West", "Utah": "West", "Nevada": "West",
    "California": "West", "Oregon": "West", "Washington": "West", "Alaska": "West", "Hawaii": "West"
};
// Create map for story
async function createStoryMap() {
    if (d3.select("#story-map-chart").selectAll("*").size() > 0) return;

    const svg = d3.select("#story-map-chart");
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(700);

    const path = d3.geoPath().projection(projection);
    const colorScale = d3.scaleSequentialLog(d3.interpolateTurbo).domain([1, 50000]);
    const regionColors = d3.scaleOrdinal()
        .domain(["Northeast", "Midwest", "South", "West", "Unknown"])
        .range(["#e1f5fe", "#f3e5f5", "#fff3e0", "#e8f5e8", "#fafafa"]);

    const tooltip = d3.select("#tooltip");

    try {
        // Load US map data
        const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
        const states = topojson.feature(us, us.objects.states);

        states.features.forEach(d => {
            d.properties.region = regionMap[d.properties.name] || "Unknown";
        });

        // Draw states
        chart.append("g")
            .selectAll("path")
            .data(states.features)
            .join("path")
            .attr("class", "map-state")
            .attr("fill", d => regionColors(d.properties.region))
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5)
            .attr("d", path);

        d3.csv("data/tech_layoffs_Q2_2024.csv").then(data => {
            data.forEach(d => {
                d.Laid_Off = +d.Laid_Off;
                d.latitude = +d.latitude;
                d.longitude = +d.longitude;
            });
            data = data.filter(d => d.Country === "USA");
            // Don't cluster too aggressively - keep more individual points
            const clusteredData = Array.from(
                d3.rollup(data,
                    v => ({
                        count: v.length,
                        totalLayoffs: d3.sum(v, d => d.Laid_Off),
                        latitude: d3.mean(v, d => d.latitude),
                        longitude: d3.mean(v, d => d.longitude),
                        location: v[0].Location_HQ,
                        companies: [...new Set(v.map(d => d.company))].slice(0, 3)
                    }),
                    d => `${Math.round(d.latitude * 2) / 2},${Math.round(d.longitude * 2) / 2}`
                ),
                ([_, stats]) => stats
            );

            console.log(clusteredData);

            // Draw circles for layoffs with better visibility
            chart.append("g")
                .selectAll("circle")
                .data(clusteredData)
                .join("circle")
                .attr("class", "map-circle")
                .attr("cx", d => projection([d.longitude, d.latitude])[0])
                .attr("cy", d => projection([d.longitude, d.latitude])[1])
                .attr("r", d => Math.max(3, Math.sqrt(d.count)))
                .attr("fill", d => colorScale(d.totalLayoffs))
                .attr("stroke", "#fff")
                .attr("stroke-width", 1)
                .attr("opacity", 0.9)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    d3.select(this).attr("opacity", 1).attr("stroke-width", 2);
                    tooltip.html(`
                                <strong>${d.location}</strong><br>
                                Total Layoffs: ${d.totalLayoffs.toLocaleString()}<br>
                                Companies: ${d.count}
                            `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px")
                        .style("opacity", 1);
                })
                .on("mouseout", function () {
                    d3.select(this).attr("opacity", 0.8).attr("stroke-width", 1);
                    tooltip.style("opacity", 0);
                });
        });

    } catch (error) {
        console.error('Error loading map data:', error);
        chart.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .text("Map data loading...");
    }
}
// Interactive map function
async function initInteractiveMap() {
    const svg = d3.select("#interactiveMap");
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(900);

    const path = d3.geoPath().projection(projection);
    const colorScale = d3.scaleSequentialLog(d3.interpolateTurbo).domain([1, 50000]);
    const regionColors = d3.scaleOrdinal()
        .domain(["Northeast", "Midwest", "South", "West", "Unknown"])
        .range(["#e1f5fe", "#f3e5f5", "#fff3e0", "#e8f5e8", "#fafafa"]);

    const tooltip = d3.select("#tooltip");

    try {
        // Load US map data
        const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
        const states = topojson.feature(us, us.objects.states);

        states.features.forEach(d => {
            d.properties.region = regionMap[d.properties.name] || "Unknown";
        });

        // Draw states
        chart.append("g")
            .selectAll("path")
            .data(states.features)
            .join("path")
            .attr("class", "map-state")
            .attr("fill", d => regionColors(d.properties.region))
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5)
            .attr("d", path);

        d3.csv("data/tech_layoffs_Q2_2024.csv").then(data => {
            data.forEach(d => {
                d.Laid_Off = +d.Laid_Off;
                d.latitude = +d.latitude;
                d.longitude = +d.longitude;
            });
            data = data.filter(d => d.Country === "USA");
            // Don't cluster too aggressively - keep more individual points
            const clusteredData = Array.from(
                d3.rollup(data,
                    v => ({
                        count: v.length,
                        totalLayoffs: d3.sum(v, d => d.Laid_Off),
                        latitude: d3.mean(v, d => d.latitude),
                        longitude: d3.mean(v, d => d.longitude),
                        location: v[0].Location_HQ,
                        companies: [...new Set(v.map(d => d.company))].slice(0, 3)
                    }),
                    d => `${Math.round(d.latitude * 2) / 2},${Math.round(d.longitude * 2) / 2}`
                ),
                ([_, stats]) => stats
            );

            console.log(clusteredData);

            // Draw circles for layoffs with better visibility
            chart.append("g")
                .selectAll("circle")
                .data(clusteredData)
                .join("circle")
                .attr("class", "map-circle")
                .attr("cx", d => projection([d.longitude, d.latitude])[0])
                .attr("cy", d => projection([d.longitude, d.latitude])[1])
                .attr("r", d => Math.max(3, Math.sqrt(d.count)))
                .attr("fill", d => colorScale(d.totalLayoffs))
                .attr("stroke", "#fff")
                .attr("stroke-width", 1)
                .attr("opacity", 0.9)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    d3.select(this).attr("opacity", 1).attr("stroke-width", 2);
                    tooltip.html(`
                                <strong>${d.location}</strong><br>
                                Total Layoffs: ${d.totalLayoffs.toLocaleString()}<br>
                                Companies: ${d.count}
                            `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px")
                        .style("opacity", 1);
                })
                .on("mouseout", function () {
                    d3.select(this).attr("opacity", 0.8).attr("stroke-width", 1);
                    tooltip.style("opacity", 0);
                });
        });
        // Add legend
        const legendGroup = chart.append("g")
            .attr("transform", `translate(20, 20)`);

        const legendData = [
            { label: "1-1K", color: colorScale(500) },
            { label: "1K-5K", color: colorScale(3000) },
            { label: "5K-15K", color: colorScale(10000) },
            { label: "15K+", color: colorScale(20000) }
        ];

        legendData.forEach((d, i) => {
            const legendItem = legendGroup.append("g")
                .attr("transform", `translate(0, ${i * 25})`);

            legendItem.append("circle")
                .attr("r", 8)
                .attr("fill", d.color)
                .attr("stroke", "#fff")
                .attr("stroke-width", 1);

            legendItem.append("text")
                .attr("x", 15)
                .attr("y", 5)
                .style("font-size", "12px")
                .style("fill", "#333")
                .text(d.label);
        });

        legendGroup.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("fill", "#333")
            .text("Layoffs");

    } catch (error) {
        console.error('Error loading interactive map:', error);
        chart.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "#666")
            .text("Error loading map data");
    }
}