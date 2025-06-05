

function create_map() {
    regionMap = ({
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
    })

    const svg = d3.select("#map"),
        margin = { top: 20, right: 20, bottom: 20, left: 20 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(1000);

    const path = d3.geoPath().projection(projection);
    const colorScale = d3.scaleSequentialLog(d3.interpolateReds).domain([1, 200000]);
    const regionColors = d3.scaleOrdinal()
        .domain(["Northeast", "Midwest", "South", "West", "Unknown"])
        .range(d3.schemePastel2);

    const legendWidth = 160;
    const legendHeight = 12;

    const defs = svg.append("defs");

    const gradientId = "layoff-gradient";
    const gradient = defs.append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("x2", "100%");

    for (let i = 0; i <= 100; i += 10) {
        const t = i / 100;
        gradient.append("stop")
            .attr("offset", `${i}%`)
            .attr("stop-color", colorScale(colorScale.domain()[0] + t * (colorScale.domain()[1] - colorScale.domain()[0])));
    }

    const legendGroup = svg.append("g")
        .attr("transform", `translate(20, 20)`);

    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", `url(#${gradientId})`)
        .attr("stroke", "#333");

    legendGroup.append("text")
        .attr("x", 0)
        .attr("y", -6)
        .text("Laid Off")
        .attr("font-size", 12)
        .attr("fill", "#333");

    const legendScale = d3.scaleLog()
        .domain(colorScale.domain())
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5, "~s")
        .tickSize(legendHeight + 4);

    legendGroup.append("g")
        .attr("transform", `translate(0,0)`)
        .call(legendAxis)
        .select(".domain").remove();

    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
        const states = topojson.feature(us, us.objects.states);
        states.features.forEach(d => {
            d.properties.region = regionMap[d.properties.name] || "Unknown";
        });

        chart.append("g")
            .selectAll("path")
            .data(states.features)
            .join("path")
            .attr("fill", d => regionColors(d.properties.region))
            .attr("stroke", "#999")
            .attr("d", path);

        d3.csv("data/tech_layoffs_Q2_2024.csv").then(data => {
            data.forEach(d => {
                d.Laid_Off = +d.Laid_Off;
                d.latitude = +d.latitude;
                d.longitude = +d.longitude;
            });
            data = data.filter(d => d.Country === "USA");

            clusteredData = Array.from(d3.rollup(data, v => ({
                    count: v.length,
                    Laid_Off: d3.sum(v, d => d.Laid_Off),
                    latitude: d3.mean(v, d => d.latitude),
                    longitude: d3.mean(v, d => d.longitude),
                    Location_HQ: v[0].Location_HQ
                }), d => `${Math.round(d.latitude / 2) * 2},${Math.round(d.longitude / 2) * 2}`),
            ([_, stats]) => stats);

            chart.append("g")
                .selectAll("circle")
                .data(clusteredData)
                .join("circle")
                .attr("cx", d => projection([d.longitude, d.latitude])[0])
                .attr("cy", d => projection([d.longitude, d.latitude])[1])
                .attr("r", d => Math.max(3, Math.sqrt(d.count)))
                .attr("fill", d => colorScale(d.Laid_Off))
                .attr("stroke", "#222")
                .attr("opacity", 1)
                .append("title");
        });
    });
}

